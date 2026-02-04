<?php
include 'setup.php';

if (!isset($receivedData['id'])) {
    send_response('Missing id', 400);
}

$query = 'DELETE FROM user WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$id = (int) $receivedData['id'];
$stmt->bind_param('i', $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('User deleted', 200);
