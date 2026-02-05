<?php
include 'setup.php';

if (!isset($receivedData['id'], $receivedData['courseid'], $receivedData['unitName'])) {
    send_response('Missing id, courseid or unitName', 400);
}

if (!isset($receivedData['unitCode'])) {
    send_response('Missing unitCode', 400);
}

$query = 'UPDATE unit SET courseid = ?, unitName = ?, unitCode = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseId = (int) $receivedData['courseid'];
$unitName = trim($receivedData['unitName']);
$unitCode = trim($receivedData['unitCode']);
$id = (int) $receivedData['id'];
$stmt->bind_param('issi', $courseId, $unitName, $unitCode, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Unit updated', 200);
