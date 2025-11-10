import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="font-bold text-primary tracking-wide">
            AI Dialer
          </Link>
          <div className="flex items-center gap-3">
            <nav>
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
