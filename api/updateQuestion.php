<?php
include 'setup.php';

if (!isset($receivedData['id'], $receivedData['courseid'], $receivedData['unitid'], $receivedData['Question'])) {
    send_response('Missing id, courseid, unitid, or Question', 400);
}

$id = (int) $receivedData['id'];
$courseId = (int) $receivedData['courseid'];
$unitId = (int) $receivedData['unitid'];
$questionRef = isset($receivedData['QuestionRef']) ? trim($receivedData['QuestionRef']) : '';
$questionText = trim($receivedData['Question']);
$uploadPermitted = isset($receivedData['uploadPermitted']) ? (int) $receivedData['uploadPermitted'] : 0;
$mcAnswer = $receivedData['MCAnswer'] ?? null;
$mcAnswer = $mcAnswer === null || $mcAnswer === '' ? null : (int) $mcAnswer;
if ($mcAnswer !== null && $mcAnswer < 1) {
    send_response('Invalid MCAnswer. Use a 1-based index.', 400);
}

if ($questionText === '') {
    send_response('Question text cannot be empty', 400);
}

$query = 'UPDATE questions SET courseid = ?, unitid = ?, QuestionRef = ?, Question = ?, uploadPermitted = ?, MCAnswer = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$questionRef = $questionRef !== '' ? $questionRef : null;
$stmt->bind_param('iissiii', $courseId, $unitId, $questionRef, $questionText, $uploadPermitted, $mcAnswer, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Question updated', 200);
