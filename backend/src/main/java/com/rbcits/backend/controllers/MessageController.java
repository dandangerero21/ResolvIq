package com.rbcits.backend.controllers;

import com.rbcits.backend.DTOs.MessageDTO;
import com.rbcits.backend.services.MessageService;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
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
        return messageService.createMessage(
            complaintId,
            userId,
            request.getContent(),
            request.getIsSolutionProposal(),
            request.getReplyToMessageId()
        );
    }

    @PostMapping(value = "/with-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MessageDTO createMessageWithImage(@RequestParam Long complaintId,
                                             @RequestParam Long userId,
                                             @RequestParam(required = false) String content,
                                             @RequestParam(name = "isSolutionProposal", defaultValue = "false") boolean isSolutionProposal,
                                             @RequestParam(required = false) Long replyToMessageId,
                                             @RequestPart("image") MultipartFile image) {
        return messageService.createMessageWithImage(
                complaintId,
                userId,
                content,
                isSolutionProposal,
                image,
                replyToMessageId
        );
    }

    @GetMapping("/images/{fileName:.+}")
    public ResponseEntity<Resource> getMessageImage(@PathVariable String fileName) {
        Resource resource = messageService.loadMessageImage(fileName);
        String contentType = messageService.resolveMessageImageContentType(fileName);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(contentType);
        } catch (IllegalArgumentException ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);
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

        @JsonProperty("replyToMessageId")
        private Long replyToMessageId;

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

        public Long getReplyToMessageId() {
            return replyToMessageId;
        }

        public void setReplyToMessageId(Long replyToMessageId) {
            this.replyToMessageId = replyToMessageId;
        }
    }
}
