import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ConversationThread } from '../shared/ConversationThread';
import complaintService from '../../../services/complaintService';
import messageService from '../../../services/messageService';
import ratingService from '../../../services/ratingService';
import { Complaint, Message } from '../../types';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import {
  ArrowLeft,
  Star,
  AlertCircle,
  User,
  Calendar,
  Tag,
} from 'lucide-react';

const statusConfig: Record<string, any> = {
  'open': { label: 'Pending Review', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  'Open': { label: 'Pending Review', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  'assigned': { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  'In Progress': { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  'resolved': { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  'Resolved': { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  'cancelled': { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
  'Cancelled': { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
};

export function UserComplaintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { complaints, addMessage, resolveComplaint } = useApp();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  /** Tracks whether the user used "End conversation" vs staff resolving remotely (persisted in sessionStorage). */
  const [conversationEndedBy, setConversationEndedBy] = useState<'user' | 'staff'>('staff');
  const [solutionAccepted, setSolutionAccepted] = useState(false);
  const [dismissedSolutionId, setDismissedSolutionId] = useState<number | null>(null);
  const [hasSubmittedRating, setHasSubmittedRating] = useState(false);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Fetch complaint from backend
  useEffect(() => {
    const loadComplaint = async () => {
      try {
        // Try to fetch from backend using the ID
        if (id) {
          const backendComplaint = await complaintService.getComplaintById(Number(id));
          setComplaint(backendComplaint);
          const resolved =
            backendComplaint.status === 'resolved' || backendComplaint.status === 'Resolved';
          if (resolved && backendComplaint.complaintId) {
            setIsConversationEnded(true);
            const key = `complaint-ended-by-${backendComplaint.complaintId}`;
            setConversationEndedBy(sessionStorage.getItem(key) === 'user' ? 'user' : 'staff');
          }
        }
      } catch (error) {
        console.error('Failed to load complaint from backend:', error);
        // Fall back to finding in context
        const contextComplaint = complaints.find(c => 
          c.id === id || 
          c.complaintId?.toString() === id
        );
        setComplaint(contextComplaint || null);
        if (contextComplaint?.complaintId) {
          const resolved =
            contextComplaint.status === 'resolved' || contextComplaint.status === 'Resolved';
          if (resolved) {
            setIsConversationEnded(true);
            const key = `complaint-ended-by-${contextComplaint.complaintId}`;
            setConversationEndedBy(sessionStorage.getItem(key) === 'user' ? 'user' : 'staff');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadComplaint();
  }, [id]);

  // Fetch messages from backend and set up polling
  useEffect(() => {
    if (!complaint?.complaintId) return;

    const fetchData = async () => {
      try {
        // Fetch messages and complaint status
        const backendMessages = await messageService.getComplaintMessages(complaint.complaintId!);
        setMessages(backendMessages);
        
        // Try to fetch updated complaint status
        try {
          const updatedComplaint = await complaintService.getComplaintById(complaint.complaintId!);
          setComplaint(updatedComplaint);
          
          // Resolved on the server — attribute to user only if they used "End conversation" (see sessionStorage).
          if ((updatedComplaint.status === 'resolved' || updatedComplaint.status === 'Resolved') && !isConversationEnded) {
            setIsConversationEnded(true);
            const key = `complaint-ended-by-${complaint.complaintId}`;
            setConversationEndedBy(sessionStorage.getItem(key) === 'user' ? 'user' : 'staff');
          }
        } catch (complaintError) {
          // Log but don't crash - complaint might not exist in backend yet
          console.debug('Could not fetch updated complaint status:', complaintError);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    // Fetch immediately
    fetchData();

    // Set up polling every 2 seconds
    const interval = setInterval(fetchData, 2000);
    setPollInterval(interval);

    return () => clearInterval(interval);
  }, [complaint?.complaintId, isConversationEnded]);

  // This effect is no longer needed - we don't use the solution dialog anymore

  // Show rating screen when conversation is ended by the other party
  useEffect(() => {
    if (isConversationEnded && !showRating && !hasSubmittedRating) {
      setShowRating(true);
    }
  }, [isConversationEnded, showRating, hasSubmittedRating]);

  // Check if complaint already has a rating (user already rated it)
  useEffect(() => {
    if (complaint?.rating) {
      setHasSubmittedRating(true);
    }
  }, [complaint?.rating]);

  // Check if a new solution was proposed after user dismissed the previous one
  useEffect(() => {
    if (dismissedSolutionId !== null && solutionAccepted === false) {
      // Find the LATEST solution (last one in the array since messages are ordered by timestamp)
      const allSolutions = messages.filter(m => m.isSolutionProposal && m.senderRole === 'staff');
      const latestSolution = allSolutions[allSolutions.length - 1];
      if (latestSolution && latestSolution.messageId && latestSolution.messageId !== dismissedSolutionId) {
        // New solution was proposed, allow banner to appear again
        setDismissedSolutionId(null);
      }
    }
  }, [messages, dismissedSolutionId, solutionAccepted]);

  const handleSolutionAccepted = () => {
    if (complaint?.complaintId) {
      setSolutionAccepted(true);
      setDismissedSolutionId(null);
      
      // Send system message to backend to inform staff
      messageService.acceptSolution(complaint.complaintId).catch(error => {
        console.error('Failed to send acceptance message:', error);
      });
    }
  };

  const handleSolutionRejected = () => {
    // Find the LATEST solution (last one in the array since messages are ordered by timestamp)
    const allSolutions = messages.filter(m => m.isSolutionProposal && m.senderRole === 'staff');
    const latestSolution = allSolutions[allSolutions.length - 1];
    if (latestSolution?.messageId && complaint?.complaintId) {
      setDismissedSolutionId(latestSolution.messageId);
      
      // Send system message to backend to inform staff
      messageService.rejectSolution(complaint.complaintId).catch(error => {
        console.error('Failed to send rejection message:', error);
      });
    }
  };

  const handleSendMessage = async (content: string, isSolutionProposal?: boolean) => {
    if (!currentUser || !complaint?.complaintId) return;
    try {
      // Send message to backend first
      const newMessage = await messageService.createMessage(
        complaint.complaintId,
        Number(currentUser.userId) || Number(currentUser.id),
        content,
        isSolutionProposal
      );
      // Add to local state
      setMessages(prev => [...prev, newMessage]);
      // Also add to context for other parts of the app
      addMessage({
        id: newMessage.id || `msg-${Date.now()}`,
        complaintId: Number(complaint.id),
        senderId: Number(currentUser.id),
        senderName: currentUser.name,
        senderRole: currentUser.role,
        content,
        timestamp: new Date(),
        isSolutionProposal,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleSubmitRating = async () => {
    if (rating > 0 && complaint && currentUser) {
      try {
        // Get staffId from assignment or complaint
        const staffId = complaint.assignedStaffId || complaint.assignedStaffName;
        if (!staffId) {
          alert('Cannot submit rating: No staff member assigned to this complaint.');
          return;
        }
        // Submit rating to backend
        await ratingService.createRating(
          complaint.complaintId!,
          Number(staffId),
          Number(currentUser.userId) || Number(currentUser.id),
          rating,
          ratingFeedback.trim()
        );
        // Also update complaint status if not already done
        if (complaint.id) {
          resolveComplaint(complaint.id, rating);
        }
        setHasSubmittedRating(true);
        setShowRating(false);
        setRatingFeedback('');
      } catch (error) {
        console.error('Failed to submit rating:', error);
        alert('Failed to submit rating. Please try again.');
      }
    }
  };

  const handleEndConversation = async () => {
    if (!complaint?.complaintId) return;
    try {
      // Update complaint status to resolved
      await complaintService.updateComplaintStatus(complaint.complaintId, 'resolved');
      sessionStorage.setItem(`complaint-ended-by-${complaint.complaintId}`, 'user');
      setConversationEndedBy('user');
      setIsConversationEnded(true);
      setShowRating(true);
    } catch (error) {
      console.error('Failed to end conversation:', error);
      alert('Failed to end conversation. Please try again.');
    }
  };

  if (!complaint) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-white/60">Complaint not found</p>
      </div>
    );
  }

  const status = statusConfig[complaint.status] || statusConfig['open'];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-black px-4 py-4 sm:px-8 sm:py-5">
        <button
          onClick={() => navigate('/user/dashboard')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${status.className}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>
              <span className="text-xs bg-white/10 border border-white/20 text-white/60 px-2 py-0.5 rounded-full">
                {complaintCategoryLabel(complaint)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                complaint.priority === 'Critical' ? 'bg-red-600 text-white' :
                complaint.priority === 'High' ? 'bg-red-500/20 text-red-300' :
                complaint.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/60'
              }`}>
                {complaint.priority}
              </span>
            </div>
            <h2 className="text-white truncate" style={{ fontWeight: 700 }}>{complaint.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Calendar className="w-3.5 h-3.5" />
            {complaint.createdAt && new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {complaint.assignedStaffName && (
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <User className="w-3.5 h-3.5" />
              Handled by <span className="text-white" style={{ fontWeight: 500 }}>{complaint.assignedStaffName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rating Screen */}
      {showRating ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-black p-6 sm:p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Star className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-white mb-1.5" style={{ fontWeight: 700 }}>Rate Your Experience</h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              How satisfied are you with how{' '}
              <span className="text-white" style={{ fontWeight: 500 }}>{complaint.assignedStaffName}</span>{" "}
              resolved your complaint?
            </p>

            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-11 h-11 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-white/40'
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-sm text-white/60 mb-4">
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                {' '}— {rating} star{rating > 1 ? 's' : ''}
              </p>
            )}

            <div className="mb-6 text-left">
              <label htmlFor="rating-feedback" className="mb-2 block text-left text-xs font-medium text-white/70">
                Comments <span className="font-normal text-white/45">(optional)</span>
              </label>
              <textarea
                id="rating-feedback"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Share what went well or what we could improve…"
                className="w-full resize-y rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-red-500/40 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
              <p className="mt-1.5 text-[11px] text-white/40">
                4–5 star reviews with a short comment may appear on our homepage.
              </p>
            </div>

            <button
              onClick={handleSubmitRating}
              disabled={rating === 0}
              className="w-full py-3 bg-red-600 text-white rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Submit Rating & Close Complaint
            </button>
          </div>
        </div>
      ) : (
        /* Chat Interface */
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Original description as system note */}
          <div className="px-6 pt-4 pb-2 flex-shrink-0">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 text-sm text-white/60 leading-relaxed">
              <div className="flex items-center gap-1.5 text-xs text-white/60 mb-1.5">
                <Tag className="w-3 h-3" />
                Original complaint description
              </div>
              {complaint.description}
            </div>
          </div>

          {(complaint.status === 'Open' || complaint.status === 'open') && (
            <div className="px-6 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-xs">
                  Your complaint is pending assignment. A staff member will be assigned shortly.
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <ConversationThread
              complaint={complaint}
              messages={messages}
              onSendMessage={handleSendMessage}
              onEndConversation={handleEndConversation}
              onSolutionAccepted={handleSolutionAccepted}
              onSolutionRejected={handleSolutionRejected}
              isConversationEnded={isConversationEnded}
              conversationEndedBy={conversationEndedBy}
              solutionAccepted={solutionAccepted}
              dismissedSolutionId={dismissedSolutionId}
            />
          </div>
        </div>
      )}

      {/* Solution Proposal Dialog removed - using banner instead */}
    </div>
  );
}