<?php
include 'setup.php';

$activityId = isset($receivedData['activityId']) ? (int) $receivedData['activityId'] : null;
$studentId = isset($receivedData['studentId']) ? (int) $receivedData['studentId'] : null;
$marks = $receivedData['marks'] ?? null; // expected: { questionId: { outcome, comment } }
$finalStatus = $receivedData['finalStatus'] ?? '';

if ($activityId === null || $studentId === null || !is_array($marks)) {
    send_response('Missing activityId, studentId, or marks payload', 400);
}

$allowedFinalStatuses = ['PASSED', 'REDOING'];
if (!in_array($finalStatus, $allowedFinalStatuses, true)) {
    send_response('Invalid finalStatus. Use PASSED or REDOING', 400);
}

$updateStmt = $mysqli->prepare('UPDATE answers SET outcome = ?, comment = ?, status = ?, updatedAt = NOW() WHERE activityId = ? AND studentId = ? AND questionId = ?');
if (!$updateStmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$updated = 0;
$missingQuestions = [];
foreach ($marks as $questionId => $payload) {
    $qid = (int) $questionId;
    $rawOutcome = isset($payload['outcome']) && strtoupper($payload['outcome']) === 'ACHIEVED' ? 'ACHIEVED' : 'NOT ACHIEVED';
    $comment = isset($payload['comment']) ? trim((string) $payload['comment']) : '';
    if (strlen($comment) > 500) {
        $comment = substr($comment, 0, 500);
    }

    $updateStmt->bind_param('sssiii', $rawOutcome, $comment, $finalStatus, $activityId, $studentId, $qid);

    if (!$updateStmt->execute()) {
        log_info('Update failed for question ' . $qid . ': ' . $updateStmt->error);
        send_response('Update failed: ' . $updateStmt->error, 500);
    }

    if ($updateStmt->affected_rows === 0) {
        $missingQuestions[] = $qid;
    } else {
        $updated++;
    }
}

$now = date('Y-m-d H:i:s');
$dateComplete = $finalStatus === 'PASSED' ? $now : null;

$activityStmt = $mysqli->prepare('UPDATE currentactivity SET status = ?, dateMarked = ?, dateComplete = ? WHERE id = ? AND studentId = ?');
if (!$activityStmt) {
    log_info('Prepare failed for currentactivity: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}
$activityStmt->bind_param('sssii', $finalStatus, $now, $dateComplete, $activityId, $studentId);
if (!$activityStmt->execute()) {
    log_info('currentactivity update failed: ' . $activityStmt->error);
    send_response('currentactivity update failed: ' . $activityStmt->error, 500);
}

$response = [
    'message' => 'Marking saved',
    'updated' => $updated,
    'finalStatus' => $finalStatus,
];

if (!empty($missingQuestions)) {
    $response['missingQuestions'] = $missingQuestions;
}

send_response($response, 200);
