package com.rbcits.backend.controllers;

import com.rbcits.backend.DTOs.StaffApplicationReviewRequest;
import com.rbcits.backend.DTOs.StaffApplicationViewDTO;
import com.rbcits.backend.services.StaffApplicationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/staff-applications")
public class StaffApplicationController {

    private final StaffApplicationService staffApplicationService;

    public StaffApplicationController(StaffApplicationService staffApplicationService) {
        this.staffApplicationService = staffApplicationService;
    }

    @GetMapping("/pending")
    public List<StaffApplicationViewDTO> listPending() {
        return staffApplicationService.listPending();
    }

    @PostMapping("/{id}/approve")
    public StaffApplicationViewDTO approve(
            @PathVariable long id,
            @RequestBody(required = false) StaffApplicationReviewRequest body) {
        Long reviewerId = body != null ? body.getReviewerUserId() : null;
        return staffApplicationService.approve(id, reviewerId);
    }

    @PostMapping("/{id}/reject")
    public StaffApplicationViewDTO reject(@PathVariable long id, @RequestBody(required = false) StaffApplicationReviewRequest body) {
        Long reviewerId = body != null ? body.getReviewerUserId() : null;
        String note = body != null ? body.getNote() : null;
        return staffApplicationService.reject(id, reviewerId, note);
    }
}
