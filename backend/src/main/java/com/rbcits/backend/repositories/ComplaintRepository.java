package com.rbcits.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.User;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    
    List<Complaint> findByCreatedBy(User user);
    List<Complaint> findByStatus(String status);
}
