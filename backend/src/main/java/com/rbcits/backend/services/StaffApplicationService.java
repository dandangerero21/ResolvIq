package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.RegistrationResponse;
import com.rbcits.backend.DTOs.StaffApplicationViewDTO;
import com.rbcits.backend.DTOs.UserDTO;
import com.rbcits.backend.models.StaffApplication;
import com.rbcits.backend.models.StaffApplicationStatus;
import com.rbcits.backend.models.User;
import com.rbcits.backend.repositories.StaffApplicationRepository;
import com.rbcits.backend.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class StaffApplicationService {

    private final StaffApplicationRepository staffApplicationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailNotificationService mailNotificationService;

    public StaffApplicationService(
            StaffApplicationRepository staffApplicationRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            MailNotificationService mailNotificationService) {
        this.staffApplicationRepository = staffApplicationRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailNotificationService = mailNotificationService;
    }

    @Transactional
    public RegistrationResponse submitFromRegistration(UserDTO dto) {
        if (dto.getSpecialization() == null || dto.getSpecialization().isBlank()) {
            throw new IllegalArgumentException("Specialization is required for staff");
        }

        String email = dto.getEmail().trim();
        String name = dto.getName().trim();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        if (userRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("This name is already in use");
        }

        String encoded = passwordEncoder.encode(dto.getPassword());

        StaffApplication existing = staffApplicationRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == StaffApplicationStatus.PENDING) {
                throw new IllegalArgumentException("A staff application for this email is already pending review");
            }
            if (existing.getStatus() == StaffApplicationStatus.APPROVED) {
                throw new IllegalArgumentException("This email has already been approved as staff");
            }
            // REJECTED — allow resubmission
            existing.setName(name);
            existing.setPassword(encoded);
            existing.setSpecialization(dto.getSpecialization().trim());
            existing.setStatus(StaffApplicationStatus.PENDING);
            existing.setCreatedAt(Instant.now());
            existing.setReviewedAt(null);
            existing.setReviewedByUserId(null);
            existing.setAdminNote(null);
            staffApplicationRepository.save(existing);
        } else {
            StaffApplication app = new StaffApplication();
            app.setEmail(email);
            app.setName(name);
            app.setPassword(encoded);
            app.setSpecialization(dto.getSpecialization().trim());
            app.setStatus(StaffApplicationStatus.PENDING);
            app.setCreatedAt(Instant.now());
            staffApplicationRepository.save(app);
        }

        mailNotificationService.notifyAdminNewStaffApplication(name, email, dto.getSpecialization().trim());
        mailNotificationService.notifyApplicantStaffApplicationReceived(email, name);

        return new RegistrationResponse(
                RegistrationResponse.OUTCOME_STAFF_APPLICATION_SUBMITTED,
                "Your application was submitted. An administrator will review it. You will receive an email when a decision is made (if email is configured). You can sign in only after approval.");
    }

    @Transactional(readOnly = true)
    public boolean hasPendingApplicationForEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return staffApplicationRepository.findByEmail(email.trim())
                .map(a -> a.getStatus() == StaffApplicationStatus.PENDING)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<StaffApplicationViewDTO> listPending() {
        return staffApplicationRepository.findByStatusOrderByCreatedAtAsc(StaffApplicationStatus.PENDING).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public StaffApplicationViewDTO approve(long applicationId, Long reviewerUserId) {
        StaffApplication app = staffApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));
        if (app.getStatus() != StaffApplicationStatus.PENDING) {
            throw new IllegalArgumentException("Only pending applications can be approved");
        }
        if (userRepository.findByEmail(app.getEmail()).isPresent()) {
            throw new IllegalArgumentException("A user with this email already exists");
        }

        User user = new User();
        user.setName(app.getName());
        user.setEmail(app.getEmail());
        user.setPassword(app.getPassword());
        user.setRole("staff");
        user.setSpecialization(app.getSpecialization());
        userRepository.save(user);

        app.setStatus(StaffApplicationStatus.APPROVED);
        app.setReviewedAt(Instant.now());
        app.setReviewedByUserId(reviewerUserId);
        app.setAdminNote(null);
        staffApplicationRepository.save(app);

        mailNotificationService.notifyApplicantStaffApproved(app.getEmail(), app.getName());

        return toView(app);
    }

    @Transactional
    public StaffApplicationViewDTO reject(long applicationId, Long reviewerUserId, String note) {
        StaffApplication app = staffApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));
        if (app.getStatus() != StaffApplicationStatus.PENDING) {
            throw new IllegalArgumentException("Only pending applications can be rejected");
        }

        app.setStatus(StaffApplicationStatus.REJECTED);
        app.setReviewedAt(Instant.now());
        app.setReviewedByUserId(reviewerUserId);
        app.setAdminNote(note == null || note.isBlank() ? null : note.trim());
        staffApplicationRepository.save(app);

        mailNotificationService.notifyApplicantStaffRejected(app.getEmail(), app.getName(), note);

        return toView(app);
    }

    private StaffApplicationViewDTO toView(StaffApplication app) {
        return new StaffApplicationViewDTO(
                app.getId(),
                app.getName(),
                app.getEmail(),
                app.getSpecialization(),
                app.getStatus(),
                app.getCreatedAt(),
                app.getReviewedAt(),
                app.getReviewedByUserId(),
                app.getAdminNote());
    }
}
