package com.rbcits.backend.DTOs;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StaffApplicationReviewRequest {
    private Long reviewerUserId;
    private String note;
}
