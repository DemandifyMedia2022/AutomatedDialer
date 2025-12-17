
import React from 'react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface SipNetworkToggleProps {
    mode: 'telxio' | 'gsm'
    onModeChange: (mode: 'telxio' | 'gsm') => void
    disabled?: boolean
}

export function SipNetworkToggle({ mode, onModeChange, disabled }: SipNetworkToggleProps) {
    return (
        <div className="flex items-center space-x-2 border px-3 py-1.5 rounded-lg bg-card text-card-foreground">
            <Switch
                id="sip-mode"
                checked={mode === 'gsm'}
                onCheckedChange={(checked) => onModeChange(checked ? 'gsm' : 'telxio')}
                disabled={disabled}
            />
            <Label htmlFor="sip-mode" className="text-sm font-medium cursor-pointer">
                {mode === 'gsm' ? 'GSM Network' : 'Default (Telxio)'}
            </Label>
        </div>
    )
}
