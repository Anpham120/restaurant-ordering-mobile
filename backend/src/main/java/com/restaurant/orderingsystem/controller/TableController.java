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

@RestController @RequestMapping("/api/tables") @RequiredArgsConstructor
public class TableController {
    private final RestaurantTableRepository tables;

    @GetMapping("/qr/{token}")
    public RestaurantTable byQr(@PathVariable String token) {
        return tables.findByQrToken(token).orElseThrow(() -> new NotFoundException("Table not found for QR token"));
    }
}
