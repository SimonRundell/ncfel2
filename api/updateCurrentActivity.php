<?php
include 'setup.php';

$required = ['id', 'studentId', 'courseId', 'unitId', 'status'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}


$studentId = (int) $receivedData['studentId'];
$courseId = (int) $receivedData['courseId'];
$unitId = (int) $receivedData['unitId'];
$status = $receivedData['status'];
$id = (int) $receivedData['id'];

// Build the update dynamically so missing fields (e.g. dateSet) are left untouched.
$setClauses = [
    'studentId = ?',
    'courseId = ?',
    'unitId = ?',
    'status = ?'
];
$types = 'iiis';
$params = [&$studentId, &$courseId, &$unitId, &$status];

if (array_key_exists('dateSet', $receivedData)) {
    $dateSet = $receivedData['dateSet'];
    $setClauses[] = 'dateSet = ?';
    $types .= 's';
    $params[] = &$dateSet;
}

if (array_key_exists('dateSubmitted', $receivedData)) {
    $dateSubmitted = $receivedData['dateSubmitted'];
    $setClauses[] = 'dateSubmitted = ?';
    $types .= 's';
    $params[] = &$dateSubmitted;
}

if (array_key_exists('dateMarked', $receivedData)) {
    $dateMarked = $receivedData['dateMarked'];
    $setClauses[] = 'dateMarked = ?';
    $types .= 's';
    $params[] = &$dateMarked;
}

if (array_key_exists('dateResubmitted', $receivedData)) {
    $dateResubmitted = $receivedData['dateResubmitted'];
    $setClauses[] = 'dateResubmitted = ?';
    $types .= 's';
    $params[] = &$dateResubmitted;
}

if (array_key_exists('dateComplete', $receivedData)) {
    $dateComplete = $receivedData['dateComplete'];
    $setClauses[] = 'dateComplete = ?';
    $types .= 's';
    $params[] = &$dateComplete;
}

$query = 'UPDATE currentactivity SET ' . implode(', ', $setClauses) . ' WHERE id = ?';
$types .= 'i';
$params[] = &$id;

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

send_response('Current activity updated', 200);
