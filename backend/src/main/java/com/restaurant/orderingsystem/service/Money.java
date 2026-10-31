package com.restaurant.orderingsystem.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

final class Money {
    private Money() {}
    static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    static BigDecimal of(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP); }
    static String vnd(BigDecimal v) { return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(v) + "đ"; }
}
