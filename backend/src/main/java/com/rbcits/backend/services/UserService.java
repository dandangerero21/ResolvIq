package com.rbcits.backend.services;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.rbcits.backend.DTOs.DeleteAccountRequestDTO;
import com.rbcits.backend.DTOs.LoginResponseDTO;
import com.rbcits.backend.DTOs.PasswordResetCompleteDTO;
import com.rbcits.backend.DTOs.PasswordResetRequestDTO;
import com.rbcits.backend.repositories.AssignmentRepository;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.MessageRepository;
import com.rbcits.backend.repositories.UserRepository;
import com.rbcits.backend.repositories.PasswordResetTokenRepository;
import com.rbcits.backend.repositories.RatingRepository;
import com.rbcits.backend.DTOs.RegistrationResponse;
import com.rbcits.backend.DTOs.SimpleMessageResponse;
import com.rbcits.backend.DTOs.UserDTO;
import com.rbcits.backend.models.Assignment;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.Message;
import com.rbcits.backend.models.PasswordResetToken;
import com.rbcits.backend.models.Rating;
import com.rbcits.backend.models.User;

@Service
public class UserService {

    private static final String DELETE_ACCOUNT_CONFIRMATION_PHRASE = "Yes, I want to delete my account.";
    private static final String ACCOUNT_DELETION_SYSTEM_MESSAGE =
            "Conversation ended automatically because this account was deleted.";
        private static final String STAFF_REASSIGNMENT_PENDING_SYSTEM_MESSAGE =
            "Your assigned staff account was deleted. An admin will reassign your complaint to a new staff member.";

    private final UserRepository userRepository;
    private final AuthTokenService authTokenService;
    private final PasswordEncoder passwordEncoder;
    private final StaffApplicationService staffApplicationService;
    private final ComplaintRepository complaintRepository;
    private final AssignmentRepository assignmentRepository;
    private final MessageRepository messageRepository;
    private final RatingRepository ratingRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final MailNotificationService mailNotificationService;
    private final String frontendBaseUrl;
    private final long passwordResetExpiryMinutes;

    public UserService(
            UserRepository userRepository,
            AuthTokenService authTokenService,
            PasswordEncoder passwordEncoder,
            StaffApplicationService staffApplicationService,
            ComplaintRepository complaintRepository,
            AssignmentRepository assignmentRepository,
            MessageRepository messageRepository,
            RatingRepository ratingRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            MailNotificationService mailNotificationService,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${app.auth.password-reset.expiry-minutes:30}") long passwordResetExpiryMinutes) {
        this.userRepository = userRepository;
        this.authTokenService = authTokenService;
        this.passwordEncoder = passwordEncoder;
        this.staffApplicationService = staffApplicationService;
        this.complaintRepository = complaintRepository;
        this.assignmentRepository = assignmentRepository;
        this.messageRepository = messageRepository;
        this.ratingRepository = ratingRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.mailNotificationService = mailNotificationService;
        this.frontendBaseUrl = normalizeFrontendBaseUrl(frontendBaseUrl);
        this.passwordResetExpiryMinutes = Math.max(5L, passwordResetExpiryMinutes);
    }

    public RegistrationResponse createUser(UserDTO dto) {

        if (dto.getRole() == null || (!dto.getRole().equalsIgnoreCase("user") && !dto.getRole().equalsIgnoreCase("staff"))) {
            throw new IllegalArgumentException("Role must be either 'user' or 'staff'");
        }

        if (dto.getRole().equalsIgnoreCase("staff")) {
            return staffApplicationService.submitFromRegistration(dto);
        }

        String email = dto.getEmail() == null ? "" : dto.getEmail().trim();
        String name = dto.getName() == null ? "" : dto.getName().trim();
        if (email.isEmpty() || name.isEmpty()) {
            throw new IllegalArgumentException("Name and email are required");
        }

        if (userRepository.findByEmailIgnoreCase(email).isPresent() || userRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("Email or name already in use");
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole("user");
        user.setSpecialization(dto.getSpecialization());
        user.setTransferredCount(0);

        userRepository.save(user);

        return new RegistrationResponse(
                RegistrationResponse.OUTCOME_USER_REGISTERED,
                "Account created. Sign in with your email and password.");
    }

    public LoginResponseDTO loginUser(String email, String password) {

        if(email == null || email.isEmpty()) {
            throw new IllegalArgumentException("Email cannot be empty.");
        }

        if(password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email.trim());
        if (userOpt.isEmpty()) {
            if (staffApplicationService.hasPendingApplicationForEmail(email)) {
                throw new IllegalArgumentException("Your staff application is still pending admin approval.");
            }
            throw new IllegalArgumentException("User not found with email: " + email);
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid password.");
        }

        String token = authTokenService.issueToken(user);
        return new LoginResponseDTO(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getSpecialization(),
                token);
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> new UserDTO(
                        user.getUserId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole(),
                        user.getSpecialization(),
                        user.getTransferredCount()))
                .toList();
    }

