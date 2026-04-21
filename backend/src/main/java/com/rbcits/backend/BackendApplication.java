package com.rbcits.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.mail.autoconfigure.MailSenderAutoConfiguration;

import java.util.TimeZone;

@SpringBootApplication(exclude = { MailSenderAutoConfiguration.class })
public class BackendApplication {

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Manila"));
		SpringApplication.run(BackendApplication.class, args);
	}

}
