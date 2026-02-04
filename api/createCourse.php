<?php
include 'setup.php';

if (!isset($receivedData['courseName']) || trim($receivedData['courseName']) === '') {
    send_response('Missing courseName', 400);
}

$query = 'INSERT INTO course (courseName) VALUES (?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseName = trim($receivedData['courseName']);
$stmt->bind_param('s', $courseName);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$response = [
    'message' => 'Course created',
    'id' => $mysqli->insert_id,
];

send_response($response, 201);
