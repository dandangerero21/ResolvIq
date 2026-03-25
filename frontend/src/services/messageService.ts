import api from './api'
import { Message } from '../app/types'

// Helper function to normalize message data from backend
const normalizeMessage = (message: any): Message => {
  return {
    ...message,
    id: message.id || message.messageId?.toString(),
    messageId: message.messageId || Number(message.id),
    senderRole: message.senderRole as any || 'user',
    isSolutionProposal: message.isSolutionProposal || false,
    isSystemMessage: message.isSystemMessage || false,
  }
}

const normalizeMessages = (messages: any[]): Message[] => {
  return messages.map(normalizeMessage)
}

const messageService = {
  createMessage: async (
    complaintId: number,
    userId: number,
    content: string,
    isSolutionProposal?: boolean
  ): Promise<Message> => {
    const response = await api.post(`/messages`, { 
      content, 
      isSolutionProposal: isSolutionProposal || false
    }, {
      params: {
        complaintId,
        userId,
      },
    })
    return normalizeMessage(response.data)
  },

  getComplaintMessages: async (complaintId: number): Promise<Message[]> => {
    const response = await api.get(`/messages/complaint/${complaintId}`)
    return normalizeMessages(response.data)
  },

  markAsSolved: async (id: number): Promise<Message> => {
    const response = await api.put(`/messages/${id}/solved`)
    return normalizeMessage(response.data)
  },

  deleteMessage: async (id: number): Promise<void> => {
    await api.delete(`/messages/${id}`)
  },

  rejectSolution: async (complaintId: number): Promise<Message> => {
    const response = await api.post(`/messages/${complaintId}/solution-rejected`)
    return normalizeMessage(response.data)
  },

  acceptSolution: async (complaintId: number): Promise<Message> => {
    const response = await api.post(`/messages/${complaintId}/solution-accepted`)
    return normalizeMessage(response.data)
  },
}

export default messageService
