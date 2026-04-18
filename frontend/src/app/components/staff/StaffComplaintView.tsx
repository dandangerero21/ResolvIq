import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Message, Complaint } from '../../types';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import { StaffComplaintMobileSidebarPanel } from '../shared/ComplaintMobileSidebarPanels';
import { ConversationThread } from '../shared/ConversationThread';
import complaintService from '../../../services/complaintService';
import messageService from '../../../services/messageService';
import assignmentService from '../../../services/assignmentService';
import userService, { User as StaffMember } from '../../../services/userService';
import { markConversationAsRead } from '../../../services/conversationUnreadService';
import { hasAcceptedSolution } from '../../utils/solutionWorkflow';
import { ArrowLeft, ArrowRightLeft, Calendar, ChevronDown, Lightbulb, Star, Tag, User } from 'lucide-react';
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

const isClosedConversationStatus = (status?: string): boolean => {
  const normalizedStatus = status?.toLowerCase();
  return normalizedStatus === 'resolved' || normalizedStatus === 'cancelled';
};

const parseSpecializations = (specialization?: string): string[] =>
  (specialization ?? '')
    .split(',')
    .map(spec => spec.trim())
    .filter(spec => spec.length > 0);

const formatTransferTargetOption = (staff: StaffMember): string => {
  const specs = parseSpecializations(staff.specialization);
  return specs.length > 0 ? `${staff.name} — ${specs.join(', ')}` : staff.name;
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
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedTransferStaffId, setSelectedTransferStaffId] = useState('');
  const [isTransferInProgress, setIsTransferInProgress] = useState(false);
  const solutionAccepted = hasAcceptedSolution(messages);
  const currentStaffId = Number(currentUser?.userId ?? currentUser?.id);

  // Fetch complaint from backend
  useEffect(() => {
    const loadComplaint = async () => {
      try {
        // Try to fetch from backend using the ID
        if (id) {
          const backendComplaint = await complaintService.getComplaintById(Number(id));
          setComplaint(backendComplaint);
          if (isClosedConversationStatus(backendComplaint.status)) {
            setIsConversationEnded(true);
          }
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
    const complaintId = complaint.complaintId;

    const fetchMessages = async () => {
      try {
        const backendMessages = await messageService.getComplaintMessages(complaintId);
        setMessages(backendMessages);

        const viewerUserId = Number(currentUser?.userId ?? currentUser?.id)
        if (Number.isFinite(viewerUserId)) {
          markConversationAsRead({
            complaintId,
            viewerRole: 'staff',
            viewerUserId,
            messages: backendMessages,
          })
        }
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
  }, [complaint?.complaintId, currentUser?.userId, currentUser?.id]);

  // Poll for complaint status changes
  useEffect(() => {
    if (!complaint?.complaintId) return;

    const pollComplaintStatus = async () => {
      try {
        const updatedComplaint = await complaintService.getComplaintById(complaint.complaintId!);
        if (updatedComplaint) {
          setComplaint(updatedComplaint);
          // Check if status has changed to a closed state
          if (isClosedConversationStatus(updatedComplaint.status)) {
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

  useEffect(() => {
    if (currentUser?.role !== 'staff') {
      setStaffMembers([]);
      return;
    }

    const loadStaffMembers = async () => {
      try {
        const staff = await userService.getStaffMembers();
        setStaffMembers(staff);
      } catch (error) {
        console.error('Failed to load staff members for transfer:', error);
      }
    };

    void loadStaffMembers();
  }, [currentUser?.role]);

  useEffect(() => {
    const availableTarget = staffMembers.find(staff => staff.userId !== currentStaffId);
    if (!availableTarget) {
      setSelectedTransferStaffId('');
      return;
    }

    setSelectedTransferStaffId(prev => {
      if (prev && staffMembers.some(staff => staff.userId === Number(prev) && staff.userId !== currentStaffId)) {
        return prev;
      }
      return String(availableTarget.userId);
    });
  }, [staffMembers, currentStaffId]);

  const handleSendMessage = async (content: string, isSolutionProposal?: boolean) => {
    if (!currentUser || !complaint?.complaintId) return;
    if (isSolutionProposal && solutionAccepted) {
      alert('A solution has already been accepted. Please mark this complaint as solved.');
      return;
    }

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
      const serverMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : null;
      alert(serverMessage ?? 'Failed to send message. Please try again.');
    }
  };

  const handleEndConversation = async () => {
    if (!complaint?.complaintId) return;
    try {
      // End Conversation should always be treated as cancelled.
      const newStatus = 'cancelled';

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

  const handleTransferComplaint = async () => {
    if (!complaint?.complaintId || !Number.isFinite(currentStaffId)) {
      return;
    }
    if (solutionAccepted) {
      alert('Transfer is disabled because the customer already accepted a solution.');
      return;
    }

    const toStaffId = Number(selectedTransferStaffId);
    if (!Number.isFinite(toStaffId)) {
      alert('Please select a staff member to transfer this complaint to.');
      return;
    }

    setIsTransferInProgress(true);
    try {
      await assignmentService.transferComplaint(complaint.complaintId, currentStaffId, toStaffId);
      const targetStaff = staffMembers.find(staff => staff.userId === toStaffId);
      const targetStaffName = targetStaff?.name ?? 'the selected staff member';

      setComplaint(prev =>
        prev
          ? {
              ...prev,
              assignedStaffId: toStaffId,
              assignedStaffName: targetStaffName,
              status: 'assigned',
            }
          : prev
      );

      alert(`Complaint transferred to ${targetStaffName}.`);
      navigate('/staff/dashboard');
    } catch (error) {
      console.error('Failed to transfer complaint:', error);
      const serverMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : null;
      alert(serverMessage ?? 'Failed to transfer complaint. Please try again.');
    } finally {
      setIsTransferInProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-white/60">Loading complaint...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-white/60">Complaint not found</p>
      </div>
    );
  }

  const status = statusConfig[complaint.status];
  const availableTransferTargets = staffMembers.filter(staff => staff.userId !== currentStaffId);
  const selectedTransferTarget = availableTransferTargets.find(
    staff => staff.userId === Number(selectedTransferStaffId)
  );
  const selectedTransferTargetSpecs = parseSpecializations(selectedTransferTarget?.specialization);
  const isCurrentStaffAssignee =
    Number.isFinite(currentStaffId) &&
    complaint.assignedStaffId?.toString() === String(currentStaffId) &&
    !isClosedConversationStatus(complaint.status);
  const canTransferComplaint = isCurrentStaffAssignee && !solutionAccepted;

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

      {isCurrentStaffAssignee && (
        <div className="shrink-0 border-b border-white/10 bg-black px-4 pb-3 md:hidden">
          {canTransferComplaint ? (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-violet-300" />
                <p className="text-xs text-violet-100" style={{ fontWeight: 600 }}>
                  Transfer complaint
                </p>
              </div>
              <p className="mt-1 text-[11px] text-violet-100/75">
                Reassign to another staff member based on specialization.
              </p>
              <div className="mt-2 space-y-2">
                <select
                  value={selectedTransferStaffId}
                  onChange={event => setSelectedTransferStaffId(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-xs text-white focus:border-violet-400/50 focus:outline-none"
                  disabled={isTransferInProgress || availableTransferTargets.length === 0}
                >
                  {availableTransferTargets.length === 0 && <option value="">No other staff available</option>}
                  {availableTransferTargets.map(staff => (
                    <option key={staff.userId} value={String(staff.userId)}>
                      {formatTransferTargetOption(staff)}
                    </option>
                  ))}
                </select>
                {selectedTransferTargetSpecs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTransferTargetSpecs.map(spec => (
                      <span
                        key={spec}
                        className="rounded-full border border-violet-400/35 bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-100"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleTransferComplaint}
                  disabled={
                    isTransferInProgress ||
                    availableTransferTargets.length === 0 ||
                    !selectedTransferStaffId
                  }
                  className="w-full rounded-lg bg-violet-600 px-4 py-2 text-xs text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontWeight: 600 }}
                >
                  {isTransferInProgress ? 'Transferring…' : 'Transfer'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <p className="text-xs text-emerald-100" style={{ fontWeight: 600 }}>
                Transfer locked
              </p>
              <p className="mt-1 text-[11px] text-emerald-100/80">
                The customer already accepted a solution for this complaint.
              </p>
            </div>
          )}
        </div>
      )}

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

          {canTransferComplaint && (
            <div className="mt-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-violet-300" />
                <p className="text-xs text-violet-200" style={{ fontWeight: 600 }}>
                  Transfer complaint
                </p>
              </div>
              <p className="mt-1 text-xs text-violet-100/75">
                Pass this complaint to another staff member. The customer will be notified that a new staff member is now handling it.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedTransferStaffId}
                  onChange={event => setSelectedTransferStaffId(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-xs text-white focus:border-violet-400/50 focus:outline-none"
                  disabled={isTransferInProgress || availableTransferTargets.length === 0}
                >
                  {availableTransferTargets.length === 0 && <option value="">No other staff available</option>}
                  {availableTransferTargets.map(staff => (
                    <option key={staff.userId} value={String(staff.userId)}>
                      {formatTransferTargetOption(staff)}
                    </option>
                  ))}
                </select>
                {selectedTransferTargetSpecs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:max-w-[60%]">
                    {selectedTransferTargetSpecs.map(spec => (
                      <span
                        key={spec}
                        className="rounded-full border border-violet-400/35 bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-100"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleTransferComplaint}
                  disabled={
                    isTransferInProgress ||
                    availableTransferTargets.length === 0 ||
                    !selectedTransferStaffId
                  }
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontWeight: 600 }}
                >
                  {isTransferInProgress ? 'Transferring…' : 'Transfer'}
                </button>
              </div>
            </div>
          )}

          {isCurrentStaffAssignee && solutionAccepted && (
            <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-xs text-emerald-100" style={{ fontWeight: 600 }}>
                Transfer locked
              </p>
              <p className="mt-1 text-xs text-emerald-100/80">
                This complaint can no longer be transferred because a solution has been accepted.
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
