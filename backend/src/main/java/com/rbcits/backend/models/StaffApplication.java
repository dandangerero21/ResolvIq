package com.rbcits.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.Instant;

@Entity
@Table(name = "staff_applications")
@Data
public class StaffApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String specialization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StaffApplicationStatus status = StaffApplicationStatus.PENDING;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant reviewedAt;

    private Long reviewedByUserId;

    @Column(columnDefinition = "TEXT")
    private String adminNote;
}
