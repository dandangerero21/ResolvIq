import api from './api'

export interface Assignment {
  assignmentId: number
  complaintId: number
  assignedToId: number
  assignedToName: string
  assignedToSpecialization: string
}

const assignmentService = {
  assignComplaint: async (complaintId: number, staffId: number): Promise<Assignment> => {
    const response = await api.post('/assignments', {}, {
      params: { complaintId, staffId }
    })
    return response.data
  },

  transferComplaint: async (
    complaintId: number,
    fromStaffId: number,
    toStaffId: number
  ): Promise<Assignment> => {
    const response = await api.post('/assignments/transfer', {}, {
      params: { complaintId, fromStaffId, toStaffId }
    })
    return response.data
  },

  getStaffAssignments: async (staffId: number): Promise<Assignment[]> => {
    const response = await api.get(`/assignments/staff/${staffId}`)
    return response.data
  },

  getAssignmentByComplaintId: async (complaintId: number): Promise<Assignment> => {
    const response = await api.get(`/assignments/complaint/${complaintId}`)
    return response.data
  },

  deleteAssignment: async (id: number): Promise<void> => {
    await api.delete(`/assignments/${id}`)
  },
}

export default assignmentService
