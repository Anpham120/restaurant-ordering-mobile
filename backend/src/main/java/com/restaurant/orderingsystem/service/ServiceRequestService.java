package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.NotFoundException;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {
    private final ServiceRequestRepository requests;
    private final RestaurantTableRepository tables;

    @Transactional
    public ServiceRequestResponse create(ServiceRequestCreate req) {
        RestaurantTable t = tables.findByQrToken(req.qrToken()).orElseThrow(() -> new NotFoundException("Table not found for QR token"));
        ServiceRequest s = new ServiceRequest();
        s.setTable(t);
        s.setType(req.type());
        return ServiceRequestResponse.of(requests.save(s));
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestResponse> list(RequestStatus status) {
        return requests.findByStatusOrderByCreatedAtAsc(status).stream().map(ServiceRequestResponse::of).toList();
    }

    @Transactional
    public ServiceRequestResponse done(Long id) {
        ServiceRequest s = requests.findById(id).orElseThrow(() -> new NotFoundException("Request not found: " + id));
        s.setStatus(RequestStatus.DONE);
        return ServiceRequestResponse.of(s);
    }
}
