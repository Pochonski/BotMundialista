import { ReactNode } from 'react'
import { AppError } from '@/infrastructure/errors/AppError'

interface ErrorInfo {
  message: string
  code?: string
  status?: number
  timestamp: number
}

interface ErrorHandlerOptions {
  logErrors?: boolean
  showToast?: boolean
  retryOnFailure?: boolean
  maxRetries?: number
}

class ErrorHandler {
  private static instance: ErrorHandler
  private options: ErrorHandlerOptions

  private constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      logErrors: true,
      showToast: false,
      retryOnFailure: false,
      maxRetries: 3,
      ...options,
    }
  }

  static getInstance(options?: ErrorHandlerOptions): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(options)
    }
    return ErrorHandler.instance
  }

  handle(error: unknown, customMessage?: string): ErrorInfo {
    const errorInfo: ErrorInfo = {
      message: 'Error desconocido',
      timestamp: Date.now(),
    }

    if (error instanceof AppError) {
      errorInfo.message = error.message
      errorInfo.code = error.code
      errorInfo.status = error.status
    } else if (error instanceof Error) {
      errorInfo.message = error.message
    } else if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>
      if (err.message && typeof err.message === 'string') {
        errorInfo.message = err.message
      }
    }

    if (this.options.logErrors) {
      console.error('[ERROR]', errorInfo)
    }

    return errorInfo
  }

  async handleWithRetry(error: unknown, fn: () => Promise<unknown>): Promise<unknown> {
    if (!this.options.retryOnFailure) {
      return fn()
    }

    let lastError = error
    for (let attempt = 1; attempt <= (this.options.maxRetries || 3); attempt++) {
      try {
        return await fn()
      } catch (e) {
        lastError = e
        if (this.options.logErrors) {
          console.warn(`[RETRY] Attempt ${attempt}/${this.options.maxRetries}`, e)
        }
      }
    }

    throw lastError
  }
}

export default ErrorHandler
