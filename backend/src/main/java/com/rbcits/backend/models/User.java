package com.rbcits.backend.models;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import java.util.List;
import jakarta.persistence.Column;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    private String name;
    private String email;
    private String password;

    @Nullable
    private String role;

    @Nullable
    @Column(columnDefinition = "TEXT")
    private String specialization; // Can contain multiple specializations separated by commas (e.g., "Technical Support, Billing")
    
    @OneToMany(mappedBy = "createdBy")
    @JsonManagedReference
    private List<Complaint> complaints;

    @OneToMany(mappedBy = "sender")
    private List<Message> messages;
}
