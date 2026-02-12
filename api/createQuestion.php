<?php
include 'setup.php';

if (!isset($receivedData['courseid'], $receivedData['unitid'], $receivedData['Question'])) {
    send_response('Missing courseid, unitid, or Question', 400);
}

$courseId = (int) $receivedData['courseid'];
$unitId = (int) $receivedData['unitid'];
$questionRef = isset($receivedData['QuestionRef']) ? trim($receivedData['QuestionRef']) : '';
$questionText = trim($receivedData['Question']);
$uploadPermitted = isset($receivedData['uploadPermitted']) ? (int) $receivedData['uploadPermitted'] : 0;

if ($questionText === '') {
    send_response('Question text cannot be empty', 400);
}

$query = 'INSERT INTO questions (courseid, unitid, QuestionRef, Question, uploadPermitted) VALUES (?, ?, ?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$questionRef = $questionRef !== '' ? $questionRef : null;
$stmt->bind_param('iissi', $courseId, $unitId, $questionRef, $questionText, $uploadPermitted);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$response = [
    'message' => 'Question created',
    'id' => $mysqli->insert_id,
];

send_response($response, 201);
