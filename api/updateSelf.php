<?php
include 'setup.php';

$required = ['id'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$id = (int) $receivedData['id'];
$email = isset($receivedData['email']) ? trim($receivedData['email']) : null;
$passwordHash = isset($receivedData['passwordHash']) ? trim($receivedData['passwordHash']) : null;
$avatar = $receivedData['avatar'] ?? null;

if ($passwordHash === '' || $passwordHash === null) {
    $passwordHash = null; // leave unchanged
}

$fields = [];
$params = [];
$types = '';

if ($email !== null && $email !== '') {
    $fields[] = 'email = ?';
    $params[] = $email;
    $types .= 's';
}

if ($passwordHash !== null) {
    $fields[] = 'passwordHash = ?';
    $params[] = $passwordHash;
    $types .= 's';
}

if ($avatar !== null) {
    $fields[] = 'avatar = ?';
    $params[] = $avatar;
    $types .= 's';
}

if (empty($fields)) {
    send_response('Nothing to update', 400);
}

$fields[] = 'id = id'; // keep structure

$query = 'UPDATE user SET ' . implode(', ', $fields) . ' WHERE id = ?';
$params[] = $id;
$types .= 'i';

$stmt = $mysqli->prepare($query);
if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

// Return the updated user row
$getStmt = $mysqli->prepare('SELECT * FROM user WHERE id = ? LIMIT 1');
if ($getStmt) {
    $getStmt->bind_param('i', $id);
    if ($getStmt->execute()) {
        $result = $getStmt->get_result();
        $user = $result ? $result->fetch_assoc() : null;
        send_response(['message' => 'Profile updated', 'user' => $user], 200);
    }
}

send_response('Profile updated', 200);
