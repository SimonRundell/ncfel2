<?php
include 'setup.php';

$required = ['email', 'passwordHash', 'userName'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$status = isset($receivedData['status']) ? (int) $receivedData['status'] : 0;
$avatar = $receivedData['avatar'] ?? null;

$query = 'INSERT INTO user (email, passwordHash, userName, classCode, status, avatar) VALUES (?, ?, ?, ?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$email = trim($receivedData['email']);
$passwordHash = trim($receivedData['passwordHash']);
$userName = trim($receivedData['userName']);
$classCode = isset($receivedData['classCode']) && $receivedData['classCode'] !== '' ? trim($receivedData['classCode']) : null;

$stmt->bind_param('ssssis', $email, $passwordHash, $userName, $classCode, $status, $avatar);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$response = [
    'message' => 'User created',
    'id' => $mysqli->insert_id,
];

send_response($response, 201);
