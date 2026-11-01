package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.security.Caller;
import com.restaurant.orderingsystem.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final PasswordResetService reset;

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest r) { return auth.register(r); }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r, HttpServletRequest req) { return auth.login(r, req.getRemoteAddr()); }

    @GetMapping("/me")
    public UserResponse me() { return auth.me(); }

    @PutMapping("/profile")
    public UserResponse profile(@Valid @RequestBody ProfileRequest r) { return auth.updateProfile(r); }

    @PostMapping("/change-password")
    public AuthResponse changePassword(@Valid @RequestBody ChangePasswordRequest r) { return auth.changePassword(r); }

    @PostMapping("/forgot-password")
    public MessageResponse forgot(@Valid @RequestBody ForgotPasswordRequest r, HttpServletRequest req) {
        return new MessageResponse(reset.requestCode(r.login(), req.getRemoteAddr()));
    }

    @PostMapping("/reset-password")
    public MessageResponse reset(@Valid @RequestBody ResetPasswordRequest r) {
        reset.reset(r.login(), r.code(), r.newPassword());
        return new MessageResponse("Đã đặt lại mật khẩu, vui lòng đăng nhập bằng mật khẩu mới");
    }
}
