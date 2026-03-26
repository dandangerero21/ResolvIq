import api from './api'

export type StaffApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface StaffApplicationView {
  id: number
  name: string
  email: string
  specialization: string
  status: StaffApplicationStatus
  createdAt: string
  reviewedAt: string | null
  reviewedByUserId: number | null
  adminNote: string | null
}

const staffApplicationService = {
  getPending: async (): Promise<StaffApplicationView[]> => {
    const res = await api.get<StaffApplicationView[]>('/staff-applications/pending')
    return res.data
  },

  approve: async (id: number, reviewerUserId?: number): Promise<StaffApplicationView> => {
    const res = await api.post<StaffApplicationView>(`/staff-applications/${id}/approve`, {
      reviewerUserId: reviewerUserId ?? null,
    })
    return res.data
  },

  reject: async (id: number, options?: { reviewerUserId?: number; note?: string }): Promise<StaffApplicationView> => {
    const res = await api.post<StaffApplicationView>(`/staff-applications/${id}/reject`, {
      reviewerUserId: options?.reviewerUserId ?? null,
      note: options?.note ?? null,
    })
    return res.data
  },
}

export default staffApplicationService
