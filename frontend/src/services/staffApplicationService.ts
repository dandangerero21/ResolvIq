import api from './api'

export type StaffApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface StaffApplicationsUpdatedDetail {
  pendingCount: number
}

const STAFF_APPLICATIONS_UPDATED_EVENT = 'staff-applications-updated'

export const notifyPendingStaffApplicationsUpdated = (pendingCount: number): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<StaffApplicationsUpdatedDetail>(STAFF_APPLICATIONS_UPDATED_EVENT, {
      detail: { pendingCount },
    })
  )
}

export const subscribePendingStaffApplicationsUpdated = (
  callback: (pendingCount: number) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<StaffApplicationsUpdatedDetail>
    callback(customEvent.detail?.pendingCount ?? 0)
  }

  window.addEventListener(STAFF_APPLICATIONS_UPDATED_EVENT, listener)
  return () => window.removeEventListener(STAFF_APPLICATIONS_UPDATED_EVENT, listener)
}

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
