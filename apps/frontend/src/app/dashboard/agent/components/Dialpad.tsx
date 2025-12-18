"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, PhoneOff, Delete, Mic, MicOff, Pause, Grid2X2, PhoneCall } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createSipClient, SipClient, SipRegistrationState, SipCallState } from '@/lib/sipClient'
import { Separator } from "@/components/ui/separator"
import { detectRegion, getCountryName } from "@/utils/regionDetection"
import { useAuth } from '@/hooks/useAuth'

interface DialpadButton {
    digit: string
    letters?: string
    symbol?: string
}

const dialpadButtons: DialpadButton[] = [
    { digit: '1', symbol: '.,!@' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', symbol: '*+=' },
    { digit: '0', letters: '+' },
    { digit: '#', symbol: '#$%' },
]

const operatorButtons = [
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: '.', value: '.' },
    { label: ',', value: ',' },
    { label: '=', value: '=' },
    { label: '/', value: '/' },
    { label: ':', value: ':' },
    { label: ';', value: ';' },
    { label: '?', value: '?' },
    { label: '!', value: '!' },
    { label: '@', value: '@' },
    { label: '$', value: '$' },
    { label: '%', value: '%' },
    { label: '&', value: '&' },
    { label: ' ', value: ' ' },
]

interface DialpadProps {
    children?: React.ReactNode
}

