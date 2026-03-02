<?php
include 'setup.php';

$activityId = $receivedData['activityId'] ?? null;
$studentId = $receivedData['studentId'] ?? null;
$attemptNumber = isset($receivedData['attemptNumber']) ? (int) $receivedData['attemptNumber'] : null;

if ($activityId === null || $studentId === null) {
    send_response('Missing activityId or studentId', 400);
}

if (!$attemptNumber) {
    $attemptNumber = get_current_attempt((int) $activityId, (int) $studentId, $mysqli);
}

$stmt = $mysqli->prepare('SELECT questionId, answer, `references`, status, outcome, comment, updatedAt, fileUploads FROM answers WHERE activityId = ? AND studentId = ? AND attemptNumber = ? ORDER BY questionId');
if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Database error', 500);
}

$stmt->bind_param('iii', $activityId, $studentId, $attemptNumber);
if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Database error', 500);
}

$result = $stmt->get_result();
$answers = [];
$references = [];
$status = 'INPROGRESS';
$outcomes = [];
$comments = [];
$fileUploads = [];
$assessorComment = '';
$currentAttempt = $attemptNumber;

while ($row = $result->fetch_assoc()) {
    $questionId = (int) $row['questionId'];
    $decodedAnswer = json_decode($row['answer'], true);
    $decodedRefs = json_decode($row['references'], true);
    $decodedUploads = json_decode($row['fileUploads'] ?? '', true);

    $answers[$questionId] = $decodedAnswer !== null ? $decodedAnswer : $row['answer'];
    $references[$questionId] = is_array($decodedRefs) ? $decodedRefs : [];
    $status = $row['status'] ?: $status;
    $outcomes[$questionId] = $row['outcome'] ?: 'NOT ACHIEVED';
    $comments[$questionId] = $row['comment'] ?? '';
    $fileUploads[$questionId] = is_array($decodedUploads) ? $decodedUploads : [];
}

$activityStmt = $mysqli->prepare('SELECT assessorComment, currentAttempt FROM currentactivity WHERE id = ? AND studentId = ? LIMIT 1');
if ($activityStmt) {
    $activityStmt->bind_param('ii', $activityId, $studentId);
    if ($activityStmt->execute()) {
        $activityResult = $activityStmt->get_result();
        if ($activityRow = $activityResult->fetch_assoc()) {
            $assessorComment = $activityRow['assessorComment'] ?? '';
            $currentAttempt = isset($activityRow['currentAttempt']) ? (int) $activityRow['currentAttempt'] : $currentAttempt;
        }
    }
}

send_response(['data' => [
    'answers' => $answers,
    'references' => $references,
    'status' => $status,
    'outcomes' => $outcomes,
    'comments' => $comments,
    'fileUploads' => $fileUploads,
    'assessorComment' => $assessorComment,
    'attemptNumber' => $attemptNumber,
    'currentAttempt' => $currentAttempt,
]]);
?>
