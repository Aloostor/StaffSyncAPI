<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');
AuthMiddleware::requireLogin();

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List departments (everyone can see)
    $stmt = $pdo->query("SELECT id, name, description FROM departments ORDER BY name ASC");
    $departments = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $departments]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Create department (admin only)
    AuthMiddleware::requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $name = $input['name'] ?? '';
    $desc = $input['description'] ?? '';
    
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Department name is required']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO departments (name, description) VALUES (?, ?)");
    if ($stmt->execute([$name, $desc])) {
        echo json_encode(['status' => 'success', 'message' => 'Department created']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to create department']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Delete department (admin only)
    AuthMiddleware::requireAdmin();
    $id = $_GET['id'] ?? 0;
    
    // Check if tickets belong to this department before deleting
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM tickets WHERE department_id = ?");
    $checkStmt->execute([$id]);
    if ($checkStmt->fetchColumn() > 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Cannot delete department containing active tickets']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM departments WHERE id = ?");
    if ($stmt->execute([$id])) {
        echo json_encode(['status' => 'success', 'message' => 'Department deleted']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete department']);
    }
}
