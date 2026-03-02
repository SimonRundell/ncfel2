<?php
include 'setup.php';

$authHeader = get_auth_header();
$username = '';
$password = '';

if ($authHeader && stripos($authHeader, 'Basic ') === 0) {
    $decoded = base64_decode(substr($authHeader, 6));
    $parts = explode(':', $decoded, 2);
    $username = $parts[0] ?? '';
    $password = $parts[1] ?? '';
} else {
    $username = $receivedData['username'] ?? '';
    $password = $receivedData['password'] ?? '';
}

if ($username === '' || $password === '') {
    send_response('Missing credentials', 400);
}

$role = null;
if (!verify_api_user($username, $password, $config, $role)) {
    header('WWW-Authenticate: Basic realm="NCFE API"');
    send_response('Unauthorized', 401);
}

$tokenData = create_jwt($username, $config, $role);

send_response([
    'token' => $tokenData['token'],
    'tokenType' => 'Bearer',
    'expiresAt' => $tokenData['exp']
], 200);
