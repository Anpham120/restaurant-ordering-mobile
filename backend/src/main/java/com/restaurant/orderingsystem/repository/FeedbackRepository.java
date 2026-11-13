package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.Feedback;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable page);
    long countByCustomerIdAndCreatedAtAfter(Long customerId, LocalDateTime since);
    boolean existsByRepliedById(Long userId);
    long countByReplyIsNull();
    /** Waiting for a reply, oldest first: the longest-waiting customer is answered first. */
    List<Feedback> findByReplyIsNullOrderByCreatedAtAsc(Pageable page);
    List<Feedback> findByReplyIsNotNullOrderByRepliedAtDesc(Pageable page);
}
