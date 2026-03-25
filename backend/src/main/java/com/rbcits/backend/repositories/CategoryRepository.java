package com.rbcits.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.rbcits.backend.models.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

}
