package com.restaurant.orderingsystem.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/** Minimal HS256 JWT: header.payload.signature, claims sub (user id), role, exp. */
@Service
public class JwtService {
    public record Claims(long userId, Role role, int version) {}

    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();
    private final byte[] key;
    private final long ttlSeconds;
    private final ObjectMapper om = new ObjectMapper();

    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.ttl-hours:12}") long ttlHours) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("app.jwt.secret (APP_JWT_SECRET) must be at least 32 bytes");
        }
        this.key = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlHours * 3600;
    }

    public long ttlSeconds() { return ttlSeconds; }

    public String issue(User u) {
        try {
            String header = ENC.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            String payload = ENC.encodeToString(om.writeValueAsBytes(Map.of(
                    "sub", String.valueOf(u.getId()), "role", u.getRole().name(), "ver", u.getTokenVersion(),
                    "exp", Instant.now().getEpochSecond() + ttlSeconds)));
            return header + "." + payload + "." + sign(header + "." + payload);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    public Optional<Claims> verify(String token) {
        try {
            String[] p = token.split("\\.");
            if (p.length != 3) return Optional.empty();
            if (!MessageDigest.isEqual(sign(p[0] + "." + p[1]).getBytes(StandardCharsets.UTF_8), p[2].getBytes(StandardCharsets.UTF_8))) return Optional.empty();
            var node = om.readTree(DEC.decode(p[1]));
            if (node.get("exp").asLong() < Instant.now().getEpochSecond()) return Optional.empty();
            return Optional.of(new Claims(node.get("sub").asLong(), Role.valueOf(node.get("role").asText()),
                    node.hasNonNull("ver") ? node.get("ver").asInt() : -1));
        } catch (Exception e) { return Optional.empty(); }
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return ENC.encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
