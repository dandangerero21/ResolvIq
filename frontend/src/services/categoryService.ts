import api from './api'

export interface Category {
  categoryId: number
  name: string
}

const categoryService = {
  createCategory: async (name: string): Promise<Category> => {
    const response = await api.post('/categories', { name })
    return response.data
  },

  getCategoryById: async (id: number): Promise<Category> => {
    const response = await api.get(`/categories/${id}`)
    return response.data
  },

  getAllCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories')
    return response.data
  },

  updateCategory: async (id: number, name: string): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, { name })
    return response.data
  },

  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`)
  },
}

export default categoryService
