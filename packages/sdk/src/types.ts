export interface ApiConfig {
  apiUrl: string
  apiKey: string
}

export interface CreditInfo {
  balance?: number
  monthlyRemaining?: number
  totalAvailable?: number
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface ToolEndpoint {
  method: HttpMethod
  path: string
  pathParams?: string[]
}

export interface ApiResult {
  data: unknown
  credits?: CreditInfo
}

export interface ApiErrorBody {
  error?: string
  message?: string
}

export interface LocalToolContentBlock {
  type: 'text'
  text: string
}

export interface LocalToolResult {
  content: LocalToolContentBlock[]
  isError?: boolean
  [key: string]: unknown
}
