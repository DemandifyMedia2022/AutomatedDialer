import { Link, useLocation } from 'react-router-dom'
import { Home, FileText, Settings } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/csv', label: 'CSV Manager', icon: FileText },
  { href: '/campaigns', label: 'Campaigns', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()
  
  return (
    <aside className="w-60 border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-3">
        <nav className="bg-card border border-border rounded-lg p-3">
          <div className="font-semibold mb-2">Menu</div>
          <div className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = location.pathname === href
              return (
                <Link
                  key={href}
                  to={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </aside>
  )
}