package com.rbcits.backend.DTOs;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonProperty.Access;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserDTO {
    private Long userId;
    private String name;
    private String email;

    @JsonProperty(access = Access.WRITE_ONLY)
    private String password;
    private String role;
    private String specialization;
    private Integer transferredCount;

    public UserDTO(Long userId, String name, String email, String role, String specialization, Integer transferredCount) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.specialization = specialization;
        this.transferredCount = transferredCount;
    }
}
