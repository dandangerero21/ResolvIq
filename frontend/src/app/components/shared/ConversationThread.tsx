import { useState, useLayoutEffect, useRef, useCallback } from 'react';
import { Message, Complaint } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Send, CheckCircle2, Lock, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';

interface ConversationThreadProps {
  complaint: Complaint;
  messages: Message[];
  onSendMessage: (content: string, isSolutionProposal?: boolean) => void;
  onEndConversation?: () => void;
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
  onSolutionAccepted,
  onSolutionRejected,
  isStaff = false,
  isConversationEnded = false,
  conversationEndedBy = 'staff',
  solutionAccepted = false,
  dismissedSolutionId = null,
}: ConversationThreadProps) {
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [markAsSolution, setMarkAsSolution] = useState(false);
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

  const isResolved = complaint.status === 'Resolved';
  const isCancelled = complaint.status === 'Cancelled';
  const isClosed = complaint.status === 'Resolved' || isConversationEnded;

  const handleSend = () => {
    if (!newMessage.trim()) return;
    pendingScrollFromOwnSendRef.current = true;
    onSendMessage(newMessage.trim(), markAsSolution);
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
                  const isAccepted = message.content?.includes('accepted');
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="max-w-sm w-full">
                        <div className={cn(
                          'border-t px-4 py-3 rounded-lg',
                          isAccepted
                            ? 'border-green-200 bg-green-50'
                            : 'border-amber-200 bg-amber-50'
                        )}>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className={cn('w-5 h-5 flex-shrink-0 mt-0.5', isAccepted ? 'text-green-600' : 'text-amber-600')} />
                            <div className="flex-1">
                              <p className={cn('text-sm', isAccepted ? 'text-green-900' : 'text-amber-900')} style={{ fontWeight: 600 }}>
                                {isAccepted ? 'Solution Accepted' : "Solution didn't work"}
                              </p>
                              <p className={cn('text-xs mt-1', isAccepted ? 'text-green-700' : 'text-amber-700')}>{message.content}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Handle both string and number IDs - normalize to strings for comparison
                const messageId = String(message.senderId);
                const currentId = String(currentUser?.userId || currentUser?.id || '');
                const isOwn = messageId === currentId;
                const isStaffMessage = message.senderRole === 'staff';
                const senderName = isStaffMessage ? `${message.senderName} - Staff` : message.senderName;
                if (message.isSolutionProposal) {
                  console.debug('Message with solution proposal:', message);
                }
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
                        {message.senderName.charAt(0)}
                      </div>
                      <span className="text-xs text-white/60">{senderName}</span>
                      <span className="text-xs text-white/40">{formatTime(message.timestamp)}</span>
                    </div>

                    {/* Solution Proposal Badge */}
                    {message.isSolutionProposal && (
                      <div className={cn('flex items-center gap-1.5 mb-1', isOwn ? 'mr-8' : 'ml-8')}>
                        <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-2.5 py-0.5">
                          <Lightbulb className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-300" style={{ fontWeight: 600 }}>Solution Proposal</span>
                        </div>
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={cn(
                        'max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                        isOwn
                          ? 'bg-black text-white rounded-bl-sm'
                          : 'bg-white/10 backdrop-blur text-white border border-white/20 rounded-br-sm',
                        message.isSolutionProposal && !isOwn && 'border-green-500/30 bg-green-500/10 text-green-300'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
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
      {!isStaff && !solutionAccepted && dismissedSolutionId === null && messages.some(m => m.isSolutionProposal && m.senderRole === 'staff') && !isResolved && !isClosed && (
        <div className="border-t border-green-200 bg-green-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-green-900" style={{ fontWeight: 600 }}>Does this solution work for you?</p>
              <p className="text-xs text-green-700 mt-1">Please let us know if the proposed solution resolved your issue.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onSolutionAccepted) {
                    onSolutionAccepted();
                  }
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
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
                className="flex-shrink-0 rounded-lg border border-green-600/80 bg-white px-3 py-1.5 text-xs text-green-900 shadow-sm transition-colors hover:border-green-700 hover:bg-green-50"
                style={{ fontWeight: 500 }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solution Accepted System Message */}
      {!isStaff && solutionAccepted && !isResolved && !isConversationEnded && (
        <div className="border-t border-green-200 bg-green-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-900" style={{ fontWeight: 600 }}>Solution Accepted</p>
              <p className="text-xs text-green-700 mt-1">Great! The issue has been resolved. You can continue messaging or mark this as solved when ready.</p>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Ended Banner (for user rating) */}
      {isConversationEnded && !isStaff && (
        <div className="border-t border-amber-200 bg-amber-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-900" style={{ fontWeight: 600 }}>
                {conversationEndedBy === 'user'
                  ? 'You ended this conversation'
                  : 'Conversation ended by staff'}
              </p>
              <p className="text-xs text-amber-700 mt-1">You can now rate your experience with the staff member's service.</p>
            </div>
          </div>
        </div>
      )}

      {/* End Conversation Banner */}
      {isConversationEnded && (
        <div className="border-t border-white/20 bg-white/5 backdrop-blur px-6 py-4 text-center">
          <p className="text-sm text-white/60" style={{ fontWeight: 500 }}>Conversation ended. No more messages can be sent.</p>
        </div>
      )}

      {/* Input Area */}
      {!isResolved && !isConversationEnded ? (
        <div className="border-t border-white/10 bg-black p-4">
          {/* Solution Proposal Toggle (Staff Only) */}
          {isStaff && (
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

          {/* End Conversation Button */}
          {!isConversationEnded && (
            <div className="flex items-center mb-3 border-t border-white/10 pt-3">
              <button
                onClick={() => setShowEndConfirmation(true)}
                className={cn(
                  'flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all',
                  solutionAccepted
                    ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                    : 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                )}
                style={{ fontWeight: 500 }}
              >
                <span>{solutionAccepted ? 'Mark as Solved' : 'End Conversation'}</span>
              </button>
              <span className="text-xs text-white/40 ml-2">{solutionAccepted ? '(Confirm resolution)' : ''}</span>
            </div>
          )}

          <div className="flex gap-3 items-end">
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
          <span>This conversation is closed — complaint resolved</span>
        </div>
      )}

      {/* End Conversation Confirmation Dialog */}
      {showEndConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-white/20 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-lg">
            <h2 className="text-lg text-white mb-2" style={{ fontWeight: 700 }}>
              {solutionAccepted ? 'Mark as Solved?' : 'End Conversation?'}
            </h2>
            <p className="text-sm text-white/60 mb-6">
              {solutionAccepted
                ? isStaff
                  ? "Mark this complaint as resolved since the solution worked."
                  : "Confirm that the issue has been resolved. You will then be able to rate the staff member's service."
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
                  if (onEndConversation) {
                    onEndConversation();
                  }
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-white text-sm transition-colors',
                  solutionAccepted ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                )}
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
