<?php
/**
 * Update a unit, including assessmentType.
 *
 * Request body:
 * - id (int, required)
 * - courseid (int, required)
 * - unitName (string, required)
 * - unitCode (string, required)
 * - assessmentType (string, optional): Open | MultiChoice
 */
include 'setup.php';

if (!isset($receivedData['id'], $receivedData['courseid'], $receivedData['unitName'])) {
    send_response('Missing id, courseid or unitName', 400);
}

if (!isset($receivedData['unitCode'])) {
    send_response('Missing unitCode', 400);
}

$assessmentType = $receivedData['assessmentType'] ?? 'Open';
$assessmentType = is_string($assessmentType) ? trim($assessmentType) : 'Open';
if ($assessmentType !== 'Open' && $assessmentType !== 'MultiChoice') {
    send_response('Invalid assessmentType. Use Open or MultiChoice', 400);
}

$query = 'UPDATE unit SET courseid = ?, unitName = ?, unitCode = ?, assessmentType = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$courseId = (int) $receivedData['courseid'];
$unitName = trim($receivedData['unitName']);
$unitCode = trim($receivedData['unitCode']);
$id = (int) $receivedData['id'];
$stmt->bind_param('isssi', $courseId, $unitName, $unitCode, $assessmentType, $id);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Unit updated', 200);
