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
$mysqli = new mysqli($config['servername'], $config['username'], $config['password'], $config['dbname']);

// Check connection
if ($mysqli->connect_error) {
    log_info("Connection failed: " . $mysqli->connect_error);
    send_response("Connection failed: " . $mysqli->connect_error, 500);
} else {
    log_info("Connected successfully to the database.");
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
/**
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
 */
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
