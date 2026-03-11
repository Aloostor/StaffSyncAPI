<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');
AuthMiddleware::requireLogin();

$action = $_GET['action'] ?? 'list';
$pdo = db();
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];

switch ($action) {
    case 'list':
        // Status & Search filters
        $statusFilter = $_GET['status'] ?? '';
        $searchQuery = $_GET['search'] ?? '';

        $params = [];
        $whereFilters = [];

        // Base where clause based on role
        if ($userRole === 'agent') {
            $whereFilters[] = "(t.assigned_to = ? OR t.assigned_to IS NULL)";
            $params[] = $userId;
        } elseif ($userRole === 'customer') {
            $whereFilters[] = "t.user_id = ?";
            $params[] = $userId;
        }

        // Apply Status Filter
        if (!empty($statusFilter) && $statusFilter !== 'all') {
            $whereFilters[] = "t.status = ?";
            $params[] = $statusFilter;
        }

        // Apply Search Filter
        if (!empty($searchQuery)) {
            $whereFilters[] = "(t.subject LIKE ? OR t.id LIKE ?)";
            $params[] = "%$searchQuery%";
            $params[] = "%$searchQuery%";
        }

        $whereSql = '';
        if (count($whereFilters) > 0) {
            $whereSql = "WHERE " . implode(' AND ', $whereFilters);
        }

        $stmt = $pdo->prepare("SELECT t.*, u.username as creator, d.name as department FROM tickets t JOIN users u ON t.user_id = u.id LEFT JOIN departments d ON t.department_id = d.id $whereSql ORDER BY t.updated_at DESC");
        $stmt->execute($params);
        $tickets = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $tickets]);
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        $input = json_decode(file_get_contents('php://input'), true);
        
        $subject = $input['subject'] ?? '';
        $message = $input['message'] ?? '';
        $deptId = $input['department_id'] ?? null;
        $priority = $input['priority'] ?? 'medium';

        if (empty($subject) || empty($message)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Subject and message are required']);
            exit;
        }

        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("INSERT INTO tickets (user_id, department_id, subject, priority) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $deptId, $subject, $priority]);
            $ticketId = $pdo->lastInsertId();

            $stmtMsg = $pdo->prepare("INSERT INTO messages (ticket_id, user_id, message) VALUES (?, ?, ?)");
            $stmtMsg->execute([$ticketId, $userId, $message]);

            $pdo->commit();
            logAction($userId, 'create_ticket', "Created ticket ID: $ticketId");

            // Trigger Discord Webhook for Urgent tickets
            if ($priority === 'urgent' && defined('DISCORD_WEBHOOK_URL') && !empty(DISCORD_WEBHOOK_URL)) {
                $webhookData = [
                    'content' => "🚨 **URGENT TICKET CREATED** 🚨",
                    'embeds' => [
                        [
                            'title' => "Ticket #$ticketId: $subject",
                            'description' => "An urgent ticket has been submitted.\n\n**Preview:**\n" . substr($message, 0, 200) . "...",
                            'color' => hexdec('EF4444'),
                            'timestamp' => date('c'),
                        ]
                    ]
                ];
                
                $ch = curl_init(DISCORD_WEBHOOK_URL);
                curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-type: application/json'));
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3); // Short timeout to prevent blocking
                curl_exec($ch);
                curl_close($ch);
            }

            echo json_encode(['status' => 'success', 'message' => 'Ticket created successfully', 'ticket_id' => $ticketId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create ticket']);
        }
        break;

    case 'get':
        $ticketId = $_GET['id'] ?? 0;
        
        // Fetch ticket
        $stmt = $pdo->prepare("SELECT t.*, u.username as creator, u.avatar as creator_avatar, d.name as department FROM tickets t JOIN users u ON t.user_id = u.id LEFT JOIN departments d ON t.department_id = d.id WHERE t.id = ?");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Ticket not found']);
            exit;
        }

        // Authorization check
        if ($userRole === 'customer' && $ticket['user_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
            exit;
        }

        // Fetch messages
        $msgSql = "SELECT m.*, u.username, u.role, u.avatar FROM messages m JOIN users u ON m.user_id = u.id WHERE m.ticket_id = ?";
        if ($userRole === 'customer') {
            $msgSql .= " AND m.is_internal_note = 0";
        }
        $msgSql .= " ORDER BY m.created_at ASC";
        
        $stmtMsg = $pdo->prepare($msgSql);
        $stmtMsg->execute([$ticketId]);
        $messages = $stmtMsg->fetchAll();

        echo json_encode(['status' => 'success', 'ticket' => $ticket, 'messages' => $messages]);
        break;

    case 'update_status':
        AuthMiddleware::requireStaff();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        
        $input = json_decode(file_get_contents('php://input'), true);
        $ticketId = $input['ticket_id'] ?? 0;
        $status = $input['status'] ?? ''; // open, answered, customer_reply, resolved, closed

        $stmt = $pdo->prepare("UPDATE tickets SET status = ? WHERE id = ?");
        if ($stmt->execute([$status, $ticketId])) {
            logAction($userId, 'update_ticket', "Updated ticket ID: $ticketId status to $status");
            echo json_encode(['status' => 'success', 'message' => 'Ticket status updated']);
        }
        break;
}

function logAction($userId, $action, $details) {
    global $pdo;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $stmt = $pdo->prepare("INSERT INTO logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
    $stmt->execute([$userId, $action, $details, $ip]);
}
