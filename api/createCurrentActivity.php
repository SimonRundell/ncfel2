<?php
include 'setup.php';

$required = ['studentId', 'courseId', 'unitId'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$status = $receivedData['status'] ?? 'NOTSET';
$dateSet = $receivedData['dateSet'] ?? null;
$dateSubmitted = $receivedData['dateSubmitted'] ?? null;
$dateMarked = $receivedData['dateMarked'] ?? null;
$dateResubmitted = $receivedData['dateResubmitted'] ?? null;
$dateComplete = $receivedData['dateComplete'] ?? null;

$query = 'INSERT INTO currentactivity (studentId, courseId, unitId, status, dateSet, dateSubmitted, dateMarked, dateResubmitted, dateComplete) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$studentId = (int) $receivedData['studentId'];
$courseId = (int) $receivedData['courseId'];
$unitId = (int) $receivedData['unitId'];

$stmt->bind_param(
    'iiissssss',
    $studentId,
    $courseId,
    $unitId,
    $status,
    $dateSet,
    $dateSubmitted,
    $dateMarked,
    $dateResubmitted,
    $dateComplete
);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$response = [
    'message' => 'Current activity created',
    'id' => $mysqli->insert_id,
];

send_response($response, 201);
