<?php
include 'setup.php';

if (!isset($receivedData['id'], $receivedData['courseid'], $receivedData['unitName'])) {
    send_response('Missing id, courseid or unitName', 400);
}

$query = 'UPDATE unit SET courseid = ?, unitName = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseId = (int) $receivedData['courseid'];
$unitName = trim($receivedData['unitName']);
$id = (int) $receivedData['id'];
$stmt->bind_param('isi', $courseId, $unitName, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Unit updated', 200);
