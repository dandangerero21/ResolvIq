package com.rbcits.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;

import lombok.Data;

@Data
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    private String content;
    private boolean isSolved;
    
    @Column(name = "is_solution_proposal", nullable = false)
    private boolean isSolutionProposal = false;
    
    @Column(name = "is_system_message", nullable = false)
    private boolean isSystemMessage = false;

    @Column(name = "image_file_name", length = 160)
    private String imageFileName;

    @Column(name = "image_original_name", length = 255)
    private String imageOriginalName;

    @Column(name = "image_mime_type", length = 120)
    private String imageMimeType;
    
    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "complaint_id")
    @JsonBackReference
    private Complaint complaint;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User sender;

    @ManyToOne
    @JoinColumn(name = "reply_to_message_id")
    private Message replyTo;
}
