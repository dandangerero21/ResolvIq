package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.RealtimeEventDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class RealtimeEventService {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishComplaintEvent(String eventType, Long complaintId, boolean publishListUpdate) {
        if (complaintId == null) {
            return;
        }

        RealtimeEventDTO event = new RealtimeEventDTO(eventType, complaintId, Instant.now());
        messagingTemplate.convertAndSend("/topic/complaints/" + complaintId, event);

        if (publishListUpdate) {
            messagingTemplate.convertAndSend("/topic/complaints/updates", event);
        }
    }
}
