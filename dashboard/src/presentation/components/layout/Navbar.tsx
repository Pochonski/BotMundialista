import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PlayerSearch } from '@/presentation/components/explorer/PlayerSearch'

const NAV_ITEMS = [
  { id: 'live', label: 'En Vivo', route: '/' },
  { id: 'matches', label: 'Partidos', route: '/' },
  { id: 'standings', label: 'Tabla', route: '/competicion' },
  { id: 'stats', label: 'Estadísticas', route: '/analisis' },
  { id: 'news', label: 'Noticias', route: '/noticias' },
] as const

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.route === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.route)
  }

  const handleNavigate = (item: (typeof NAV_ITEMS)[number]) => {
    navigate(item.route)
  }

  return (
    <header className="bg-bg-base/80 border-border-card fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
        <button
          onClick={() => navigate('/')}
          className="focus-visible flex shrink-0 items-center gap-2"
          aria-label="ScoreHub inicio"
        >
          <span className="text-accent-gold font-display text-2xl font-bold tracking-wide">SCOREHUB</span>
          <span className="text-text-muted font-body hidden text-xs font-light sm:inline">
            Mundial 2026
          </span>
        </button>

        {/* Navegación desktop (md+). En mobile se usa el BottomNav. */}
        <nav
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
          role="navigation"
          aria-label="Secciones principales"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item)}
              className={`font-body focus-visible rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive(item)
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-muted hover:bg-bg-card hover:text-text-primary'
              }`}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* PlayerSearch: desktop inline, mobile via icon toggle. */}
        <div className="hidden shrink-0 md:block">
          <PlayerSearch />
        </div>

        {/* Botón search en mobile: abre PlayerSearch debajo del header. */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="focus-visible hover:bg-bg-card -mr-2 rounded-lg p-2.5 md:hidden"
          aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar jugador'}
          aria-expanded={searchOpen}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Panel de búsqueda desplegable en mobile. */}
      {searchOpen && (
        <div className="bg-bg-card border-border-card animate-fade-in-up border-b px-4 py-3 md:hidden">
          <PlayerSearch onSelect={() => setSearchOpen(false)} />
        </div>
      )}
    </header>
  )
}
