<?php
/**
 * @fileoverview Core Setup and Utility Functions for NCFE Level 2 API
 * 
 * This file provides the foundational functionality for all API endpoints:
 * - Database connection management
 * - CORS headers configuration
 * - Request/response handling utilities
 * - Logging functionality
 * - JSON payload processing
 * 
 * All API endpoint files should include this file first using:
 * include 'setup.php';
 * 
 * @author Simon Rundell, CodeMonkey Design Ltd.
 * @version 2.0
 * @date 25th July 2024
 * @updated 4th February 2026
 */

/* 
==================================================================
Setup communal code for PHP scripts
Simon Rundell for CodeMonkey Design Ltd.
25th July 2024
==================================================================
*/

/**
 * CORS Headers Configuration
 * 
 * Allows cross-origin requests from any domain. Required for frontend
 * (Vite dev server) to communicate with backend API.
 * 
 * @security Consider restricting Access-Control-Allow-Origin in production
 */
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Authorization, X-Requested-With");
header("Content-Type: application/json");

/**
 * Error Reporting Configuration
 * 
 * Enables all error reporting for development.
 * 
 * @todo Disable display_errors in production environment
 */
// debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Handle CORS Preflight Requests
 * 
 * Browsers send OPTIONS request before actual request to check CORS policy.
 * Respond with 200 OK to allow the actual request to proceed.
 */
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Return 200 OK for preflight requests
    http_response_code(200);
    exit;
}

/**
 * Database Connection Setup
 * 
 * Reads configuration from .config.json and establishes MySQL connection.
 * Configuration file should contain:
 * - servername: MySQL host (e.g., "localhost")
 * - username: Database username
 * - password: Database password
 * - dbname: Database name
 * - api: Base API URL
 * - SMTP settings for email functionality
 * 
 * @global array $config Configuration array from .config.json
 * @global mysqli $mysqli Database connection object (used by all endpoints)
 * 
 * @throws Exception If connection fails (handled by send_response)
 */
// Read connection information from a secure location
$config = json_decode(file_get_contents('./.config.json'), true);
if (!is_array($config)) {
    send_response('Invalid configuration file', 500);
}

enforce_auth_if_needed($config);

$mysqli = new mysqli($config['servername'], $config['username'], $config['password'], $config['dbname']);

// Check connection
if ($mysqli->connect_error) {
    log_info("Connection failed: " . $mysqli->connect_error);
    send_response("Connection failed: " . $mysqli->connect_error, 500);
} else {
    log_info("Connected successfully to the database on " . $config['servername']. " as user " . $config['username']. " to database " . $config['dbname']);
}

/**
 * Request Payload Processing
 * 
 * Reads and decodes JSON payload from POST requests.
 * Makes data available in $receivedData global variable.
 * 
 * @global array $receivedData Decoded JSON payload from request body
 * 
 * For POST requests:
 * - Reads raw php://input stream
 * - Decodes JSON to associative array
 * - Validates array structure
 * - Logs received data for debugging
 * 
 * Empty payloads are converted to empty array to prevent null errors.
 */
// Read the raw POST data
$jsonPayload = file_get_contents('php://input');

// Decode the JSON payload into an associative array
$receivedData = json_decode($jsonPayload, true);

// Handle empty payload
if ($jsonPayload === '' || $receivedData === null) {
    $receivedData = [];
}

/**
 * POST Request Validation
 * 
 * For POST requests, validates that payload is valid JSON array.
 * Logs received data for debugging and audit purposes.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    log_info("Received: " . json_encode($receivedData));
    $data = $receivedData;

    // Move the array check here, after decoding
    if (!is_array($data)) {
        log_info("Invalid JSON payload");
        send_response("Invalid JSON payload", 400);
        exit;
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Assuming GET requests are handled differently and might not need JSON decoding
    // $data['action'] = $_GET['action']; 
    // $data['data'] = $_GET['data'];
}

/**
 * Console Log Utility (Legacy)
 * 
 * Outputs data to browser console for debugging.
 * 
 * @deprecated Use log_info() for server-side logging instead
 * @param mixed $output Data to log to browser console
 * @param bool $with_script_tags Whether to wrap in <script> tags (default: true)
 * @return void Echoes JavaScript console.log statement
 * 
 * @example
 * console_log(['user' => $userName, 'status' => 'active']);
 * // Outputs: <script>console.log({"user":"John","status":"active"});</script>
 */
function console_log($output, $with_script_tags = true) {
    $js_code = 'console.log(' . json_encode($output, JSON_HEX_TAG) . ');';
    if ($with_script_tags) {
        $js_code = '<script>' . $js_code . '</script>';
    }
    echo $js_code;
}

