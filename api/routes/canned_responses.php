<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');
AuthMiddleware::requireStaff(); // Only staff can manage and see canned responses

$action = $_GET['action'] ?? 'list';
$pdo = db();
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];

switch ($action) {
    case 'list':
        // Staff see global responses + their own private ones
        $stmt = $pdo->prepare("SELECT * FROM canned_responses WHERE is_global = 1 OR user_id = ? ORDER BY title ASC");
        $stmt->execute([$userId]);
        $responses = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $responses]);
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        
        $input = json_decode(file_get_contents('php://input'), true);
        $title = $input['title'] ?? '';
        $message_body = $input['message_body'] ?? '';
        // Only admins can create global macros; agents can only request but for simplicity, we let agent UI limit this or just restrict to admin if is_global=1
        $isGlobal = isset($input['is_global']) && $input['is_global'] ? 1 : 0;

        if ($isGlobal && $userRole !== 'admin') {
            $isGlobal = 0; // force false if not admin
        }

        if (empty($title) || empty($message_body)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Title and message body are required']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO canned_responses (user_id, title, message_body, is_global) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $title, $message_body, $isGlobal]);
            $responseId = $pdo->lastInsertId();
            echo json_encode(['status' => 'success', 'message' => 'Canned response created successfully', 'id' => $responseId]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create canned response']);
        }
        break;

    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? 0;

        try {
            // Can only delete if admin or if creator
            $stmt = $pdo->prepare("DELETE FROM canned_responses WHERE id = ? AND (user_id = ? OR ? = 'admin')");
            $stmt->execute([$id, $userId, $userRole]);
            echo json_encode(['status' => 'success', 'message' => 'Response deleted']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete']);
        }
        break;
}
