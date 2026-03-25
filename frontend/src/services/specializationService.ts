import api from './api';

export interface Specialization {
  specializationId: number;
  name: string;
  description: string;
}

const specializationService = {
  getAllSpecializations: async (): Promise<Specialization[]> => {
    const response = await api.get('/specializations');
    return response.data;
  },

  getSpecializationById: async (id: number): Promise<Specialization> => {
    const response = await api.get(`/specializations/${id}`);
    return response.data;
  },

  createSpecialization: async (specialization: Omit<Specialization, 'specializationId'>): Promise<Specialization> => {
    const response = await api.post('/specializations', specialization);
    return response.data;
  },

  updateSpecialization: async (id: number, specialization: Omit<Specialization, 'specializationId'>): Promise<Specialization> => {
    const response = await api.put(`/specializations/${id}`, specialization);
    return response.data;
  },

  deleteSpecialization: async (id: number): Promise<void> => {
    await api.delete(`/specializations/${id}`);
  },
};

export default specializationService;
