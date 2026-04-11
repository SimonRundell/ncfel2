<?php
/**
 * Persist marking outcomes for an activity attempt.
 * Updates answers.outcome/comment per question and sets answers.status to RETURNED
 * when a redo is required. Also updates currentactivity status and attempt tracking.
 *
 * Request body:
 * - activityId (int, required)
 * - studentId (int, required)
 * - marks (object, required): questionId => { outcome, comment }
 * - assessorComment (string, optional)
 * - finalStatus (string, required): PASSED | REDOING | NOTPASSED
 */
include 'setup.php';

$activityId = isset($receivedData['activityId']) ? (int) $receivedData['activityId'] : null;
$studentId = isset($receivedData['studentId']) ? (int) $receivedData['studentId'] : null;
$marks = $receivedData['marks'] ?? null; // expected: { questionId: { outcome, comment } }
$assessorComment = isset($receivedData['assessorComment']) ? trim((string) $receivedData['assessorComment']) : '';
if (strlen($assessorComment) > 1000) {
    $assessorComment = substr($assessorComment, 0, 1000);
}
$finalStatus = $receivedData['finalStatus'] ?? '';

if ($activityId === null || $studentId === null || !is_array($marks)) {
    send_response('Missing activityId, studentId, or marks payload', 400);
}

$attemptStmt = $mysqli->prepare('SELECT currentAttempt FROM currentactivity WHERE id = ? AND studentId = ? LIMIT 1');
if (!$attemptStmt) {
    log_info('Prepare failed for currentactivity attempt: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}
$attemptStmt->bind_param('ii', $activityId, $studentId);
if (!$attemptStmt->execute()) {
    log_info('Execute failed for currentactivity attempt: ' . $attemptStmt->error);
    send_response('Execute failed: ' . $attemptStmt->error, 500);
}
$attemptResult = $attemptStmt->get_result();
$attemptRow = $attemptResult ? $attemptResult->fetch_assoc() : null;
if (!$attemptRow) {
    send_response('Activity not found', 404);
}
$currentAttempt = isset($attemptRow['currentAttempt']) ? (int) $attemptRow['currentAttempt'] : 1;

$allowedFinalStatuses = ['PASSED', 'REDOING', 'NOTPASSED'];
if (!in_array($finalStatus, $allowedFinalStatuses, true)) {
    send_response('Invalid finalStatus. Use PASSED, REDOING, or NOTPASSED', 400);
}

if ($finalStatus === 'REDOING' && $currentAttempt >= 2) {
    send_response('Second attempt already used', 400);
}

if ($finalStatus === 'NOTPASSED' && $currentAttempt !== 2) {
    send_response('NOTPASSED is only allowed on attempt 2', 400);
}

$statusToStore = $finalStatus === 'REDOING' ? 'RETURNED' : $finalStatus;
$updateStmt = $mysqli->prepare('UPDATE answers SET outcome = ?, comment = ?, status = ?, updatedAt = NOW() WHERE activityId = ? AND studentId = ? AND questionId = ? AND attemptNumber = ?');
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

    $updateStmt->bind_param('sssiiii', $rawOutcome, $comment, $statusToStore, $activityId, $studentId, $qid, $currentAttempt);

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

if ($statusToStore === 'RETURNED') {
    $statusStmt = $mysqli->prepare('UPDATE answers SET status = ?, updatedAt = NOW() WHERE activityId = ? AND studentId = ? AND attemptNumber = ?');
    if (!$statusStmt) {
        log_info('Prepare failed for bulk status update: ' . $mysqli->error);
        send_response('Prepare failed: ' . $mysqli->error, 500);
    }
    $statusStmt->bind_param('siii', $statusToStore, $activityId, $studentId, $currentAttempt);
    if (!$statusStmt->execute()) {
        log_info('Bulk status update failed: ' . $statusStmt->error);
        send_response('Bulk status update failed: ' . $statusStmt->error, 500);
    }
}

$now = date('Y-m-d H:i:s');
$dateComplete = $finalStatus === 'PASSED' || $finalStatus === 'NOTPASSED' ? $now : null;

if ($finalStatus === 'REDOING') {
    $cloneStmt = $mysqli->prepare('INSERT INTO answers (activityId, studentId, questionId, attemptNumber, answer, outcome, comment, `references`, status, updatedAt, fileUploads)
        SELECT activityId, studentId, questionId, 2, answer, outcome, comment, `references`, ?, NOW(), fileUploads
        FROM answers WHERE activityId = ? AND studentId = ? AND attemptNumber = 1
        ON DUPLICATE KEY UPDATE answer = VALUES(answer), `references` = VALUES(`references`), fileUploads = VALUES(fileUploads), status = VALUES(status), updatedAt = VALUES(updatedAt)');
    if (!$cloneStmt) {
        log_info('Prepare failed for attempt clone: ' . $mysqli->error);
        send_response('Prepare failed: ' . $mysqli->error, 500);
    }
    $redoStatus = 'REDOING';
    $cloneStmt->bind_param('sii', $redoStatus, $activityId, $studentId);
    if (!$cloneStmt->execute()) {
        log_info('Attempt clone failed: ' . $cloneStmt->error);
        send_response('Attempt clone failed: ' . $cloneStmt->error, 500);
    }
}

$activityStmt = $mysqli->prepare('UPDATE currentactivity SET status = ?, dateMarked = ?, dateComplete = ?, assessorComment = ?, currentAttempt = ?, dateReturned = ? WHERE id = ? AND studentId = ?');
if (!$activityStmt) {
    log_info('Prepare failed for currentactivity: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}
$activityStatus = $finalStatus === 'REDOING' ? 'RETURNED' : $finalStatus;
$nextAttempt = $finalStatus === 'REDOING' ? 2 : $currentAttempt;
$dateReturned = $finalStatus === 'REDOING' ? $now : null;
$activityStmt->bind_param('ssssisii', $activityStatus, $now, $dateComplete, $assessorComment, $nextAttempt, $dateReturned, $activityId, $studentId);
if (!$activityStmt->execute()) {
    log_info('currentactivity update failed: ' . $activityStmt->error);
    send_response('currentactivity update failed: ' . $activityStmt->error, 500);
}

$response = [
    'message' => 'Marking saved',
    'updated' => $updated,
    'finalStatus' => $activityStatus,
    'attemptNumber' => $currentAttempt,
];

if (!empty($missingQuestions)) {
    $response['missingQuestions'] = $missingQuestions;
}

send_response($response, 200);
