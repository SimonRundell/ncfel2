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

$email = trim($receivedData['email']);
$passwordHash = trim($receivedData['passwordHash']);
$userName = trim($receivedData['userName']);
$classCode = isset($receivedData['classCode']) && $receivedData['classCode'] !== '' ? trim($receivedData['classCode']) : null;
$id = (int) $receivedData['id'];

// Fetch current hashes/flags to detect password change
$currentStmt = $mysqli->prepare('SELECT passwordHash, changeLogin FROM user WHERE id = ? LIMIT 1');
if (!$currentStmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}
$currentStmt->bind_param('i', $id);
if (!$currentStmt->execute()) {
    log_info('Execute failed: ' . $currentStmt->error);
    send_response('Execute failed: ' . $currentStmt->error, 500);
}
$currentResult = $currentStmt->get_result();
$currentRow = $currentResult ? $currentResult->fetch_assoc() : null;
$existingHash = $currentRow['passwordHash'] ?? '';
$existingChangeLogin = (int) ($currentRow['changeLogin'] ?? 0);
$passwordChanged = $passwordHash !== '' && $passwordHash !== $existingHash;
$newChangeLogin = $passwordChanged ? 1 : $existingChangeLogin;

$query = 'UPDATE user SET email = ?, passwordHash = ?, userName = ?, classCode = ?, status = ?, avatar = ?, changeLogin = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$stmt->bind_param('ssssisi' . 'i', $email, $passwordHash, $userName, $classCode, $status, $avatar, $newChangeLogin, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('User updated', 200);
