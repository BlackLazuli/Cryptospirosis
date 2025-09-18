package com.cryptospirosis.notes.controller;

import com.cryptospirosis.notes.entity.NoteEntity;
import com.cryptospirosis.notes.service.NoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    // Get all notes for a user
    @GetMapping("/user/{userId}")
    public List<NoteEntity> getNotesByUser(@PathVariable Long userId) {
        return noteService.getNotesByUser(userId);
    }
    

@PostMapping("/user/{userId}")
public NoteEntity createNote(@PathVariable Long userId, @RequestBody NoteEntity note) {
    System.out.println("📥 Received note payload: title=" + note.getTitle() + ", body=" + note.getBody());
    return noteService.createNote(userId, note);
}


    // Get note by ID
    @GetMapping("/{id}")
    public ResponseEntity<NoteEntity> getNoteById(@PathVariable Long id) {
        return noteService.getNoteById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Update note
    @PutMapping("/{id}")
    public NoteEntity updateNote(@PathVariable Long id, @RequestBody NoteEntity note) {
        return noteService.updateNote(id, note);
    }

    // Delete note
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        noteService.deleteNote(id);
        return ResponseEntity.noContent().build();
    }
}
