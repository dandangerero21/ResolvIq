package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.MessageDTO;
import com.rbcits.backend.models.Message;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.User;
import com.rbcits.backend.repositories.MessageRepository;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository,
                        ComplaintRepository complaintRepository,
                        UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }

    public MessageDTO createMessage(Long complaintId, Long userId, String content) {
        return createMessage(complaintId, userId, content, false);
    }

    public MessageDTO createMessage(Long complaintId, Long userId, String content, boolean isSolutionProposal) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));
        
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Message message = new Message();
        message.setComplaint(complaint);
        message.setSender(sender);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        message.setSolved(false);
        message.setSolutionProposal(isSolutionProposal);

        Message saved = messageRepository.save(message);
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
        return convertToDTO(updated);
    }

    public void deleteMessage(Long id) {
        if (!messageRepository.existsById(id)) {
            throw new IllegalArgumentException("Message not found");
        }
        messageRepository.deleteById(id);
    }

    public MessageDTO createSystemMessage(Long complaintId, String content) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        Message message = new Message();
        message.setComplaint(complaint);
        message.setSender(null); // System message has no sender
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        message.setSolved(false);
        message.setSolutionProposal(false);
        message.setSystemMessage(true);

        Message saved = messageRepository.save(message);
        return convertToDTO(saved);
    }

    private MessageDTO convertToDTO(Message message) {
        return new MessageDTO(
            message.getMessageId(),
            message.getContent(),
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
}
