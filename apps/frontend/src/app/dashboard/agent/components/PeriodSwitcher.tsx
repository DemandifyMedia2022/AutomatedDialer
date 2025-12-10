import React from 'react'

interface SwitcherProps {
    value: 'daily' | 'monthly'
    onChange: (value: 'daily' | 'monthly') => void
}

export function PeriodSwitcher({ value, onChange }: SwitcherProps) {
    return (
        <div className="relative grid grid-cols-2 h-9 w-fit min-w-[160px] items-center rounded-lg bg-muted p-1 text-muted-foreground">
            <div
                className="absolute inset-y-1 rounded-md bg-primary shadow-sm transition-all duration-300 ease-in-out"
                style={{
                    width: 'calc(50% - 4px)',
                    left: '4px',
                    transform: value === 'monthly' ? 'translateX(100%)' : 'translateX(0)'
                }}
            />
            <button
                onClick={() => onChange('daily')}
                className={`relative z-10 flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${value === 'daily' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                Daily
            </button>
            <button
                onClick={() => onChange('monthly')}
                className={`relative z-10 flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${value === 'monthly' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                Monthly
            </button>
        </div>
    )
}
