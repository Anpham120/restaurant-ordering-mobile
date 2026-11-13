package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Photo the shipper takes when handing the order over; required to mark an order delivered.
 * Kept out of {@link Order} so lists of orders never load the image bytes. The shipper is {@code orders.shipper_id}.
 */
@Entity @Table(name = "delivery_proofs") @Getter @Setter
public class DeliveryProof {
    public static final int MAX_BYTES = 700 * 1024;

    @Id @Column(name = "order_id") private Long orderId;
    @MapsId @OneToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @Column(nullable = false, length = MAX_BYTES) private byte[] photo;
    @Column(name = "content_type", nullable = false, length = 20) private String contentType;
    @Column(name = "taken_at", nullable = false) private LocalDateTime takenAt;
}
