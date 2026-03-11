<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

class AuthMiddleware {
    
    // Check if user is logged in
    public static function requireLogin() {
        if (!isset($_SESSION['user_id'])) {
            self::sendUnauthorizedResponse();
        }
        
        // Check for session timeout
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > INACTIVE_TIMEOUT)) {
            session_unset();
            session_destroy();
            self::sendUnauthorizedResponse("Session expired. Please log in again.");
        }
        
        // Update last activity in DB and Session
        self::updateLastActivity($_SESSION['user_id']);
    }

    // Require specific role
    public static function requireRole($allowedRoles) {
        self::requireLogin();
        
        if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], $allowedRoles)) {
            self::sendForbiddenResponse();
        }
    }
    
    // Specifically require admin or agent
    public static function requireStaff() {
        self::requireRole(['admin', 'agent']);
    }
    
    // Specifically require admin
    public static function requireAdmin() {
        self::requireRole(['admin']);
    }

    private static function updateLastActivity($userId) {
        $_SESSION['last_activity'] = time();
        try {
            $pdo = db();
            $stmt = $pdo->prepare("UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$userId]);
        } catch (PDOException $e) {
            // Silently fail for last_activity to not break the app
        }
    }

    private static function sendUnauthorizedResponse($message = "Unauthorized. Please log in.") {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => $message]);
        exit;
    }

    private static function sendForbiddenResponse($message = "Forbidden. You do not have permission to access this resource.") {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => $message]);
        exit;
    }
}
