package com.cryptospirosis.notes.service;

import com.cryptospirosis.notes.entity.UserEntity;
import com.cryptospirosis.notes.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    // Create a new user
    public UserEntity createUser(UserEntity user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        return userRepository.save(user);
    }
    
    // Get all users
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }
    
    // Get user by ID
    public Optional<UserEntity> getUserById(Long userId) {
        return userRepository.findById(userId);
    }
    
    // Get user by username
    public Optional<UserEntity> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    // Get user by email
    public Optional<UserEntity> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    
    // Update user
    public UserEntity updateUser(Long userId, UserEntity updatedUser) {
        Optional<UserEntity> existingUser = userRepository.findById(userId);
        if (existingUser.isPresent()) {
            UserEntity user = existingUser.get();
            
            // Check if username is being changed and if it already exists
            if (!user.getUsername().equals(updatedUser.getUsername()) && 
                userRepository.existsByUsername(updatedUser.getUsername())) {
                throw new RuntimeException("Username already exists");
            }
            
            // Check if email is being changed and if it already exists
            if (!user.getEmail().equals(updatedUser.getEmail()) && 
                userRepository.existsByEmail(updatedUser.getEmail())) {
                throw new RuntimeException("Email already exists");
            }
            
            user.setUsername(updatedUser.getUsername());
            user.setEmail(updatedUser.getEmail());
            user.setPassword(updatedUser.getPassword());
            
            return userRepository.save(user);
        } else {
            throw new RuntimeException("User not found with id: " + userId);
        }
    }
    
    // Delete user
    public void deleteUser(Long userId) {
        if (userRepository.existsById(userId)) {
            userRepository.deleteById(userId);
        } else {
            throw new RuntimeException("User not found with id: " + userId);
        }
    }
    
    // Check if user exists by username
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }
    
    // Check if user exists by email
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}
