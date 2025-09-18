package com.cryptospirosis.notes.security;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cryptospirosis.notes.entity.UserEntity;
import com.cryptospirosis.notes.repository.UserRepository;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {

    String path = request.getRequestURI();

    // 🔹 Skip JWT validation for public endpoints
    if (path.startsWith("/api/auth") || path.startsWith("/notes")) {
        chain.doFilter(request, response);
        return;
    }

    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
        chain.doFilter(request, response);
        return;
    }

    String token = header.substring(7);
    try {
        String email = jwtUtil.extractEmail(token);
        Optional<UserEntity> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent() && jwtUtil.validateToken(token)) {
            UserEntity user = userOpt.get();
            if (!email.equals(user.getEmail())) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Token is invalid due to email mismatch. Please log in again.");
                return;
            }

            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(user.getEmail(), null, Collections.emptyList());

            SecurityContextHolder.getContext().setAuthentication(authToken);
        } else {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Invalid token. Please log in again.");
            return;
        }
    } catch (JwtException e) {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("Token has expired or is invalid. Please log in again.");
        return;
    }

    chain.doFilter(request, response);
}
}