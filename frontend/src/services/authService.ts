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
}

const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post('/users/login', {
        email,
        password,
      })
      // Store user in localStorage immediately after login
      authService.setUser(response.data)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  },

  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/users/register', {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
        specialization: data.specialization || null,
      })
      // Store user in localStorage immediately after signup
      authService.setUser(response.data)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Signup failed')
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
