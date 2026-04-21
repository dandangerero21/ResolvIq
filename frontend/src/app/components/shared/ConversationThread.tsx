import { useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import { Message, Complaint } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Send, CheckCircle2, Lock, Lightbulb, AlertCircle, Paperclip, Reply, X } from 'lucide-react';
import { cn } from '../ui/utils';
import {
  getLatestStaffSolutionProposal,
  getMessageNumericId,
  hasRejectedLatestStaffSolutionProposal,
  isAcceptedSystemMessage,
} from '../../utils/solutionWorkflow';

const CHAT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const PHILIPPINE_TIME_ZONE = 'Asia/Manila';
const philippinesTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: PHILIPPINE_TIME_ZONE,
});
const philippinesDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: PHILIPPINE_TIME_ZONE,
});
const philippinesDateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: PHILIPPINE_TIME_ZONE,
});

interface ConversationThreadProps {
  complaint: Complaint;
  messages: Message[];
  onSendMessage: (
    content: string,
    isSolutionProposal?: boolean,
    imageFile?: File | null,
    replyToMessageId?: number | null
  ) => void | Promise<void>;
  onEndConversation?: () => void;
  onMarkAsSolved?: () => void;
  onSolutionAccepted?: () => void;
  onSolutionRejected?: () => void;
  isStaff?: boolean;
  isConversationEnded?: boolean;
  /** Who closed the thread from the customer's perspective (user "End conversation" vs staff). */
  conversationEndedBy?: 'user' | 'staff';
  solutionAccepted?: boolean;
  dismissedSolutionId?: number | null;
}

