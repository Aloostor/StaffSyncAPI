<?php
require 'api/config.php';
require 'api/db.php';

$pdo = db();

// Hashed password for '123456'
$pass = password_hash('123456', PASSWORD_DEFAULT);

// Optional: clear existing users if you want to start fresh
$pdo->exec("DELETE FROM users");

// Insert standard test accounts
$pdo->exec("INSERT INTO users (id, username, password, email, role, full_name) VALUES (1, 'admin', '$pass', 'admin@ss.local', 'admin', 'Admin User')");
$pdo->exec("INSERT INTO users (id, username, password, email, role, full_name) VALUES (2, 'agent', '$pass', 'agent@ss.local', 'agent', 'Support Agent')");
$pdo->exec("INSERT INTO users (id, username, password, email, role, full_name) VALUES (3, 'customer', '$pass', 'customer@ss.local', 'customer', 'Test Customer')");

echo "Test accounts created successfully!\n";
