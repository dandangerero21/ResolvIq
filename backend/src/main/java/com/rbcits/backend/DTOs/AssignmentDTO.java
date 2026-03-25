package com.rbcits.backend.DTOs;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentDTO {
    private Long assignmentId;
    private Long complaintId;
    private Long assignedToId;
    private String assignedToName;
    private String assignedToSpecialization;
}
