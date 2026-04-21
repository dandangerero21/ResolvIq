import api from './api'
import { Message } from '../app/types'

const ISO_TIMESTAMP_WITH_TZ = /(Z|[+\-]\d{2}:?\d{2})$/i
const PH_TIMEZONE_OFFSET_SUFFIX = '+08:00'

const resolveImageUrl = (url: unknown): string | undefined => {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return undefined
  }

  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
    return url
  }

  const baseUrl = api.defaults.baseURL
  if (typeof baseUrl !== 'string' || baseUrl.startsWith('/')) {
    return url
  }

  const apiHost = baseUrl.replace(/\/api\/?$/, '')
  const normalizedPath = url.startsWith('/') ? url : `/${url}`
  return `${apiHost}${normalizedPath}`
}

const normalizeTimestamp = (timestamp: unknown): Date => {
  if (timestamp instanceof Date && !Number.isNaN(timestamp.getTime())) {
    return timestamp
  }

  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim()
    if (trimmed.length > 0) {
      // Backend LocalDateTime values are timezone-less. Interpret them as Philippine local time.
      const candidate = ISO_TIMESTAMP_WITH_TZ.test(trimmed)
        ? trimmed
        : `${trimmed}${PH_TIMEZONE_OFFSET_SUFFIX}`
      const parsed = new Date(candidate)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }

  if (typeof timestamp === 'number') {
    const parsed = new Date(timestamp)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return new Date()
}

// Helper function to normalize message data from backend
const normalizeMessage = (message: any): Message => {
  return {
    ...message,
    id: message.id || message.messageId?.toString(),
    messageId: message.messageId || Number(message.id),
    content: typeof message.content === 'string' ? message.content : '',
    imageUrl: resolveImageUrl(message.imageUrl),
    imageOriginalName: typeof message.imageOriginalName === 'string' ? message.imageOriginalName : undefined,
    imageMimeType: typeof message.imageMimeType === 'string' ? message.imageMimeType : undefined,
    replyToMessageId: typeof message.replyToMessageId === 'number' ? message.replyToMessageId : undefined,
    replyToContent: typeof message.replyToContent === 'string' ? message.replyToContent : undefined,
    replyToSenderName: typeof message.replyToSenderName === 'string' ? message.replyToSenderName : undefined,
    replyToImageUrl: resolveImageUrl(message.replyToImageUrl),
    replyToImageOriginalName:
      typeof message.replyToImageOriginalName === 'string' ? message.replyToImageOriginalName : undefined,
    senderRole: message.senderRole as any || 'user',
    timestamp: normalizeTimestamp(message.timestamp),
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
    isSolutionProposal?: boolean,
    imageFile?: File | null,
    replyToMessageId?: number | null
  ): Promise<Message> => {
    let response

    if (imageFile) {
      const formData = new FormData()
      if (content.trim().length > 0) {
        formData.append('content', content.trim())
      }
      formData.append('isSolutionProposal', String(Boolean(isSolutionProposal)))
      formData.append('image', imageFile)
      if (typeof replyToMessageId === 'number') {
        formData.append('replyToMessageId', String(replyToMessageId))
      }

      response = await api.post(`/messages/with-image`, formData, {
        params: {
          complaintId,
          userId,
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    } else {
      response = await api.post(
        `/messages`,
        {
          content,
          isSolutionProposal: isSolutionProposal || false,
          replyToMessageId: typeof replyToMessageId === 'number' ? replyToMessageId : null,
        },
        {
          params: {
            complaintId,
            userId,
          },
        }
      )
    }

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
