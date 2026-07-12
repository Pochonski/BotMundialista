type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: Record<string, unknown>
  timestamp: number
  source?: string
}

class Logger {
  private static instance: Logger
  private enabled = true

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, source?: string) {
    if (!this.enabled) return

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      source,
    }

    const prefix = source ? `[${source}]` : ''

    switch (level) {
      case 'error':
        console.error(`${prefix} [ERROR] ${message}`, data || '')
        break
      case 'warn':
        console.warn(`${prefix} [WARN] ${message}`, data || '')
        break
      case 'debug':
        console.debug(`${prefix} [DEBUG] ${message}`, data || '')
        break
      default:
        console.log(`${prefix} [INFO] ${message}`, data || '')
    }
  }

  info(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('info', message, data, source)
  }

  warn(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('warn', message, data, source)
  }

  error(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('error', message, data, source)
  }

  debug(message: string, data?: Record<string, unknown>, source?: string) {
    this.log('debug', message, data, source)
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
}

export const logger = Logger.getInstance()