/**
 * Send JSON Response and Terminate
 * 
 * Standardized response function used by all API endpoints.
 * Sets HTTP status code, formats response as JSON, and terminates execution.
 * 
 * Response Format:
 * {
 *   "message": "...",        // Original response data
 *   "status_code": 200       // HTTP status code
 * }
 * 

 * Send JSON Response Without Terminating
 * 
 * Similar to send_response() but doesn't terminate script execution.
 * Useful for endpoints that need to perform cleanup or send multiple responses.
 * 
 * @param mixed $response Response data (string or array)
 * @param int $code HTTP status code (default: 200)
 * @return void Echoes JSON response
 * 
 * @example
 * send_response_keep_alive(['progress' => 50], 200);
 * // Script continues executing...
 * 
 * @see send_response() For standard responses that terminate
 
 * @param mixed $response Response data (string or array)
 * @param int $code HTTP status code (default: 200)
 * @return never Terminates script execution after sending response
 * 
 * @example
 * // Success response
 * send_response(['id' => 123, 'name' => 'John'], 201);
 * 
 * @example
 * // Error response
 * send_response('User not found', 404);
 * 
 * @see send_response_keep_alive() For responses that don't terminate
 */
function send_response($response, $code = 200) {
    http_response_code($code);

    // Ensure $response is an array
    if (!is_array($response)) {
        $response = ['message' => $response];
    }

/**
 * Server-Side Logging Function
 * 
 * Appends timestamped log entries to server.log file in current directory.
 * Used throughout the application for debugging, audit trails, and error tracking.
 * 
 * Log Format:
 * YYYY-MM-DD HH:MM:SS : [log message]\n
 * 
 * @param string $log Message to log
 * @return void Appends to server.log file
 * 
 * @example
 * log_info('User login successful: ' . $email);
 * // Writes: "2026-02-04 14:30:15 : User login successful: user@example.com"
 * 
 * @example
 * log_info('Database query error: ' . $mysqli->error);
 * 
 * @note File permissions must allow writing to server.log
 * @note Log file can grow large; consider log rotation in production
 */ 
    $response['status_code'] = $code; // Add the response code to the response data
    die(json_encode($response));
}

function send_response_keep_alive($response, $code = 200) {
    http_response_code($code);

    // Ensure $response is an array
    if (!is_array($response)) {
        $response = ['message' => $response];
    }

    $response['status_code'] = $code; // Add the response code to the response data
    echo json_encode($response);
}

function log_info($log) {
    $currentDirectory = getcwd();
    $file=$currentDirectory.'/server.log';
    $currentDateTime = date('Y-m-d H:i:s');
    file_put_contents($file, $currentDateTime." : ".$log.chr(13), FILE_APPEND);
} // log_info

function get_current_attempt($activityId, $studentId, $mysqli) {
    $stmt = $mysqli->prepare('SELECT currentAttempt FROM currentactivity WHERE id = ? AND studentId = ? LIMIT 1');
    if (!$stmt) {
        return 1;
    }

    $stmt->bind_param('ii', $activityId, $studentId);
    if (!$stmt->execute()) {
        return 1;
    }

    $result = $stmt->get_result();
    if (!$result) {
        return 1;
    }

    $row = $result->fetch_assoc();
    $attempt = isset($row['currentAttempt']) ? (int) $row['currentAttempt'] : 1;
    return $attempt > 0 ? $attempt : 1;
}

function enforce_auth_if_needed($config) {
    if (!should_enforce_auth()) {
        return;
    }

    $authHeader = get_auth_header();
    if (!$authHeader) {
        send_response('Unauthorized', 401);
    }

    if (stripos($authHeader, 'Bearer ') === 0) {
        $token = trim(substr($authHeader, 7));
        $claims = [];
        $errorMessage = '';
        $errorCode = 401;

        if (!verify_jwt($token, $config, $claims, $errorCode, $errorMessage)) {
            send_response($errorMessage !== '' ? $errorMessage : 'Unauthorized', $errorCode);
        }

        $GLOBALS['authenticatedUser'] = $claims['sub'] ?? null;
        $GLOBALS['authenticatedRole'] = $claims['role'] ?? null;
        enforce_role_policy($config, $GLOBALS['authenticatedRole']);
        return;
    }

    if (stripos($authHeader, 'Basic ') === 0) {
        $decoded = base64_decode(substr($authHeader, 6));
        $parts = explode(':', $decoded, 2);
        $username = $parts[0] ?? '';
        $password = $parts[1] ?? '';

        $role = null;
        if (!verify_api_user($username, $password, $config, $role)) {
            send_response('Unauthorized', 401);
        }

        $GLOBALS['authenticatedUser'] = $username;
        $GLOBALS['authenticatedRole'] = $role;
        enforce_role_policy($config, $role);
        return;
    }

    send_response('Unauthorized', 401);
}

