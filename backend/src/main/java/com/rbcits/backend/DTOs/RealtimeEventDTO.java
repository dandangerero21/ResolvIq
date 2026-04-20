package com.rbcits.backend.DTOs;

import java.time.Instant;

public record RealtimeEventDTO(
        String type,
        Long complaintId,
        Instant timestamp
) {
}
