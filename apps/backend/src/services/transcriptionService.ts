import { db } from '../db/prisma';
import OpenAI, { toFile } from 'openai';
import { Readable } from 'stream';
import { getIo } from '../utils/ws';
import { env } from '../config/env';
import path from 'path';
import fs from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptionSegment {
    speaker: 'agent' | 'customer' | 'unknown';
    text: string;
    startTime: number;
    endTime: number;
    confidence?: number;
    isFinal: boolean;
}

interface TranscriptionSession {
    sessionId: string;
    callId?: number;
    userId?: number;
    language: string;
    provider: string;
    segments: TranscriptionSegment[];
    fullTranscript: string;
    startedAt: Date;
}

// In-memory storage for active sessions
const activeSessions = new Map<string, TranscriptionSession>();

const recordingsPath = path.isAbsolute(env.RECORDINGS_DIR)
  ? env.RECORDINGS_DIR
  : path.resolve(process.cwd(), env.RECORDINGS_DIR);

/**
 * Create a new transcription session
 */
export async function createTranscriptionSession(
    sessionId: string,
    userId?: number,
    language: string = 'en'
): Promise<string> {
    try {
        // Create session in database
        await db.transcription_sessions.create({
            data: {
                session_id: sessionId,
                user_id: userId || null,
                status: 'pending',
                provider: 'openai-whisper',
                language: language,
            },
        });

        // Initialize in-memory session
        activeSessions.set(sessionId, {
            sessionId,
            userId,
            language,
            provider: 'openai-whisper',
            segments: [],
            fullTranscript: '',
            startedAt: new Date(),
        });

        return sessionId;
    } catch (error) {
        console.error('[TranscriptionService] Failed to create session:', error);
        throw error;
    }
}

/**
 * Start transcription for a call
 */
export async function startTranscription(
    sessionId: string,
    callId: number
): Promise<void> {
    try {
        const session = activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.callId = callId;

        // Update database
        await db.transcription_sessions.update({
            where: { session_id: sessionId },
            data: {
                call_id: callId,
                status: 'active',
                started_at: new Date(),
            },
        });

        console.log(`[TranscriptionService] Started transcription for call ${callId}`);
    } catch (error) {
        console.error('[TranscriptionService] Failed to start transcription:', error);
        throw error;
    }
}

/**
 * Process audio chunk and generate transcription using OpenAI Whisper
 */
export async function transcribeAudioChunk(
    sessionId: string,
    audioBuffer: Buffer,
    speaker: 'agent' | 'customer' = 'agent'
): Promise<void> {
    try {
        const session = activeSessions.get(sessionId);
        if (!session) {
            console.warn(`[TranscriptionService] Session ${sessionId} not found`);
            return;
        }

        // Convert buffer to file-like object for OpenAI API using toFile helper
        // This properly handles Node.js Buffer types
        const audioFile = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' });

        // Call OpenAI Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: session.language,
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
        });

        // Process segments
        if (transcription.segments && transcription.segments.length > 0) {
            const currentTime = (Date.now() - session.startedAt.getTime()) / 1000;

            for (const segment of transcription.segments) {
                const transcriptSegment: TranscriptionSegment = {
                    speaker,
                    text: segment.text,
                    startTime: segment.start,
                    endTime: segment.end,
                    confidence: segment.no_speech_prob ? 1 - segment.no_speech_prob : undefined,
                    isFinal: true,
                };

                session.segments.push(transcriptSegment);
                session.fullTranscript += segment.text + ' ';

                // Emit real-time update via WebSocket
                const io = getIo();
                if (io && session.userId) {
                    io.to(`user:${session.userId}`).emit('transcription:segment', {
                        sessionId,
                        callId: session.callId,
                        segment: transcriptSegment,
                    });
                }

                // Store segment in database
                if (session.callId) {
                    await db.transcription_segments.create({
                        data: {
                            call_id: session.callId,
                            speaker,
                            text: segment.text,
                            segment_start_time: segment.start,
                            segment_end_time: segment.end,
                            confidence: transcriptSegment.confidence || null,
                            is_final: true,
                            sentiment: null,
                        },
                    });
                }
            }
        }
    } catch (error) {
        console.error('[TranscriptionService] Failed to transcribe audio chunk:', error);

        // Emit error to user
        const session = activeSessions.get(sessionId);
        if (session && session.userId) {
            const io = getIo();
            io?.to(`user:${session.userId}`).emit('transcription:error', {
                sessionId,
                error: 'Transcription failed',
            });
        }
    }
}

