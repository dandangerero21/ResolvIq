package com.rbcits.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.rbcits.backend.models.Message;
import com.rbcits.backend.models.Complaint;
import com.rbcits.backend.models.User;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByComplaintOrderByTimestampAsc(Complaint complaint);

    List<Message> findBySender(User sender);

    boolean existsByComplaintAndIsSystemMessageTrueAndContentContainingIgnoreCase(Complaint complaint, String content);
}
