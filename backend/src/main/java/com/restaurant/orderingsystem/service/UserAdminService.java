package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** Manager tools: staff accounts (create, edit, lock) and customers (view, lock). */
@Service
@RequiredArgsConstructor
public class UserAdminService {
    private final UserRepository users;
    private final OrderRepository orders;
    private final OrderStatusHistoryRepository history;
    private final StoreSettingsRepository settings;
    private final PaymentRepository payments;
    private final org.springframework.security.crypto.password.PasswordEncoder encoder;

    @Transactional(readOnly = true)
    public List<UserResponse> staff() {
        return users.findAll(Sort.by("role", "fullName")).stream().filter(u -> u.getRole() != Role.CUSTOMER).map(UserResponse::of).toList();
    }

    @Transactional
    public UserResponse createStaff(StaffRequest r) {
        if (r.password() == null) throw ApiException.badRequest("Vui lòng nhập mật khẩu (tối thiểu 8 ký tự)");
        User u = new User();
        apply(u, r);
        u.setPasswordHash(encoder.encode(r.password()));
        return UserResponse.of(users.save(u));
    }

    @Transactional
    public UserResponse updateStaff(Long id, StaffRequest r) {
        User u = user(id);
        if (u.getRole() == Role.CUSTOMER) throw ApiException.badRequest("Đây là tài khoản khách hàng");
        if (u.getId().equals(Caller.id()) && (r.role() != Role.MANAGER || Boolean.FALSE.equals(r.active())))
            throw ApiException.badRequest("Không thể tự hạ quyền hoặc khóa tài khoản của chính mình");
        boolean losesManager = u.getRole() == Role.MANAGER && u.isActive() && (r.role() != Role.MANAGER || Boolean.FALSE.equals(r.active()));
        if (losesManager && users.countByRoleAndActiveTrue(Role.MANAGER) <= 1) throw ApiException.badRequest("Phải còn ít nhất một quản lý đang hoạt động");
        apply(u, r);
        if (r.password() != null) u.setPasswordHash(encoder.encode(r.password()));
        return UserResponse.of(u);
    }

    /** Deletes a staff account with no recorded activity; otherwise it must be locked instead. */
    @Transactional
    public void deleteStaff(Long id) {
        User u = user(id);
        if (u.getRole() == Role.CUSTOMER) throw ApiException.badRequest("Không xóa tài khoản khách hàng, hãy khóa tài khoản");
        if (u.getId().equals(Caller.id())) throw ApiException.badRequest("Không thể xóa tài khoản của chính mình");
        if (history.existsByChangedById(id) || settings.existsByUpdatedById(id) || payments.existsByConfirmedById(id))
            throw ApiException.conflict("Nhân viên đã có lịch sử xử lý đơn, hãy khóa tài khoản thay vì xóa");
        if (u.getRole() == Role.MANAGER && u.isActive() && users.countByRoleAndActiveTrue(Role.MANAGER) <= 1)
            throw ApiException.badRequest("Phải còn ít nhất một quản lý đang hoạt động");
        users.delete(u);
    }

    @Transactional(readOnly = true)
    public PageResponse<CustomerSummary> customers(String q, int page, int size) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        var spec = (org.springframework.data.jpa.domain.Specification<User>) (root, query, cb) -> {
            var p = cb.equal(root.get("role"), Role.CUSTOMER);
            if (needle.isEmpty()) return p;
            return cb.and(p, cb.or(cb.like(cb.lower(root.get("fullName")), "%" + needle + "%"), cb.like(root.get("phone"), "%" + needle + "%")));
        };
        var result = users.findAll(spec, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return PageResponse.of(result.map(u -> new CustomerSummary(u.getId(), u.getFullName(), u.getPhone(), u.getEmail(), u.isActive(), u.getCreatedAt(),
                orders.countByCustomerId(u.getId()))));
    }

    @Transactional
    public UserResponse setActive(Long id, boolean active) {
        User u = user(id);
        if (u.getId().equals(Caller.id())) throw ApiException.badRequest("Không thể tự khóa tài khoản của chính mình");
        if (!active && u.getRole() == Role.MANAGER && u.isActive() && users.countByRoleAndActiveTrue(Role.MANAGER) <= 1)
            throw ApiException.badRequest("Phải còn ít nhất một quản lý đang hoạt động");
        u.setActive(active);
        return UserResponse.of(u);
    }

    private User user(Long id) { return users.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản")); }

    private void apply(User u, StaffRequest r) {
        if (r.role() == Role.CUSTOMER) throw ApiException.badRequest("Tài khoản khách hàng do khách tự đăng ký");
        String email = AuthService.normalizeEmail(r.email());
        if (u.getId() == null ? users.existsByPhone(r.phone()) : users.existsByPhoneAndIdNot(r.phone(), u.getId()))
            throw ApiException.conflict("Số điện thoại đã được dùng");
        if (email != null && (u.getId() == null ? users.existsByEmailIgnoreCase(email) : users.existsByEmailIgnoreCaseAndIdNot(email, u.getId())))
            throw ApiException.conflict("Email đã được dùng");
        u.setFullName(r.fullName().trim());
        u.setPhone(r.phone());
        u.setEmail(email);
        u.setRole(r.role());
        if (r.active() != null) u.setActive(r.active());
    }
}
