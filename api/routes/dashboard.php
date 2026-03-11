<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');
AuthMiddleware::requireLogin();

$pdo = db();
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];

try {
    $data = [];

    if ($userRole === 'admin' || $userRole === 'agent') {
        // Stats for staff
        $stmtStats = $pdo->query("
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets
            FROM tickets
        ");
        $data['stats'] = $stmtStats->fetch();

        // Online Staff (Active in last 30 minutes)
        $timeout = date('Y-m-d H:i:s', time() - INACTIVE_TIMEOUT);
        $stmtOnline = $pdo->prepare("
            SELECT id, username, full_name, role, avatar 
            FROM users 
            WHERE last_activity > ? AND role IN ('admin', 'agent')
            ORDER BY last_activity DESC
        ");
        $stmtOnline->execute([$timeout]);
        $data['online_staff'] = $stmtOnline->fetchAll();

        // Recent Tickets
        $stmtRecent = $pdo->query("
            SELECT t.id, t.subject, t.status, t.priority, t.updated_at, u.username as creator
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.updated_at DESC
            LIMIT 5
        ");
        $data['recent_tickets'] = $stmtRecent->fetchAll();

    } else {
        // Customer specific stats
        $stmtStats = $pdo->prepare("
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets
            FROM tickets
            WHERE user_id = ?
        ");
        $stmtStats->execute([$userId]);
        $data['stats'] = $stmtStats->fetch();
        
        // Recent Tickets for Customer
        $stmtRecent = $pdo->prepare("
            SELECT id, subject, status, priority, updated_at
            FROM tickets
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 5
        ");
        $stmtRecent->execute([$userId]);
        $data['recent_tickets'] = $stmtRecent->fetchAll();
    }

    echo json_encode(['status' => 'success', 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to load dashboard data']);
}
