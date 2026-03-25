package com.rbcits.backend.controllers;

import com.rbcits.backend.DTOs.RatingDTO;
import com.rbcits.backend.services.RatingService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping
    public RatingDTO createRating(@RequestParam Long complaintId,
                                 @RequestParam Long staffId,
                                 @RequestParam Long userId,
                                 @RequestParam int score,
                                 @RequestParam String feedback) {
        return ratingService.createRating(complaintId, staffId, userId, score, feedback);
    }

    @GetMapping("/staff/{staffId}")
    public List<RatingDTO> getStaffRatings(@PathVariable Long staffId) {
        return ratingService.getStaffRatings(staffId);
    }

    @GetMapping("/complaint/{complaintId}")
    public RatingDTO getRatingByComplaintId(@PathVariable Long complaintId) {
        return ratingService.getRatingByComplaintId(complaintId);
    }

    @DeleteMapping("/{id}")
    public void deleteRating(@PathVariable Long id) {
        ratingService.deleteRating(id);
    }
}
