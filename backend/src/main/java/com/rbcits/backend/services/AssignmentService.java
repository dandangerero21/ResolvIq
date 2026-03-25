package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.AssignmentDTO;
import com.rbcits.backend.models.Assignment;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.User;
import com.rbcits.backend.repositories.AssignmentRepository;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public AssignmentService(AssignmentRepository assignmentRepository,
                            ComplaintRepository complaintRepository,
                            UserRepository userRepository) {
        this.assignmentRepository = assignmentRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }

    public AssignmentDTO assignComplaint(Long complaintId, Long staffId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));
        
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Staff not found"));

        if (!"staff".equals(staff.getRole())) {
            throw new IllegalArgumentException("User is not staff");
        }

        Assignment assignment = new Assignment();
        assignment.setComplaint(complaint);
        assignment.setAssignedTo(staff);

        Assignment saved = assignmentRepository.save(assignment);
        complaint.setStatus("assigned");
        complaintRepository.save(complaint);
        
        return convertToDTO(saved);
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
        
        assignment.getComplaint().setStatus("open");
        complaintRepository.save(assignment.getComplaint());
        assignmentRepository.deleteById(id);
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
