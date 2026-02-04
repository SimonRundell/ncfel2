<?php
include 'setup.php';

$required = ['id', 'studentId', 'courseId', 'unitId', 'status'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$dateSet = $receivedData['dateSet'] ?? null;
$dateSubmitted = $receivedData['dateSubmitted'] ?? null;
$dateMarked = $receivedData['dateMarked'] ?? null;
$dateResubmitted = $receivedData['dateResubmitted'] ?? null;
$dateComplete = $receivedData['dateComplete'] ?? null;

$query = 'UPDATE currentactivity SET studentId = ?, courseId = ?, unitId = ?, status = ?, dateSet = ?, dateSubmitted = ?, dateMarked = ?, dateResubmitted = ?, dateComplete = ? WHERE id = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$studentId = (int) $receivedData['studentId'];
$courseId = (int) $receivedData['courseId'];
$unitId = (int) $receivedData['unitId'];
$status = $receivedData['status'];
$id = (int) $receivedData['id'];

$stmt->bind_param(
    'iiissssssi',
    $studentId,
    $courseId,
    $unitId,
    $status,
    $dateSet,
    $dateSubmitted,
    $dateMarked,
    $dateResubmitted,
    $dateComplete,
    $id
);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Current activity updated', 200);
