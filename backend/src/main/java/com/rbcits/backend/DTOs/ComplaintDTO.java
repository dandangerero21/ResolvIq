package com.rbcits.backend.DTOs;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintDTO {
    private Long complaintId;
    private String title;
    private String description;
    private String status;
    private String priority;
    private Long createdById;
    private String createdByName;
    private Long categoryId;
    private String categoryName;
    private String customCategory;
    private Long assignedStaffId;
    private String assignedStaffName;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant resolvedAt;
    private Integer rating;
    private String ratingFeedback;
    private List<MessageDTO> messages;
    private AssignmentDTO assignment;
}
