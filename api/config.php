<?php
// Prevent direct access from browser (though typically web server should route to public/index.php, we'll secure it)
if (basename($_SERVER['PHP_SELF']) == basename(__FILE__)) {
    die('Direct access not permitted');
}

// Environment Configuration (in a real app, use .env or similar)
define('DB_HOST', 'localhost');
define('DB_NAME', 'staffsync');
define('DB_USER', 'root'); // Adjust to user's local setup
define('DB_PASS', '');     // Adjust to user's local setup
define('DB_CHARSET', 'utf8mb4');

// System Configuration
define('APP_NAME', 'StaffSyncAPI');
define('APP_URL', 'http://localhost/StaffSyncAPI'); // Adjust accordingly

// Security Configuration
define('SESSION_LIFETIME', 86400); // 1 day
define('INACTIVE_TIMEOUT', 1800);  // 30 minutes

// Integrations
define('DISCORD_WEBHOOK_URL', ''); // Add Discord Webhook URL here for urgent tickets

// Error Reporting (Dev Mode)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set default timezone
date_default_timezone_set('UTC');

// Start Session globally with secure defaults
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => isset($_SERVER['HTTPS']), // require HTTPS if available
    'cookie_samesite' => 'Strict',
    'gc_maxlifetime' => SESSION_LIFETIME
]);
