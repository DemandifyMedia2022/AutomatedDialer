"use client"

import { useEffect } from 'react'

export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress specific console errors
    const originalConsoleError = console.error
    
    console.error = (...args: any[]) => {
      const message = args[0]
      
      // Suppress specific error messages
      if (
        typeof message === 'string' && (
          message.includes('Expected moveto path command') ||
          message.includes('WebSocket connection to') ||
          message.includes('Invalid frame header') ||
          message.includes('401 Unauthorized') ||
          message.includes('Input elements should have autocomplete attributes')
        )
      ) {
        return // Don't log these specific errors
      }
      
      // Log other errors normally
      originalConsoleError.apply(console, args)
    }
    
    // Suppress specific console warnings
    const originalConsoleWarn = console.warn
    
    console.warn = (...args: any[]) => {
      const message = args[0]
      
      // Suppress specific warning messages
      if (
        typeof message === 'string' && (
          message.includes('WebSocket connection to') ||
          message.includes('Invalid frame header') ||
          message.includes('[useAgentPresence] Socket connection error') ||
          message.includes('[useAgentPresence] Max reconnection attempts reached') ||
          message.includes('Added non-passive event listener to a scroll-blocking') ||
          message.includes('Forced reflow while executing JavaScript') ||
          message.includes("'message' handler took")
        )
      ) {
        return // Don't log these specific warnings
      }
      
      // Log other warnings normally
      originalConsoleWarn.apply(console, args)
    }
    
    // Suppress specific console logs
    const originalConsoleLog = console.log
    
    console.log = (...args: any[]) => {
      const message = args[0]
      
      // Suppress specific log messages
      if (
        typeof message === 'string' && (
          message.includes('Download the React DevTools') ||
          message.includes('[HMR] connected') ||
          message.includes('[Fast Refresh] rebuilding') ||
          message.includes('[Fast Refresh] done') ||
          message.includes('All calls:') ||
          message.includes('Filtered follow-ups:')
        )
      ) {
        return // Don't log these specific messages
      }
      
      // Log other messages normally
      originalConsoleLog.apply(console, args)
    }
    
    return () => {
      // Restore original console methods on cleanup
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      console.log = originalConsoleLog
    }
  }, [])
  
  return null // This component doesn't render anything
}
