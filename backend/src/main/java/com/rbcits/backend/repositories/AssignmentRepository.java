package com.rbcits.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.rbcits.backend.models.Assignment;
import com.rbcits.backend.models.User;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

	List<Assignment> findByAssignedTo(User assignedTo);

}
