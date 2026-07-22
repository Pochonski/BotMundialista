import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'
import { ErrorBoundary } from '@/infrastructure/errors'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <ErrorBoundary>
      {/* min-h-dvh respeta la URL bar dinámica de iOS Safari. */}
      <div className="flex min-h-dvh flex-col">
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>

        <Navbar />

        {/*
          pb-20 en mobile deja espacio para el BottomNav fijo (h-16 + safe area).
          En md+ el BottomNav desaparece, vuelve a pb-0.
        */}
        <main id="main-content" className="flex-1 pb-20 pt-14 md:pb-0" role="main">
          {children}
        </main>

        <Footer />

        <BottomNav />
      </div>
    </ErrorBoundary>
  )
}
