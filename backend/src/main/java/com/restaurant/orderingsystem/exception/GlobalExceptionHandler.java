package com.restaurant.orderingsystem.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status.value());
        m.put("error", message);
        return ResponseEntity.status(status).body(m);
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Map<String, Object>> notFound(NotFoundException e) { return body(HttpStatus.NOT_FOUND, e.getMessage()); }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<Map<String, Object>> badRequest(BadRequestException e) { return body(HttpStatus.BAD_REQUEST, e.getMessage()); }

    @ExceptionHandler(UnauthorizedException.class)
    ResponseEntity<Map<String, Object>> unauthorized(UnauthorizedException e) { return body(HttpStatus.UNAUTHORIZED, e.getMessage()); }

    @ExceptionHandler(ForbiddenException.class)
    ResponseEntity<Map<String, Object>> forbidden(ForbiddenException e) { return body(HttpStatus.FORBIDDEN, e.getMessage()); }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        StringBuilder sb = new StringBuilder();
        e.getBindingResult().getFieldErrors().forEach(f -> sb.append(f.getField()).append(": ").append(f.getDefaultMessage()).append("; "));
        return body(HttpStatus.BAD_REQUEST, sb.toString().trim());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String, Object>> unreadable(Exception e) { return body(HttpStatus.BAD_REQUEST, "Malformed request"); }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException e) {
        return body(HttpStatus.CONFLICT, "Data conflict: duplicate value or record is still referenced");
    }
}
