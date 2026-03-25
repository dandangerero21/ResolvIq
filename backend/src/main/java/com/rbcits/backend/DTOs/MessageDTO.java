package com.rbcits.backend.DTOs;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {
    private Long messageId;
    private String content;
    private boolean isSolved;
    
    @JsonProperty("isSolutionProposal")
    private boolean isSolutionProposal;
    
    @JsonProperty("isSystemMessage")
    private boolean isSystemMessage;
    
    private LocalDateTime timestamp;
    private Long complaintId;
    private Long senderId;
    private String senderName;
    private String senderRole;
}
