<?php
include 'setup.php';

$payload = is_array($receivedData) ? $receivedData : [];
log_info('assignUnitToClass payload: ' . json_encode($payload));

$classCode = trim((string)($payload['classCode'] ?? ''));
$courseId = $payload['courseId'] ?? null;
$unitId = $payload['unitId'] ?? null;
$assessorId = $payload['assessorId'] ?? null;

$missing = [];
if ($classCode === '') {
    $missing[] = 'classCode';
}
if ($courseId === null || $courseId === '') {
    $missing[] = 'courseId';
}
if ($unitId === null || $unitId === '') {
    $missing[] = 'unitId';
}
if ($assessorId === null || $assessorId === '') {
    $missing[] = 'assessorId';
}

if (!empty($missing)) {
    send_response('Missing fields: ' . implode(', ', $missing), 400);
}

$courseId = (int)$courseId;
$unitId = (int)$unitId;
$assessorId = (int)$assessorId;
$status = 'INPROGRESS';
$dateNow = date('Y-m-d H:i:s');

// Fetch students in class (status 0)
$studentStmt = $mysqli->prepare('SELECT id FROM user WHERE classCode = ? AND status = 0');
if (!$studentStmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}
$studentStmt->bind_param('s', $classCode);
if (!$studentStmt->execute()) {
    log_info('Execute failed: ' . $studentStmt->error);
    send_response('Execute failed: ' . $studentStmt->error, 500);
}
$studentResult = $studentStmt->get_result();
$students = $studentResult ? $studentResult->fetch_all(MYSQLI_ASSOC) : [];

if (empty($students)) {
    send_response('No students found for this class', 200);
}

$checkStmt = $mysqli->prepare('SELECT id FROM currentactivity WHERE studentId = ? AND courseId = ? AND unitId = ? AND status = ? LIMIT 1');
$insertStmt = $mysqli->prepare('INSERT INTO currentactivity (studentId, courseId, unitId, assessorId, status, dateSet) VALUES (?, ?, ?, ?, ?, ?)');

if (!$checkStmt || !$insertStmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$inserted = 0;
$skipped = 0;

$mysqli->begin_transaction();
try {
    foreach ($students as $student) {
        $sid = (int)$student['id'];
        $checkStmt->bind_param('iiis', $sid, $courseId, $unitId, $status);
        if (!$checkStmt->execute()) {
            $skipped++;
            continue;
        }
        $exists = $checkStmt->get_result();
        if ($exists && $exists->fetch_assoc()) {
            $skipped++;
            continue;
        }

        $insertStmt->bind_param('iiiiss', $sid, $courseId, $unitId, $assessorId, $status, $dateNow);
        if ($insertStmt->execute()) {
            $inserted++;
        } else {
            $skipped++;
        }
    }
    $mysqli->commit();
} catch (Exception $e) {
    $mysqli->rollback();
    log_info('Assign failed: ' . $e->getMessage());
    send_response('Assign failed: ' . $e->getMessage(), 500);
}

$response = [
    'message' => 'Assignment complete',
    'inserted' => $inserted,
    'skipped' => $skipped,
];

send_response($response, 200);
