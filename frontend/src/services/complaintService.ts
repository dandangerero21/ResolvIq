import api from './api'
import { Complaint } from '../app/types'

// Helper function to normalize complaint data from backend
const normalizeComplaint = (complaint: any): Complaint => {
  return {
    ...complaint,
    id: complaint.id || complaint.complaintId?.toString(),
    complaintId: complaint.complaintId || Number(complaint.id),
    customCategory: complaint.customCategory ?? complaint.custom_category ?? undefined,
    categoryName: complaint.categoryName ?? complaint.category_name ?? undefined,
    ratingFeedback: complaint.ratingFeedback ?? complaint.rating_feedback ?? undefined,
    assignmentCount: complaint.assignmentCount ?? complaint.assignment_count ?? 0,
    reassignmentCount: complaint.reassignmentCount ?? complaint.reassignment_count ?? 0,
    transferCount: complaint.transferCount ?? complaint.transfer_count ?? 0,
    transferredByStaffId: complaint.transferredByStaffId ?? complaint.transferred_by_staff_id ?? undefined,
    transferredByStaffName: complaint.transferredByStaffName ?? complaint.transferred_by_staff_name ?? undefined,
  }
}

const normalizeComplaints = (complaints: any[]): Complaint[] => {
  return complaints.map(normalizeComplaint)
}

const complaintService = {
  createComplaint: async (
    title: string,
    description: string,
    categoryId: number | null,
    userId: number,
    priority?: string,
    customCategory?: string | null
  ): Promise<Complaint> => {
    const response = await api.post('/complaints', {
      title,
      description,
      categoryId,
      priority: priority || 'Medium',
      ...(customCategory?.trim() ? { customCategory: customCategory.trim() } : {}),
    }, {
      params: { userId }
    })
    return normalizeComplaint(response.data)
  },

  getComplaintById: async (id: number): Promise<Complaint> => {
    const response = await api.get(`/complaints/${id}`)
    return normalizeComplaint(response.data)
  },

  getUserComplaints: async (userId: number): Promise<Complaint[]> => {
    const response = await api.get(`/complaints/user/${userId}`)
    return normalizeComplaints(response.data)
  },

  getComplaintsByStatus: async (status: string): Promise<Complaint[]> => {
    const response = await api.get(`/complaints/status/${status}`)
    return normalizeComplaints(response.data)
  },

  getAllComplaints: async (): Promise<Complaint[]> => {
    const response = await api.get('/complaints')
    return normalizeComplaints(response.data)
  },

  updateComplaintStatus: async (id: number, status: string): Promise<Complaint> => {
    const response = await api.put(`/complaints/${id}/status`, {}, {
      params: { status }
    })
    return normalizeComplaint(response.data)
  },

  deleteComplaint: async (id: number): Promise<void> => {
    await api.delete(`/complaints/${id}`)
  },
}

export default complaintService
