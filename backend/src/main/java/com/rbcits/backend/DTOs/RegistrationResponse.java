package com.rbcits.backend.DTOs;

/**
 * Returned from POST /api/users/register — never includes credentials or session; user must sign in separately.
 */
public record RegistrationResponse(String outcome, String message) {
    public static final String OUTCOME_USER_REGISTERED = "user_registered";
    public static final String OUTCOME_STAFF_APPLICATION_SUBMITTED = "staff_application_submitted";
}