/**
 * Stop transcription and finalize
 */
export async function stopTranscription(sessionId: string): Promise<void> {
    try {
        const session = activeSessions.get(sessionId);
        if (!session) {
            console.warn(`[TranscriptionService] Session ${sessionId} not found`);
            return;
        }

        // Calculate statistics
        const wordCount = session.fullTranscript.trim().split(/\s+/).length;
        const avgConfidence = session.segments.length > 0
            ? session.segments.reduce((sum, seg) => sum + (seg.confidence || 0), 0) / session.segments.length
            : null;
        const durationSeconds = session.segments.length > 0
            ? Math.max(...session.segments.map(s => s.endTime))
            : 0;

        // Store metadata in database
        if (session.callId) {
            await db.call_transcription_metadata.create({
                data: {
                    call_id: session.callId,
                    full_transcript: session.fullTranscript.trim(),
                    language: session.language,
                    avg_confidence: avgConfidence,
                    word_count: wordCount,
                    duration_seconds: durationSeconds,
                    provider: 'openai-whisper',
                    metadata_json: null,
                },
            });
        }

        // Update session status
        await db.transcription_sessions.update({
            where: { session_id: sessionId },
            data: {
                status: 'completed',
                ended_at: new Date(),
            },
        });

        // Emit completion event
        if (session.userId) {
            const io = getIo();
            io?.to(`user:${session.userId}`).emit('transcription:completed', {
                sessionId,
                callId: session.callId,
                wordCount,
                avgConfidence,
            });
        }

        // Clean up in-memory session
        activeSessions.delete(sessionId);

        console.log(`[TranscriptionService] Completed transcription for session ${sessionId}`);
    } catch (error) {
        console.error('[TranscriptionService] Failed to stop transcription:', error);
        throw error;
    }
}

/**
 * Get transcription for a call
 */
export async function getCallTranscription(callId: number) {
    try {
        const metadata = await db.call_transcription_metadata.findUnique({
            where: { call_id: callId },
        });

        const segments = await db.transcription_segments.findMany({
            where: { call_id: callId },
            orderBy: { segment_start_time: 'asc' },
        });

        return {
            metadata,
            segments,
        };
    } catch (error) {
        console.error('[TranscriptionService] Failed to get transcription:', error);
        throw error;
    }
}

/**
 * Search transcriptions by keyword
 */
export async function searchTranscriptions(keyword: string, limit: number = 50) {
    try {
        const results = await db.call_transcription_metadata.findMany({
            where: {
                full_transcript: {
                    contains: keyword,
                },
            },
            include: {
                calls: {
                    select: {
                        id: true,
                        destination: true,
                        start_time: true,
                        disposition: true,
                    },
                },
            },
            take: limit,
            orderBy: {
                created_at: 'desc',
            },
        });

        return results;
    } catch (error) {
        console.error('[TranscriptionService] Failed to search transcriptions:', error);
        throw error;
    }
}

/**
 * Handle session cleanup on error
 */
export async function handleTranscriptionError(
    sessionId: string,
    errorMessage: string
): Promise<void> {
    try {
        await db.transcription_sessions.update({
            where: { session_id: sessionId },
            data: {
                status: 'failed',
                error_message: errorMessage,
                ended_at: new Date(),
            },
        });

        activeSessions.delete(sessionId);
    } catch (error) {
        console.error('[TranscriptionService] Failed to handle error:', error);
    }
}

