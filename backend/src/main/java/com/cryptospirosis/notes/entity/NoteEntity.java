package com.cryptospirosis.notes.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "notes")
public class NoteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notesId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    private String payeeAddress;

    @Column(precision = 19, scale = 6)
    private BigDecimal payeeAmount;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "user_id", nullable = false)
@com.fasterxml.jackson.annotation.JsonIgnore
private UserEntity user;

    // Constructors
    public NoteEntity() {}

    public NoteEntity(String title, String body, UserEntity user) {
        this.title = title;
        this.body = body;
        this.user = user;
        this.createdAt = LocalDateTime.now();
    }

    // Getters & Setters
    public Long getNotesId() {
        return notesId;
    }

    public void setNotesId(Long notesId) {
        this.notesId = notesId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getPayeeAddress() {
        return payeeAddress;
    }

    public void setPayeeAddress(String payeeAddress) {
        this.payeeAddress = payeeAddress;
    }

    public BigDecimal getPayeeAmount() {
        return payeeAmount;
    }

    public void setPayeeAmount(BigDecimal payeeAmount) {
        this.payeeAmount = payeeAmount;
    }
}
