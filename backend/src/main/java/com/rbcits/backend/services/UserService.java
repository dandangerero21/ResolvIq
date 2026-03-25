package com.rbcits.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.rbcits.backend.repositories.UserRepository;
import com.rbcits.backend.DTOs.UserDTO;
import com.rbcits.backend.models.User;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserDTO createUser(UserDTO dto) {

        if (userRepository.findByEmail(dto.getEmail()).isPresent() || userRepository.findByName(dto.getName()).isPresent()) {
            throw new IllegalArgumentException("Email or name already in use");
        }

        if (dto.getRole() == null || (!dto.getRole().equals("user") && !dto.getRole().equals("staff"))) {
            throw new IllegalArgumentException("Role must be either 'user' or 'staff'");
        }

        if (dto.getRole().equals("staff") && (dto.getSpecialization() == null || dto.getSpecialization().isEmpty())) {
            throw new IllegalArgumentException("Specialization is required for staff");
        }

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole(dto.getRole());
        user.setSpecialization(dto.getSpecialization());

        User savedUser = userRepository.save(user);
        return new UserDTO(savedUser.getUserId(), savedUser.getName(), savedUser.getEmail(), savedUser.getRole(), savedUser.getSpecialization());
    }

    public UserDTO loginUser(String email, String password) {

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + email);
        }

        if(email == null || email.isEmpty()) {
            throw new IllegalArgumentException("Email cannot be empty.");
        }

        if(password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
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

}
