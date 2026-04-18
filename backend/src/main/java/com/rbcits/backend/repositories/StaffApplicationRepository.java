package com.rbcits.backend.repositories;

import com.rbcits.backend.models.StaffApplication;
import com.rbcits.backend.models.StaffApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffApplicationRepository extends JpaRepository<StaffApplication, Long> {

    Optional<StaffApplication> findByEmail(String email);
    Optional<StaffApplication> findByEmailIgnoreCase(String email);

    List<StaffApplication> findByStatusOrderByCreatedAtAsc(StaffApplicationStatus status);
}
