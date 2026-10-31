package com.restaurant.orderingsystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class OrderingSystemApplication {

    static {
        // Opening hours and "per day" reports use Vietnam local time regardless of the host setting
        // (static block so it also applies when tests load this class).
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    }

    public static void main(String[] args) {
        SpringApplication.run(OrderingSystemApplication.class, args);
    }
}
