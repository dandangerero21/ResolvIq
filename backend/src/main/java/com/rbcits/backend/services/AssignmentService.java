package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.AssignmentDTO;
import com.rbcits.backend.models.Assignment;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.Message;
import com.rbcits.backend.models.User;
import com.rbcits.backend.repositories.AssignmentRepository;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.MessageRepository;
import com.rbcits.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AssignmentService {

    private static final String GENERIC_REASSIGNMENT_MESSAGE_TEMPLATE =
            "A new staff member, %s, is now handling your complaint.";

    private final AssignmentRepository assignmentRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final RealtimeEventService realtimeEventService;

    public AssignmentService(AssignmentRepository assignmentRepository,
                            ComplaintRepository complaintRepository,
                            UserRepository userRepository,
                            MessageRepository messageRepository,
                            RealtimeEventService realtimeEventService) {
        this.assignmentRepository = assignmentRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.realtimeEventService = realtimeEventService;
    }

    @Transactional
    public AssignmentDTO assignComplaint(Long complaintId, Long staffId) {
        return upsertAssignment(complaintId, staffId, null, false);
    }

    @Transactional
    public AssignmentDTO transferComplaint(Long complaintId, Long fromStaffId, Long toStaffId) {
        User fromStaff = requireStaffUser(fromStaffId, "Current staff member not found");
        return upsertAssignment(complaintId, toStaffId, fromStaff, true);
    }

    public List<AssignmentDTO> getStaffAssignments(Long staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Staff not found"));
        
        return assignmentRepository.findByAssignedTo(staff).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public AssignmentDTO getAssignmentByComplaintId(Long complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));
        
        if (complaint.getAssignment() == null) {
            throw new IllegalArgumentException("No assignment found for this complaint");
        }
        return convertToDTO(complaint.getAssignment());
    }

    public void deleteAssignment(Long id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        Long complaintId = assignment.getComplaint() != null ? assignment.getComplaint().getComplaintId() : null;
        
        assignment.getComplaint().setStatus("open");
        complaintRepository.save(assignment.getComplaint());
        assignmentRepository.deleteById(id);
        realtimeEventService.publishComplaintEvent("ASSIGNMENT_REMOVED", complaintId, true);
    }

    private AssignmentDTO upsertAssignment(Long complaintId,
                                           Long targetStaffId,
                                           User transferredBy,
                                           boolean transferRequestedByStaff) {
        if (complaintId == null) {
            throw new IllegalArgumentException("Complaint id is required");
        }
        if (targetStaffId == null) {
            throw new IllegalArgumentException("Staff id is required");
        }

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        User targetStaff = requireStaffUser(targetStaffId, "Staff not found");

        Assignment assignment = complaint.getAssignment();
        User previousStaff = assignment != null ? assignment.getAssignedTo() : null;
        Long previousStaffId = previousStaff != null ? previousStaff.getUserId() : null;
        String previousStaffName = previousStaff != null ? previousStaff.getName() : null;

        if (transferRequestedByStaff) {
            if (previousStaffId == null) {
                throw new IllegalArgumentException("Complaint is not currently assigned to a staff member.");
            }
            if (transferredBy == null || transferredBy.getUserId() == null
                    || !previousStaffId.equals(transferredBy.getUserId())) {
                throw new IllegalArgumentException("You can only transfer complaints currently assigned to you.");
            }
            if (targetStaff.getUserId().equals(previousStaffId)) {
                throw new IllegalArgumentException("Please select a different staff member for transfer.");
            }
            if (hasAcceptedSolution(complaint)) {
                throw new IllegalArgumentException(
                        "Transfer is not allowed because the customer already accepted a solution.");
            }
        }

        boolean hasCurrentAssignment = previousStaffId != null;
        boolean changedAssignee = hasCurrentAssignment && !previousStaffId.equals(targetStaff.getUserId());
        boolean hasPriorAssignments = numberOrZero(complaint.getAssignmentCount()) > 0;
        boolean isReassignment = changedAssignee || (!hasCurrentAssignment && hasPriorAssignments);
        boolean shouldIncrementAssignmentCount = !hasCurrentAssignment || changedAssignee;

        if (assignment == null) {
            assignment = new Assignment();
            assignment.setComplaint(complaint);
        }
        assignment.setAssignedTo(targetStaff);
        Assignment saved = assignmentRepository.save(assignment);

        if (shouldIncrementAssignmentCount) {
            complaint.setAssignmentCount(numberOrZero(complaint.getAssignmentCount()) + 1);
        }
        if (isReassignment) {
            complaint.setReassignmentCount(numberOrZero(complaint.getReassignmentCount()) + 1);
        }
        if (transferRequestedByStaff && transferredBy != null) {
            complaint.setTransferCount(numberOrZero(complaint.getTransferCount()) + 1);
            complaint.setTransferredByStaffId(transferredBy.getUserId());
            complaint.setTransferredByStaffName(transferredBy.getName());
            transferredBy.setTransferredCount(numberOrZero(transferredBy.getTransferredCount()) + 1);
            userRepository.save(transferredBy);
        }
        complaint.setStatus("assigned");
        complaintRepository.save(complaint);

        if (isReassignment) {
            createReassignmentSystemMessage(complaint, previousStaffName, targetStaff.getName(), transferRequestedByStaff);
        }

        realtimeEventService.publishComplaintEvent("ASSIGNMENT_UPDATED", complaint.getComplaintId(), true);

        return convertToDTO(saved);
    }

    private User requireStaffUser(Long staffId, String userNotFoundMessage) {
        if (staffId == null) {
            throw new IllegalArgumentException("Staff id is required");
        }
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException(userNotFoundMessage));
        if (staff.getRole() == null || !staff.getRole().equalsIgnoreCase("staff")) {
            throw new IllegalArgumentException("User is not staff");
        }
        return staff;
    }

    private void createReassignmentSystemMessage(Complaint complaint,
                                                 String previousStaffName,
                                                 String newStaffName,
                                                 boolean isTransfer) {
        String normalizedPrevious = previousStaffName == null ? "" : previousStaffName.trim();
        String normalizedNew = newStaffName == null ? "Staff" : newStaffName.trim();

        String content;
        if (isTransfer && !normalizedPrevious.isEmpty()) {
            content = "Your complaint has been transferred from " + normalizedPrevious + " to " + normalizedNew
                    + ". " + normalizedNew + " is now handling your complaint.";
        } else if (!normalizedPrevious.isEmpty() && !normalizedPrevious.equalsIgnoreCase(normalizedNew)) {
            content = "Your complaint has been reassigned from " + normalizedPrevious + " to " + normalizedNew
                    + ". " + normalizedNew + " is now handling your complaint.";
        } else {
            content = String.format(GENERIC_REASSIGNMENT_MESSAGE_TEMPLATE, normalizedNew);
        }

        Message systemMessage = new Message();
        systemMessage.setComplaint(complaint);
        systemMessage.setSender(null);
        systemMessage.setContent(content);
        systemMessage.setTimestamp(LocalDateTime.now());
        systemMessage.setSolved(false);
        systemMessage.setSolutionProposal(false);
        systemMessage.setSystemMessage(true);
        messageRepository.save(systemMessage);
    }

    private int numberOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean hasAcceptedSolution(Complaint complaint) {
        return messageRepository.existsByComplaintAndIsSystemMessageTrueAndContentContainingIgnoreCase(
                complaint,
                "accepted");
    }

    private AssignmentDTO convertToDTO(Assignment assignment) {
        return new AssignmentDTO(
            assignment.getAssignmentId(),
            assignment.getComplaint() != null ? assignment.getComplaint().getComplaintId() : null,
            assignment.getAssignedTo() != null ? assignment.getAssignedTo().getUserId() : null,
            assignment.getAssignedTo() != null ? assignment.getAssignedTo().getName() : null,
            assignment.getAssignedTo() != null ? assignment.getAssignedTo().getSpecialization() : null
        );
    }
}
