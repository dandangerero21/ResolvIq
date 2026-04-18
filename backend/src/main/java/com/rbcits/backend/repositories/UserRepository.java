package com.rbcits.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.rbcits.backend.models.User;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByName(String name);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
}
