package com.rbcits.backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.mail.internet.MimeMessage;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class MailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MailNotificationService.class);
    private static final URI POSTMARK_EMAIL_URI = URI.create("https://api.postmarkapp.com/email");

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String postmarkServerToken;
    private final boolean usePostmarkApi;
    private final boolean mailEnabled;
    private final String fromAddress;
    private final String adminNotifyEmail;
    private final String appName;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public MailNotificationService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${POSTMARK_SERVER_TOKEN:}") String postmarkServerToken,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:noreply@localhost}") String fromAddress,
            @Value("${app.mail.admin-notify:}") String adminNotifyEmail,
            @Value("${app.mail.app-name:ResolvIQ}") String appName) {
        this.mailSender = mailSender;
        this.postmarkServerToken = postmarkServerToken == null ? "" : postmarkServerToken.trim();
        this.usePostmarkApi = StringUtils.hasText(this.postmarkServerToken);
        this.mailEnabled = mailEnabled && (usePostmarkApi || mailSender != null);
        this.fromAddress = fromAddress;
        this.adminNotifyEmail = adminNotifyEmail == null ? "" : adminNotifyEmail.trim();
        this.appName = appName;
    }

    /** Fallback plain-only send (e.g. if MIME fails). */
    public void sendPlain(String to, String subject, String text) {
        if (!mailEnabled || to == null || to.isBlank()) {
            return;
        }
        if (usePostmarkApi) {
            try {
                sendViaPostmark(to, subject, text, null);
            } catch (Exception e) {
                log.warn("Failed to send email to {}: {}", to, e.getMessage());
            }
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendHtmlMultipart(String to, String subject, String plainText, String htmlBody) {
        if (!mailEnabled || to == null || to.isBlank()) {
            return;
        }
        if (usePostmarkApi) {
            try {
                sendViaPostmark(to, subject, plainText, htmlBody);
            } catch (Exception e) {
                log.warn("Failed to send HTML email to {}: {}", to, e.getMessage());
                try {
                    sendViaPostmark(to, subject, plainText, null);
                } catch (Exception e2) {
                    log.warn("Postmark plain fallback failed for {}: {}", to, e2.getMessage());
                }
            }
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(plainText, htmlBody);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send HTML email to {}: {}", to, e.getMessage());
            sendPlain(to, subject, plainText);
        }
    }

    private void sendViaPostmark(String to, String subject, String plainText, String htmlBody) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("From", fromAddress);
        root.put("To", to);
        root.put("Subject", subject);
        root.put("TextBody", plainText == null ? "" : plainText);
        if (htmlBody != null && !htmlBody.isBlank()) {
            root.put("HtmlBody", htmlBody);
        }
        root.put("MessageStream", "outbound");

        String json = objectMapper.writeValueAsString(root);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(POSTMARK_EMAIL_URI)
                .timeout(Duration.ofSeconds(30))
                .header("X-Postmark-Server-Token", postmarkServerToken)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String detail = response.body();
            try {
                JsonNode err = objectMapper.readTree(detail);
                if (err.has("Message")) {
                    detail = err.get("Message").asText();
                }
            } catch (Exception ignored) {
                // keep raw body
            }
            throw new IllegalStateException("Postmark HTTP " + response.statusCode() + ": " + detail);
        }
    }

    public void notifyAdminNewStaffApplication(String applicantName, String applicantEmail, String specialization) {
        if (adminNotifyEmail.isBlank()) {
            log.debug("app.mail.admin-notify not set; skipping admin notification for staff application");
            return;
        }
        String subject = "[" + appName + "] New staff application — " + applicantEmail;
        String plain = String.format(
                "A new staff application was submitted on %s.%n%nName: %s%nEmail: %s%nSpecialization: %s%n%nReview pending applications in the admin dashboard.",
                appName, applicantName, applicantEmail, specialization);

        String rows = EmailHtmlTemplates.detailRow("Name", applicantName)
                + EmailHtmlTemplates.detailRow("Email", applicantEmail)
                + EmailHtmlTemplates.detailRow("Specialization", specialization);
        String inner =
                EmailHtmlTemplates.paragraph(
                        "Someone applied for a <strong style=\"color:"
                                + EmailHtmlTemplates.ACCENT
                                + ";\">staff</strong> role. Review them in the admin dashboard.")
                + EmailHtmlTemplates.detailsTable(rows)
                + EmailHtmlTemplates.mutedLine("Submitted through " + EmailHtmlTemplates.escape(appName) + ".");

        String html = EmailHtmlTemplates.layout(appName, "New staff application", inner);
        sendHtmlMultipart(adminNotifyEmail, subject, plain, html);
    }

    public void notifyApplicantStaffApproved(String applicantEmail, String applicantName) {
        String subject = "[" + appName + "] Staff application approved";
        String plain = String.format(
                "Hello %s,%n%nYour staff application for %s has been approved. You can now sign in with the email and password you used when you applied.%n",
                applicantName, appName);

        String inner =
                EmailHtmlTemplates.paragraph("Hello " + EmailHtmlTemplates.escape(applicantName) + ",")
                        + EmailHtmlTemplates.paragraph(
                                "Your staff application for <strong style=\"color:"
                                        + EmailHtmlTemplates.TEXT
                                        + ";\">"
                                        + EmailHtmlTemplates.escape(appName)
                                        + "</strong> has been <strong style=\"color:"
                                        + EmailHtmlTemplates.ACCENT
                                        + ";\">approved</strong>.")
                        + EmailHtmlTemplates.paragraph(
                                "You can sign in with the email and password you used when you applied.")
                        + EmailHtmlTemplates.callout(
                                true,
                                "You’re cleared to use the staff dashboard. Welcome to the team.");

        String html = EmailHtmlTemplates.layout(appName, "You’re approved", inner);
        sendHtmlMultipart(applicantEmail, subject, plain, html);
    }

    public void notifyApplicantStaffRejected(String applicantEmail, String applicantName, String note) {
        String extraPlain =
                (note == null || note.isBlank()) ? "" : String.format("%n%nNote from the team:%n%s%n", note.trim());
        String subject = "[" + appName + "] Staff application update";
        String plain = String.format(
                "Hello %s,%n%nYour staff application for %s was not approved at this time.%s",
                applicantName, appName, extraPlain);

        String inner =
                EmailHtmlTemplates.paragraph("Hello " + EmailHtmlTemplates.escape(applicantName) + ",")
                        + EmailHtmlTemplates.paragraph(
                                "Your staff application for "
                                        + EmailHtmlTemplates.escape(appName)
                                        + " was not approved at this time.");

        if (note != null && !note.isBlank()) {
            inner += EmailHtmlTemplates.callout(
                    false,
                    "<strong style=\"color:"
                            + EmailHtmlTemplates.TEXT
                            + ";\">Note from the team</strong><br/><span style=\"color:"
                            + EmailHtmlTemplates.MUTED
                            + ";\">"
                            + EmailHtmlTemplates.escape(note.trim()).replace("\n", "<br/>")
                            + "</span>");
        }

        inner += EmailHtmlTemplates.mutedLine("You may apply again later if applications reopen.");

        String html = EmailHtmlTemplates.layout(appName, "Application update", inner);
        sendHtmlMultipart(applicantEmail, subject, plain, html);
    }
}
