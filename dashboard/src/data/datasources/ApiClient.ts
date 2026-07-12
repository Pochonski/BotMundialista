import { HttpClient } from '@/infrastructure/http/HttpClient'
import { API_BASE_URL } from '@/infrastructure/config'

export const apiClient = new HttpClient(API_BASE_URL)
