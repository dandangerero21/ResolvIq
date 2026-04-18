package com.rbcits.backend.DTOs;

public record LoginResponseDTO(
        Long userId,
        String name,
        String email,
        String role,
        String specialization,
        String token) {
}