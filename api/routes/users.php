<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');
AuthMiddleware::requireLogin();

$action = $_GET['action'] ?? 'list';
$pdo = db();

switch ($action) {
    case 'list':
        AuthMiddleware::requireAdmin();
        $stmt = $pdo->query("SELECT id, username, email, role, full_name, avatar, last_activity, created_at FROM users ORDER BY created_at DESC");
        $users = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $users]);
        break;

    case 'active':
        // Get list of online agents for customers to see
        // 'Online' means last activity within the last 5 minutes (300 seconds)
        $fiveMinsAgo = date('Y-m-d H:i:s', time() - 300);
        $stmt = $pdo->prepare("SELECT id, full_name, role, avatar FROM users WHERE role IN ('admin', 'agent') AND last_activity > ?");
        $stmt->execute([$fiveMinsAgo]);
        $activeStaff = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $activeStaff]);
        break;

    case 'stats':
        AuthMiddleware::requireStaff();
        // Return some basic stats for staff dashboard
        $stats = [];
        
        $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status");
        while ($row = $stmt->fetch()) {
            $stats['tickets_by_status'][$row['status']] = $row['count'];
        }
        
        $stmt = $pdo->query("SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority");
        while ($row = $stmt->fetch()) {
            $stats['tickets_by_priority'][$row['priority']] = $row['count'];
        }
        
        echo json_encode(['status' => 'success', 'data' => $stats]);
        break;

    case 'create':
        AuthMiddleware::requireAdmin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        
        $input = json_decode(file_get_contents('php://input'), true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        $email = $input['email'] ?? '';
        $role = $input['role'] ?? 'customer';
        $full_name = $input['full_name'] ?? '';

        if (empty($username) || empty($password) || empty($email) || empty($full_name)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
            exit;
        }

        $hashedPass = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, password, email, role, full_name) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$username, $hashedPass, $email, $role, $full_name]);
            echo json_encode(['status' => 'success', 'message' => 'User created successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create user. Username or email may already exist.']);
        }
        break;

    case 'update_profile':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $_SESSION['user_id'];
        
        $full_name = $input['full_name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? ''; // Optional
        
        if (empty($full_name) || empty($email)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Name and Email are required.']);
            exit;
        }

        try {
            if (!empty($password)) {
                $hashedPass = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, password = ? WHERE id = ?");
                $stmt->execute([$full_name, $email, $hashedPass, $userId]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ? WHERE id = ?");
                $stmt->execute([$full_name, $email, $userId]);
            }
            
            // Update session data
            $_SESSION['full_name'] = $full_name;
            
            echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to update profile. Email may already be in use.']);
        }
        break;
}
