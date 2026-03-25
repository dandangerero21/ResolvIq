import api from './api'

export interface Rating {
  ratingId: number
  score: number
  feedback: string
  complaintId: number
  staffId: number
  staffName: string
  userId: number
  userName: string
}

const ratingService = {
  createRating: async (
    complaintId: number,
    staffId: number,
    userId: number,
    score: number,
    feedback: string
  ): Promise<Rating> => {
    const response = await api.post('/ratings', {}, {
      params: { complaintId, staffId, userId, score, feedback }
    })
    return response.data
  },

  getStaffRatings: async (staffId: number): Promise<Rating[]> => {
    const response = await api.get(`/ratings/staff/${staffId}`)
    return response.data
  },

  getRatingByComplaintId: async (complaintId: number): Promise<Rating> => {
    const response = await api.get(`/ratings/complaint/${complaintId}`)
    return response.data
  },

  deleteRating: async (id: number): Promise<void> => {
    await api.delete(`/ratings/${id}`)
  },
}

export default ratingService