function should_enforce_auth() {
    $script = basename($_SERVER['SCRIPT_NAME'] ?? '');
    $allowlist = ['authToken.php'];
    return !in_array($script, $allowlist, true);
}

function get_auth_header() {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            return trim($headers['Authorization']);
        }
        if (isset($headers['authorization'])) {
            return trim($headers['authorization']);
        }
    }

    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }

    return null;
}

function verify_api_user($username, $password, $config, &$role = null) {
    $user = get_api_user($username, $config);
    if (!$user) {
        return false;
    }

    if (isset($user['passwordHash']) && password_verify($password, $user['passwordHash'])) {
        $role = $user['role'] ?? null;
        return true;
    }

    if (isset($user['password']) && hash_equals($user['password'], $password)) {
        $role = $user['role'] ?? null;
        return true;
    }

    return false;
}

function get_api_user($username, $config) {
    $users = $config['apiAuthUsers'] ?? [];
    if (!is_array($users)) {
        return null;
    }

    foreach ($users as $user) {
        if (!is_array($user)) {
            continue;
        }
        if (($user['username'] ?? '') === $username) {
            return $user;
        }
    }

    return null;
}

function enforce_role_policy($config, $role) {
    $script = basename($_SERVER['SCRIPT_NAME'] ?? '');
    $requiredRoles = get_required_roles_for_script($script);
    if (!$requiredRoles) {
        return;
    }

    if (!$role || !in_array($role, $requiredRoles, true)) {
        send_response('Forbidden', 403);
    }
}

function get_required_roles_for_script($script) {
    $reportingAllowed = [
        'completedAssessments.php',
        'downloadAnswerFile.php'
    ];

    $isReadOnly = preg_match('/^get.+\.php$/', $script) === 1;
    if ($isReadOnly || in_array($script, $reportingAllowed, true)) {
        return ['admin', 'reporting'];
    }

    return ['admin'];
}

function verify_jwt($token, $config, &$claims, &$errorCode, &$errorMessage) {
    $errorCode = 401;
    $errorMessage = '';

    $secret = $config['jwtSecret'] ?? '';
    if ($secret === '') {
        $errorCode = 500;
        $errorMessage = 'JWT secret is not configured';
        return false;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        $errorMessage = 'Invalid token';
        return false;
    }

    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $headerJson = base64url_decode($encodedHeader);
    $payloadJson = base64url_decode($encodedPayload);

    $header = json_decode($headerJson, true);
    $payload = json_decode($payloadJson, true);

    if (!is_array($header) || !is_array($payload)) {
        $errorMessage = 'Invalid token';
        return false;
    }

    if (($header['alg'] ?? '') !== 'HS256') {
        $errorMessage = 'Unsupported token algorithm';
        return false;
    }

    $signature = base64url_encode(hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true));
    if (!hash_equals($signature, $encodedSignature)) {
        $errorMessage = 'Invalid token signature';
        return false;
    }

    $now = time();
    if (isset($payload['nbf']) && $now < (int) $payload['nbf']) {
        $errorMessage = 'Token not active';
        return false;
    }
    if (isset($payload['exp']) && $now >= (int) $payload['exp']) {
        $errorMessage = 'Token expired';
        return false;
    }

    $issuer = $config['jwtIssuer'] ?? null;
    if ($issuer && isset($payload['iss']) && $payload['iss'] !== $issuer) {
        $errorMessage = 'Invalid token issuer';
        return false;
    }

    $audience = $config['jwtAudience'] ?? null;
    if ($audience && isset($payload['aud']) && $payload['aud'] !== $audience) {
        $errorMessage = 'Invalid token audience';
        return false;
    }

    $claims = $payload;
    return true;
}

function create_jwt($username, $config, $role = null) {
    $secret = $config['jwtSecret'] ?? '';
    if ($secret === '') {
        send_response('JWT secret is not configured', 500);
    }

    $ttlMinutes = (int) ($config['jwtTtlMinutes'] ?? 60);
    if ($ttlMinutes <= 0) {
        $ttlMinutes = 60;
    }

    $now = time();
    $exp = $now + ($ttlMinutes * 60);

    $header = [
        'alg' => 'HS256',
        'typ' => 'JWT'
    ];

    $payload = [
        'iss' => $config['jwtIssuer'] ?? 'ncfel2',
        'aud' => $config['jwtAudience'] ?? 'ncfel2-api',
        'iat' => $now,
        'nbf' => $now - 5,
        'exp' => $exp,
        'sub' => $username,
        'role' => $role
    ];

    $encodedHeader = base64url_encode(json_encode($header));
    $encodedPayload = base64url_encode(json_encode($payload));
    $signature = base64url_encode(hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true));

    return [
        'token' => $encodedHeader . '.' . $encodedPayload . '.' . $signature,
        'exp' => $exp
    ];
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}
