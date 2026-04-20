package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.MessageDTO;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.Message;
import com.rbcits.backend.models.User;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.MessageRepository;
import com.rbcits.backend.repositories.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final MessageImageStorageService messageImageStorageService;
    private final RealtimeEventService realtimeEventService;

    public MessageService(MessageRepository messageRepository,
                          ComplaintRepository complaintRepository,
                          UserRepository userRepository,
                          MessageImageStorageService messageImageStorageService,
                          RealtimeEventService realtimeEventService) {
        this.messageRepository = messageRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.messageImageStorageService = messageImageStorageService;
        this.realtimeEventService = realtimeEventService;
    }

    public MessageDTO createMessage(Long complaintId, Long userId, String content) {
        return createMessage(complaintId, userId, content, false);
    }

    public MessageDTO createMessage(Long complaintId, Long userId, String content, boolean isSolutionProposal) {
        return createMessage(complaintId, userId, content, isSolutionProposal, null);
    }

    public MessageDTO createMessage(Long complaintId,
                                    Long userId,
                                    String content,
                                    boolean isSolutionProposal,
                                    Long replyToMessageId) {
        return createMessageInternal(complaintId, userId, content, isSolutionProposal, null, replyToMessageId);
    }

    public MessageDTO createMessageWithImage(Long complaintId,
                                             Long userId,
                                             String content,
                                             boolean isSolutionProposal,
                                             MultipartFile imageFile,
                                             Long replyToMessageId) {
        MessageImageStorageService.StoredImage storedImage = messageImageStorageService.store(imageFile);

        try {
            return createMessageInternal(
                    complaintId,
                    userId,
                    content,
                    isSolutionProposal,
                    storedImage,
                    replyToMessageId
            );
        } catch (RuntimeException ex) {
            messageImageStorageService.deleteIfExists(storedImage.fileName());
            throw ex;
        }
    }

    private MessageDTO createMessageInternal(Long complaintId,
                                             Long userId,
                                             String content,
                                             boolean isSolutionProposal,
                                             MessageImageStorageService.StoredImage storedImage,
                                             Long replyToMessageId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Message replyToMessage = resolveReplyTarget(complaintId, replyToMessageId);

        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isEmpty() && storedImage == null) {
            throw new IllegalArgumentException("Message content cannot be empty.");
        }

        if (isSolutionProposal) {
            if (sender.getRole() == null || !sender.getRole().equalsIgnoreCase("staff")) {
                throw new IllegalArgumentException("Only staff members can send solution proposals.");
            }
            if (isClosedComplaintStatus(complaint.getStatus())) {
                throw new IllegalArgumentException("Cannot send a solution proposal for a closed complaint.");
            }
            if (hasAcceptedSolution(complaint)) {
                throw new IllegalArgumentException(
                        "A solution has already been accepted. Mark the complaint as solved instead of sending another proposal.");
            }
        }

        Message message = new Message();
        message.setComplaint(complaint);
        message.setSender(sender);
        message.setContent(normalizedContent);
        message.setTimestamp(LocalDateTime.now());
        message.setSolved(false);
        message.setSolutionProposal(isSolutionProposal);
        message.setSystemMessage(false);
        message.setReplyTo(replyToMessage);

        if (storedImage != null) {
            message.setImageFileName(storedImage.fileName());
            message.setImageOriginalName(storedImage.originalName());
            message.setImageMimeType(storedImage.contentType());
        }

        Message saved = messageRepository.save(message);
        realtimeEventService.publishComplaintEvent("MESSAGE_CREATED", complaintId, false);
        return convertToDTO(saved);
    }

    public List<MessageDTO> getComplaintMessages(Long complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));
        
        List<Message> messages = messageRepository.findByComplaintOrderByTimestampAsc(complaint);
        return messages.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public MessageDTO markAsSolved(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        message.setSolved(true);
        Message updated = messageRepository.save(message);
        Long complaintId = updated.getComplaint() != null ? updated.getComplaint().getComplaintId() : null;
        realtimeEventService.publishComplaintEvent("MESSAGE_SOLVED", complaintId, false);
        return convertToDTO(updated);
    }

    public void deleteMessage(Long id) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        Long complaintId = message.getComplaint() != null ? message.getComplaint().getComplaintId() : null;

        messageRepository.deleteById(id);
        if (message.getImageFileName() != null && !message.getImageFileName().isBlank()) {
            messageImageStorageService.deleteIfExists(message.getImageFileName());
        }

        realtimeEventService.publishComplaintEvent("MESSAGE_DELETED", complaintId, false);
    }

    public MessageDTO createSystemMessage(Long complaintId, String content) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        Message message = new Message();
        message.setComplaint(complaint);
        message.setSender(null); // System message has no sender
        message.setContent(content == null ? "" : content.trim());
        message.setTimestamp(LocalDateTime.now());
        message.setSolved(false);
        message.setSolutionProposal(false);
        message.setSystemMessage(true);
        message.setImageFileName(null);
        message.setImageOriginalName(null);
        message.setImageMimeType(null);
        message.setReplyTo(null);

        Message saved = messageRepository.save(message);
        realtimeEventService.publishComplaintEvent("MESSAGE_CREATED", complaintId, false);
        return convertToDTO(saved);
    }

    public Resource loadMessageImage(String fileName) {
        return messageImageStorageService.loadAsResource(fileName);
    }

    public String resolveMessageImageContentType(String fileName) {
        return messageImageStorageService.resolveContentType(fileName);
    }

    private MessageDTO convertToDTO(Message message) {
        Message replyTo = message.getReplyTo();
        return new MessageDTO(
                message.getMessageId(),
                message.getContent(),
                buildImageUrl(message.getImageFileName()),
                message.getImageOriginalName(),
                message.getImageMimeType(),
            replyTo != null ? replyTo.getMessageId() : null,
            replyTo != null ? replyTo.getContent() : null,
            replyTo != null && replyTo.getSender() != null ? replyTo.getSender().getName() : null,
            replyTo != null ? buildImageUrl(replyTo.getImageFileName()) : null,
            replyTo != null ? replyTo.getImageOriginalName() : null,
                message.isSolved(),
                message.isSolutionProposal(),
                message.isSystemMessage(),
                message.getTimestamp(),
                message.getComplaint() != null ? message.getComplaint().getComplaintId() : null,
                message.getSender() != null ? message.getSender().getUserId() : null,
                message.getSender() != null ? message.getSender().getName() : null,
                message.getSender() != null ? message.getSender().getRole() : null
        );
    }

    private Message resolveReplyTarget(Long complaintId, Long replyToMessageId) {
        if (replyToMessageId == null) {
            return null;
        }

        Message replyTo = messageRepository.findById(replyToMessageId)
                .orElseThrow(() -> new IllegalArgumentException("Reply target message not found."));

        Long replyComplaintId = replyTo.getComplaint() != null ? replyTo.getComplaint().getComplaintId() : null;
        if (replyComplaintId == null || !replyComplaintId.equals(complaintId)) {
            throw new IllegalArgumentException("You can only reply to messages in the same complaint thread.");
        }

        return replyTo;
    }

    private String buildImageUrl(String imageFileName) {
        if (imageFileName == null || imageFileName.isBlank()) {
            return null;
        }

        return "/api/messages/images/" + imageFileName;
    }

    private boolean hasAcceptedSolution(Complaint complaint) {
        return messageRepository.existsByComplaintAndIsSystemMessageTrueAndContentContainingIgnoreCase(complaint, "accepted");
    }

    private boolean isClosedComplaintStatus(String status) {
        if (status == null) {
            return false;
        }

        return status.equalsIgnoreCase("resolved") || status.equalsIgnoreCase("cancelled");
    }
}
