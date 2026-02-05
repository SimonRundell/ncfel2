<?php
include 'setup.php';

if (!isset($receivedData['courseid'], $receivedData['unitName'])) {
    send_response('Missing courseid or unitName', 400);
}

if (!isset($receivedData['unitCode']) || trim($receivedData['unitCode']) === '') {
    send_response('Missing unitCode', 400);
}

$query = 'INSERT INTO unit (courseid, unitName, unitCode) VALUES (?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseId = (int) $receivedData['courseid'];
$unitName = trim($receivedData['unitName']);
$unitCode = trim($receivedData['unitCode']);
$stmt->bind_param('iss', $courseId, $unitName, $unitCode);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$response = [
    'message' => 'Unit created',
    'id' => $mysqli->insert_id,
];

send_response($response, 201);
