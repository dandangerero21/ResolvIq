import api from './api'
import { User } from '../app/types'

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  name: string
  password: string
  role: 'user' | 'staff'
  specialization?: string
}

export interface AuthResponse extends User {
  userId: number
  token?: string
}

interface SimpleMessageResponse {
  message: string
}

export type RegistrationOutcome = 'user_registered' | 'staff_application_submitted'

export interface RegistrationResult {
  outcome: RegistrationOutcome
  message: string
}

const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/users/login', {
        email,
        password,
      })

      const { token, ...userWithoutToken } = response.data
      if (token) {
        authService.setToken(token)
      } else {
        localStorage.removeItem('token')
      }

      // Store user in localStorage immediately after login
      authService.setUser(userWithoutToken as AuthResponse)
      return userWithoutToken as AuthResponse
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  },

  signup: async (data: SignupRequest): Promise<RegistrationResult> => {
    try {
      const response = await api.post<RegistrationResult>('/users/register', {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
        specialization: data.specialization || null,
      })
      return response.data
    } catch (error: any) {
      const msg =
        typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : error.response?.data?.message?.toString?.() || 'Signup failed'
      throw new Error(msg)
    }
  },

  requestPasswordReset: async (email: string): Promise<string> => {
    try {
      const response = await api.post<SimpleMessageResponse>('/users/password-reset/request', {
        email,
      })
      return response.data.message
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to request password reset')
    }
  },

  validatePasswordResetToken: async (token: string): Promise<string> => {
    try {
      const response = await api.get<SimpleMessageResponse>('/users/password-reset/validate', {
        params: { token },
      })
      return response.data.message
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Reset link is invalid or expired')
    }
  },

  completePasswordReset: async (token: string, newPassword: string): Promise<string> => {
    try {
      const response = await api.post<SimpleMessageResponse>('/users/password-reset/complete', {
        token,
        newPassword,
      })
      return response.data.message
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset password')
    }
  },

  getCurrentUser: (): AuthResponse | null => {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage is not available')
        return null
      }
      const user = localStorage.getItem('user')
      if (!user) {
        return null
      }
      const parsed = JSON.parse(user)
      console.log('Successfully retrieved user from localStorage')
      return parsed
    } catch (error) {
      console.error('Error retrieving user from localStorage:', error)
      // Clear corrupted data
      localStorage.removeItem('user')
      return null
    }
  },

  setToken: (token: string) => {
    try {
      localStorage.setItem('token', token)
    } catch (error) {
      console.error('Error setting token in localStorage:', error)
    }
  },

  setUser: (user: AuthResponse) => {
    try {
      localStorage.setItem('user', JSON.stringify(user))
      console.log('User stored in localStorage:', user)
    } catch (error) {
      console.error('Error storing user in localStorage:', error)
    }
  },

  logout: () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      console.log('User logged out - localStorage cleared')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  },
}

export default authService
