import { useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import { Message, Complaint } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Send, CheckCircle2, Lock, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';
import { isAcceptedSystemMessage } from '../../utils/solutionWorkflow';

interface ConversationThreadProps {
  complaint: Complaint;
  messages: Message[];
  onSendMessage: (content: string, isSolutionProposal?: boolean) => void;
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
  const [showSolutionAcceptanceConfirmation, setShowSolutionAcceptanceConfirmation] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
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

  const handleSend = () => {
    if (!newMessage.trim()) return;
    pendingScrollFromOwnSendRef.current = true;
    const canSendAsProposal = isStaff && !solutionAccepted && markAsSolution;
    onSendMessage(newMessage.trim(), canSendAsProposal);
    setNewMessage('');
    setMarkAsSolution(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
                          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {message.content}
                          </p>
                        </div>
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
      {!isStaff && !solutionAccepted && dismissedSolutionId === null && messages.some(m => m.isSolutionProposal && m.senderRole === 'staff') && !isClosed && (
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

          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message… (Enter to send)"
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
              disabled={!newMessage.trim()}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                newMessage.trim()
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
