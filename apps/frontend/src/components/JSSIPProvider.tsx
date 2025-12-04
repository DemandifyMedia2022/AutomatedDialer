import Script from 'next/script'
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    JsSIP?: any
  }
}

export default function JSSIPProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkJSSIP = () => {
      if (window.JsSIP) {
        console.log('[JSSIP] Global provider: JsSIP loaded successfully')
        setIsLoaded(true)
        setError(null)
      } else {
        console.log('[JSSIP] Global provider: JsSIP not yet available')
      }
    }

    // Check immediately
    checkJSSIP()

    // Set up interval to check
    const interval = setInterval(checkJSSIP, 500)

    // Clear interval after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!window.JsSIP) {
        setError('JSSIP failed to load')
      }
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <>
      <Script
        src="/js/jssip.min.js"
        strategy="beforeInteractive"
        onError={() => {
          console.error('[JSSIP] Script loading failed')
          setError('Failed to load JSSIP script')
        }}
        onLoad={() => {
          console.log('[JSSIP] Script loaded, waiting for initialization...')
        }}
      />
      
      {children}
    </>
  )
}
