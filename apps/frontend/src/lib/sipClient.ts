// Reusable browser-only SIP/WebRTC client using SIP.js SimpleUser.
// - Designed for use in the Vite React frontend.
// - Handles registration and audio only (no UI).
// - Safe for SSR builds because SIP.js is dynamically imported.

import type { Web as sipWeb } from "sip.js";

export type SipRegistrationState =
    | "UNREGISTERED"
    | "REGISTERING"
    | "REGISTERED"
    | "FAILED";

export type SipCallState = "IDLE" | "RINGING" | "IN_CALL" | "ENDING";

export interface SipClientConfig {
    server: string; // Asterisk IP, e.g. 192.168.0.238
    wssPort: number; // WSS port, e.g. 8089
    extension: string; // SIP extension, e.g. 600
    username: string; // Auth username
    password: string; // Auth password
    domain?: string; // SIP domain/realm, defaults to server IP
}

export interface SipClientCallbacks {
    onRegistrationStateChange?: (state: SipRegistrationState, error?: string) => void;
    onCallStateChange?: (state: SipCallState) => void;
    onError?: (error: Error) => void;
}

export interface SipClient {
    register: () => Promise<void>;
    unregister: () => Promise<void>;
    makeCall: (destination: string) => Promise<void>;
    hangup: () => Promise<void>;
    attachAudioElements: (remoteAudio: HTMLAudioElement, localAudio?: HTMLAudioElement) => void;
    mute: () => void;
    unmute: () => void;
    hold: () => Promise<void>;
    unhold: () => Promise<void>;
    sendDTMF: (tone: string) => void;
}

