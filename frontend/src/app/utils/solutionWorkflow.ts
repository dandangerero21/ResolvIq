import { Message } from '../types';

const ACCEPTED_KEYWORD_REGEX = /\baccepted\b/i;
const REJECTED_KEYWORD_REGEX = /(didn't work|did not resolve|solution rejected)/i;

export const isAcceptedSystemMessage = (message: Message): boolean => {
  if (!message.isSystemMessage) {
    return false;
  }

  const content = message.content?.trim();
  return Boolean(content && ACCEPTED_KEYWORD_REGEX.test(content));
};

export const hasAcceptedSolution = (messages: Message[]): boolean =>
  messages.some(isAcceptedSystemMessage);

export const isRejectedSystemMessage = (message: Message): boolean => {
  if (!message.isSystemMessage) {
    return false;
  }

  const content = message.content?.trim();
  return Boolean(content && REJECTED_KEYWORD_REGEX.test(content));
};

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

export const hasRejectedLatestStaffSolutionProposal = (messages: Message[]): boolean => {
  let latestProposalIndex = -1;

  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const message = messages[idx];
    if (message.senderRole === 'staff' && message.isSolutionProposal) {
      latestProposalIndex = idx;
      break;
    }
  }

  if (latestProposalIndex < 0) {
    return false;
  }

  for (let idx = messages.length - 1; idx > latestProposalIndex; idx -= 1) {
    if (isRejectedSystemMessage(messages[idx])) {
      return true;
    }
  }

  return false;
};
