package com.rbcits.backend.DTOs;

/**
 * Public-facing testimonial derived from resolved-complaint ratings (scores 4–5 with feedback).
 */
public record RatingTestimonialDTO(
        long id,
        int score,
        String feedback,
        String authorName,
        String authorRole
) {}
