package com.rbcits.backend.services;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class MessageImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif");

    private final Path storagePath;
    private final long maxFileSizeBytes;

    public MessageImageStorageService(
            @Value("${app.chat.image.upload-dir:uploads/message-images}") String uploadDir,
            @Value("${app.chat.image.max-bytes:5242880}") long maxFileSizeBytes) {
        this.storagePath = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @PostConstruct
    public void ensureStorageDirectory() {
        try {
            Files.createDirectories(storagePath);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize chat image storage directory.", ex);
        }
    }

    public StoredImage store(MultipartFile imageFile) {
        validateImage(imageFile);

        String originalName = StringUtils.cleanPath(
                imageFile.getOriginalFilename() == null ? "image" : imageFile.getOriginalFilename());
        String contentType = normalizeContentType(imageFile.getContentType());
        String extension = extensionFor(originalName, contentType);
        String fileName = UUID.randomUUID().toString().replace("-", "") + extension;

        Path destination = resolveValidatedPath(fileName);
        try (var inputStream = imageFile.getInputStream()) {
            Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store uploaded image.", ex);
        }

        return new StoredImage(fileName, originalName, contentType);
    }

    public Resource loadAsResource(String fileName) {
        Path filePath = resolveValidatedPath(fileName);
        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("Image not found.");
        }

        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException ex) {
            throw new IllegalArgumentException("Invalid image path.", ex);
        }
    }

    public String resolveContentType(String fileName) {
        Path filePath = resolveValidatedPath(fileName);

        try {
            String probed = Files.probeContentType(filePath);
            if (probed != null && !probed.isBlank()) {
                return probed;
            }
        } catch (IOException ignored) {
            // Fallback below
        }

        return switch (extensionFor(filePath.getFileName().toString(), null)) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".webp" -> "image/webp";
            case ".gif" -> "image/gif";
            default -> "application/octet-stream";
        };
    }

    public void deleteIfExists(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return;
        }

        try {
            Files.deleteIfExists(resolveValidatedPath(fileName));
        } catch (IOException ignored) {
            // Best-effort cleanup.
        }
    }

    private void validateImage(MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            throw new IllegalArgumentException("Please select an image to upload.");
        }

        if (imageFile.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("Image is too large. Maximum allowed size is 5 MB.");
        }

        String contentType = normalizeContentType(imageFile.getContentType());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPG, PNG, WEBP, and GIF images are allowed.");
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }

        String normalized = contentType.toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(normalized)) {
            return "image/jpeg";
        }

        return normalized;
    }

    private String extensionFor(String fileName, String contentType) {
        String normalizedName = fileName == null ? "" : fileName;
        int lastDot = normalizedName.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < normalizedName.length() - 1) {
            String ext = normalizedName.substring(lastDot).toLowerCase(Locale.ROOT);
            if (ext.equals(".jpg") || ext.equals(".jpeg") || ext.equals(".png") || ext.equals(".webp")
                    || ext.equals(".gif")) {
                return ext.equals(".jpg") ? ".jpeg" : ext;
            }
        }

        if (contentType == null) {
            return "";
        }

        return switch (contentType) {
            case "image/jpeg" -> ".jpeg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    private Path resolveValidatedPath(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("Invalid image path.");
        }

        Path normalized = Paths.get(fileName).normalize();
        if (normalized.getNameCount() != 1) {
            throw new IllegalArgumentException("Invalid image path.");
        }

        Path resolved = storagePath.resolve(normalized).normalize();
        if (!resolved.startsWith(storagePath)) {
            throw new IllegalArgumentException("Invalid image path.");
        }

        return resolved;
    }

    public record StoredImage(String fileName, String originalName, String contentType) {
    }
}