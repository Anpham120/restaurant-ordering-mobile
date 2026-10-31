package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.*;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api/service-requests") @RequiredArgsConstructor
public class ServiceRequestController {
    private final ServiceRequestService service;

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ServiceRequestResponse create(@Valid @RequestBody ServiceRequestCreate req) { return service.create(req); }

    @GetMapping
    public List<ServiceRequestResponse> list(@RequestParam(defaultValue = "OPEN") RequestStatus status) { return service.list(status); }

    @PatchMapping("/{id}/done")
    public ServiceRequestResponse done(@PathVariable Long id) { return service.done(id); }
}
