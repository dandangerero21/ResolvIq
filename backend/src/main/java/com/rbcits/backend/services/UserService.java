package com.rbcits.backend.services;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.rbcits.backend.DTOs.PasswordResetCompleteDTO;
import com.rbcits.backend.DTOs.PasswordResetRequestDTO;
import com.rbcits.backend.repositories.UserRepository;
import com.rbcits.backend.repositories.PasswordResetTokenRepository;
import com.rbcits.backend.DTOs.RegistrationResponse;
import com.rbcits.backend.DTOs.SimpleMessageResponse;
import com.rbcits.backend.DTOs.UserDTO;
import com.rbcits.backend.models.PasswordResetToken;
import com.rbcits.backend.models.User;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StaffApplicationService staffApplicationService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final MailNotificationService mailNotificationService;
    private final String frontendBaseUrl;
    private final long passwordResetExpiryMinutes;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            StaffApplicationService staffApplicationService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            MailNotificationService mailNotificationService,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${app.auth.password-reset.expiry-minutes:30}") long passwordResetExpiryMinutes) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.staffApplicationService = staffApplicationService;
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

        if (userRepository.findByEmail(dto.getEmail()).isPresent() || userRepository.findByName(dto.getName()).isPresent()) {
            throw new IllegalArgumentException("Email or name already in use");
        }

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole("user");
        user.setSpecialization(dto.getSpecialization());

        userRepository.save(user);

        return new RegistrationResponse(
                RegistrationResponse.OUTCOME_USER_REGISTERED,
                "Account created. Sign in with your email and password.");
    }

    public UserDTO loginUser(String email, String password) {

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

        return new UserDTO(user.getUserId(), user.getName(), user.getEmail(), user.getRole(), user.getSpecialization());
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> new UserDTO(user.getUserId(), user.getName(), user.getEmail(), user.getRole(), user.getSpecialization()))
                .toList();
    }

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

}
