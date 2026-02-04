<?php
include 'setup.php';

if (!isset($receivedData['id'], $receivedData['courseName'])) {
    send_response('Missing id or courseName', 400);
}

$query = 'UPDATE course SET courseName = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseName = trim($receivedData['courseName']);
$id = (int) $receivedData['id'];
$stmt->bind_param('si', $courseName, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Course updated', 200);
