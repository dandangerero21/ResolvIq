package com.rbcits.backend.DTOs;

import com.rbcits.backend.models.StaffApplicationStatus;

import java.time.Instant;

public record StaffApplicationViewDTO(
        long id,
        String name,
        String email,
        String specialization,
        StaffApplicationStatus status,
        Instant createdAt,
        Instant reviewedAt,
        Long reviewedByUserId,
        String adminNote) {}
