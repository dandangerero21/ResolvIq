package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.RatingDTO;
import com.rbcits.backend.DTOs.RatingTestimonialDTO;
import com.rbcits.backend.models.Rating;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.User;
import com.rbcits.backend.repositories.RatingRepository;
import com.rbcits.backend.repositories.ComplaintRepository;
import com.rbcits.backend.repositories.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RatingService {

    private final RatingRepository ratingRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public RatingService(RatingRepository ratingRepository,
                        ComplaintRepository complaintRepository,
                        UserRepository userRepository) {
        this.ratingRepository = ratingRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }

    public RatingDTO createRating(Long complaintId, Long staffId, Long userId, int score, String feedback) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found with ID: " + complaintId));
        
        // Check if rating already exists for this complaint
        Optional<Rating> existingRating = ratingRepository.findByComplaint(complaint);
        
        // If rating exists, update it instead
        if (existingRating.isPresent()) {
            Rating rating = existingRating.get();
            rating.setScore(score);
            rating.setFeedback(feedback != null ? feedback : "");
            Rating updated = ratingRepository.save(rating);
            return convertToDTO(updated);
        }
        
        // Determine the actual staff ID to use
        Long finalStaffId;
        if (staffId != null && staffId > 0) {
            finalStaffId = staffId;
        } else {
            // Try to get from assignment
            if (complaint.getAssignment() != null && complaint.getAssignment().getAssignedTo() != null) {
                finalStaffId = complaint.getAssignment().getAssignedTo().getUserId();
            } else {
                throw new IllegalArgumentException("No staff assigned to this complaint. Cannot submit rating without assignment.");
            }
        }
        
        User staff = userRepository.findById(finalStaffId)
                .orElseThrow(() -> new IllegalArgumentException("Staff member not found with ID: " + finalStaffId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        if (score < 1 || score > 5) {
            throw new IllegalArgumentException("Score must be between 1 and 5");
        }

        Rating rating = new Rating();
        rating.setComplaint(complaint);
        rating.setStaff(staff);
        rating.setUser(user);
        rating.setScore(score);
        rating.setFeedback(feedback != null ? feedback : "");

        Rating saved = ratingRepository.save(rating);

        return convertToDTO(saved);
    }

    public List<RatingDTO> getStaffRatings(Long staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Staff not found"));
        
        return ratingRepository.findByStaff(staff).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public RatingDTO getRatingByComplaintId(Long complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));
        
        if (complaint.getRating() == null) {
            throw new IllegalArgumentException("No rating found for this complaint");
        }
        return convertToDTO(complaint.getRating());
    }

    public void deleteRating(Long id) {
        if (!ratingRepository.existsById(id)) {
            throw new IllegalArgumentException("Rating not found");
        }
        ratingRepository.deleteById(id);
    }

    /**
     * Ratings with scores 4–5 and non-empty feedback, newest first, for the marketing homepage.
     */
    @Transactional(readOnly = true)
    public List<RatingTestimonialDTO> getPublicTestimonials(int limit) {
        int cap = Math.min(Math.max(limit, 1), 50);
        int fetchSize = Math.min(cap * 4, 200);
        Pageable pageable = PageRequest.of(0, fetchSize);
        return ratingRepository.findByScoreBetweenOrderByRatingIdDesc(4, 5, pageable).stream()
                .filter(r -> r.getFeedback() != null && !r.getFeedback().isBlank())
                .limit(cap)
                .map(this::toTestimonialDTO)
                .collect(Collectors.toList());
    }

    private RatingTestimonialDTO toTestimonialDTO(Rating r) {
        User u = r.getUser();
        String name = (u != null && u.getName() != null && !u.getName().isBlank())
                ? u.getName().trim()
                : "Customer";
        return new RatingTestimonialDTO(
                r.getRatingId(),
                r.getScore(),
                r.getFeedback().trim(),
                name,
                formatAuthorRole(u));
    }

    private String formatAuthorRole(User u) {
        if (u == null || u.getRole() == null || u.getRole().isBlank()) {
            return "";
        }
        String role = u.getRole().trim();
        if (role.equalsIgnoreCase("user")) {
            return "";
        }
        return Character.toUpperCase(role.charAt(0)) + role.substring(1).toLowerCase();
    }

    private RatingDTO convertToDTO(Rating rating) {
        return new RatingDTO(
            rating.getRatingId(),
            rating.getScore(),
            rating.getFeedback(),
            rating.getComplaint() != null ? rating.getComplaint().getComplaintId() : null,
            rating.getStaff() != null ? rating.getStaff().getUserId() : null,
            rating.getStaff() != null ? rating.getStaff().getName() : null,
            rating.getUser() != null ? rating.getUser().getUserId() : null,
            rating.getUser() != null ? rating.getUser().getName() : null
        );
    }
}
