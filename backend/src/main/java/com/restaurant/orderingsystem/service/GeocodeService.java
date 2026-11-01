package com.restaurant.orderingsystem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.restaurant.orderingsystem.dto.Dtos.GeoPlace;
import com.restaurant.orderingsystem.entity.StoreSettings;
import com.restaurant.orderingsystem.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Address search and reverse lookup through OpenStreetMap Nominatim, so a customer can pick a position without a map
 * SDK or a paid key. Follows the public usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * at most one request per second from the whole application, an identifying User-Agent, and cached answers.
 * Heavy traffic would need a commercial geocoder or a self-hosted Nominatim: only {@code app.geocode.url} changes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GeocodeService {
    private static final long MIN_GAP_MS = 1100;
    private static final long MAX_WAIT_MS = 3000;
    private static final long TTL_MS = Duration.ofHours(24).toMillis();
    private static final int CACHE_SIZE = 500;

    private final StoreService store;

    @Value("${app.geocode.url:https://nominatim.openstreetmap.org}") private String baseUrl;
    @Value("${app.geocode.user-agent:AtlasRestaurant/1.0 (+https://order.atlasplatform12.tech)}") private String userAgent;

    private RestClient client;
    private long nextSlot = 0;
    private final Map<String, Cached> cache = new LinkedHashMap<>(64, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, Cached> e) { return size() > CACHE_SIZE; }
    };

    private record Cached(long expiresAt, List<GeoPlace> places) {}

    private synchronized RestClient client() {
        if (client == null) {
            var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(4000);
            factory.setReadTimeout(6000);
            client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory)
                    .defaultHeader(HttpHeaders.USER_AGENT, userAgent).defaultHeader(HttpHeaders.ACCEPT_LANGUAGE, "vi").build();
        }
        return client;
    }

    /** Places matching the text, nearest to the restaurant first (Nominatim biases results to the area around it). */
    public List<GeoPlace> search(String text) {
        String q = text == null ? "" : text.trim();
        if (q.length() < 3) throw ApiException.badRequest("Nhập ít nhất 3 ký tự để tìm địa chỉ");
        return cached("s:" + q.toLowerCase(Locale.ROOT), () -> {
            StoreSettings s = store.settings();
            String view = "";
            if (s.getLatitude() != null && s.getLongitude() != null) {   // box of about +-0.35 degrees (~38 km) around the restaurant
                double lat = s.getLatitude().doubleValue(), lon = s.getLongitude().doubleValue();
                view = String.format(Locale.ROOT, "&viewbox=%.4f,%.4f,%.4f,%.4f", lon - 0.35, lat + 0.35, lon + 0.35, lat - 0.35);
            }
            String finalView = view;
            JsonNode body = call(u -> u.path("/search").query("q={q}&format=jsonv2&limit=6&countrycodes=vn&addressdetails=0" + finalView).build(q));
            List<GeoPlace> out = new ArrayList<>();
            if (body != null && body.isArray()) for (JsonNode n : body) out.add(place(n));
            return out;
        });
    }

    /** The address text for a GPS position, or an empty list when nothing is known there. */
    public List<GeoPlace> reverse(BigDecimal lat, BigDecimal lng) {
        BigDecimal la = lat.setScale(5, RoundingMode.HALF_UP), lo = lng.setScale(5, RoundingMode.HALF_UP);
        return cached("r:" + la + "," + lo, () -> {
            JsonNode n = call(u -> u.path("/reverse").query("lat={la}&lon={lo}&format=jsonv2&zoom=18").build(la, lo));
            return n == null || n.has("error") ? List.of() : List.of(place(n));
        });
    }

    private List<GeoPlace> cached(String key, java.util.function.Supplier<List<GeoPlace>> load) {
        long now = System.currentTimeMillis();
        synchronized (cache) {
            Cached c = cache.get(key);
            if (c != null && c.expiresAt() > now) return c.places();
        }
        List<GeoPlace> places = load.get();
        synchronized (cache) { cache.put(key, new Cached(System.currentTimeMillis() + TTL_MS, places)); }
        return places;
    }

    private JsonNode call(java.util.function.Function<org.springframework.web.util.UriBuilder, java.net.URI> uri) {
        throttle();
        try {
            return client().get().uri(uri).retrieve().body(JsonNode.class);
        } catch (Exception e) {
            log.warn("Geocoding request failed: {}", e.toString());
            throw ApiException.unavailable("Chưa tra cứu được địa chỉ lúc này, hãy thử lại hoặc dùng vị trí hiện tại của bạn");
        }
    }

    /** Keeps the whole application under one request per second; callers that would wait too long are turned away. */
    private void throttle() {
        long wait;
        synchronized (this) {
            long now = System.currentTimeMillis();
            long slot = Math.max(now, nextSlot);
            wait = slot - now;
            if (wait > MAX_WAIT_MS) throw ApiException.tooManyRequests("Hệ thống tra cứu địa chỉ đang bận, vui lòng thử lại sau vài giây");
            nextSlot = slot + MIN_GAP_MS;
        }
        if (wait > 0) {
            try { Thread.sleep(wait); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
    }

    private static GeoPlace place(JsonNode n) {
        String name = n.path("display_name").asText("");
        name = name.replaceAll(",\\s*\\d{5,6}\\s*,", ",").replaceAll(",\\s*Việt Nam$", "");
        return new GeoPlace(name, new BigDecimal(n.path("lat").asText("0")).setScale(6, RoundingMode.HALF_UP),
                new BigDecimal(n.path("lon").asText("0")).setScale(6, RoundingMode.HALF_UP));
    }
}
