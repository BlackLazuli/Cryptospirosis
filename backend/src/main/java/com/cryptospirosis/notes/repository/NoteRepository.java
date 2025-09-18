package com.cryptospirosis.notes.repository;

import com.cryptospirosis.notes.entity.NoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteRepository extends JpaRepository<NoteEntity, Long> {
    List<NoteEntity> findByUser_UserId(Long userId);
}