export default function Dialpad({ children }: DialpadProps) {
    const { user } = useAuth()
    const [number, setNumber] = useState('')
    const [isCalling, setIsCalling] = useState(false)
    const [selectedPort, setSelectedPort] = useState<string>('sip')
    const [callDuration, setCallDuration] = useState(0)
    const [showOperators, setShowOperators] = useState(false)
    const [longPressPopup, setLongPressPopup] = useState<{
        button: DialpadButton
        x: number
        y: number
    } | null>(null)
    const [registrationState, setRegistrationState] = useState<SipRegistrationState>('UNREGISTERED')
    const [registrationError, setRegistrationError] = useState<string | null>(null)
    const [sipCallState, setSipCallState] = useState<SipCallState>('IDLE')

    // Floating Card State
    const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 420, y: 160 })
    const [isMuted, setIsMuted] = useState(false)
    const [isOnHold, setIsOnHold] = useState(false)
    const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
    const sipClientRef = useRef<SipClient | null>(null)
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
    const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null)
    const callTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const registrationPromiseRef = useRef<{ resolve: () => void; reject: (err: Error) => void } | null>(null)

    const LONG_PRESS_DURATION = 500

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const callStartTimeRef = useRef<Date | null>(null)

    // Reset loop for floating card
    useEffect(() => {
        if (!isCalling) {
            setIsMuted(false)
            setIsOnHold(false)
        } else {
            // Default center pos if not set
            try {
                const w = window.innerWidth;
                const h = window.innerHeight;
                setPopupPos({ x: Math.max(8, Math.floor(w / 2 - 180)), y: Math.max(60, Math.floor(h / 2 - 120)) })
            } catch { }
        }
    }, [isCalling])

    const startRecording = () => {
        if (!remoteAudioRef.current || !remoteAudioRef.current.srcObject) return
        try {
            const stream = remoteAudioRef.current.srcObject as MediaStream
            const recorder = new MediaRecorder(stream)
            audioChunksRef.current = []

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            recorder.start()
            mediaRecorderRef.current = recorder
            console.log('Call recording started')
        } catch (err) {
            console.error('Failed to start recording:', err)
        }
    }

    const stopAndUploadRecording = async (destination: string) => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

        return new Promise<void>((resolve) => {
            mediaRecorderRef.current!.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                    const durationMs = callStartTimeRef.current ? Date.now() - callStartTimeRef.current.getTime() : 0
                    const durationSec = Math.round(durationMs / 1000)

                    const formData = new FormData()
                    formData.append('destination', destination)
                    formData.append('direction', 'outbound')
                    formData.append('disposition', 'ANSWERED') // Assuming answered if we recorded
                    formData.append('call_type', 'sip')
                    if (callStartTimeRef.current) {
                        formData.append('start_time', callStartTimeRef.current.toISOString())
                    }
                    formData.append('end_time', new Date().toISOString())
                    formData.append('call_duration', String(durationSec))
                    formData.append('recording', audioBlob, `call_${Date.now()}.webm`)

                    console.log('Uploading call recording...', { size: audioBlob.size, duration: durationSec })

                    const res = await fetch('/api/calls', {
                        method: 'POST',
                        body: formData
                    })

                    if (res.ok) {
                        console.log('Call recording uploaded successfully')
                    } else {
                        console.error('Failed to upload call recording', await res.text())
                    }
                } catch (err) {
                    console.error('Error uploading recording:', err)
                } finally {
                    audioChunksRef.current = []
                    mediaRecorderRef.current = null
                    callStartTimeRef.current = null
                    resolve()
                }
            }
            mediaRecorderRef.current!.stop()
        })
    }

    const playRingtone = () => {
        try {
            stopRingtone()
            const playBeep = () => {
                try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
                    const oscillator = ctx.createOscillator()
                    const gainNode = ctx.createGain()
                    oscillator.frequency.value = 440
                    oscillator.type = 'sine'
                    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
                    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
                    oscillator.connect(gainNode)
                    gainNode.connect(ctx.destination)
                    oscillator.start(ctx.currentTime)
                    oscillator.stop(ctx.currentTime + 0.5)
                } catch (err) { console.error('Failed to play beep', err) }
            }
            playBeep()
            const ringInterval = setInterval(() => { playBeep() }, 2000)
            ringtoneIntervalRef.current = ringInterval
        } catch (err) { console.error('Failed to play ringtone', err) }
    }

    const stopRingtone = () => {
        try {
            if (ringtoneIntervalRef.current) {
                clearInterval(ringtoneIntervalRef.current)
                ringtoneIntervalRef.current = null
            }
        } catch (err) { }
    }

    // Keep track of the current number in a ref to access it in callbacks
    const currentNumberRef = useRef(number)
    useEffect(() => { currentNumberRef.current = number }, [number])

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const client = await createSipClient(
                    {
                        server: '192.168.0.238',
                        wssPort: 8089,
                        extension: '600',
                        username: '600',
                        password: 'David@765',
                    },
                    {
                        onRegistrationStateChange: (state, error) => {
                            if (!mounted) return
                            setRegistrationState(state)
                            setRegistrationError(error || null)
                            if (state === 'REGISTERED' && registrationPromiseRef.current) {
                                registrationPromiseRef.current.resolve()
                                registrationPromiseRef.current = null
                            }
                            if (state === 'FAILED' && registrationPromiseRef.current) {
                                registrationPromiseRef.current.reject(new Error(error || 'Registration failed'))
                                registrationPromiseRef.current = null
                            }
                        },
                        onCallStateChange: (state) => {
                            if (!mounted) return
                            setSipCallState(state)
                            setIsCalling(state === 'IN_CALL' || state === 'RINGING')
                            if (state === 'RINGING') {
                                playRingtone()
                                if (remoteAudioRef.current) {
                                    if (remoteAudioRef.current.srcObject) {
                                        remoteAudioRef.current.play().then(() => { stopRingtone() }).catch((err) => { })
                                    }
                                }
                                if (callTimerIntervalRef.current) {
                                    clearInterval(callTimerIntervalRef.current)
                                    callTimerIntervalRef.current = null
                                }
                                setCallDuration(0)
                            } else if (state === 'IN_CALL') {
                                stopRingtone()
                                if (remoteAudioRef.current) {
                                    remoteAudioRef.current.play().catch((err) => { })
                                    // Start recording when call connects
                                    callStartTimeRef.current = new Date()
                                    startRecording()
                                }
                                if (!callTimerIntervalRef.current) {
                                    callTimerIntervalRef.current = setInterval(() => {
                                        setCallDuration((prev) => prev + 1)
                                    }, 1000)
                                }
                            } else {
                                stopRingtone()
                                if (remoteAudioRef.current) {
                                    remoteAudioRef.current.pause()
                                    remoteAudioRef.current.currentTime = 0
                                }

                                // Stop recording and upload if we were recording
                                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                                    stopAndUploadRecording(currentNumberRef.current)
                                }

                                if (callTimerIntervalRef.current) {
                                    clearInterval(callTimerIntervalRef.current)
                                    callTimerIntervalRef.current = null
                                }
                                if (state === 'IDLE') {
                                    setCallDuration(0)
                                }
                            }
                        },
                        onError: (err) => { console.error('SIP client error:', err) },
                    }
                )

                if (!mounted) return
                sipClientRef.current = client
                if (client) {
                    if (remoteAudioRef.current) {
                        client.attachAudioElements(remoteAudioRef.current)
                    }
                    // Auto-register on mount
                    client.register().catch(err => {
                        console.error('Auto-registration failed:', err)
                        setRegistrationError(err.message)
                    })
                }
            })()
        return () => {
            mounted = false
            if (callTimerIntervalRef.current) {
                clearInterval(callTimerIntervalRef.current)
            }
            stopRingtone()
            if (registrationPromiseRef.current) {
                registrationPromiseRef.current.reject(new Error('Component unmounted'))
                registrationPromiseRef.current = null
            }
            ; (async () => {
                if (sipClientRef.current) {
                    try {
                        await sipClientRef.current.hangup()
                    } catch { }
                }
            })()
        }
    }, [])

    const toggleMute = () => {
        if (!sipClientRef.current) return
        if (isMuted) {
            sipClientRef.current.unmute()
            setIsMuted(false)
        } else {
            sipClientRef.current.mute()
            setIsMuted(true)
        }
    }

    const toggleHold = async () => {
        if (!sipClientRef.current) return
        try {
            if (isOnHold) {
                await sipClientRef.current.unhold()
                setIsOnHold(false)
            } else {
                await sipClientRef.current.hold()
                setIsOnHold(true)
            }
        } catch { }
    }

    const startDTMF = (tone: string) => {
        if (!sipClientRef.current) return
        sipClientRef.current.sendDTMF(tone)
    }

    const onPopupMouseDown = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        window.addEventListener("mousemove", onPopupMouseMove)
        window.addEventListener("mouseup", onPopupMouseUp)
    }

    const onPopupMouseMove = (e: MouseEvent) => {
        if (!dragOffsetRef.current) return
        const nx = e.clientX - dragOffsetRef.current.x
        const ny = e.clientY - dragOffsetRef.current.y
        setPopupPos({ x: Math.max(8, nx), y: Math.max(60, ny) })
    }

    const onPopupMouseUp = () => {
        dragOffsetRef.current = null
        window.removeEventListener("mousemove", onPopupMouseMove)
        window.removeEventListener("mouseup", onPopupMouseUp)
    }

    const handleNumberClick = (digit: string) => {
        if (isCalling && selectedPort === 'sip') {
            startDTMF(digit)
            return
        }
        if (!longPressTimerRef.current) {
            setNumber(prev => prev + digit)
        }
    }

    const handleLetterClick = (letter: string) => {
        setNumber(prev => prev + letter.toLowerCase())
        setLongPressPopup(null)
    }

    const handleSymbolClick = (symbol: string) => {
        setNumber(prev => prev + symbol)
        setLongPressPopup(null)
    }

    const handleLongPressStart = (btn: DialpadButton, event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
        if (isCalling || (!btn.letters && !btn.symbol)) {
            if (!btn.letters && !btn.symbol) {
                handleNumberClick(btn.digit)
            }
            return
        }
        longPressTimerRef.current = setTimeout(() => {
            const buttonElement = buttonRefs.current[btn.digit]
            if (buttonElement) {
                const rect = buttonElement.getBoundingClientRect()
                setLongPressPopup({
                    button: btn,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                })
            }
        }, LONG_PRESS_DURATION)
    }

    const handleLongPressEnd = (btn: DialpadButton) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    const handleLongPressCancel = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (longPressPopup) {
                setLongPressPopup(null)
            }
        }
        if (longPressPopup) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [longPressPopup])

    const handleBackspace = () => {
        setNumber(prev => prev.slice(0, -1))
    }

    const handleClear = () => {
        setNumber('')
    }

    const gsmCallIdRef = useRef<string | number | null>(null)

    // ... (keep existing refs)

    const handleCall = async () => {
        if (!number) return
        if (selectedPort === 'sip') {
            // ... (keep existing SIP logic)
            if (!sipClientRef.current) return
            if (registrationState !== 'REGISTERED') {
                try {
                    if (registrationState === 'REGISTERING' && registrationPromiseRef.current) {
                        const existingPromise = new Promise<void>((resolve, reject) => {
                            const timeout = setTimeout(() => { reject(new Error('Registration timeout')) }, 5000)
                            const originalResolve = registrationPromiseRef.current!.resolve
                            const originalReject = registrationPromiseRef.current!.reject
                            registrationPromiseRef.current = {
                                resolve: () => { clearTimeout(timeout); originalResolve(); resolve() },
                                reject: (err: Error) => { clearTimeout(timeout); originalReject(err); reject(err) }
                            }
                        })
                        await existingPromise
                    } else {
                        try { await navigator.mediaDevices.getUserMedia({ audio: true, video: false }) }
                        catch (micErr: any) { setRegistrationError('Microphone permission denied.'); return }
                        const registrationPromise = new Promise<void>((resolve, reject) => {
                            const timeout = setTimeout(() => { reject(new Error('Registration timeout')) }, 10000)
                            registrationPromiseRef.current = {
                                resolve: () => { clearTimeout(timeout); resolve() },
                                reject: (err: Error) => { clearTimeout(timeout); reject(err) }
                            }
                        })
                        await sipClientRef.current.register()
                        await registrationPromise
                    }
                } catch (err: any) {
                    setRegistrationError(err?.message || 'Failed to register SIP parameters')
                    return
                }
            }
            try {
                await sipClientRef.current.makeCall(number)
            } catch (error: any) {
                setRegistrationError(error?.message || 'Call failed')
                setIsCalling(false)
                setCallDuration(0)
                stopRingtone()
            }
            return
        }

        // GSM Logic
        setIsCalling(true)
        try {
            const response = await fetch('/api/dialer/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number,
                    port: selectedPort,
                    type: selectedPort === 'sip' ? 'sip' : 'gsm',
                    username: user?.username,
                    extension: user?.extension
                }),
            })
            if (!response.ok) throw new Error('Call failed')

            // Capture the call ID from the server
            const data = await response.json()
            if (data && data.id) {
                gsmCallIdRef.current = data.id
            }

            const interval = setInterval(() => { setCallDuration(prev => prev + 1) }, 1000)
                ; (window as any).callInterval = interval
        } catch (error) {
            setIsCalling(false)
            setCallDuration(0)
        }
    }

    const handleHangup = async () => {
        stopRingtone()
        if (callTimerIntervalRef.current) {
            clearInterval(callTimerIntervalRef.current)
            callTimerIntervalRef.current = null
        }
        if (selectedPort === 'sip' && sipClientRef.current) {
            try { await sipClientRef.current.hangup() } catch (error) { }
            finally {
                if ((window as any).callInterval) clearInterval((window as any).callInterval)
                setIsCalling(false)
                setCallDuration(0)
            }
            return
        }

        // GSM Logic
        try {
            const callId = gsmCallIdRef.current || Date.now().toString()
            await fetch('/api/dialer/hangup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callId }),
            })
        } catch (error) { }
        finally {
            gsmCallIdRef.current = null
            if ((window as any).callInterval) clearInterval((window as any).callInterval)
            setIsCalling(false)
            setCallDuration(0)
        }
    }

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <>
            <Card className="w-full h-fit flex flex-col p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-lg font-semibold flex items-center gap-2">
                        <PhoneCall className="w-5 h-5 text-primary" />
                        Dialer
                    </div>
                    <div className="flex items-center gap-2">
                        {/* SIP Status Dot */}
                        {selectedPort === 'sip' && (
                            <div className="flex items-center gap-1.5" title={registrationError || registrationState}>
                                <span className={`h-2.5 w-2.5 rounded-full ${registrationState === 'REGISTERED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                    registrationState === 'REGISTERING' ? 'bg-amber-500 animate-pulse' :
                                        'bg-red-500'
                                    }`} />
                            </div>
                        )}
                        <Select value={selectedPort} onValueChange={setSelectedPort}>
                            <SelectTrigger className="h-8 text-xs w-[80px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sip">SIP</SelectItem>
                                <SelectItem value="COM1">COM1</SelectItem>
                                <SelectItem value="COM2">COM2</SelectItem>
                                <SelectItem value="COM3">COM3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="Enter number"
                            className="w-full text-lg font-mono tracking-wide h-12"
                            readOnly={isCalling}
                        />
                    </div>


                    {/* Status badges when calling */}
                    {isCalling && (
                        <div className="flex items-center justify-center gap-3 py-2 bg-muted/30 rounded-md">
                            <Badge variant={sipCallState === 'IN_CALL' ? 'default' : 'secondary'} className={sipCallState === 'RINGING' ? 'animate-pulse' : ''}>
                                {sipCallState === 'RINGING' ? 'Ringing...' : sipCallState === 'IN_CALL' ? 'Connected' : 'Calling...'}
                            </Badge>
                            {sipCallState === 'IN_CALL' && (
                                <span className="text-sm font-mono font-medium">{formatDuration(callDuration)}</span>
                            )}
                        </div>
                    )}


                    <div className="grid grid-cols-3 gap-3">
                        {dialpadButtons.map((btn) => (
                            <Button
                                key={btn.digit}
                                ref={(el) => { buttonRefs.current[btn.digit] = el }}
                                variant="outline"
                                className="h-14 flex flex-col items-center justify-center relative transition-all active:scale-95 hover:bg-muted/50"
                                onClick={() => { if (!longPressPopup) { handleNumberClick(btn.digit) } }}
                                onMouseDown={(e) => handleLongPressStart(btn, e)}
                                onMouseUp={() => handleLongPressEnd(btn)}
                                onMouseLeave={handleLongPressCancel}
                                onTouchStart={(e) => handleLongPressStart(btn, e)}
                                onTouchEnd={() => handleLongPressEnd(btn)}
                                onTouchCancel={handleLongPressCancel}
                                disabled={selectedPort !== 'sip' && isCalling}
                            >
                                <span className="text-xl font-semibold leading-none">{btn.digit}</span>
                                {btn.letters && (<span className="text-[10px] text-muted-foreground mt-0.5 leading-none">{btn.letters}</span>)}
                                {btn.symbol && (<span className="text-[10px] text-muted-foreground mt-0.5 leading-none tracking-widest">{btn.symbol}</span>)}
                            </Button>
                        ))}
                    </div>

                    {/* Long press popup logic remains same but container ensures it's above */}
                    {longPressPopup && (
                        <div
                            className="fixed z-50 bg-popover border shadow-xl p-2 rounded-lg"
                            style={{ left: `${longPressPopup.x}px`, top: `${longPressPopup.y}px`, transform: 'translate(-50%, -100%)', marginTop: '-8px' }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-2">
                                {longPressPopup.button.letters && (
                                    <div className="flex gap-1 justify-center">
                                        {longPressPopup.button.letters.split('').map((letter) => (
                                            <Button key={letter} variant="secondary" size="sm" className="h-8 w-8 text-sm font-bold" onClick={() => handleLetterClick(letter)} >{letter}</Button>
                                        ))}
                                    </div>
                                )}
                                {longPressPopup.button.symbol && (
                                    <div className="flex gap-1 justify-center flex-wrap">
                                        {longPressPopup.button.symbol.split('').map((symbol) => (
                                            <Button key={symbol} variant="secondary" size="sm" className="h-8 w-8 text-sm font-bold" onClick={() => handleSymbolClick(symbol)} >{symbol}</Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    <div className="flex items-center justify-between pt-2">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShowOperators(!showOperators)} disabled={isCalling}>
                            {showOperators ? 'Hide' : 'Show'} Operators
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={handleClear} disabled={isCalling || !number} >
                            Clear Input
                        </Button>
                    </div>

                    {showOperators && (
                        <div className="border rounded-md p-2 bg-muted/40">
                            <div className="grid grid-cols-6 gap-1">
                                {operatorButtons.map((op) => (
                                    <Button key={op.value} variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSymbolClick(op.value)} disabled={isCalling} >{op.label}</Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        {!isCalling ? (
                            <Button className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-sm" onClick={handleCall} disabled={!number} >
                                <Phone className="h-5 w-5 mr-2" /> Call
                            </Button>
                        ) : (
                            <Button variant="destructive" className="flex-1 h-12 text-base font-semibold shadow-sm" onClick={handleHangup} >
                                <PhoneOff className="h-5 w-5 mr-2" /> End Call
                            </Button>
                        )}
                        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={handleBackspace} disabled={isCalling || !number} >
                            <Delete className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>

                    <audio ref={remoteAudioRef} autoPlay playsInline controls={false} style={{ display: 'none' }} />
                    {children}
                </div>
            </Card>

            {isCalling && selectedPort === 'sip' && (
                <div
                    className="fixed z-50 w-[380px] rounded-xl border-2 bg-card text-card-foreground shadow-2xl backdrop-blur-sm"
                    style={{ left: popupPos.x, top: popupPos.y }}
                >
                    <div
                        className="flex items-center justify-between px-5 py-3 rounded-t-xl bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-b-2 border-emerald-200 dark:border-emerald-800 cursor-move"
                        onMouseDown={onPopupMouseDown}
                    >
                        <div className="flex items-center gap-2.5 text-sm font-semibold">
                            {(() => {
                                const s = sipCallState
                                const dot = s === "RINGING" ? 'bg-amber-500 animate-pulse' : s === "IN_CALL" ? 'bg-emerald-500 animate-pulse' : s === "ENDING" ? 'bg-red-500' : 'bg-muted'
                                return (<> <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot} shadow-sm`} /> <span className="text-foreground">{s === "RINGING" ? "Ringing..." : s === "IN_CALL" ? "Connected" : s}</span> </>)
                            })()}
                        </div>
                        <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">Drag to move</div>
                    </div>
                    <div className="px-5 pt-4 pb-5">
                        <div className="text-center text-xl font-bold tracking-wide text-foreground">{number || "Unknown"}</div>
                        <div className="mt-1.5 text-center text-sm font-mono text-muted-foreground">{formatDuration(callDuration) || "00:00"}</div>
                        <div className="mt-5 grid grid-cols-4 gap-3 place-items-center">
                            <Button size="icon" variant={isMuted ? "default" : "outline"} className={`rounded-full h-11 w-11 transition-all hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-500 hover:bg-red-600' : ''}`} onClick={toggleMute} > {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} </Button>
                            <Button size="icon" variant={isOnHold ? "default" : "outline"} className={`rounded-full h-11 w-11 transition-all hover:scale-110 active:scale-95 ${isOnHold ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white' : 'hover:bg-primary/10 hover:border-primary/50'}`} onClick={toggleHold} > <Pause className="h-4 w-4" /> </Button>
                            <Button size="icon" variant="destructive" className="rounded-full h-14 w-14 transition-all hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl col-span-2" onClick={handleHangup} > <PhoneOff className="h-5 w-5" /> </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
