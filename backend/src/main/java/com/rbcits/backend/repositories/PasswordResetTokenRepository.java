package com.rbcits.backend.repositories;

import com.rbcits.backend.models.PasswordResetToken;
import com.rbcits.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    List<PasswordResetToken> findByUserAndUsedAtIsNull(User user);
}
