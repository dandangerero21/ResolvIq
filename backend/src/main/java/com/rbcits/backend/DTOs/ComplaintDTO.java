package com.rbcits.backend.DTOs;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;
import java.util.Date;

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
    private Date createdAt;
    private Date updatedAt;
    private Date resolvedAt;
    private Integer rating;
    private List<MessageDTO> messages;
    private AssignmentDTO assignment;
}
