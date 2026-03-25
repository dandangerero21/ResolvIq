package com.rbcits.backend.controllers;

import com.rbcits.backend.DTOs.MessageDTO;
import com.rbcits.backend.services.MessageService;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public MessageDTO createMessage(@RequestParam Long complaintId,
                                   @RequestParam Long userId,
                                   @RequestBody MessageRequest request) {
        return messageService.createMessage(complaintId, userId, request.getContent(), request.getIsSolutionProposal());
    }

    @GetMapping("/complaint/{complaintId}")
    public List<MessageDTO> getComplaintMessages(@PathVariable Long complaintId) {
        return messageService.getComplaintMessages(complaintId);
    }

    @PutMapping("/{id}/solved")
    public MessageDTO markAsSolved(@PathVariable Long id) {
        return messageService.markAsSolved(id);
    }

    @DeleteMapping("/{id}")
    public void deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
    }

    @PostMapping("/{complaintId}/solution-rejected")
    public MessageDTO solutionRejected(@PathVariable Long complaintId) {
        return messageService.createSystemMessage(complaintId, "Solution didn't work");
    }

    @PostMapping("/{complaintId}/solution-accepted")
    public MessageDTO solutionAccepted(@PathVariable Long complaintId) {
        return messageService.createSystemMessage(complaintId, "Solution accepted and issue resolved");
    }

    public static class MessageRequest {
        private String content;
        
        @JsonProperty("isSolutionProposal")
        private boolean isSolutionProposal;

        // No-arg constructor for Jackson
        public MessageRequest() {
        }

        public MessageRequest(String content, boolean isSolutionProposal) {
            this.content = content;
            this.isSolutionProposal = isSolutionProposal;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public boolean getIsSolutionProposal() {
            return isSolutionProposal;
        }

        public void setIsSolutionProposal(boolean isSolutionProposal) {
            this.isSolutionProposal = isSolutionProposal;
        }
    }
}