export async function transcribeCallRecordingForCall(callId: bigint | number): Promise<void> {
    try {
        const id = typeof callId === 'bigint' ? callId : BigInt(callId);

        const call = await db.calls.findUnique({
            where: { id },
            select: { recording_url: true, remote_recording_url: true },
        });

        let fullTranscript = '';
        const segmentsData: {
            call_id: bigint;
            speaker: string | null;
            text: string;
            segment_start_time: number;
            segment_end_time: number;
            confidence: number | null;
            is_final: boolean | null;
            words_json?: string | null;
            sentiment?: string | null;
        }[] = [];

        if (!call || (!call.recording_url && !call.remote_recording_url)) {
            return;
        }

        // We want both sides: use mixed recording as 'agent' and remote-only as 'customer' when available.
        const sources: { url: string; speaker: 'agent' | 'customer' }[] = [];
        if (call.recording_url) {
            sources.push({ url: call.recording_url, speaker: 'agent' });
        }
        if (call.remote_recording_url) {
            sources.push({ url: call.remote_recording_url, speaker: 'customer' });
        }

        for (const source of sources) {
            let filename: string | null = null;
            try {
                const u = new URL(source.url);
                filename = path.basename(u.pathname);
            } catch {
                filename = path.basename(source.url);
            }

            if (!filename) {
                continue;
            }

            const fullPath = path.join(recordingsPath, filename);
            const audioBuffer = await fs.promises.readFile(fullPath);
            const audioFile = await toFile(audioBuffer, filename, { type: 'audio/webm' });

            const transcription: any = await openai.audio.translations.create({
                file: audioFile,
                model: 'whisper-1',
                response_format: 'verbose_json',
                temperature: 0,
            });

            if (Array.isArray(transcription.segments) && transcription.segments.length) {
                for (const segment of transcription.segments) {
                    const text: string = segment.text ?? '';
                    fullTranscript += text ? text + ' ' : '';
                    segmentsData.push({
                        call_id: id,
                        speaker: source.speaker,
                        text,
                        segment_start_time: Number(segment.start ?? 0),
                        segment_end_time: Number(segment.end ?? 0),
                        confidence: typeof segment.no_speech_prob === 'number' ? 1 - segment.no_speech_prob : null,
                        is_final: true,
                        words_json: null,
                        sentiment: null,
                    });
                }
            } else if (typeof transcription.text === 'string' && transcription.text.trim()) {
                const text = transcription.text.trim();
                fullTranscript += text ? text + ' ' : '';
                segmentsData.push({
                    call_id: id,
                    speaker: source.speaker,
                    text,
                    segment_start_time: 0,
                    segment_end_time: 0,
                    confidence: null,
                    is_final: true,
                    words_json: null,
                    sentiment: null,
                });
            }
        }

        const trimmedTranscript = fullTranscript.replace(/\s+/g, ' ').trim();
        const wordCount = trimmedTranscript ? trimmedTranscript.split(/\s+/).length : 0;
        const avgConfidence = segmentsData.length
            ? segmentsData.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / segmentsData.length
            : null;
        const durationSeconds = segmentsData.length
            ? Math.max(...segmentsData.map(s => s.segment_end_time))
            : 0;

        await db.call_transcription_metadata.upsert({
            where: { call_id: id },
            create: {
                call_id: id,
                full_transcript: trimmedTranscript,
                language: 'en-US',
                avg_confidence: avgConfidence,
                word_count: wordCount,
                duration_seconds: durationSeconds,
                provider: 'openai-whisper',
                metadata_json: null,
            },
            update: {
                full_transcript: trimmedTranscript,
                avg_confidence: avgConfidence,
                word_count: wordCount,
                duration_seconds: durationSeconds,
                updated_at: new Date(),
            },
        });

        await db.transcription_segments.deleteMany({ where: { call_id: id } });

        if (segmentsData.length) {
            await db.transcription_segments.createMany({ data: segmentsData });
        }
    } catch (error) {
        console.error('[TranscriptionService] Failed to transcribe call recording:', error);
    }
}
