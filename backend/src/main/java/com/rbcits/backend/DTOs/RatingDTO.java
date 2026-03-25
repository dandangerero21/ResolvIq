package com.rbcits.backend.DTOs;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RatingDTO {
    private Long ratingId;
    private int score;
    private String feedback;
    private Long complaintId;
    private Long staffId;
    private String staffName;
    private Long userId;
    private String userName;
}
