import { Message } from '../app/types'

export type ConversationViewerRole = 'user' | 'staff'

const STORAGE_PREFIX = 'conversation-last-read-v1'

const toMessageId = (message: Message): number | null => {
  if (typeof message.messageId === 'number' && Number.isFinite(message.messageId)) {
    return message.messageId
  }

  if (typeof message.id === 'string') {
    const parsed = Number(message.id)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const toViewerRole = (role: string | undefined): ConversationViewerRole | null => {
  if (role === 'user' || role === 'staff') {
    return role
  }
  return null
}

const buildStorageKey = (
  complaintId: number,
  viewerRole: ConversationViewerRole,
  viewerUserId: number
): string => {
  return `${STORAGE_PREFIX}:${viewerRole}:${viewerUserId}:${complaintId}`
}

const getLastReadMessageId = (
  complaintId: number,
  viewerRole: ConversationViewerRole,
  viewerUserId: number
): number => {
  if (typeof window === 'undefined') {
    return 0
  }

  const raw = window.localStorage.getItem(buildStorageKey(complaintId, viewerRole, viewerUserId))
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

const setLastReadMessageId = (
  complaintId: number,
  viewerRole: ConversationViewerRole,
  viewerUserId: number,
  messageId: number
): void => {
  if (typeof window === 'undefined') {
    return
  }

  const key = buildStorageKey(complaintId, viewerRole, viewerUserId)
  const current = Number(window.localStorage.getItem(key) ?? '0')
  if (!Number.isFinite(current) || messageId > current) {
    window.localStorage.setItem(key, String(messageId))
  }
}

const isCounterpartyMessage = (
  message: Message,
  viewerRole: ConversationViewerRole,
  viewerUserId: number
): boolean => {
  if (message.isSystemMessage) {
    return false
  }

  const senderId = Number(message.senderId)
  if (Number.isFinite(senderId) && senderId === viewerUserId) {
    return false
  }

  const senderRole = toViewerRole(message.senderRole)
  if (!senderRole) {
    return false
  }

  if (viewerRole === 'user') {
    return senderRole === 'staff'
  }

  return senderRole === 'user'
}

export const getConversationUnreadCount = ({
  complaintId,
  viewerRole,
  viewerUserId,
  messages,
}: {
  complaintId: number
  viewerRole: ConversationViewerRole
  viewerUserId: number
  messages: Message[]
}): number => {
  const lastReadMessageId = getLastReadMessageId(complaintId, viewerRole, viewerUserId)

  return messages.reduce((count, message) => {
    const messageId = toMessageId(message)
    if (messageId === null || messageId <= lastReadMessageId) {
      return count
    }

    return isCounterpartyMessage(message, viewerRole, viewerUserId) ? count + 1 : count
  }, 0)
}

export const markConversationAsRead = ({
  complaintId,
  viewerRole,
  viewerUserId,
  messages,
}: {
  complaintId: number
  viewerRole: ConversationViewerRole
  viewerUserId: number
  messages: Message[]
}): void => {
  const latestMessageId = messages.reduce((maxId, message) => {
    const messageId = toMessageId(message)
    if (messageId === null) {
      return maxId
    }
    return messageId > maxId ? messageId : maxId
  }, 0)

  if (latestMessageId > 0) {
    setLastReadMessageId(complaintId, viewerRole, viewerUserId, latestMessageId)
  }
}
