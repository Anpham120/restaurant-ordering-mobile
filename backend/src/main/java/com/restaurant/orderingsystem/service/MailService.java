package com.restaurant.orderingsystem.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Sends e-mail through SMTP (e.g. Gmail with an App Password). Without SMTP credentials (local development, tests)
 * messages are logged and kept in an in-memory outbox instead, so flows like "forgot password" still work.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {
    public record Mail(String to, String subject, String body) {}

    private final JavaMailSender sender;
    @Value("${spring.mail.username:}") private String username;
    @Value("${app.mail.from:}") private String from;
    @Value("${app.mail.from-name:Atlas Restaurant}") private String fromName;
    /** Write unsent mails (subject and body, which hold reset codes) to the log: development only, off in production. */
    @Value("${app.mail.log-content:true}") private boolean logContent;
    private final List<Mail> outbox = Collections.synchronizedList(new ArrayList<>());

    public boolean enabled() { return username != null && !username.isBlank(); }

    @Async
    public void send(String to, String subject, String body) {
        if (!enabled()) {
            outbox.add(new Mail(to, subject, body));
            if (logContent) log.info("[mail disabled] to={} subject={}\n{}", to, subject, body);
            else log.warn("[mail disabled] SMTP is not configured: a mail to {} was not sent (set SMTP_USERNAME / SMTP_PASSWORD)", to);
            return;
        }
        try {
            MimeMessage m = sender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(m, false, StandardCharsets.UTF_8.name());
            h.setFrom(new InternetAddress(from == null || from.isBlank() ? username : from, fromName, StandardCharsets.UTF_8.name()));
            h.setTo(to);
            h.setSubject(subject);
            h.setText(body, false);
            sender.send(m);
        } catch (Exception e) {
            log.error("Could not send e-mail to {}: {}", to, e.getMessage());
        }
    }

    /** Messages "sent" while SMTP is not configured (development/tests only). */
    public List<Mail> outbox() { return List.copyOf(outbox); }
}
