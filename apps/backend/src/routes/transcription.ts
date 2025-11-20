import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import * as transcriptionService from '../services/transcriptionService';
import { randomUUID } from 'crypto';

const router = Router();

function toJSONSafe(value: any): any {
    if (typeof value === 'bigint') return Number(value);
    if (Array.isArray(value)) return value.map(v => toJSONSafe(v));
    if (value && typeof value === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = toJSONSafe(v);
        }
        return out;
    }
    return value;
}

/**
 * POST /api/transcription/session/create
 * Create a new transcription session
 */
router.post('/session/create', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const { language = 'en' } = req.body;

        const sessionId = randomUUID();
        await transcriptionService.createTranscriptionSession(sessionId, userId, language);

        res.json({
            success: true,
            sessionId,
            message: 'Transcription session created',
        });
    } catch (error: any) {
        console.error('[TranscriptionRoutes] Create session error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create transcription session',
        });
    }
});

/**
 * POST /api/transcription/session/:sessionId/start
 * Start transcription for a call
 */
router.post('/session/:sessionId/start', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { callId } = req.body;

        if (!callId) {
            return res.status(400).json({
                success: false,
                error: 'callId is required',
            });
        }

        await transcriptionService.startTranscription(sessionId, Number(callId));

        res.json({
            success: true,
            message: 'Transcription started',
        });
    } catch (error: any) {
        console.error('[TranscriptionRoutes] Start transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start transcription',
        });
    }
});

/**
 * POST /api/transcription/session/:sessionId/stop
 * Stop transcription session
 */
router.post('/session/:sessionId/stop', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;

        await transcriptionService.stopTranscription(sessionId);

        res.json({
            success: true,
            message: 'Transcription stopped',
        });
    } catch (error: any) {
        console.error('[TranscriptionRoutes] Stop transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to stop transcription',
        });
    }
});

/**
 * GET /api/transcription/call/:callId
 * Get transcription for a specific call
 */
router.get('/call/:callId', requireAuth, async (req, res) => {
    try {
        const { callId } = req.params;

        const transcription = await transcriptionService.getCallTranscription(Number(callId));

        if (!transcription.metadata) {
            return res.status(404).json({
                success: false,
                error: 'Transcription not found',
            });
        }

        const safe = toJSONSafe(transcription);

        res.json({
            success: true,
            data: safe,
        });
    } catch (error: any) {
        console.error('[TranscriptionRoutes] Get transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get transcription',
        });
    }
});

/**
 * GET /api/transcription/search
 * Search transcriptions by keyword
 */
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q, limit = '50' } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Search query (q) is required',
            });
        }

        const results = await transcriptionService.searchTranscriptions(
            q,
            Math.min(Number(limit), 100)
        );

        const safe = toJSONSafe(results);

        res.json({
            success: true,
            data: safe,
        });
    } catch (error: any) {
        console.error('[TranscriptionRoutes] Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to search transcriptions',
        });
    }
});

export default router;
