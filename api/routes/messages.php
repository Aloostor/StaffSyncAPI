<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');
AuthMiddleware::requireLogin();

$pdo = db();
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$ticketId = $input['ticket_id'] ?? 0;
$message = $input['message'] ?? '';
$isInternal = isset($input['is_internal_note']) && $input['is_internal_note'] ? 1 : 0;

if (empty($message) || !$ticketId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Ticket ID and message are required']);
    exit;
}

// Check ticket access
$stmt = $pdo->prepare("SELECT user_id FROM tickets WHERE id = ?");
$stmt->execute([$ticketId]);
$ticket = $stmt->fetch();

if (!$ticket) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Ticket not found']);
    exit;
}

if ($userRole === 'customer' && $ticket['user_id'] != $userId) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
    exit;
}

// Customers cannot add internal notes
if ($userRole === 'customer') {
    $isInternal = 0;
}

try {
    $pdo->beginTransaction();
    
    // Insert message
    $stmtMsg = $pdo->prepare("INSERT INTO messages (ticket_id, user_id, message, is_internal_note) VALUES (?, ?, ?, ?)");
    $stmtMsg->execute([$ticketId, $userId, $message, $isInternal]);
    
    // Update ticket status optionally (e.g. to answered if staff replies, or customer_reply if customer)
    $newStatus = ($userRole === 'customer') ? 'customer_reply' : 'answered';
    
    // Don't change status to answered if it's just an internal note
    if ($isInternal) {
        $stmtUpdate = $pdo->prepare("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmtUpdate->execute([$ticketId]);
    } else {
        $stmtUpdate = $pdo->prepare("UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmtUpdate->execute([$newStatus, $ticketId]);
    }
    
    $pdo->commit();
    echo json_encode(['status' => 'success', 'message' => 'Reply added successfully']);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to add reply']);
}
