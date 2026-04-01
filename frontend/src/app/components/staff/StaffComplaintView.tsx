import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Message, Complaint } from '../../types';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import { StaffComplaintMobileSidebarPanel } from '../shared/ComplaintMobileSidebarPanels';
import { ConversationThread } from '../shared/ConversationThread';
import complaintService from '../../../services/complaintService';
import messageService from '../../../services/messageService';
import { ArrowLeft, Calendar, ChevronDown, Lightbulb, Star, Tag, User } from 'lucide-react';
import { useState, useEffect } from 'react';

const statusConfig: Record<string, any> = {
  'open': { label: 'Pending', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  'Open': { label: 'Pending', className: 'bg-red-50 text-red-600 border border-red-100', dot: 'bg-red-500' },
  'assigned': { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  'In Progress': { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-500' },
  'resolved': { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  'Resolved': { label: 'Resolved', className: 'bg-white/10 text-white/60 border border-white/20', dot: 'bg-white/40' },
  'cancelled': { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
  'Cancelled': { label: 'Cancelled', className: 'bg-red-50 text-red-500 border border-red-100', dot: 'bg-red-400' },
};

export function StaffComplaintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [solutionAccepted, setSolutionAccepted] = useState(false);

  // Check if solution was accepted by looking for acceptance system message
  useEffect(() => {
    const accepted = messages.some(
      m => m.isSystemMessage && m.content?.includes('accepted')
    );
    setSolutionAccepted(accepted);
  }, [messages]);

  // Fetch complaint from backend
  useEffect(() => {
    const loadComplaint = async () => {
      try {
        // Try to fetch from backend using the ID
        if (id) {
          const backendComplaint = await complaintService.getComplaintById(Number(id));
          setComplaint(backendComplaint);
        }
      } catch (error) {
        console.error('Failed to load complaint from backend:', error);
        // Show error to user, don't try to use context
        setComplaint(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadComplaint();
  }, [id]);

  // Fetch messages from backend and set up polling
  useEffect(() => {
    if (!complaint?.complaintId) return;

    const fetchMessages = async () => {
      try {
        const backendMessages = await messageService.getComplaintMessages(complaint.complaintId!);
        setMessages(backendMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    // Fetch immediately
    fetchMessages();

    // Set up polling every 2 seconds
    const interval = setInterval(fetchMessages, 2000);
    setPollInterval(interval);

    return () => clearInterval(interval);
  }, [complaint?.complaintId]);

  // Poll for complaint status changes
  useEffect(() => {
    if (!complaint?.complaintId) return;

    const pollComplaintStatus = async () => {
      try {
        const updatedComplaint = await complaintService.getComplaintById(complaint.complaintId!);
        if (updatedComplaint) {
          setComplaint(updatedComplaint);
          // Check if status has changed to resolved
          if (updatedComplaint.status === 'Resolved' || updatedComplaint.status === 'resolved') {
            setIsConversationEnded(true);
            // Clear the polling interval if conversation is ended
            if (pollInterval) {
              clearInterval(pollInterval);
              setPollInterval(null);
            }
          }
        }
      } catch (error) {
        // Log but don't crash - complaint might not exist in backend yet
        console.debug('Failed to poll complaint status:', error);
      }
    };

    // Poll every 3 seconds
    const statusPollInterval = setInterval(pollComplaintStatus, 3000);

    return () => clearInterval(statusPollInterval);
  }, [complaint?.complaintId, pollInterval]);

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
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleEndConversation = async () => {
    if (!complaint?.complaintId) return;
    try {
      // Check if solution was accepted by looking for acceptance system message
      const solutionAccepted = messages.some(
        m => m.isSystemMessage && m.content?.includes('accepted')
      );
      
      // Set status based on whether solution was accepted
      const newStatus = solutionAccepted ? 'Resolved' : 'Cancelled';
      
      // Update complaint status
      await complaintService.updateComplaintStatus(complaint.complaintId, newStatus);
      // Update local state to reflect the status change
      setComplaint(prev => prev ? { ...prev, status: newStatus } : null);
      setIsConversationEnded(true);
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

  const status = statusConfig[complaint.status];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
      {/* Mobile only: complaint metadata in-page (does not change global sidebar) */}
      <div className="shrink-0 border-b border-white/10 bg-black md:hidden">
        <details className="group px-4 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-white/90 [&::-webkit-details-marker]:hidden">
            <span>Complaint details</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 pb-2">
            <StaffComplaintMobileSidebarPanel complaint={complaint} />
          </div>
        </details>
      </div>

      {/* Header — tablet/desktop */}
      <div className="hidden shrink-0 border-b border-white/10 bg-black px-4 py-4 sm:px-8 sm:py-5 md:block">
        <button
          onClick={() => navigate('/staff/dashboard')}
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
                complaint.priority === 'High' ? 'bg-red-50 text-red-600' :
                complaint.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-white/10 text-white/60'
              }`}>
                {complaint.priority}
              </span>
            </div>
            <h2 className="text-white" style={{ fontWeight: 700 }}>{complaint.title}</h2>
          </div>

          {(complaint.status === 'Resolved' || complaint.status === 'resolved') && complaint.rating && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-amber-700 text-sm" style={{ fontWeight: 600 }}>{complaint.rating}/5</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <User className="w-3.5 h-3.5" />
            Submitted by <span className="text-white" style={{ fontWeight: 500 }}>{complaint.createdByName || complaint.userName || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Calendar className="w-3.5 h-3.5" />
            {complaint.createdAt && new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Complaint Description — md+ only (mobile uses collapsible above thread) */}
        <div className="hidden flex-shrink-0 px-6 pt-4 pb-2 md:block">
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-white/60 mb-1.5">
              <Tag className="w-3 h-3" />
              Original complaint description
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{complaint.description}</p>
          </div>

          {(complaint.status !== 'Resolved' && complaint.status !== 'resolved') && (
            <div className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 text-xs">
                Use the <span style={{ fontWeight: 600 }}>Solution Proposal</span> toggle when sending a message that resolves the issue.
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ConversationThread
            complaint={complaint}
            messages={messages}
            onSendMessage={handleSendMessage}
            onEndConversation={handleEndConversation}
            isStaff={true}
            isConversationEnded={isConversationEnded}
            solutionAccepted={solutionAccepted}
          />
        </div>
      </div>
    </div>
  );
}
