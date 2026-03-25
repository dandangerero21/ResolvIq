package com.rbcits.backend.controllers;

import com.rbcits.backend.DTOs.ComplaintDTO;
import com.rbcits.backend.services.ComplaintService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "http://localhost:5173")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public ComplaintDTO createComplaint(@RequestBody ComplaintDTO dto, 
                                       @RequestParam Long userId) {
        return complaintService.createComplaint(dto, userId);
    }

    @GetMapping("/{id}")
    public ComplaintDTO getComplaintById(@PathVariable Long id) {
        return complaintService.getComplaintById(id);
    }

    @GetMapping("/user/{userId}")
    public List<ComplaintDTO> getUserComplaints(@PathVariable Long userId) {
        return complaintService.getUserComplaints(userId);
    }

    @GetMapping("/status/{status}")
    public List<ComplaintDTO> getComplaintsByStatus(@PathVariable String status) {
        return complaintService.getComplaintsByStatus(status);
    }

    @GetMapping
    public List<ComplaintDTO> getAllComplaints() {
        return complaintService.getAllComplaints();
    }

    @PutMapping("/{id}/status")
    public ComplaintDTO updateComplaintStatus(@PathVariable Long id, 
                                             @RequestParam String status) {
        return complaintService.updateComplaintStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void deleteComplaint(@PathVariable Long id) {
        complaintService.deleteComplaint(id);
    }
}
