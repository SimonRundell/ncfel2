<?php
include 'setup.php';

$required = ['id', 'email', 'passwordHash', 'userName'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$status = isset($receivedData['status']) ? (int) $receivedData['status'] : 0;
$avatar = $receivedData['avatar'] ?? null;

$query = 'UPDATE user SET email = ?, passwordHash = ?, userName = ?, classCode = ?, status = ?, avatar = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$email = trim($receivedData['email']);
$passwordHash = trim($receivedData['passwordHash']);
$userName = trim($receivedData['userName']);
$classCode = isset($receivedData['classCode']) && $receivedData['classCode'] !== '' ? trim($receivedData['classCode']) : null;
$id = (int) $receivedData['id'];

$stmt->bind_param('ssssisi', $email, $passwordHash, $userName, $classCode, $status, $avatar, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('User updated', 200);
