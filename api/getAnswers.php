<?php
include 'setup.php';

$activityId = $receivedData['activityId'] ?? null;
$studentId = $receivedData['studentId'] ?? null;

if ($activityId === null || $studentId === null) {
    send_response('Missing activityId or studentId', 400);
}

$stmt = $mysqli->prepare('SELECT questionId, answer, `references`, status, outcome, comment, updatedAt FROM answers WHERE activityId = ? AND studentId = ? ORDER BY questionId');
if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Database error', 500);
}

$stmt->bind_param('ii', $activityId, $studentId);
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
$assessorComment = '';

while ($row = $result->fetch_assoc()) {
    $questionId = (int) $row['questionId'];
    $decodedAnswer = json_decode($row['answer'], true);
    $decodedRefs = json_decode($row['references'], true);

    $answers[$questionId] = $decodedAnswer !== null ? $decodedAnswer : $row['answer'];
    $references[$questionId] = is_array($decodedRefs) ? $decodedRefs : [];
    $status = $row['status'] ?: $status;
    $outcomes[$questionId] = $row['outcome'] ?: 'NOT ACHIEVED';
    $comments[$questionId] = $row['comment'] ?? '';
}

$activityStmt = $mysqli->prepare('SELECT assessorComment FROM currentactivity WHERE id = ? AND studentId = ? LIMIT 1');
if ($activityStmt) {
    $activityStmt->bind_param('ii', $activityId, $studentId);
    if ($activityStmt->execute()) {
        $activityResult = $activityStmt->get_result();
        if ($activityRow = $activityResult->fetch_assoc()) {
            $assessorComment = $activityRow['assessorComment'] ?? '';
        }
    }
}

send_response(['data' => [
    'answers' => $answers,
    'references' => $references,
    'status' => $status,
    'outcomes' => $outcomes,
    'comments' => $comments,
    'assessorComment' => $assessorComment,
]]);
?>
