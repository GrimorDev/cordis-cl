import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// In-memory token store (never localStorage)
let accessToken: string | null = null
let refreshToken: string | null = null
let tokenFamily: string | null = null
let userId: string | null = null

export function setTokens(data: {
  accessToken: string
  refreshToken: string
  tokenFamily: string
  userId: string
}) {
  accessToken = data.accessToken
  refreshToken = data.refreshToken
  tokenFamily = data.tokenFamily
  userId = data.userId
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  tokenFamily = null
  userId = null
}

export function getAccessToken() {
  return accessToken
}

// Request interceptor - attach access token
api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response interceptor - auto refresh on 401
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken && userId) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          userId,
          refreshToken,
          tokenFamily,
        })

        const data = response.data
        setTokens({ ...data, userId: userId! })

        refreshQueue.forEach(cb => cb(data.accessToken))
        refreshQueue = []

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
