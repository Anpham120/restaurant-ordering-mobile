package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Delivery priced by distance from the restaurant, the manager-tunable rules, and the OpenStreetMap address search. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DistanceDeliveryTest extends ApiTestBase {
    // the restaurant: Vạn Phúc Building, Hà Đông (set by AdminBootstrap)
    private static final double STORE_LAT = 20.983310, STORE_LNG = 105.772724;
    private static final String MOVED = "latitude=%s&longitude=%s";

    static HttpServer nominatim;
    static final AtomicInteger HITS = new AtomicInteger();
    static volatile String userAgent;

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) throws IOException {
        nominatim = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        nominatim.createContext("/search", ex -> reply(ex,
                "[{\"lat\":\"20.9833104\",\"lon\":\"105.7727238\",\"display_name\":\"Vạn Phúc Building, Phố Tố Hữu, Vạn Phúc, Phường Hà Đông, Thành phố Hà Nội, 12123, Việt Nam\"}]"));
        nominatim.createContext("/reverse", ex -> reply(ex,
                "{\"lat\":\"20.9629\",\"lon\":\"105.7698\",\"display_name\":\"135, Phan Đình Giót, La Khê, Phường Hà Đông, Thành phố Hà Nội, Việt Nam\"}"));
        nominatim.start();
        r.add("app.geocode.url", () -> "http://127.0.0.1:" + nominatim.getAddress().getPort());
    }

    @AfterAll
    static void stop() { nominatim.stop(0); }

    private static void reply(HttpExchange ex, String body) throws IOException {
        HITS.incrementAndGet();
        userAgent = ex.getRequestHeaders().getFirst("User-Agent");
        byte[] b = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(200, b.length);
        ex.getResponseBody().write(b);
        ex.close();
    }

    /** A point due north of the restaurant: 1 degree of latitude is about 111.2 km in a straight line. */
    private JsonNode quoteNorth(double straightKm) throws Exception {
        double lat = STORE_LAT + straightKm / 111.195;
        return json(as(null, get("/api/delivery/quote").param("lat", String.format("%.6f", lat)).param("lng", String.valueOf(STORE_LNG)))
                .andExpect(status().isOk()));
    }

    private static BigDecimal expectedFee(BigDecimal km, double base, double baseFee, double perKm) {
        BigDecimal fee = BigDecimal.valueOf(baseFee);
        if (km.doubleValue() > base) fee = fee.add(km.subtract(BigDecimal.valueOf(base)).setScale(0, RoundingMode.CEILING).multiply(BigDecimal.valueOf(perKm)));
        return fee;
    }

    private ObjectNode settings() throws Exception { return (ObjectNode) json(as(null, get("/api/store")).andExpect(status().isOk())); }

    @Test
    void feeIsFlatInsideTheBaseRadiusThenGrowsPerKilometreUntilTheLimit() throws Exception {
        JsonNode at = quoteNorth(0);
        assertEquals(0, at.get("deliveryFee").decimalValue().compareTo(new BigDecimal("15000")));
        assertTrue(at.get("deliverable").asBoolean());

        JsonNode inside = quoteNorth(3.0);                       // ~3.9 km by road: still covered by the base fee
        assertTrue(inside.get("distanceKm").asDouble() <= 5.0);
        assertEquals(0, inside.get("deliveryFee").decimalValue().compareTo(new BigDecimal("15000")));

        JsonNode beyond = quoteNorth(6.3);                       // ~8.2 km by road: base fee + 4 started km
        BigDecimal km = beyond.get("distanceKm").decimalValue();
        assertTrue(km.doubleValue() > 5.0 && km.doubleValue() <= 15.0, "distance " + km);
        assertEquals(0, beyond.get("deliveryFee").decimalValue().compareTo(expectedFee(km, 5, 15000, 5000)));
        assertTrue(beyond.get("deliveryFee").asDouble() > inside.get("deliveryFee").asDouble());
        assertTrue(beyond.get("estimatedMinutes").asInt() > inside.get("estimatedMinutes").asInt());
        assertEquals(0, beyond.get("deliveryFee").decimalValue().remainder(new BigDecimal("1000")).compareTo(BigDecimal.ZERO));  // whole thousands

        JsonNode tooFar = quoteNorth(13.0);                      // ~17 km by road: beyond the 15 km limit
        assertFalse(tooFar.get("deliverable").asBoolean());
        org.hamcrest.MatcherAssert.assertThat(tooFar.get("message").asText(), containsString("ngoài phạm vi giao tối đa 15 km"));
    }

    @Test
    void managerTunesThePricingAndAnOrderKeepsTheFeeItWasPlacedWith() throws Exception {
        ObjectNode original = settings();
        try {
            as(manager, put("/api/admin/settings"), original.deepCopy().put("deliveryBaseFee", 20000).put("deliveryBaseKm", 3).put("deliveryExtraFeePerKm", 8000)
                    .put("deliveryMaxKm", 10).put("prepMinutes", 20).put("minutesPerKm", 5).toString())
                    .andExpect(status().isOk()).andExpect(jsonPath("$.deliveryBaseFee").value(20000.0)).andExpect(jsonPath("$.deliveryMaxKm").value(10.0));

            JsonNode q = quoteNorth(2.0);                        // ~2.6 km by road, inside the new 3 km base radius
            assertEquals(0, q.get("deliveryFee").decimalValue().compareTo(new BigDecimal("20000")));
            JsonNode far = quoteNorth(6.3);                      // ~8.2 km by road
            assertEquals(0, far.get("deliveryFee").decimalValue().compareTo(expectedFee(far.get("distanceKm").decimalValue(), 3, 20000, 8000)));
            assertFalse(quoteNorth(9.0).get("deliverable").asBoolean());   // ~11.7 km > new 10 km limit

            long id = placeOrder(customer, null);                // address ~1.4 km away
            JsonNode order = json(as(customer, get("/api/me/orders/" + id)).andExpect(status().isOk()));
            assertEquals(0, order.get("deliveryFee").decimalValue().compareTo(new BigDecimal("20000")));
            assertTrue(order.get("distanceKm").asDouble() > 0 && order.get("distanceKm").asDouble() < 2.5);

            as(manager, put("/api/admin/settings"), original.toString()).andExpect(status().isOk());
            as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.deliveryFee").value(20000.0));   // history is not repriced
            assertEquals(0, quoteNorth(2.0).get("deliveryFee").decimalValue().compareTo(new BigDecimal("15000")));
        } finally {
            as(manager, put("/api/admin/settings"), original.toString()).andExpect(status().isOk());
        }
    }

    @Test
    void invalidPricingRulesAreRejected() throws Exception {
        ObjectNode s = settings();
        as(manager, put("/api/admin/settings"), s.deepCopy().put("deliveryMaxKm", 4).toString())          // limit below the 5 km base radius
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("Phạm vi giao tối đa")));
        as(manager, put("/api/admin/settings"), s.deepCopy().put("latitude", 21.0).putNull("longitude").toString())      // half a position
                .andExpect(status().isBadRequest());
        as(manager, put("/api/admin/settings"), s.deepCopy().put("minutesPerKm", 0).toString()).andExpect(status().isBadRequest());
        as(customer, put("/api/admin/settings"), s.toString()).andExpect(status().isForbidden());
        assertEquals(5.0, settings().get("deliveryBaseKm").asDouble());                                   // nothing was changed
    }

    @Test
    void savedAddressBecomesUndeliverableWhenTheRadiusShrinks() throws Exception {
        ObjectNode original = settings();
        try {
            long addr = address(customer);
            as(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + pho + ",\"quantity\":2}").andExpect(status().isOk());
            as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + "}").andExpect(jsonPath("$.canPlace").value(true))
                    .andExpect(jsonPath("$.address.deliverable").value(true)).andExpect(jsonPath("$.address.distanceKm").isNumber());

            as(manager, put("/api/admin/settings"), original.deepCopy().put("deliveryBaseKm", 0.5).put("deliveryMaxKm", 0.5).toString()).andExpect(status().isOk());
            as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + "}").andExpect(jsonPath("$.canPlace").value(false))
                    .andExpect(jsonPath("$.problems[0]", containsString("ngoài phạm vi giao")));
            as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isBadRequest());
            as(customer, get("/api/me/addresses")).andExpect(jsonPath("$[0].deliverable").value(false));
        } finally {
            as(manager, put("/api/admin/settings"), original.toString()).andExpect(status().isOk());
        }
    }

    @Test
    void addressSearchGoesThroughNominatimIsCachedAndNeedsALogin() throws Exception {
        as(null, get("/api/geocode/search").param("q", "van phuc")).andExpect(status().isUnauthorized());
        as(customer, get("/api/geocode/search").param("q", "ab")).andExpect(status().isBadRequest());

        int before = HITS.get();
        as(customer, get("/api/geocode/search").param("q", "Vạn Phúc Building")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Vạn Phúc Building, Phố Tố Hữu, Vạn Phúc, Phường Hà Đông, Thành phố Hà Nội"))   // postcode and country trimmed
                .andExpect(jsonPath("$[0].latitude").value(20.983310)).andExpect(jsonPath("$[0].longitude").value(105.772724));
        assertEquals(before + 1, HITS.get());
        org.hamcrest.MatcherAssert.assertThat(userAgent, containsString("AtlasRestaurant"));                                   // Nominatim policy: identify the application

        as(customer, get("/api/geocode/search").param("q", "  vạn phúc building ")).andExpect(status().isOk());   // same query: answered from the cache
        assertEquals(before + 1, HITS.get());

        as(customer, get("/api/geocode/reverse").param("lat", "20.9629").param("lng", "105.7698")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name", startsWith("135, Phan Đình Giót")));
        as(customer, get("/api/geocode/reverse").param("lat", "95").param("lng", "105.7698")).andExpect(status().isBadRequest());
    }
}
