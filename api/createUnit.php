<?php
/**
 * Create a unit with an assessment type (Open or MultiChoice).
 *
 * Request body:
 * - courseid (int, required)
 * - unitName (string, required)
 * - unitCode (string, required)
 * - assessmentType (string, optional): Open | MultiChoice
 */
include 'setup.php';

if (!isset($receivedData['courseid'], $receivedData['unitName'])) {
    send_response('Missing courseid or unitName', 400);
}

if (!isset($receivedData['unitCode']) || trim($receivedData['unitCode']) === '') {
    send_response('Missing unitCode', 400);
}

$assessmentType = $receivedData['assessmentType'] ?? 'Open';
$assessmentType = is_string($assessmentType) ? trim($assessmentType) : 'Open';
if ($assessmentType !== 'Open' && $assessmentType !== 'MultiChoice') {
    send_response('Invalid assessmentType. Use Open or MultiChoice', 400);
}

$query = 'INSERT INTO unit (courseid, unitName, unitCode, assessmentType) VALUES (?, ?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseId = (int) $receivedData['courseid'];
$unitName = trim($receivedData['unitName']);
$unitCode = trim($receivedData['unitCode']);
$stmt->bind_param('isss', $courseId, $unitName, $unitCode, $assessmentType);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$response = [
    'message' => 'Unit created',
    'id' => $mysqli->insert_id,
];

send_response($response, 201);
