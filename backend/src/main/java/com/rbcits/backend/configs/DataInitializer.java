package com.rbcits.backend.configs;

import com.rbcits.backend.models.User;
import com.rbcits.backend.models.Specialization;
import com.rbcits.backend.models.Category;
import com.rbcits.backend.repositories.UserRepository;
import com.rbcits.backend.repositories.SpecializationRepository;
import com.rbcits.backend.repositories.CategoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SpecializationRepository specializationRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, SpecializationRepository specializationRepository, 
                          CategoryRepository categoryRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.specializationRepository = specializationRepository;
        this.categoryRepository = categoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
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
        if (userRepository.findByEmail("admin@example.com").isEmpty()) {
            User admin = new User();
            admin.setName("Administrator");
            admin.setEmail("admin@example.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("admin");
            admin.setSpecialization(null);
            userRepository.save(admin);
            System.out.println("Admin user created: admin@example.com / admin123");
        }
    }
}
