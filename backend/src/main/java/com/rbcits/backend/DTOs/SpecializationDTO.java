package com.rbcits.backend.DTOs;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpecializationDTO {
    private Long specializationId;
    private String name;
    private String description;
}
