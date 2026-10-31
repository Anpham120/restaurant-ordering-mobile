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

/** The logged-in customer: address book, favorites, cart, checkout, own orders, reviews. */
@RestController @RequestMapping("/api/me") @RequiredArgsConstructor
public class CustomerController {
    private final AddressService addresses;
    private final FavoriteService favorites;
    private final CartService cart;
    private final OrderService orders;
    private final ReviewService reviews;

    // addresses
    @GetMapping("/addresses") public List<AddressResponse> addresses() { return addresses.list(); }
    @PostMapping("/addresses") @ResponseStatus(HttpStatus.CREATED)
    public AddressResponse addAddress(@Valid @RequestBody AddressRequest r) { return addresses.create(r); }
    @PutMapping("/addresses/{id}") public AddressResponse updateAddress(@PathVariable Long id, @Valid @RequestBody AddressRequest r) { return addresses.update(id, r); }
    @PatchMapping("/addresses/{id}/default") public AddressResponse defaultAddress(@PathVariable Long id) { return addresses.setDefault(id); }
    @DeleteMapping("/addresses/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteAddress(@PathVariable Long id) { addresses.delete(id); }

    // favorites
    @GetMapping("/favorites") public List<MenuItemResponse> favorites() { return favorites.list(); }
    @PutMapping("/favorites/{menuItemId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void addFavorite(@PathVariable Long menuItemId) { favorites.add(menuItemId); }
    @DeleteMapping("/favorites/{menuItemId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void removeFavorite(@PathVariable Long menuItemId) { favorites.remove(menuItemId); }

    // cart
    @GetMapping("/cart") public CartResponse cart() { return cart.get(); }
    @PutMapping("/cart/items/{menuItemId}") public CartResponse putCart(@PathVariable Long menuItemId, @Valid @RequestBody CartItemRequest r) { return cart.put(menuItemId, r); }
    @DeleteMapping("/cart") public CartResponse clearCart() { return cart.clear(); }

    // checkout & orders
    @PostMapping("/checkout/preview") public CheckoutPreview preview(@Valid @RequestBody CheckoutRequest r) { return orders.preview(r); }
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED) public OrderResponse place(@Valid @RequestBody CheckoutRequest r) { return orders.place(r); }
    @GetMapping("/orders")
    public PageResponse<OrderResponse> myOrders(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) { return orders.myOrders(page, size); }
    @GetMapping("/orders/{id}") public OrderResponse myOrder(@PathVariable Long id) { return orders.myOrder(id); }
    @PostMapping("/orders/{id}/cancel") public OrderResponse cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest r) { return orders.cancelByCustomer(id, r.reason()); }
    @PostMapping("/orders/{id}/reorder") public CartResponse reorder(@PathVariable Long id) { return orders.reorder(id); }

    // reviews
    @PostMapping("/reviews") @ResponseStatus(HttpStatus.CREATED) public ReviewResponse review(@Valid @RequestBody ReviewRequest r) { return reviews.create(r); }
}
