package com.rbcits.backend.services;

import com.rbcits.backend.DTOs.SpecializationDTO;
import com.rbcits.backend.models.Specialization;
import com.rbcits.backend.repositories.SpecializationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpecializationService {

    @Autowired
    private SpecializationRepository specializationRepository;

    public List<SpecializationDTO> getAllSpecializations() {
        return specializationRepository.findAll()
                .stream()
                .map(spec -> new SpecializationDTO(spec.getSpecializationId(), spec.getName(), spec.getDescription()))
                .collect(Collectors.toList());
    }

    public SpecializationDTO getSpecializationById(Long id) {
        return specializationRepository.findById(id)
                .map(spec -> new SpecializationDTO(spec.getSpecializationId(), spec.getName(), spec.getDescription()))
                .orElseThrow(() -> new RuntimeException("Specialization not found"));
    }

    public SpecializationDTO createSpecialization(SpecializationDTO dto) {
        Specialization specialization = new Specialization(dto.getName(), dto.getDescription());
        Specialization saved = specializationRepository.save(specialization);
        return new SpecializationDTO(saved.getSpecializationId(), saved.getName(), saved.getDescription());
    }

    public SpecializationDTO updateSpecialization(Long id, SpecializationDTO dto) {
        Specialization specialization = specializationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Specialization not found"));
        specialization.setName(dto.getName());
        specialization.setDescription(dto.getDescription());
        Specialization updated = specializationRepository.save(specialization);
        return new SpecializationDTO(updated.getSpecializationId(), updated.getName(), updated.getDescription());
    }

    public void deleteSpecialization(Long id) {
        specializationRepository.deleteById(id);
    }
}
