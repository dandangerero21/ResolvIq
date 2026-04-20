package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.ComplaintDTO;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.User;
import com.rbcits.backend.models.Category;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.UserRepository;
import com.rbcits.backend.repositories.CategoryRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final RealtimeEventService realtimeEventService;

    public ComplaintService(ComplaintRepository complaintRepository, 
                           UserRepository userRepository,
                           CategoryRepository categoryRepository,
                           RealtimeEventService realtimeEventService) {
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.realtimeEventService = realtimeEventService;
    }

    public ComplaintDTO createComplaint(ComplaintDTO dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Category category = null;
        if (dto.getCategoryId() != null) {
            category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        }

        String custom = dto.getCustomCategory() != null ? dto.getCustomCategory().trim() : null;
        if (custom != null && custom.isEmpty()) {
            custom = null;
        }
        if (category != null && category.getCategory_id() != null && category.getCategory_id() == 6L
                && (custom == null || custom.isEmpty())) {
            throw new IllegalArgumentException("Please describe your category when selecting Other");
        }
        if (category == null || category.getCategory_id() == null || category.getCategory_id() != 6L) {
            custom = null;
        }

        Complaint complaint = new Complaint();
        complaint.setTitle(dto.getTitle());
        complaint.setDescription(dto.getDescription());
        complaint.setStatus("open");
        complaint.setPriority(dto.getPriority() != null ? dto.getPriority() : "Medium");
        complaint.setCreatedBy(user);
        complaint.setCategory(category);
        complaint.setCustomCategory(custom);

        Complaint saved = complaintRepository.save(complaint);
        realtimeEventService.publishComplaintEvent("COMPLAINT_CREATED", saved.getComplaintId(), true);
        return convertToDTO(saved);
    }

    public ComplaintDTO getComplaintById(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));
        return convertToDTO(complaint);
    }

    public List<ComplaintDTO> getUserComplaints(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return complaintRepository.findByCreatedBy(user).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ComplaintDTO> getComplaintsByStatus(String status) {
        return complaintRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ComplaintDTO> getAllComplaints() {
        return complaintRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public ComplaintDTO updateComplaintStatus(Long id, String status) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        String normalizedStatus = status == null ? "" : status.trim().toLowerCase();
        if (normalizedStatus.isEmpty()) {
            throw new IllegalArgumentException("Status cannot be empty");
        }

        complaint.setStatus(normalizedStatus);
        if (normalizedStatus.equals("resolved")) {
            complaint.setResolvedAt(Instant.now());
        }
        Complaint updated = complaintRepository.save(complaint);
        realtimeEventService.publishComplaintEvent("COMPLAINT_UPDATED", updated.getComplaintId(), true);
        return convertToDTO(updated);
    }

    public void deleteComplaint(Long id) {
        if (!complaintRepository.existsById(id)) {
            throw new IllegalArgumentException("Complaint not found");
        }
        complaintRepository.deleteById(id);
        realtimeEventService.publishComplaintEvent("COMPLAINT_DELETED", id, true);
    }

    private ComplaintDTO convertToDTO(Complaint complaint) {
        return new ComplaintDTO(
            complaint.getComplaintId(),
            complaint.getTitle(),
            complaint.getDescription(),
            complaint.getStatus(),
            complaint.getPriority(),
            complaint.getCreatedBy() != null ? complaint.getCreatedBy().getUserId() : null,
            complaint.getCreatedBy() != null ? complaint.getCreatedBy().getName() : null,
            complaint.getCategory() != null ? complaint.getCategory().getCategory_id() : null,
            complaint.getCategory() != null ? complaint.getCategory().getName() : null,
            complaint.getCustomCategory(),
            complaint.getAssignment() != null && complaint.getAssignment().getAssignedTo() != null 
                ? complaint.getAssignment().getAssignedTo().getUserId() : null,
            complaint.getAssignment() != null && complaint.getAssignment().getAssignedTo() != null 
                ? complaint.getAssignment().getAssignedTo().getName() : null,
            complaint.getCreatedAt(),
            complaint.getUpdatedAt(),
            complaint.getResolvedAt(),
            complaint.getRating() != null ? complaint.getRating().getScore() : null,
            complaint.getRating() != null ? complaint.getRating().getFeedback() : null,
            complaint.getAssignmentCount(),
            complaint.getReassignmentCount(),
            complaint.getTransferCount(),
            complaint.getTransferredByStaffId(),
            complaint.getTransferredByStaffName(),
            null,
            null
        );
    }
}
