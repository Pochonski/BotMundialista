import React, { Component, ReactNode } from 'react'
import ErrorHandler from './ErrorHandler'

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
  errorCode?: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (errorInfo: { message: string; code?: string }) => void
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const errorHandler = ErrorHandler.getInstance()
    const errorInfo = errorHandler.handle(error)

    return {
      hasError: true,
      errorMessage: errorInfo.message,
      errorCode: errorInfo.code,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorHandler = ErrorHandler.getInstance()
    const errorDetails = errorHandler.handle(error)

    if (this.props.onError) {
      this.props.onError({
        message: errorDetails.message,
        code: errorDetails.code,
      })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-base">
          <div className="max-w-md w-full bg-bg-card rounded-xl border border-border-card p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-red/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="font-display text-xl font-bold text-text-primary mb-2">
                Lo sentimos, algo salió mal
              </h1>
              <p className="font-body text-text-muted mb-6">
                Ocurrió un error inesperado.
              </p>
              {this.state.errorCode && (
                <p className="font-mono text-xs text-text-dim mb-4">
                  Error: {this.state.errorCode}
                </p>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-accent-blue/10 text-accent-blue font-body font-medium hover:bg-accent-blue/20 transition-colors focus-visible"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
