package com.rbcits.backend.configs;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * Registers {@link org.springframework.mail.javamail.JavaMailSender} only when Postmark HTTP is not in use
 * ({@code POSTMARK_SERVER_TOKEN} unset) and an SMTP host is configured.
 */
public class SmtpWhenNoPostmarkCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String token = context.getEnvironment().getProperty("POSTMARK_SERVER_TOKEN", "");
        if (StringUtils.hasText(token)) {
            return false;
        }
        String host = context.getEnvironment().getProperty("spring.mail.host", "");
        return StringUtils.hasText(host);
    }
}
