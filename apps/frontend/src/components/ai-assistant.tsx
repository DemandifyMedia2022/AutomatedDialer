"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

import { SparklesIcon, XIcon, SendIcon, Loader2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { FollowUpNotification } from "@/components/agent/FollowUpNotification"

interface Message {
    role: "user" | "assistant"
    content: string
}

interface AIAssistantProps {
    apiKey?: string
    userRole?: "agent" | "manager" | "superadmin" | "qa"
}

export default function AIAssistant({ apiKey, userRole }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    // Detect user role from pathname if not provided
    const detectedRole = userRole || (
        pathname?.includes("/agent") ? "agent" :
            pathname?.includes("/manager") ? "manager" :
                pathname?.includes("/superadmin") ? "superadmin" :
                    pathname?.includes("/qa") ? "qa" : "agent"
    )

    // Get current page context
    const pageContext = pathname?.split("/").pop() || "dashboard"

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: "user", content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    apiKey: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
                    context: {
                        role: detectedRole,
                        page: pageContext,
                        pathname: pathname,
                    },
                }),
            })

            if (!response.ok) throw new Error("Failed to get response")

            const data = await response.json()
            const assistantMessage: Message = {
                role: "assistant",
                content: data.message,
            }
            setMessages((prev) => [...prev, assistantMessage])
        } catch (error) {
            console.error("Error:", error)
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Suggested questions based on role and page
    const getSuggestedQuestions = () => {
        const suggestions: Record<string, string[]> = {
            agent: [
                "How do I start a manual dial?",
                "How do I view my call history?",
                "What are the different call dispositions?",
            ],
            manager: [
                "How do I create a new campaign?",
                "How do I track agent performance?",
                "How do I upload a playbook?",
            ],
            superadmin: [
                "How do I manage user accounts?",
                "How do I configure system settings?",
                "How do I view system analytics?",
            ],
            qa: [
                "How do I review call recordings?",
                "How do I access call transcripts?",
                "How do I generate quality reports?",
            ],
        }
        return suggestions[detectedRole] || suggestions.agent
    }

    if (!isOpen) {
        return (
            <div className="flex items-center gap-2">
                {detectedRole === 'agent' && <FollowUpNotification />}
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="outline"
                    className="gap-2"
                >
                    <SparklesIcon size={16} />
                    <span>Assistant</span>
                </Button>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 dark:bg-black/60 md:p-4">
            <div className="bg-background h-screen w-full md:h-full md:w-[420px] flex flex-col md:rounded-lg shadow-2xl border border-border">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <SparklesIcon size={20} className="text-blue-600" />
                        <div>
                            <h2 className="text-sm font-semibold">AI Assistant</h2>
                            <p className="text-xs text-muted-foreground capitalize">{detectedRole} Dashboard</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="h-8 w-8"
                    >
                        <XIcon size={18} />
                    </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col h-full">
                            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                                <SparklesIcon size={48} className="text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">How can I help you?</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    I can help you navigate the dialer, explain features, and guide you through tasks.
                                </p>
                            </div>

                            {/* Suggested Questions */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Suggested questions:</p>
                                {getSuggestedQuestions().map((question, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setInput(question)
                                            handleSend()
                                        }}
                                        className="w-full text-left text-sm p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-lg px-4 py-2 ${message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-lg px-4 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                    <div className="flex gap-2">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything..."
                            className="min-h-[60px] max-h-[120px] resize-none"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="h-[60px] w-[60px]"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <SendIcon size={18} />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        AI can make mistakes. Verify important information.
                    </p>
                </div>
            </div>
        </div>
    )
}
