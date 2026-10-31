package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.entity.Role;

/** The authenticated user of the current request (role re-read from the DB on every request). */
public record AuthUser(long id, String fullName, Role role) {}