export function ConversationThread({
  complaint,
  messages,
  onSendMessage,
  onEndConversation,
  onMarkAsSolved,
  onSolutionAccepted,
  onSolutionRejected,
  isStaff = false,
  isConversationEnded = false,
  solutionAccepted = false,
  dismissedSolutionId = null,
}: ConversationThreadProps) {
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [markAsSolution, setMarkAsSolution] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [showSolutionAcceptanceConfirmation, setShowSolutionAcceptanceConfirmation] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUserNearBottomRef = useRef(true);
  const pendingScrollFromOwnSendRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const prevComplaintKeyRef = useRef<string | number | undefined>(undefined);

  const NEAR_BOTTOM_PX = 120;
  const complaintKey = complaint.complaintId ?? complaint.id ?? '';

  const updateNearBottomFromScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserNearBottomRef.current = dist < NEAR_BOTTOM_PX;
  }, []);

  /** Scroll only the messages pane — never `scrollIntoView`, which also scrolls the window and fights `position: fixed` shells. */
  const scrollMessagesPaneToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (behavior === 'smooth') {
      el.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollTop = top;
    }
  }, []);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    if (complaintKey !== prevComplaintKeyRef.current) {
      prevComplaintKeyRef.current = complaintKey;
      didInitialScrollRef.current = false;
      isUserNearBottomRef.current = true;
    }

    if (pendingScrollFromOwnSendRef.current) {
      pendingScrollFromOwnSendRef.current = false;
      scrollMessagesPaneToBottom('smooth');
      isUserNearBottomRef.current = true;
      return;
    }

    if (!didInitialScrollRef.current && messages.length > 0) {
      didInitialScrollRef.current = true;
      scrollMessagesPaneToBottom('auto');
      isUserNearBottomRef.current = true;
      return;
    }

    if (isUserNearBottomRef.current) {
      scrollMessagesPaneToBottom('auto');
    }
  }, [messages, complaintKey, scrollMessagesPaneToBottom]);

  const statusValue = complaint.status?.toLowerCase();
  const isResolved = statusValue === 'resolved';
  const isCancelled = statusValue === 'cancelled';
  const isClosed = isResolved || isCancelled || isConversationEnded;
  const canRateAfterClose =
    typeof complaint.assignedStaffId === 'number' && Number.isFinite(complaint.assignedStaffId);

  useEffect(() => {
    if (solutionAccepted && markAsSolution) {
      setMarkAsSolution(false);
    }
  }, [solutionAccepted, markAsSolution]);

  useEffect(() => {
    setReplyingToMessage(null);
  }, [complaintKey]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const clearSelectedImage = useCallback(() => {
    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
    setAttachmentError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedImagePreviewUrl]);

  const clearReplyTarget = useCallback(() => {
    setReplyingToMessage(null);
  }, []);

  const getReplyPreviewText = useCallback((message: Message): string => {
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (content.length > 0) {
      return content;
    }

    if (typeof message.imageOriginalName === 'string' && message.imageOriginalName.trim().length > 0) {
      return `Image: ${message.imageOriginalName}`;
    }

    if (typeof message.imageUrl === 'string' && message.imageUrl.trim().length > 0) {
      return 'Image attachment';
    }

    return 'Original message';
  }, []);

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const contentType = file.type.toLowerCase();
    if (!ALLOWED_CHAT_IMAGE_TYPES.has(contentType)) {
      setAttachmentError('Only JPG, PNG, WEBP, and GIF images are allowed.');
      event.target.value = '';
      return;
    }

    if (file.size > CHAT_IMAGE_MAX_SIZE_BYTES) {
      setAttachmentError('Image is too large. Maximum allowed size is 5 MB.');
      event.target.value = '';
      return;
    }

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImage(file);
    setSelectedImagePreviewUrl(URL.createObjectURL(file));
    setAttachmentError(null);
  };

  const handleSend = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage && !selectedImage) return;

    pendingScrollFromOwnSendRef.current = true;
    const canSendAsProposal = isStaff && !solutionAccepted && markAsSolution;
    const replyToMessageId =
      replyingToMessage && typeof replyingToMessage.messageId === 'number'
        ? replyingToMessage.messageId
        : null;

    onSendMessage(trimmedMessage, canSendAsProposal, selectedImage, replyToMessageId);
    setNewMessage('');
    setMarkAsSolution(false);
    clearReplyTarget();
    clearSelectedImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPhilippinesDateKey = (date: Date) => philippinesDateKeyFormatter.format(new Date(date));

  const formatTime = (date: Date) => {
    return philippinesTimeFormatter.format(new Date(date));
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dateKey = getPhilippinesDateKey(date);
    if (dateKey === getPhilippinesDateKey(today)) return 'Today';
    if (dateKey === getPhilippinesDateKey(yesterday)) return 'Yesterday';

    return philippinesDateLabelFormatter.format(new Date(date));
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const dateStr = formatDate(msg.timestamp);
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      grouped.push({ date: dateStr, messages: [msg] });
    }
  });

  const latestStaffProposal = getLatestStaffSolutionProposal(messages);
  const latestStaffProposalId = latestStaffProposal ? getMessageNumericId(latestStaffProposal) : null;
  const latestProposalAlreadyRejected = hasRejectedLatestStaffSolutionProposal(messages);
  const latestProposalDismissedLocally =
    dismissedSolutionId !== null && latestStaffProposalId !== null && dismissedSolutionId === latestStaffProposalId;
  const shouldShowSolutionPrompt =
    !isStaff &&
    !solutionAccepted &&
    !isClosed &&
    latestStaffProposal !== null &&
    !latestProposalAlreadyRejected &&
    !latestProposalDismissedLocally;

  const canSendMessage = newMessage.trim().length > 0 || selectedImage !== null;

  return (
    <div className="flex min-h-0 h-full flex-col bg-black">
      {/* Messages Area */}
      <div
        ref={messagesScrollRef}
        onScroll={updateNearBottomFromScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-6 bg-black p-4 sm:p-6"
      >
        {grouped.map(group => (
          <div key={group.date}>
            {/* Date Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40 px-2">{group.date}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {group.messages.map(message => {
                // Check if this is a system message
                if (message.isSystemMessage) {
                  const systemContent = message.content?.trim() ?? '';
                  const normalizedSystemContent = systemContent.toLowerCase();
                  const isAccepted = isAcceptedSystemMessage(message);
                  const isRejected =
                    !isAccepted &&
                    (normalizedSystemContent.includes("didn't work") ||
                      normalizedSystemContent.includes('did not resolve') ||
                      normalizedSystemContent.includes('solution rejected'));
                  const isAssignmentUpdate =
                    !isAccepted &&
                    !isRejected &&
                    (normalizedSystemContent.includes('reassigned') ||
                      normalizedSystemContent.includes('transferred') ||
                      normalizedSystemContent.includes('new staff') ||
                      normalizedSystemContent.includes('now handling your complaint'));

                  const systemTitle = isAccepted
                    ? 'Solution Accepted'
                    : isRejected
                      ? "Solution didn't work"
                      : isAssignmentUpdate
                        ? 'Assignment Updated'
                        : 'Conversation Update';
                  const hasDistinctSystemContent =
                    systemContent.length > 0 &&
                    systemContent.toLowerCase() !== systemTitle.toLowerCase();
                  const fallbackRejectedContent = isStaff
                    ? 'The customer said this proposal did not resolve the issue.'
                    : 'Thanks for the feedback. Please wait for another proposed fix.';
                  const fallbackAcceptedContent = isStaff
                    ? 'The customer accepted your proposed solution!'
                    : 'You accepted the proposed solution!';
                  const rawResolvedSystemContent = hasDistinctSystemContent
                    ? systemContent
                    : isAccepted
                      ? fallbackAcceptedContent
                      : isRejected
                        ? fallbackRejectedContent
                        : systemContent;
                  const resolvedSystemContent = isAccepted && rawResolvedSystemContent.length > 0
                    ? rawResolvedSystemContent.replace(/[.]+$/, '').concat('!')
                    : rawResolvedSystemContent;

                  const panelClass = isAccepted
                    ? 'border-emerald-400/35 bg-emerald-400/12 backdrop-blur'
                    : isRejected
                      ? 'border-red-400/35 bg-red-400/12 backdrop-blur'
                      : isAssignmentUpdate
                        ? 'border-sky-400/35 bg-sky-400/12 backdrop-blur'
                        : 'border-white/20 bg-white/5 backdrop-blur';
                  const iconClass = isAccepted
                    ? 'text-emerald-300'
                    : isRejected
                      ? 'text-red-300'
                      : isAssignmentUpdate
                        ? 'text-sky-300'
                        : 'text-white/60';
                  const titleClass = isAccepted
                    ? 'text-emerald-100'
                    : isRejected
                      ? 'text-red-100'
                      : isAssignmentUpdate
                        ? 'text-sky-100'
                        : 'text-white/90';
                  const bodyClass = isAccepted
                    ? 'text-emerald-200/85'
                    : isRejected
                      ? 'text-red-200/85'
                      : isAssignmentUpdate
                        ? 'text-sky-200/85'
                        : 'text-white/70';

                  const SystemIcon = isRejected ? AlertCircle : CheckCircle2;
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="max-w-sm w-full">
                        <div className={cn('border-t px-4 py-3 rounded-lg', panelClass)}>
                          <div className="flex items-start gap-3">
                            <SystemIcon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconClass)} />
                            <div className="flex-1">
                              <p className={cn('text-sm', titleClass)} style={{ fontWeight: 600 }}>
                                {systemTitle}
                              </p>
                              {resolvedSystemContent.length > 0 && (
                                <p className={cn('text-xs mt-1 break-words [overflow-wrap:anywhere] whitespace-pre-wrap', bodyClass)}>
                                  {resolvedSystemContent}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Handle both string and number IDs - normalize to strings for comparison
                const messageId = String(message.senderId ?? '');
                const currentId = String(currentUser?.userId || currentUser?.id || '');
                const isOwn = messageId === currentId;
                const isStaffMessage = message.senderRole === 'staff';
                const baseSenderName =
                  typeof message.senderName === 'string' && message.senderName.trim().length > 0
                    ? message.senderName.trim()
                    : 'Deleted account';
                const senderName = isStaffMessage ? `${baseSenderName} - Staff` : baseSenderName;
                const senderInitial = baseSenderName.charAt(0).toUpperCase();
                const hasImageAttachment =
                  typeof message.imageUrl === 'string' && message.imageUrl.trim().length > 0;
                const hasTextContent =
                  typeof message.content === 'string' && message.content.trim().length > 0;
                const hasReplyReference = typeof message.replyToMessageId === 'number';
                const hasReplyImage =
                  typeof message.replyToImageUrl === 'string' && message.replyToImageUrl.trim().length > 0;
                const replySenderName =
                  typeof message.replyToSenderName === 'string' && message.replyToSenderName.trim().length > 0
                    ? message.replyToSenderName.trim()
                    : 'Replied message';
                const replyContent =
                  typeof message.replyToContent === 'string' && message.replyToContent.trim().length > 0
                    ? message.replyToContent.trim()
                    : typeof message.replyToImageOriginalName === 'string' &&
                        message.replyToImageOriginalName.trim().length > 0
                      ? `Image: ${message.replyToImageOriginalName}`
                      : hasReplyImage
                        ? 'Image attachment'
                        : 'Original message';
                return (
                  <div
                    key={message.id}
                    className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
                  >
                    {/* Sender info */}
                    <div className={cn('flex items-center gap-2 mb-1.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0',
                        isOwn ? 'bg-black' : isStaffMessage ? 'bg-amber-500' : 'bg-red-500'
                      )} style={{ fontSize: '10px', fontWeight: 700 }}>
                        {senderInitial}
                      </div>
                      <span className="text-xs text-white/60">{senderName}</span>
                      <span className="text-xs text-white/40">{formatTime(message.timestamp)}</span>
                    </div>

                    <div className={cn('w-full flex', isOwn ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[72%] min-w-0 flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                        {/* Solution Proposal Badge */}
                        {message.isSolutionProposal && (
                          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/20 px-2.5 py-0.5">
                            <Lightbulb className="h-3 w-3 text-green-400" />
                            <span className="text-xs text-green-300" style={{ fontWeight: 600 }}>
                              Solution Proposal
                            </span>
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={cn(
                            'inline-block max-w-full px-4 py-3 rounded-2xl text-sm leading-relaxed border',
                            isOwn
                              ? 'bg-transparent border-white/20 text-white rounded-tr-sm'
                              : 'bg-white/10 backdrop-blur text-white border border-white/20 rounded-tl-sm',
                            message.isSolutionProposal && !isOwn && 'border-green-500/30 bg-green-500/10 text-green-300'
                          )}
                        >
                          {hasReplyReference && (
                            <div
                              className={cn(
                                'mb-2 rounded-lg border px-2.5 py-2 text-xs',
                                isOwn ? 'border-white/20 bg-white/10' : 'border-white/15 bg-black/20'
                              )}
                            >
                              <p className="text-white/65">{replySenderName}</p>
                              {hasReplyImage && (
                                <img
                                  src={message.replyToImageUrl}
                                  alt={message.replyToImageOriginalName || 'Replied image'}
                                  loading="lazy"
                                  className="mt-1 h-10 w-10 rounded object-cover"
                                />
                              )}
                              <p className="mt-1 line-clamp-2 break-words [overflow-wrap:anywhere] text-white/80">
                                {replyContent}
                              </p>
                            </div>
                          )}
                          {hasImageAttachment && (
                            <a
                              href={message.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={message.imageUrl}
                                alt={message.imageOriginalName || 'Uploaded chat image'}
                                loading="lazy"
                                className="max-h-72 w-auto max-w-full rounded-lg object-cover"
                              />
                            </a>
                          )}
                          {hasTextContent && (
                            <p className={cn(
                              'whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
                              hasImageAttachment && 'mt-2'
                            )}>
                              {message.content}
                            </p>
                          )}
                          {hasImageAttachment && message.imageOriginalName && (
                            <p className="mt-1 text-[11px] text-white/60 break-all">
                              {message.imageOriginalName}
                            </p>
                          )}
                        </div>

                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => setReplyingToMessage(message)}
                            className={cn(
                              'mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/80',
                              isOwn ? 'self-end' : 'self-start'
                            )}
                            aria-label="Reply to message"
                          >
                            <Reply className="h-3 w-3" />
                            <span>Reply</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-white/60">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation below</p>
          </div>
        )}
      </div>

      {/* Solution Proposal Banner (User Side) - Only show if solution not yet responded to */}
      {shouldShowSolutionPrompt && (
        <div className="border-t border-emerald-500/30 bg-emerald-950/35 px-6 py-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-emerald-100" style={{ fontWeight: 600 }}>Does this solution work for you?</p>
              <p className="text-xs mt-1 text-emerald-200/85">Please let us know if the proposed solution resolved your issue.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onSolutionAccepted) {
                    setShowSolutionAcceptanceConfirmation(true);
                  }
                }}
                className="flex-shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-black transition-colors hover:bg-emerald-400"
                style={{ fontWeight: 500 }}
              >
                Yes
              </button>
              <button
                onClick={() => {
                  if (onSolutionRejected) {
                    onSolutionRejected();
                  }
                }}
                className="flex-shrink-0 rounded-lg border border-emerald-400/70 bg-black/30 px-3 py-1.5 text-xs text-emerald-100 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-500/10"
                style={{ fontWeight: 500 }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solution Accepted System Message */}
      {!isStaff && solutionAccepted && !isClosed && (
        <div className="border-t border-emerald-500/30 bg-emerald-950/35 px-6 py-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm text-emerald-100" style={{ fontWeight: 600 }}>Solution Accepted</p>
              <p className="mt-1 text-xs text-emerald-200/85">Great! The issue has been resolved. You can continue messaging or mark this as solved when ready.</p>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Ended Banner (for user rating) */}
      {isConversationEnded && !isStaff && (
        <div className="border-t border-amber-300/30 bg-amber-200/10 px-6 py-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300/90" />
            <div className="flex-1">
              <p className="text-sm text-amber-100/90" style={{ fontWeight: 600 }}>
                Conversation ended
              </p>
              <p className="mt-1 text-xs text-amber-200/75">
                {canRateAfterClose
                  ? "You can now rate your experience with the staff member's service."
                  : 'Rating is unavailable because this complaint currently has no assigned staff member.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isClosed ? (
        <div className="border-t border-white/10 bg-black p-4">
          {/* Solution Proposal Toggle (Staff Only) */}
          {isStaff && !solutionAccepted && (
            <div className="flex items-center mb-3">
              <button
                type="button"
                onClick={() => setMarkAsSolution(!markAsSolution)}
                className={cn(
                  'flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all',
                  markAsSolution
                    ? 'bg-green-500/20 border-green-500/30 text-green-300'
                    : 'bg-white/10 border-white/20 text-white/60 hover:border-white/30'
                )}
              >
                <Lightbulb className={cn('w-3 h-3', markAsSolution ? 'text-green-400' : 'text-white/40')} />
                <span style={{ fontWeight: 500 }}>
                  {markAsSolution ? 'Marked as Solution Proposal' : 'Mark as Solution Proposal'}
                </span>
                {markAsSolution && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              </button>
            </div>
          )}

          {isStaff && solutionAccepted && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-400/12 px-3 py-2 text-xs text-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              <span style={{ fontWeight: 500 }}>
                Solution accepted. New solution proposals are locked.
              </span>
            </div>
          )}

          {/* End Conversation / Mark as Solved Button */}
          {!isClosed && (
            <div className="mb-3 flex items-center">
              {solutionAccepted ? (
                <button
                  onClick={() => setShowEndConfirmation(true)}
                  className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 transition-all hover:bg-emerald-500/20"
                  style={{ fontWeight: 500 }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mark as Solved</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowEndConfirmation(true)}
                  className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition-all hover:bg-red-500/20"
                  style={{ fontWeight: 500 }}
                >
                  <span>End Conversation</span>
                </button>
              )}
            </div>
          )}

          {replyingToMessage && (
            <div className="mb-3 rounded-xl border border-white/20 bg-white/5 p-2.5">
              <div className="flex items-start gap-2.5">
                <Reply className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/85" style={{ fontWeight: 500 }}>
                    Replying to {replyingToMessage.senderName || 'message'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-white/60 break-words [overflow-wrap:anywhere]">
                    {getReplyPreviewText(replyingToMessage)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearReplyTarget}
                  className="rounded-md border border-white/20 p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cancel reply"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {selectedImage && selectedImagePreviewUrl && (
            <div className="mb-3 rounded-xl border border-white/20 bg-white/5 p-2.5">
              <div className="flex items-start gap-3">
                <img
                  src={selectedImagePreviewUrl}
                  alt={selectedImage.name}
                  className="h-14 w-14 rounded-lg border border-white/15 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white/90" style={{ fontWeight: 500 }}>
                    {selectedImage.name}
                  </p>
                  <p className="mt-1 text-[11px] text-white/55">
                    {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="rounded-md border border-white/20 p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Remove selected image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {attachmentError && (
            <p className="mb-3 text-xs text-red-300">{attachmentError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-11 rounded-xl border border-white/20 bg-white/10 text-white/70 transition-colors hover:border-white/40 hover:text-white"
              aria-label="Attach image"
            >
              <Paperclip className="mx-auto h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageSelected}
            />

            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (optional if sending an image)"
                rows={1}
                className="w-full resize-none px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />
              {markAsSolution && (
                <div className="absolute right-3 bottom-3">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                </div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!canSendMessage}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                canSendMessage
                  ? markAsSolution
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                    : 'bg-black hover:bg-red-600 text-white shadow-sm'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/10 bg-white/5 backdrop-blur p-4 flex items-center justify-center gap-2 text-white/60 text-sm">
          <Lock className="w-4 h-4" />
          <span>This conversation is closed — complaint closed</span>
        </div>
      )}

      {/* End Conversation Confirmation Dialog */}
      {showSolutionAcceptanceConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-black p-6 shadow-lg">
            <h2 className="mb-2 text-lg text-white" style={{ fontWeight: 700 }}>
              Confirm Solution Acceptance
            </h2>
            <p className="mb-6 text-sm text-white/60">
              Are you sure this solution fully worked for your issue? If not, choose Not yet so staff can continue helping.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSolutionAcceptanceConfirmation(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
                style={{ fontWeight: 500 }}
              >
                Not yet
              </button>
              <button
                onClick={() => {
                  setShowSolutionAcceptanceConfirmation(false);
                  if (onSolutionAccepted) {
                    onSolutionAccepted();
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
                style={{ fontWeight: 500 }}
              >
                Yes, it worked
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-white/20 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-lg">
            <h2 className="text-lg text-white mb-2" style={{ fontWeight: 700 }}>
              {solutionAccepted ? 'Mark as Solved?' : 'End Conversation?'}
            </h2>
            <p className="text-sm text-white/60 mb-6">
              {solutionAccepted
                ? isStaff
                  ? 'This will mark the complaint as resolved and close the conversation.'
                  : 'This will mark the complaint as resolved. You can still rate the staff member\'s service.'
                : isStaff
                  ? "This will cancel the conversation. The complaint will not be marked as resolved."
                  : "This will end your conversation with the staff member. You can still rate their service."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEndConfirmation(false)}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndConfirmation(false);
                  if (solutionAccepted && onMarkAsSolved) {
                    onMarkAsSolved();
                  } else if (onEndConversation) {
                    onEndConversation();
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm text-white transition-colors ${
                  solutionAccepted
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                style={{ fontWeight: 500 }}
              >
                {solutionAccepted ? 'Mark as Solved' : 'End Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
