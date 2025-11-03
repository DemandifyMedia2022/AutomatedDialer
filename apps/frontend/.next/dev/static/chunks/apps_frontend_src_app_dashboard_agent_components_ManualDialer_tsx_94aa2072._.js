(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const SIP_DOMAIN = "pbx2.telxio.com.sg";
const Dialer = ()=>{
    _s();
    const [JsSIP, setJsSIP] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [isLoggedIn, setIsLoggedIn] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [number, setNumber] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [ua, setUa] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("Waiting for login...");
    const [isRegistered, setIsRegistered] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isCalling, setIsCalling] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const localAudioRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const remoteAudioRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // ───── Load JsSIP dynamically ─────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dialer.useEffect": ()=>{
            const loadJsSIP = {
                "Dialer.useEffect.loadJsSIP": async ()=>{
                    const module = await __turbopack_context__.A("[project]/node_modules/jssip/lib-es5/JsSIP.js [app-client] (ecmascript, async loader)");
                    setJsSIP(module.default);
                }
            }["Dialer.useEffect.loadJsSIP"];
            loadJsSIP();
        }
    }["Dialer.useEffect"], []);
    // ───── LOGIN HANDLER ─────
    const handleLogin = async ()=>{
        if (!username || !password) return alert("Enter SIP username and password");
        if (!JsSIP) return alert("JsSIP not yet loaded. Please wait a moment.");
        try {
            const socket = new JsSIP.WebSocketInterface(`wss://${SIP_DOMAIN}:8089/ws`);
            const configuration = {
                sockets: [
                    socket
                ],
                uri: `sip:${username}@${SIP_DOMAIN}`,
                authorization_user: username,
                password,
                register: true,
                display_name: username
            };
            const userAgent = new JsSIP.UA(configuration);
            userAgent.start();
            userAgent.on("connected", ()=>setStatus("Connected"));
            userAgent.on("disconnected", ()=>{
                setStatus("Disconnected");
                setIsRegistered(false);
            });
            userAgent.on("registered", ()=>{
                setStatus("Registered ✅");
                setIsRegistered(true);
                setIsLoggedIn(true);
            });
            userAgent.on("registrationFailed", ()=>{
                setStatus("Registration failed ❌");
                setIsRegistered(false);
            });
            setUa(userAgent);
        } catch (err) {
            console.error("SIP configuration error", err);
            setStatus("SIP configuration error");
        }
    };
    // ───── MAKE CALL ─────
    const makeCall = async ()=>{
        if (!number) return alert("Enter number");
        if (!ua) return alert("UA not initialized");
        if (!isRegistered) return alert("SIP not registered yet");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
            }
            const callSession = ua.call(`sip:${number}@${SIP_DOMAIN}`, {
                mediaConstraints: {
                    audio: true,
                    video: false
                },
                mediaStream: stream
            });
            callSession.connection.addEventListener("track", (event)=>{
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = event.streams[0];
                }
            });
            callSession.on("progress", ()=>setStatus("Ringing..."));
            callSession.on("confirmed", ()=>{
                setStatus("In Call...");
                setIsCalling(true);
            });
            callSession.on("ended", ()=>{
                setStatus("Call Ended");
                setIsCalling(false);
                setNumber("");
            });
            callSession.on("failed", ()=>{
                setStatus("Call Failed ❌");
                setIsCalling(false);
            });
            setSession(callSession);
        } catch (err_0) {
            console.error("Audio device error:", err_0);
            alert("Microphone access denied or unavailable.");
        }
    };
    // ───── END CALL ─────
    const endCall = ()=>{
        if (session) {
            session.terminate();
            setStatus("Call Ended");
            setIsCalling(false);
        }
    };
    // ───── LOGOUT HANDLER ─────
    const handleLogout = ()=>{
        if (ua) ua.stop();
        setUa(null);
        setIsLoggedIn(false);
        setIsRegistered(false);
        setUsername("");
        setPassword("");
        setNumber("");
        setStatus("Logged out");
    };
    // ───── UI RENDER ─────
    if (!isLoggedIn) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-[60vh] items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "mb-4 text-center text-xl font-semibold",
                        children: "🔐 SIP Login"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                        lineNumber: 135,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                className: "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary",
                                type: "text",
                                placeholder: "SIP Username",
                                value: username,
                                onChange: (e)=>setUsername(e.target.value)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                                lineNumber: 137,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                className: "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary",
                                type: "password",
                                placeholder: "SIP Password",
                                value: password,
                                onChange: (e_0)=>setPassword(e_0.target.value)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                                lineNumber: 138,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
                                onClick: handleLogin,
                                children: "Login"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                                lineNumber: 139,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground text-xs",
                                children: status
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                                lineNumber: 140,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                        lineNumber: 136,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 134,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
            lineNumber: 133,
            columnNumber: 12
        }, ("TURBOPACK compile-time value", void 0));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto w-full max-w-lg space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between rounded-lg border bg-card p-3 text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "font-medium",
                        children: status
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                        lineNumber: 147,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded-md border px-3 py-1 text-xs hover:bg-muted",
                        onClick: handleLogout,
                        children: "Logout"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: "w-full rounded-md border bg-background px-3 py-3 text-lg tracking-widest outline-none focus:ring-2 focus:ring-primary",
                type: "text",
                value: number,
                onChange: (e_1)=>setNumber(e_1.target.value),
                placeholder: "Enter number",
                disabled: isCalling
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 153,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-3 gap-3",
                children: [
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "*",
                    "0",
                    "#"
                ].map((num)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setNumber((prev)=>prev + num),
                        className: "rounded-lg bg-muted py-4 text-lg font-semibold hover:opacity-90",
                        children: num
                    }, num, false, {
                        fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                        lineNumber: 156,
                        columnNumber: 82
                    }, ("TURBOPACK compile-time value", void 0)))
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 155,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-center",
                children: !isCalling ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "rounded-full bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:opacity-50",
                    onClick: makeCall,
                    disabled: !isRegistered,
                    children: "📞 Call"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                    lineNumber: 162,
                    columnNumber: 23
                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "rounded-full bg-red-600 px-6 py-3 text-white hover:bg-red-700",
                    onClick: endCall,
                    children: "🔴 End"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                    lineNumber: 164,
                    columnNumber: 23
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 161,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("audio", {
                ref: localAudioRef,
                autoPlay: true,
                muted: true
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 169,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("audio", {
                ref: remoteAudioRef,
                autoPlay: true
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
                lineNumber: 170,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/app/dashboard/agent/components/ManualDialer.tsx",
        lineNumber: 145,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Dialer, "N8KqiP4xaJFFmmOm+Ezl73WI/0I=");
_c = Dialer;
const __TURBOPACK__default__export__ = Dialer;
var _c;
__turbopack_context__.k.register(_c, "Dialer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_frontend_src_app_dashboard_agent_components_ManualDialer_tsx_94aa2072._.js.map