    @Transactional
    public SimpleMessageResponse deleteAccount(Long userId, DeleteAccountRequestDTO request, String authorizationHeader) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required.");
        }

        Long authenticatedUserId = authTokenService.extractUserIdFromAuthorizationHeader(authorizationHeader);
        if (!userId.equals(authenticatedUserId)) {
            throw new AccessDeniedException("You can only delete your own account.");
        }

        String confirmationText = request == null ? null : request.confirmationText();
        if (!DELETE_ACCOUNT_CONFIRMATION_PHRASE.equals(confirmationText)) {
            throw new IllegalArgumentException(
                    "Please type the exact confirmation phrase to delete your account.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        if (user.getRole() != null && user.getRole().equalsIgnoreCase("admin")) {
            throw new IllegalArgumentException("Administrator accounts cannot be deleted.");
        }

        Instant now = Instant.now();
        List<Complaint> createdComplaints = complaintRepository.findByCreatedBy(user);
        List<Assignment> assignedComplaints = assignmentRepository.findByAssignedTo(user);

        boolean deletingStaffAccount = user.getRole() != null && user.getRole().equalsIgnoreCase("staff");
        Map<Long, Complaint> complaintsCreatedByUserById = new LinkedHashMap<>();
        Map<Long, Complaint> complaintsToPersistById = new LinkedHashMap<>();
        List<Message> systemMessages = new ArrayList<>();

        for (Complaint complaint : createdComplaints) {
            if (complaint == null || complaint.getComplaintId() == null) {
                continue;
            }

            // Only cancel complaints that are not already in a terminal state.
            if (!isClosedComplaintStatus(complaint.getStatus())) {
                complaint.setStatus("cancelled");
                complaint.setResolvedAt(now);
            }
            complaint.setCreatedBy(null);
            complaint.setRating(null);

            complaintsCreatedByUserById.put(complaint.getComplaintId(), complaint);
            complaintsToPersistById.put(complaint.getComplaintId(), complaint);
            systemMessages.add(buildSystemMessage(complaint, ACCOUNT_DELETION_SYSTEM_MESSAGE));
        }

        for (Assignment assignment : assignedComplaints) {
            Complaint complaint = assignment.getComplaint();
            if (complaint == null || complaint.getComplaintId() == null) {
                continue;
            }

            // Detach one-to-one link before assignment deletion to avoid transient reference issues on flush.
            complaint.setAssignment(null);
            complaint.setRating(null);
            if (complaint.getAssignmentCount() == null || complaint.getAssignmentCount() < 1) {
                complaint.setAssignmentCount(1);
            }

            boolean complaintCreatedByDeletedAccount = complaintsCreatedByUserById.containsKey(complaint.getComplaintId());
            if (deletingStaffAccount && !complaintCreatedByDeletedAccount) {
                if (!isClosedComplaintStatus(complaint.getStatus())) {
                    complaint.setStatus("open");
                    complaint.setResolvedAt(null);
                }
                systemMessages.add(buildSystemMessage(complaint, STAFF_REASSIGNMENT_PENDING_SYSTEM_MESSAGE));
            }

            complaintsToPersistById.put(complaint.getComplaintId(), complaint);
        }

        // Preserve ratings: instead of deleting, detach the user/staff reference
        // so the rating score stays visible on the complaint.
        List<Rating> userRatings = ratingRepository.findByUser(user);
        for (Rating rating : userRatings) {
            if (rating != null) {
                rating.setUser(null);
            }
        }
        List<Rating> staffRatings = ratingRepository.findByStaff(user);
        for (Rating rating : staffRatings) {
            if (rating != null) {
                rating.setStaff(null);
            }
        }
        List<Rating> allAffectedRatings = new ArrayList<>(userRatings);
        allAffectedRatings.addAll(staffRatings);
        if (!allAffectedRatings.isEmpty()) {
            ratingRepository.saveAll(allAffectedRatings);
        }

        if (!complaintsToPersistById.isEmpty()) {
            complaintRepository.saveAll(complaintsToPersistById.values());
        }
        if (!systemMessages.isEmpty()) {
            messageRepository.saveAll(systemMessages);
        }

        if (!assignedComplaints.isEmpty()) {
            assignmentRepository.deleteAll(assignedComplaints);
        }

        List<Message> sentMessages = messageRepository.findBySender(user);
        if (!sentMessages.isEmpty()) {
            for (Message message : sentMessages) {
                message.setSender(null);
            }
            messageRepository.saveAll(sentMessages);
        }

        List<PasswordResetToken> resetTokens = passwordResetTokenRepository.findByUser(user);
        if (!resetTokens.isEmpty()) {
            passwordResetTokenRepository.deleteAll(resetTokens);
        }

        userRepository.delete(user);
        return new SimpleMessageResponse("Account deleted permanently.");
    }

    @Transactional
    public SimpleMessageResponse requestPasswordReset(PasswordResetRequestDTO request) {
        String email = request == null ? null : request.email();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email cannot be empty.");
        }

        User user = userRepository.findByEmailIgnoreCase(email.trim())
            .orElseThrow(() -> new IllegalArgumentException("No account found with that email."));

        Instant now = Instant.now();
        invalidateOpenPasswordResetTokens(user, now);

        String tokenValue = UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setToken(tokenValue);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusSeconds(passwordResetExpiryMinutes * 60L));
        passwordResetTokenRepository.save(token);

        String confirmationUrl = buildPasswordResetConfirmationUrl(tokenValue);
        mailNotificationService.notifyPasswordResetConfirmation(
            user.getEmail(),
            user.getName(),
            confirmationUrl,
            passwordResetExpiryMinutes);

        return new SimpleMessageResponse("Confirmation email sent. Check your inbox to continue password reset.");
    }

    public SimpleMessageResponse validatePasswordResetToken(String token) {
        requireActivePasswordResetToken(token);
        return new SimpleMessageResponse("Password reset link is valid.");
    }

    @Transactional
    public SimpleMessageResponse completePasswordReset(PasswordResetCompleteDTO request) {
        String tokenValue = request == null ? null : request.token();
        String newPassword = request == null ? null : request.newPassword();
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password cannot be empty.");
        }
        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters long.");
        }

        PasswordResetToken token = requireActivePasswordResetToken(tokenValue);
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        Instant now = Instant.now();
        token.setUsedAt(now);
        passwordResetTokenRepository.save(token);
        invalidateOpenPasswordResetTokens(user, now);

        return new SimpleMessageResponse("Password updated successfully. You can now sign in with your new password.");
    }

    private PasswordResetToken requireActivePasswordResetToken(String tokenValue) {
        if (tokenValue == null || tokenValue.isBlank()) {
            throw new IllegalArgumentException("Reset link is invalid or expired.");
        }

        PasswordResetToken token = passwordResetTokenRepository.findByToken(tokenValue.trim())
                .orElseThrow(() -> new IllegalArgumentException("Reset link is invalid or expired."));

        Instant now = Instant.now();
        if (token.getUsedAt() != null || token.getExpiresAt() == null || token.getExpiresAt().isBefore(now)) {
            throw new IllegalArgumentException("Reset link is invalid or expired.");
        }

        return token;
    }

    private void invalidateOpenPasswordResetTokens(User user, Instant now) {
        List<PasswordResetToken> openTokens = passwordResetTokenRepository.findByUserAndUsedAtIsNull(user);
        if (openTokens.isEmpty()) {
            return;
        }
        for (PasswordResetToken token : openTokens) {
            token.setUsedAt(now);
        }
        passwordResetTokenRepository.saveAll(openTokens);
    }

    private String buildPasswordResetConfirmationUrl(String tokenValue) {
        String encodedToken = URLEncoder.encode(tokenValue, StandardCharsets.UTF_8);
        return frontendBaseUrl + "/reset-password/confirm?token=" + encodedToken;
    }

    private String normalizeFrontendBaseUrl(String configuredBaseUrl) {
        String fallback = "http://localhost:5173";
        String raw = configuredBaseUrl == null ? "" : configuredBaseUrl.trim();
        String normalized = raw.isBlank() ? fallback : raw;
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (!normalized.toLowerCase(Locale.ROOT).startsWith("http://")
                && !normalized.toLowerCase(Locale.ROOT).startsWith("https://")) {
            normalized = "https://" + normalized;
        }
        return normalized;
    }

    private Message buildSystemMessage(Complaint complaint, String content) {
        Message systemMessage = new Message();
        systemMessage.setComplaint(complaint);
        systemMessage.setSender(null);
        systemMessage.setContent(content);
        systemMessage.setTimestamp(LocalDateTime.now());
        systemMessage.setSolved(false);
        systemMessage.setSolutionProposal(false);
        systemMessage.setSystemMessage(true);
        return systemMessage;
    }

    private boolean isClosedComplaintStatus(String status) {
        if (status == null) {
            return false;
        }
        return status.equalsIgnoreCase("resolved") || status.equalsIgnoreCase("cancelled");
    }

}
