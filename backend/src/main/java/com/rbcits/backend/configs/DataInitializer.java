package com.rbcits.backend.configs;

import com.rbcits.backend.models.User;
import com.rbcits.backend.models.Specialization;
import com.rbcits.backend.models.Category;
import com.rbcits.backend.repositories.UserRepository;
import com.rbcits.backend.repositories.SpecializationRepository;
import com.rbcits.backend.repositories.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private static final String DEFAULT_ADMIN_EMAIL_B64 = "YWRtaW5AZXhhbXBsZS5jb20=";
    private static final String DEFAULT_ADMIN_PASSWORD_B64 = "YWRtaW4xMjM=";

    private final UserRepository userRepository;
    private final SpecializationRepository specializationRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public DataInitializer(UserRepository userRepository, SpecializationRepository specializationRepository, 
                          CategoryRepository categoryRepository, PasswordEncoder passwordEncoder,
                          JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.specializationRepository = specializationRepository;
        this.categoryRepository = categoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        ensureTransferredCountColumn();

        // Create default categories if not exists
        if (categoryRepository.count() == 0) {
            categoryRepository.save(new Category(null, "Technical Issue", null));
            categoryRepository.save(new Category(null, "Billing", null));
            categoryRepository.save(new Category(null, "Account Access", null));
            categoryRepository.save(new Category(null, "Product Defect", null));
            categoryRepository.save(new Category(null, "Service Quality", null));
            categoryRepository.save(new Category(null, "Other", null));
            System.out.println("Created 6 default categories");
        }

        // Create default specializations if not exists
        if (specializationRepository.findByName("Technical Support").isEmpty()) {
            specializationRepository.save(new Specialization("Technical Support", "Handles technical and software-related issues"));
            System.out.println("Created specialization: Technical Support");
        }
        if (specializationRepository.findByName("Billing").isEmpty()) {
            specializationRepository.save(new Specialization("Billing", "Handles billing and payment-related issues"));
            System.out.println("Created specialization: Billing");
        }
        if (specializationRepository.findByName("Account & Access").isEmpty()) {
            specializationRepository.save(new Specialization("Account & Access", "Handles account access and login issues"));
            System.out.println("Created specialization: Account & Access");
        }
        if (specializationRepository.findByName("Quality Assurance").isEmpty()) {
            specializationRepository.save(new Specialization("Quality Assurance", "Handles product defect and quality issues"));
            System.out.println("Created specialization: Quality Assurance");
        }
        if (specializationRepository.findByName("Customer Service").isEmpty()) {
            specializationRepository.save(new Specialization("Customer Service", "Handles general customer service and inquiries"));
            System.out.println("Created specialization: Customer Service");
        }

        // Create admin user if not exists
        String adminEmail = getSeedValue("APP_SEED_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL_B64);
        String adminPassword = getSeedValue("APP_SEED_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD_B64);

        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = new User();
            admin.setName("Administrator");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole("admin");
            admin.setSpecialization(null);
            userRepository.save(admin);
            System.out.println("Admin user created from seed configuration");
        }
    }

    private String getSeedValue(String envKey, String fallbackBase64) {
        String envValue = System.getenv(envKey);
        if (envValue != null && !envValue.isBlank()) {
            return envValue.trim();
        }
        return new String(Base64.getDecoder().decode(fallbackBase64), StandardCharsets.UTF_8);
    }

    private void ensureTransferredCountColumn() {
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS transferred_count INTEGER DEFAULT 0");
        jdbcTemplate.update("UPDATE users SET transferred_count = 0 WHERE transferred_count IS NULL");
        jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN transferred_count SET DEFAULT 0");
        jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN transferred_count SET NOT NULL");
        logger.info("Ensured users.transferred_count column exists");
    }
}
