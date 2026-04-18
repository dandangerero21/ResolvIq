import api from './api';

export interface User {
  userId: number;
  name: string;
  email: string;
  role: 'user' | 'staff' | 'admin';
  specialization?: string;
  transferredCount?: number;
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

  deleteAccount: async (userId: number, confirmationText: string): Promise<string> => {
    try {
      const response = await api.delete<{ message: string }>(`/users/${userId}`, {
        data: { confirmationText },
      });
      return response.data.message;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete account');
    }
  },
};

export default userService;
