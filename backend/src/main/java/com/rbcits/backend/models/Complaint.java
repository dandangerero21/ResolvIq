package com.rbcits.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import lombok.Data;

@Entity
@Table(name = "complaint")
@Data
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "complaint_id")
    private Long complaintId;

    private String title;

    /** Long-form user narrative; map as TEXT so we are not limited to default VARCHAR(255). */
    @Column(columnDefinition = "TEXT")
    private String description;
    private String status;
    private String priority;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonBackReference
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "category_id")
    @JsonBackReference
    private Category category;

    /** When category is Other, user-specified subtype (e.g. "Lost shipment"). */
    @Column(name = "custom_category", length = 200)
    private String customCategory;

    @OneToMany(mappedBy = "complaint")
    @JsonManagedReference
    private List<Message> messages;

    @OneToOne(mappedBy = "complaint")
    @JsonManagedReference
    private Assignment assignment;

    @OneToOne(mappedBy = "complaint")
    @JsonManagedReference
    private Rating rating;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
