import { API_BASE } from './api'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}

class SuperAdminApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'SuperAdminApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Fetch API utility with error handling and interceptors
 */
export async function fetchAPI<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  // Request interceptor - add default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for authentication
    })

    // Response interceptor - handle errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorData: any = null

      try {
        errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If response is not JSON, use status text
      }

      throw new SuperAdminApiError(
        errorMessage,
        response.status,
        errorData?.code
      )
    }

    // Parse JSON response
    const data = await response.json()
    
    // Handle API response format
    if (data.success === false) {
      throw new SuperAdminApiError(
        data.message || data.error || 'Request failed',
        response.status
      )
    }

    return data.data !== undefined ? data.data : data
  } catch (error) {
    // Re-throw SuperAdminApiError as-is
    if (error instanceof SuperAdminApiError) {
      throw error
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new SuperAdminApiError(
        'Network error: Unable to connect to server',
        0,
        'NETWORK_ERROR'
      )
    }

    // Handle other errors
    throw new SuperAdminApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * GET request helper
 */
export async function get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const queryString = params
    ? '?' + new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value)
          }
          return acc
        }, {} as Record<string, string>)
      ).toString()
    : ''

  return fetchAPI<T>(`${endpoint}${queryString}`, {
    method: 'GET',
  })
}

/**
 * POST request helper
 */
export async function post<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  })
}

/**
 * PUT request helper
 */
export async function put<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  })
}

/**
 * DELETE request helper
 */
export async function del<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  return fetchAPI<T>(endpoint, {
    method: 'DELETE',
    ...options,
  })
}

/**
 * PATCH request helper
 */
export async function patch<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  })
}

// Export error class for type checking
export { SuperAdminApiError }
