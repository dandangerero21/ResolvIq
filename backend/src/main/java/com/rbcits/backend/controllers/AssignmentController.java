package com.rbcits.backend.controllers;






import com.rbcits.backend.DTOs.AssignmentDTO;
import com.rbcits.backend.services.AssignmentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@CrossOrigin(origins = "http://localhost:5173")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @PostMapping
    public AssignmentDTO assignComplaint(@RequestParam Long complaintId,
                                        @RequestParam Long staffId) {
        return assignmentService.assignComplaint(complaintId, staffId);
    }

    @GetMapping("/staff/{staffId}")
    public List<AssignmentDTO> getStaffAssignments(@PathVariable Long staffId) {
        return assignmentService.getStaffAssignments(staffId);
    }

    @GetMapping("/complaint/{complaintId}")
    public AssignmentDTO getAssignmentByComplaintId(@PathVariable Long complaintId) {
        return assignmentService.getAssignmentByComplaintId(complaintId);
    }

    @DeleteMapping("/{id}")
    public void deleteAssignment(@PathVariable Long id) {
        assignmentService.deleteAssignment(id);
    }
}
