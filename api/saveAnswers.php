<?php
include 'setup.php';

$activityId = $receivedData['activityId'] ?? null;
$studentId = $receivedData['studentId'] ?? null;
$answers = $receivedData['answers'] ?? null; // expected map: questionId => answer JSON
$references = $receivedData['references'] ?? []; // expected map: questionId => [urls]
$incomingStatus = $receivedData['status'] ?? 'DRAFT';
// answers.status enum currently does not include DRAFT; map DRAFT to INPROGRESS so inserts succeed.
$status = $incomingStatus === 'DRAFT' ? 'INPROGRESS' : $incomingStatus;

if ($activityId === null || $studentId === null || !is_array($answers)) {
    send_response('Missing or invalid activityId, studentId, or answers', 400);
}

log_info('saveAnswers request for activity ' . $activityId . ' student ' . $studentId . ' status ' . $status . ' (incoming ' . $incomingStatus . ') with ' . count($answers) . ' answers');
log_info('saveAnswers using database ' . ($config['dbname'] ?? 'unknown'));

// Upsert one row per question so we retain questionId linkage.
// Expect a unique key on (activityId, questionId, studentId) in the answers table.
$query = 'INSERT INTO answers (activityId, studentId, questionId, answer, `references`, status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW()) ' .
         'ON DUPLICATE KEY UPDATE answer = VALUES(answer), `references` = VALUES(`references`), status = VALUES(status), updatedAt = VALUES(updatedAt)';

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$saved = 0;
foreach ($answers as $questionId => $answerContent) {
    $qid = (int) $questionId;
    $answerJson = is_string($answerContent) ? $answerContent : json_encode($answerContent);
    $refList = $references[$questionId] ?? [];
    $refsJson = json_encode($refList);

    log_info('saveAnswers begin question ' . $qid . ' answerLen=' . strlen($answerJson) . ' refsCount=' . count($refList));

    $stmt->bind_param('iiisss', $activityId, $studentId, $qid, $answerJson, $refsJson, $status);

    if (!$stmt->execute()) {
        log_info('Execute failed for question ' . $qid . ': ' . $stmt->error);
        send_response('Execute failed: ' . $stmt->error, 500);
    }
    $affected = $stmt->affected_rows;
    $saved += $affected > 0 ? 1 : 0;
    $warn = $affected === 0 ? ' (warning: no rows affected, check constraints/indexes)' : '';
    if ($stmt->error) {
        log_info('saveAnswers question ' . $qid . ' error after execute: ' . $stmt->error);
    }
    log_info('saveAnswers question ' . $qid . ' affected_rows=' . $affected . ' insert_id=' . $stmt->insert_id . $warn);
}

$total = count($answers);
log_info('saveAnswers persisted ' . $saved . ' of ' . $total . ' rows for activity ' . $activityId . ' student ' . $studentId . ' status ' . $status);

$countResult = $mysqli->query('SELECT COUNT(*) AS c FROM answers');
if ($countResult) {
    $row = $countResult->fetch_assoc();
    log_info('answers table row count now ' . ($row['c'] ?? 'unknown'));
    $countResult->free();
} else {
    log_info('answers table count query failed: ' . $mysqli->error);
}

$response = [
    'message' => 'Answers saved',
    'status' => $status,
    'saved' => $saved,
];

if ($saved === 0) {
    send_response('No answers were persisted. Check that answers table has columns (activityId, studentId, questionId, answer, references, status, updatedAt) and a UNIQUE KEY on (activityId, questionId, studentId).', 500);
}

send_response($response, 200);
