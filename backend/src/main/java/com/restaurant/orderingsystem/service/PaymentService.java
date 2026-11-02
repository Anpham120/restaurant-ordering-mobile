package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Payments. COD is collected by staff on delivery. A bank transfer shows a VietQR code whose transfer content is the
 * payment code (prefix + order id); SePay watches the restaurant's bank account and calls our webhook for each incoming
 * transfer, which marks the payment PAID and releases the order to the store. Unpaid transfers expire automatically.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {
    static final String SEPAY = "SEPAY";
    private static final DateTimeFormatter SEPAY_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final PaymentRepository payments;
    private final BankTransactionRepository transactions;
    private final OrderRepository orders;
    private final UserRepository users;
    private final StoreService store;
    private final NotificationService notifications;
    private final OrderEvents events;

    @Value("${app.sepay.api-key:}") private String sepayApiKey;
    @Value("${app.payment.code-prefix:ATL}") private String codePrefix;
    @Value("${app.public-url:http://localhost:8082}") private String publicUrl;

    /**
     * Most installed banking apps that open from a VietQR deeplink (app id, name, autofill), from
     * api.vietqr.io/v2/android-app-deeplinks. Only the "autofill" apps take the account, amount and content from the link;
     * the others just open, so the app copies the transfer content for the customer to paste. Autofill apps come first.
     */
    private static final String[][] BANK_APPS = {
            {"mb", "MB Bank", "1"}, {"icb", "VietinBank iPay", "1"}, {"bidv", "BIDV SmartBanking", "1"}, {"acb", "ACB ONE", "1"},
            {"ocb", "OCB OMNI", "1"},
            {"vcb", "VCB Digibank", "0"}, {"tcb", "Techcombank Mobile", "0"}, {"vba", "Agribank Plus", "0"}, {"vpb", "VPBank NEO", "0"},
            {"tpb", "TPBank Mobile", "0"}, {"cake", "CAKE", "0"}, {"timo", "Timo", "0"}};

    // ---------------------------------------------------------------- codes & QR
    String transferContent(Order o) { return codePrefix + o.getId(); }

    PaymentResponse toResponse(Payment p) {
        if (p == null) return null;
        Order o = p.getOrder();
        StoreSettings s = store.settings();
        boolean showQr = p.getMethod() == PaymentMethod.BANK_TRANSFER && p.getStatus() == PaymentStatus.PENDING && s.getBankAccount() != null;
        String content = p.getMethod() == PaymentMethod.BANK_TRANSFER ? transferContent(o) : null;
        String qr = showQr ? "https://qr.sepay.vn/img?acc=" + enc(s.getBankAccount()) + "&bank=" + enc(s.getBankCode())
                + "&amount=" + p.getAmount().toBigInteger() + "&des=" + enc(content) + "&template=compact"
                + (s.getBankHolder() == null ? "" : "&holder=" + enc(s.getBankHolder())) : null;
        List<BankAppLink> apps = !showQr ? List.of() : java.util.Arrays.stream(BANK_APPS).map(a -> new BankAppLink(a[0], a[1],
                "https://cdn.vietqr.io/bank-app-icon/" + a[0] + "-android.webp",
                "https://dl.vietqr.io/pay?app=" + a[0] + "&ba=" + enc(s.getBankAccount() + "@" + s.getBankCode().toLowerCase(Locale.ROOT))
                        + "&am=" + p.getAmount().toBigInteger() + "&tn=" + enc(content)
                        + (s.getBankHolder() == null ? "" : "&bn=" + enc(s.getBankHolder()))
                        + "&url=" + enc(publicUrl + "/order/" + o.getId()), "1".equals(a[2]))).toList();
        boolean open = p.getStatus() == PaymentStatus.PENDING;
        boolean toCod = open && p.getMethod() == PaymentMethod.BANK_TRANSFER && o.getStatus() == OrderStatus.AWAITING_PAYMENT;
        boolean toTransfer = open && p.getMethod() == PaymentMethod.COD && o.getStatus() == OrderStatus.PENDING && s.getBankAccount() != null;
        return new PaymentResponse(p.getId(), p.getMethod(), p.getAmount(), p.getStatus(), p.getExpiresAt(), p.getPaidAt(),
                p.getConfirmedBy() == null ? null : p.getConfirmedBy().getFullName(), content, qr,
                showQr ? s.getBankCode() : null, showQr ? s.getBankAccount() : null, showQr ? s.getBankHolder() : null, apps, toCod, toTransfer);
    }

    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }

    // ---------------------------------------------------------------- SePay webhook
    /** Authenticates the call, stores the transaction once (SePay may resend) and settles the matching payment. */
    @Transactional
    public void sepayWebhook(String authorization, SepayWebhook w) {
        if (sepayApiKey == null || sepayApiKey.isBlank()) throw ApiException.unauthorized("Chưa cấu hình SEPAY_API_KEY");
        String expected = "Apikey " + sepayApiKey;
        if (authorization == null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), authorization.trim().getBytes(StandardCharsets.UTF_8)))
            throw ApiException.unauthorized("Sai API key");
        if (w.id() == null || w.transferAmount() == null) throw ApiException.badRequest("Thiếu id hoặc transferAmount");
        if (!"in".equalsIgnoreCase(w.transferType())) return;                       // money going out: not ours to handle
        if (transactions.existsByProviderAndProviderTxnId(SEPAY, w.id())) return;   // duplicate delivery

        BankTransaction t = new BankTransaction();
        t.setProvider(SEPAY);
        t.setProviderTxnId(w.id());
        t.setGateway(w.gateway());
        t.setAccountNumber(w.accountNumber());
        t.setAmount(w.transferAmount());
        t.setContent(w.content());
        t.setReferenceCode(w.referenceCode());
        t.setTransactionDate(parseTime(w.transactionDate()));
        t.setReceivedAt(LocalDateTime.now());

        String storeAccount = store.settings().getBankAccount();
        boolean ourAccount = storeAccount != null && (storeAccount.equalsIgnoreCase(nz(w.accountNumber())) || storeAccount.equalsIgnoreCase(nz(w.subAccount())));
        Long orderId = orderIdFrom(w.code(), w.content());
        Payment p = orderId == null ? null : orders.findById(orderId).map(Order::getPayment).orElse(null);
        if (!ourAccount) {
            t.setNote("Không phải tài khoản nhận tiền của quán – bỏ qua");
        } else if (p == null) {
            t.setNote("Không khớp đơn hàng nào");
        } else {
            if (p.getMethod() == PaymentMethod.COD && p.getStatus() == PaymentStatus.PENDING) {
                p.setMethod(PaymentMethod.BANK_TRANSFER);   // customer chose COD but paid by transfer anyway
            }
            t.setPayment(p);
            settle(p, t);
        }
        transactions.save(t);
    }

    private void settle(Payment p, BankTransaction t) {
        Order o = p.getOrder();
        if (p.getStatus() != PaymentStatus.PENDING) {
            if (p.getStatus() == PaymentStatus.FAILED) {
                // money arrived after the order expired or was cancelled: it must be returned
                p.setStatus(PaymentStatus.REFUND_PENDING);
                p.setPaidAt(LocalDateTime.now());
                t.setNote("Đơn đã hủy – cần hoàn tiền");
                notifications.toCustomer(o, NotificationType.PAYMENT, "Đã nhận tiền cho đơn đã hủy",
                        "Đơn " + OrderService.code(o) + " đã hủy trước khi nhận được tiền. Cửa hàng sẽ hoàn " + Money.vnd(t.getAmount()) + " cho bạn.");
            } else {
                t.setNote("Đơn đã được thanh toán trước đó – cần kiểm tra");
            }
            return;
        }
        if (t.getAmount().compareTo(p.getAmount()) < 0) {
            t.setNote("Thiếu tiền: cần " + Money.vnd(p.getAmount()));
            return;
        }
        p.setStatus(PaymentStatus.PAID);
        p.setPaidAt(LocalDateTime.now());
        t.setNote(t.getAmount().compareTo(p.getAmount()) > 0 ? "Chuyển dư " + Money.vnd(t.getAmount().subtract(p.getAmount())) : "Khớp đơn");
        if (o.getStatus() == OrderStatus.AWAITING_PAYMENT) events.change(o, OrderStatus.PENDING, "Đã nhận chuyển khoản " + Money.vnd(t.getAmount()), null);
    }

    private static String nz(String s) { return s == null ? "" : s.trim(); }

    /** Customer switches between COD and bank transfer before paying / before the store confirmed the order. */
    @Transactional
    public PaymentResponse switchMethod(Order o, PaymentMethod to) {
        Payment p = o.getPayment();
        if (p == null || p.getStatus() != PaymentStatus.PENDING) throw ApiException.badRequest("Đơn đã thanh toán hoặc đã đóng, không đổi được phương thức");
        if (p.getMethod() == to) return toResponse(p);
        if (to == PaymentMethod.COD) {
            if (o.getStatus() != OrderStatus.AWAITING_PAYMENT) throw ApiException.badRequest("Đơn không ở trạng thái chờ thanh toán");
            p.setMethod(PaymentMethod.COD);
            p.setExpiresAt(null);
            events.change(o, OrderStatus.PENDING, "Khách đổi sang thanh toán khi nhận hàng", null);
        } else {
            if (o.getStatus() != OrderStatus.PENDING) throw ApiException.badRequest("Cửa hàng đã xác nhận đơn, không đổi sang chuyển khoản được nữa");
            StoreSettings s = store.settings();
            if (s.getBankAccount() == null) throw ApiException.badRequest("Cửa hàng chưa hỗ trợ chuyển khoản");
            p.setMethod(PaymentMethod.BANK_TRANSFER);
            p.setExpiresAt(LocalDateTime.now().plusMinutes(s.getTransferTimeoutMinutes()));
            events.change(o, OrderStatus.AWAITING_PAYMENT, "Khách đổi sang chuyển khoản", null);
        }
        return toResponse(p);
    }

    Long orderIdFrom(String code, String content) {
        Pattern pattern = Pattern.compile(Pattern.quote(codePrefix.toUpperCase(Locale.ROOT)) + "\\s*(\\d{1,12})");
        for (String s : new String[]{code, content}) {
            if (s == null) continue;
            Matcher m = pattern.matcher(s.toUpperCase(Locale.ROOT));
            if (m.find()) return Long.valueOf(m.group(1));
        }
        return null;
    }

    private static LocalDateTime parseTime(String s) {
        try { return s == null ? null : LocalDateTime.parse(s, SEPAY_TIME); } catch (Exception e) { return null; }
    }

    // ---------------------------------------------------------------- expiry
    /** Cancels bank-transfer orders that were not paid in time (runs every minute). */
    @Scheduled(fixedDelayString = "${app.payment.expiry-check-ms:60000}", initialDelayString = "${app.payment.expiry-check-ms:60000}")
    @Transactional
    public void expireUnpaid() {
        for (Payment p : payments.findExpired(PaymentMethod.BANK_TRANSFER, PaymentStatus.PENDING, LocalDateTime.now())) {
            Order o = p.getOrder();
            p.setStatus(PaymentStatus.FAILED);
            if (o.getStatus() == OrderStatus.AWAITING_PAYMENT) events.change(o, OrderStatus.CANCELLED, "Quá hạn thanh toán chuyển khoản", null);
            log.info("Order {} cancelled: transfer not received in time", o.getId());
        }
    }

    // ---------------------------------------------------------------- staff / manager
    /** Staff confirm a transfer by hand (e.g. the webhook was not configured or the customer typed a wrong content). */
    @Transactional
    public PaymentResponse confirmTransfer(Long orderId) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        Payment p = o.getPayment();
        if (p == null || p.getMethod() != PaymentMethod.BANK_TRANSFER || p.getStatus() != PaymentStatus.PENDING)
            throw ApiException.badRequest("Đơn không có khoản chuyển khoản đang chờ");
        p.setStatus(PaymentStatus.PAID);
        p.setPaidAt(LocalDateTime.now());
        p.setConfirmedBy(users.getReferenceById(Caller.id()));
        events.change(o, OrderStatus.PENDING, "Nhân viên xác nhận đã nhận chuyển khoản", Caller.id());
        return toResponse(p);
    }

    @Transactional
    public PaymentListItem markRefunded(Long paymentId) {
        Payment p = payments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Không tìm thấy thanh toán"));
        if (p.getStatus() != PaymentStatus.REFUND_PENDING) throw ApiException.badRequest("Khoản này không ở trạng thái chờ hoàn tiền");
        p.setStatus(PaymentStatus.REFUNDED);
        p.setConfirmedBy(users.getReferenceById(Caller.id()));
        notifications.toCustomer(p.getOrder(), NotificationType.PAYMENT, "Đã hoàn tiền",
                "Cửa hàng đã hoàn " + Money.vnd(p.getAmount()) + " cho đơn " + OrderService.code(p.getOrder()) + ".");
        return item(p);
    }

    @Transactional(readOnly = true)
    public List<PaymentListItem> list(PaymentStatus status) {
        return payments.findByStatusOrderByCreatedAtDesc(status).stream().map(this::item).toList();
    }

    @Transactional(readOnly = true)
    public List<BankTransactionResponse> bankTransactions(int limit) {
        return transactions.findAllByOrderByReceivedAtDesc(PageRequest.of(0, Math.min(Math.max(limit, 1), 200))).stream().map(t -> {
            Order o = t.getPayment() == null ? null : t.getPayment().getOrder();
            return new BankTransactionResponse(t.getId(), t.getProvider(), t.getProviderTxnId(), t.getGateway(), t.getAccountNumber(), t.getAmount(),
                    t.getContent(), t.getReferenceCode(), t.getTransactionDate(), t.getReceivedAt(),
                    o == null ? null : o.getId(), o == null ? null : OrderService.code(o), t.getNote());
        }).toList();
    }

    private PaymentListItem item(Payment p) {
        Order o = p.getOrder();
        return new PaymentListItem(p.getId(), o.getId(), OrderService.code(o), o.getCustomer().getFullName(), p.getMethod(), p.getAmount(),
                p.getStatus(), p.getCreatedAt(), p.getPaidAt(), p.getConfirmedBy() == null ? null : p.getConfirmedBy().getFullName());
    }

    /** Cash is collected when the order is delivered. */
    static void collectCod(Payment p, User staff) {
        if (p.getMethod() == PaymentMethod.COD && p.getStatus() == PaymentStatus.PENDING) {
            p.setStatus(PaymentStatus.PAID);
            p.setPaidAt(LocalDateTime.now());
            p.setConfirmedBy(staff);
        }
    }

    /** On cancellation: unpaid → FAILED, already paid online → must be refunded. */
    static void onCancel(Payment p) {
        if (p.getStatus() == PaymentStatus.PENDING) p.setStatus(PaymentStatus.FAILED);
        else if (p.getStatus() == PaymentStatus.PAID) p.setStatus(PaymentStatus.REFUND_PENDING);
    }

    static BigDecimal amountOf(Order o) { return OrderService.total(o); }
}
