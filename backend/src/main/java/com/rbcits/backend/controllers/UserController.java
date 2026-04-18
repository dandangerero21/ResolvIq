package com.rbcits.backend.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import com.rbcits.backend.DTOs.PasswordResetCompleteDTO;
import com.rbcits.backend.DTOs.PasswordResetRequestDTO;
import com.rbcits.backend.DTOs.RegistrationResponse;
import com.rbcits.backend.DTOs.SimpleMessageResponse;
import com.rbcits.backend.DTOs.UserDTO;
import com.rbcits.backend.services.UserService;


@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }


    @PostMapping("/register")
    public RegistrationResponse registerUser(@RequestBody UserDTO userDTO) {
        return userService.createUser(userDTO);
    }

    @PostMapping("/login")
    public UserDTO loginUser(@RequestBody UserDTO userDTO) {
        return userService.loginUser(userDTO.getEmail(), userDTO.getPassword());
    }

    @PostMapping("/password-reset/request")
    public SimpleMessageResponse requestPasswordReset(@RequestBody PasswordResetRequestDTO request) {
        return userService.requestPasswordReset(request);
    }

    @GetMapping("/password-reset/validate")
    public SimpleMessageResponse validatePasswordResetToken(@RequestParam("token") String token) {
        return userService.validatePasswordResetToken(token);
    }

    @PostMapping("/password-reset/complete")
    public SimpleMessageResponse completePasswordReset(@RequestBody PasswordResetCompleteDTO request) {
        return userService.completePasswordReset(request);
    }

    @GetMapping
    public List<UserDTO> getAllUsers() {
        return userService.getAllUsers();
    }
}