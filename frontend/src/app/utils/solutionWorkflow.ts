import { Message } from '../types';

const ACCEPTED_KEYWORD_REGEX = /\baccepted\b/i;

export const isAcceptedSystemMessage = (message: Message): boolean => {
  if (!message.isSystemMessage) {
    return false;
  }

  const content = message.content?.trim();
  return Boolean(content && ACCEPTED_KEYWORD_REGEX.test(content));
};

export const hasAcceptedSolution = (messages: Message[]): boolean =>
  messages.some(isAcceptedSystemMessage);

export const getLatestStaffSolutionProposal = (messages: Message[]): Message | null => {
  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const message = messages[idx];
    if (message.senderRole === 'staff' && message.isSolutionProposal) {
      return message;
    }
  }
  return null;
};

export const getMessageNumericId = (message: Message): number | null => {
  if (typeof message.messageId === 'number' && Number.isFinite(message.messageId)) {
    return message.messageId;
  }

  if (typeof message.id === 'string') {
    const parsed = Number(message.id);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};
