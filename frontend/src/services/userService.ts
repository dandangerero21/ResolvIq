import api from './api';

export interface User {
  userId: number;
  name: string;
  email: string;
  role: 'user' | 'staff' | 'admin';
  specialization?: string;
}

const userService = {
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  },

  getStaffMembers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/users');
      return response.data.filter((user: User) => user.role === 'staff');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch staff members');
    }
  },

  getUserById: async (userId: number): Promise<User> => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user');
    }
  },
};

export default userService;
