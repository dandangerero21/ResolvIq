package com.rbcits.backend.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import com.rbcits.backend.models.User;

@Service
public class AuthTokenService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String DEFAULT_LOCAL_SECRET = "dev-local-change-me";

    private final byte[] signingSecret;
    private final long tokenExpiryMinutes;

    public AuthTokenService(
            @Value("${app.auth.token.secret:${APP_AUTH_TOKEN_SECRET:" + DEFAULT_LOCAL_SECRET + "}}") String configuredSecret,
            @Value("${app.auth.token.expiry-minutes:${AUTH_TOKEN_EXPIRY_MINUTES:10080}}") long tokenExpiryMinutes) {
        this.signingSecret = normalizeSecret(configuredSecret).getBytes(StandardCharsets.UTF_8);
        this.tokenExpiryMinutes = Math.max(5L, tokenExpiryMinutes);
    }

    public String issueToken(User user) {
        if (user == null || user.getUserId() == null) {
            throw new IllegalArgumentException("Cannot issue token for unknown user.");
        }

        long expiryEpochSeconds = Instant.now().plusSeconds(tokenExpiryMinutes * 60L).getEpochSecond();
        String payload = user.getUserId() + ":" + expiryEpochSeconds;
        String payloadB64 = encode(payload.getBytes(StandardCharsets.UTF_8));
        String signatureB64 = sign(payloadB64);
        return payloadB64 + "." + signatureB64;
    }

    public Long extractUserIdFromAuthorizationHeader(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        return extractUserId(token);
    }

    private Long extractUserId(String token) {
        String[] tokenParts = token.split("\\.", 2);
        if (tokenParts.length != 2) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        String payloadB64 = tokenParts[0];
        String providedSignatureB64 = tokenParts[1];
        String expectedSignatureB64 = sign(payloadB64);

        boolean signatureMatch = MessageDigest.isEqual(
                expectedSignatureB64.getBytes(StandardCharsets.UTF_8),
                providedSignatureB64.getBytes(StandardCharsets.UTF_8));
        if (!signatureMatch) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        String[] payloadParts = payload.split(":", 2);
        if (payloadParts.length != 2) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        long userId;
        long expiryEpochSeconds;
        try {
            userId = Long.parseLong(payloadParts[0]);
            expiryEpochSeconds = Long.parseLong(payloadParts[1]);
        } catch (NumberFormatException ex) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        if (userId <= 0L) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        if (Instant.now().getEpochSecond() >= expiryEpochSeconds) {
            throw new BadCredentialsException("Authentication token expired.");
        }

        return userId;
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication token is required.");
        }

        String header = authorizationHeader.trim();
        if (!header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            throw new BadCredentialsException("Invalid authentication token.");
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication token is required.");
        }

        return token;
    }

    private String sign(String payloadB64) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(signingSecret, HMAC_SHA256));
            byte[] signatureBytes = mac.doFinal(payloadB64.getBytes(StandardCharsets.UTF_8));
            return encode(signatureBytes);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign authentication token.", ex);
        }
    }

    private String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private String normalizeSecret(String configuredSecret) {
        if (configuredSecret == null) {
            return DEFAULT_LOCAL_SECRET;
        }
        String trimmed = configuredSecret.trim();
        return trimmed.isEmpty() ? DEFAULT_LOCAL_SECRET : trimmed;
    }
}