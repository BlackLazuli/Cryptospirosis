package com.cryptospirosis.notes.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cryptospirosis.notes.entity.NoteEntity;
import com.cryptospirosis.notes.entity.UserEntity;
import com.cryptospirosis.notes.repository.NoteRepository;
import com.cryptospirosis.notes.repository.UserRepository;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public NoteService(NoteRepository noteRepository, UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    public List<NoteEntity> getNotesByUser(Long userId) {
        return noteRepository.findByUser_UserId(userId);
    }

    public NoteEntity createNote(Long userId, NoteEntity note) {
        // fetch the user
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // attach the user to the note
        note.setUser(user);

        // set createdAt
        note.setCreatedAt(java.time.LocalDateTime.now());

        return noteRepository.save(note);
    }

    public Optional<NoteEntity> getNoteById(Long id) {
        return noteRepository.findById(id);
    }

    public NoteEntity updateNote(Long id, NoteEntity updatedNote) {
        return noteRepository.findById(id)
                .map(note -> {
                    note.setTitle(updatedNote.getTitle());
                    note.setBody(updatedNote.getBody());
                    note.setPayeeAddress(updatedNote.getPayeeAddress());
                    note.setPayeeAmount(updatedNote.getPayeeAmount());
                    return noteRepository.save(note);
                })
                .orElseThrow(() -> new RuntimeException("Note not found"));
    }

    public void deleteNote(Long id) {
        noteRepository.deleteById(id);
    }
}
