import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-5 py-6 max-w-6xl pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}