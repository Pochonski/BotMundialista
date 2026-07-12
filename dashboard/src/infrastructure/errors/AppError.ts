export class AppError extends Error {
  code: string
  status: number
  timestamp: number

  constructor(message: string, code: string, status: number = 0) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.timestamp = Date.now()
  }
}

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
}
