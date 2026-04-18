package com.rbcits.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.rbcits.backend.models.Rating;
import com.rbcits.backend.models.User;
import com.rbcits.backend.models.Complaint;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

	List<Rating> findByStaff(User staff);
	List<Rating> findByUser(User user);
	Optional<Rating> findByComplaint(Complaint complaint);

	List<Rating> findByScoreBetweenOrderByRatingIdDesc(int minScore, int maxScore, Pageable pageable);

}
