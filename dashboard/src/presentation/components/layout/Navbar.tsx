import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlayerSearch } from '@/presentation/components/explorer/PlayerSearch'

const NAV_ITEMS = [
  { id: 'live', label: 'En Vivo', route: '/' },
  { id: 'matches', label: 'Partidos', route: '/' },
  { id: 'standings', label: 'Tabla', route: '/competicion' },
  { id: 'stats', label: 'Estadísticas', route: '/analisis' },
  { id: 'news', label: 'Noticias', route: '/analisis' },
] as const

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.route === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.route)
  }

  const handleNavigate = (item: typeof NAV_ITEMS[number]) => {
    navigate(item.route)
    setMobileOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-base/80 backdrop-blur-lg border-b border-border-card">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 focus-visible shrink-0"
        >
          <span className="text-accent-gold font-display text-2xl font-bold tracking-wide">
            MUNDIALISTA
          </span>
          <span className="text-text-muted font-body text-xs font-light hidden sm:inline">
            2026
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Secciones principales">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item)}
              className={`px-3 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200 focus-visible ${
                isActive(item)
                  ? 'text-accent-blue bg-accent-blue/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
              }`}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:block">
          <PlayerSearch />
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-bg-card focus-visible"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M5 5l10 10M15 5L5 15" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="fixed top-14 left-0 right-0 bg-bg-card border-b border-border-card z-50 md:hidden animate-fade-in-up"
            role="navigation"
            aria-label="Secciones principales"
          >
            <div className="p-4 space-y-3">
              <PlayerSearch />
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-body font-medium transition-all duration-200 focus-visible ${
                      isActive(item)
                        ? 'text-accent-blue bg-accent-blue/10'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
