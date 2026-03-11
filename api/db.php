<?php
require_once __DIR__ . '/config.php';

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        // For quick browser testing, use SQLite instead of MySQL
        $dbFile = __DIR__ . '/../database/staffsync.sqlite';
        $needsInit = !file_exists($dbFile);
        
        $dsn = "sqlite:" . $dbFile;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays
            PDO::ATTR_EMULATE_PREPARES   => false,                  // Use real prepared statements for security
        ];

        try {
            $this->pdo = new PDO($dsn, null, null, $options);
            
            // Enable foreign keys for SQLite
            $this->pdo->exec('PRAGMA foreign_keys = ON;');
            
            if ($needsInit) {
                // Initialize schema if the file was just created
                $schema = file_get_contents(__DIR__ . '/../database/schema_sqlite.sql');
                $this->pdo->exec($schema);
            }
        } catch (\PDOException $e) {
            // Log the error securely and display a generic message
            error_log("Database connection failed: " . $e->getMessage());
            $this->sendErrorResponse("Database connection failed. Please check the server logs.", 500);
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }
    
    // Helper function to send standard JSON error responses
    private function sendErrorResponse($message, $code) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => $message]);
        exit;
    }
}

// Helper function to quick-get PDO instance
function db() {
    return Database::getInstance()->getConnection();
}
