package com.rbcits.backend.DTOs;

public record PasswordResetCompleteDTO(String token, String newPassword) {
}