export async function createSipClient(
    config: SipClientConfig,
    callbacks: SipClientCallbacks = {}
): Promise<SipClient | null> {
    if (typeof window === "undefined") {
        return null;
    }

    // Dynamic import so bundler/server never evaluates browser-only SIP.js code
    const sipModule = await import("sip.js");
    // In the browser build, SIP.js exposes SimpleUser as SIP.Web.SimpleUser
    const SIP: any = (sipModule as any).default || sipModule;
    const SimpleUser = SIP.Web.SimpleUser;

    const { server, wssPort, extension, username, password, domain = server } = config;

    const aor = `sip:${extension}@${domain}`;
    const wsServer = `wss://${server}:${wssPort}/ws`;
    // Build a proper SIP.URI object so SIP.js can call uri.clone()
    const uri = SIP.UserAgent.makeURI(aor);

    let remoteAudioEl: HTMLAudioElement | undefined;
    let localAudioEl: HTMLAudioElement | undefined;

    const options: sipWeb.SimpleUserOptions = {
        media: {
            // WebRTC constraints: audio only, with advanced noise cancellation and echo cancellation
            constraints: {
                audio: {
                    // Core audio processing features
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // High quality audio settings
                    sampleRate: 48000,
                    channelCount: 1,
                    // Chrome-specific advanced features for better audio quality
                    googEchoCancellation: true,
                    googNoiseSuppression: true,
                    googAutoGainControl: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                    googNoiseReduction: true,
                    googEchoCancellation2: true,
                    googDAEchoCancellation: true,
                } as any,
                video: false,
            },
            remote: {
                audio: undefined as any, // Will be set via attachAudioElements
            },
            local: {
                audio: undefined as any, // Will be set via attachAudioElements
            } as any,
        },
        userAgentOptions: {
            transportOptions: {
                server: wsServer,
            },
            uri,
            authorizationUsername: username,
            authorizationPassword: password,
            displayName: `Agent ${extension}`,
            // Keep WebSocket/SIP registered even if the connection drops temporarily
            reconnectionAttempts: 20,
            reconnectionDelay: 5,
            sessionDescriptionHandlerFactoryOptions: {
                peerConnectionConfiguration: {
                    iceServers: [
                        // For LAN/local testing, STUN/TURN is typically not required.
                        // Add STUN/TURN servers here if needed.
                    ],
                    // Enable audio processing at WebRTC level
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                },
                // Enable early media to receive ringback tones and voicemail prompts
                alwaysAcquireMediaFirst: true,
            },
        },
    };

    const simpleUser = new SimpleUser(wsServer, options);

    let registrationState: SipRegistrationState = "UNREGISTERED";
    let callState: SipCallState = "IDLE";

    const setRegistrationState = (state: SipRegistrationState, error?: string) => {
        registrationState = state;
        callbacks.onRegistrationStateChange?.(state, error);
    };

    const setCallState = (state: SipCallState) => {
        callState = state;
        callbacks.onCallStateChange?.(state);
    };

    const attachAudioElements = (remoteAudio: HTMLAudioElement, localAudio?: HTMLAudioElement) => {
        remoteAudioEl = remoteAudio;
        localAudioEl = localAudio;

        // Attach audio elements to SimpleUser for WebRTC audio streams
        // SimpleUser will automatically attach MediaStreams to these elements
        // Remote audio will receive ringback tones during RINGING and call audio during IN_CALL

        // MODIFIED: We do NOT attach to simpleUser.options.media anymore.
        // This prevents sip.js from trying to auto-play and causing "Failed to play remote media" errors/race conditions.
        // We handle media attachment manually in the delegates (onSessionDescriptionHandler, onCallAnswered, etc).
        /*
        if (remoteAudioEl) {
            (simpleUser.options.media as any).remote.audio = remoteAudioEl;
            // Ensure remote audio is configured for auto-play
            remoteAudioEl.autoplay = true;
            // remoteAudioEl.playsInline = true; // Not valid for Audio elements
            remoteAudioEl.volume = 1.0;
        }

        if (localAudioEl) {
            (simpleUser.options.media as any).local.audio = localAudioEl;
            localAudioEl.autoplay = false; // Local audio should not auto-play (echo)
            localAudioEl.muted = true; // Mute local audio to prevent echo
        }
        */

        console.log("Audio elements stored (manual media handling active)");
    };

    const register = async () => {
        try {
            if (!remoteAudioEl) {
                throw new Error("Remote audio element is not attached.");
            }
            if (registrationState === "REGISTERED") {
                return; // Already registered
            }
            if (registrationState === "REGISTERING") {
                // Already registering, wait for it to complete
                return;
            }

            setRegistrationState("REGISTERING");
            await simpleUser.connect();
            await simpleUser.register();
            // Don't set REGISTERED here - wait for the delegate callback
            // The SimpleUser delegate will call onRegistered when registration actually completes
        } catch (err: any) {
            console.error("SIP register error:", err);
            setRegistrationState("FAILED", err?.message || String(err));
            callbacks.onError?.(err);
        }
    };

    const unregister = async () => {
        try {
            if (registrationState === "UNREGISTERED") return;
            await simpleUser.unregister();
            await simpleUser.disconnect();
            setRegistrationState("UNREGISTERED");
        } catch (err: any) {
            console.error("SIP unregister error:", err);
            callbacks.onError?.(err);
        }
    };

    const makeCall = async (destination: string) => {
        try {
            if (registrationState !== "REGISTERED") {
                throw new Error("SIP is not registered.");
            }
            if (!remoteAudioEl) {
                throw new Error("Remote audio element is not attached.");
            }
            if (callState !== "IDLE") {
                throw new Error("Already in a call.");
            }

            // Outbound call is starting – we are in RINGING state until the far end answers
            setCallState("RINGING");

            // Build a full SIP URI so SIP.js can create a valid URI
            const target = `sip:${destination}@${domain}`;

            // Make the call - SimpleUser will handle early media (ringback tone) automatically
            // The remote audio element will receive the MediaStream and play it via delegates
            await simpleUser.call(target);

            // Note: We deliberately do NOT manually call play() here anymore.
            // We rely on the delegates (onCallRinging, onCallAnswered, onSessionDescriptionHandler)
            // to detect the media stream and call attachStreamToAudio().
            // This prevents "play() request was interrupted by a new load request" errors.

        } catch (err: any) {
            console.error("SIP makeCall error:", err);
            setCallState("IDLE");
            callbacks.onError?.(err);
        }
    };

    const hangup = async () => {
        try {
            if (callState === "IDLE") return;
            setCallState("ENDING");
            await simpleUser.hangup();
        } catch (err: any) {
            console.error("SIP hangup error:", err);
            callbacks.onError?.(err);
        } finally {
            setCallState("IDLE");
        }
    };

    // Helper function to attach MediaStream to audio element
    const attachStreamToAudio = async (stream: MediaStream | null, audioEl: HTMLAudioElement | undefined) => {
        if (!audioEl || !stream) return;

        try {
            // Only update srcObject if strictly different to avoid reloading/interrupting
            if (audioEl.srcObject !== stream) {
                console.log("Attaching new media stream to audio element");
                audioEl.srcObject = stream;
            }

            // Only attempt to play if paused to avoid "interrupted" errors
            // or redundant calls.
            if (audioEl.paused) {
                try {
                    await audioEl.play();
                    console.log("Audio playback started");
                } catch (playErr: any) {
                    // Ignore specific interruption errors as they are often benign during stream switching
                    if (playErr.name === "AbortError" || playErr.message.includes("interrupted")) {
                        console.log("Audio play request was interrupted (benign):", playErr.message);
                    } else {
                        console.warn("Could not play audio stream:", playErr);
                    }
                }
            }
        } catch (err) {
            console.error("Error attaching stream to audio element:", err);
        }
    };

    // SIP event delegates
    simpleUser.delegate = {
        // Called when registration is successful (SIP 200 OK for REGISTER)
        onRegistered: () => {
            console.log("SIP registration successful - onRegistered delegate fired");
            setRegistrationState("REGISTERED");
            // Explicitly trigger the callback to ensure promise resolution
            callbacks.onRegistrationStateChange?.("REGISTERED");
        },
        // Called when registration fails or is lost
        onUnregistered: (response: any) => {
            console.log("SIP unregistered - onUnregistered delegate fired", response);
            const currentState = registrationState;
            if (currentState === "REGISTERED" || currentState === "REGISTERING") {
                setRegistrationState("UNREGISTERED");
                callbacks.onRegistrationStateChange?.("UNREGISTERED");
            }
        },
        // Called when media session is established (for early media/ringback)
        onSessionDescriptionHandler: (sessionDescriptionHandler: any) => {
            // Monitor for remote media stream
            if (sessionDescriptionHandler && sessionDescriptionHandler.peerConnection) {
                sessionDescriptionHandler.peerConnection.addEventListener('track', (event: RTCTrackEvent) => {
                    if (event.track && event.track.kind === 'audio') {
                        console.log("Remote audio track received (onSDH) - attaching to audio element");
                        const stream = new MediaStream([event.track]);
                        attachStreamToAudio(stream, remoteAudioEl);
                    }
                });
            }
        },
        // Inbound call handling
        onCallReceived: async () => {
            try {
                setCallState("RINGING");
                await simpleUser.answer();
            } catch (err: any) {
                console.error("Error auto-answering inbound call:", err);
                setCallState("IDLE");
                callbacks.onError?.(err);
            }
        },
        // Called when an outbound or inbound call is actually answered (SIP 200 OK)
        onCallAnswered: () => {
            // Ensure remote audio stream is attached BEFORE notifying state change
            try {
                const session = (simpleUser as any).session;
                if (session && session.sessionDescriptionHandler) {
                    const pc = session.sessionDescriptionHandler.peerConnection;
                    if (pc) {
                        pc.getReceivers().forEach((receiver: RTCRtpReceiver) => {
                            if (receiver.track && receiver.track.kind === 'audio') {
                                console.log("Remote audio track found (onCallAnswered) - attaching");
                                const stream = new MediaStream([receiver.track]);
                                attachStreamToAudio(stream, remoteAudioEl);
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn("Could not attach remote audio stream:", err);
            }

            // Now notify that we are IN_CALL, after media is attached
            setCallState("IN_CALL");
        },
        // Optional: called when remote end is ringing (SIP 180/183) - early media starts here
        onCallRinging: () => {
            console.log("Call ringing - early media may be available");
            setCallState("RINGING");

            // Try to get early media stream for ringback tone
            try {
                const session = (simpleUser as any).session;
                if (session && session.sessionDescriptionHandler) {
                    const pc = session.sessionDescriptionHandler.peerConnection;
                    if (pc) {
                        // Check for existing receivers (early media)
                        const receivers = pc.getReceivers();
                        if (receivers.length > 0) {
                            receivers.forEach((receiver: RTCRtpReceiver) => {
                                if (receiver.track && receiver.track.kind === 'audio' && receiver.track.readyState === 'live') {
                                    console.log("Early media (ringback tone) received");
                                    const stream = new MediaStream([receiver.track]);
                                    attachStreamToAudio(stream, remoteAudioEl);
                                }
                            });
                        }

                        // Also listen for new tracks (for early media that arrives later)
                        const trackHandler = (event: RTCTrackEvent) => {
                            if (event.track && event.track.kind === 'audio') {
                                console.log("Ringback tone track received (event)");
                                const stream = new MediaStream([event.track]);
                                attachStreamToAudio(stream, remoteAudioEl);
                                // Remove listener after first track
                                pc.removeEventListener('track', trackHandler);
                            }
                        };
                        pc.addEventListener('track', trackHandler);
                    }
                }
            } catch (err) {
                console.warn("Could not get early media stream:", err);
            }
        },
        onCallHangup: () => {
            setCallState("IDLE");
            // Clear audio stream
            if (remoteAudioEl) {
                remoteAudioEl.srcObject = null;
            }
        },
    } as any;

    const mute = () => {
        if (callState !== "IN_CALL") return;
        simpleUser.mute();
    };

    const unmute = () => {
        if (callState !== "IN_CALL") return;
        simpleUser.unmute();
    };

    const hold = async () => {
        if (callState !== "IN_CALL") return;
        try {
            await simpleUser.hold();
        } catch (err: any) {
            console.error("SIP hold error:", err);
            callbacks.onError?.(err);
        }
    };

    const unhold = async () => {
        // We can be in HOLD state technically, but SimpleUser tracks this internally
        try {
            await simpleUser.unhold();
        } catch (err: any) {
            console.error("SIP unhold error:", err);
            callbacks.onError?.(err);
        }
    };

    const sendDTMF = (tone: string) => {
        if (callState !== "IN_CALL") return;
        try {
            simpleUser.sendDTMF(tone);
        } catch (err: any) {
            console.error("SIP DTMF error:", err);
            callbacks.onError?.(err);
        }
    };

    return {
        register,
        unregister,
        makeCall,
        hangup,
        attachAudioElements,
        mute,
        unmute,
        hold,
        unhold,
        sendDTMF,
    };
}

