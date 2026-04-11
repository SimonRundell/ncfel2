<?php
/**
 * Fetch a marking bundle for a specific activity attempt.
 * Returns questions, answers, outcomes, comments, uploads, and attempt metadata
 * in one call to keep marking and assessment views consistent.
 *
 * Request body:
 * - activityId (int, required)
 * - studentId (int, required)
 * - attemptNumber (int, optional; defaults to current attempt)
 *
 * Response message.data:
 * - questions: array of { id, QuestionRef, Question, uploadPermitted, MCAnswer }
 * - answers: map questionId => answer (JSON string or MC selection index)
 * - outcomes: map questionId => ACHIEVED | NOT ACHIEVED
 * - comments: map questionId => string
 * - fileUploads: map questionId => array of upload metadata
 * - attemptNumber: int
 */
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

$activityId = (int) $activityId;
$studentId = (int) $studentId;

$query = 'SELECT a.questionId, a.answer, a.outcome, a.comment, a.status, a.updatedAt, a.fileUploads, q.QuestionRef, q.Question, q.uploadPermitted, q.MCAnswer '
    . 'FROM answers a '
    . 'JOIN questions q ON q.id = a.questionId '
    . 'WHERE a.activityId = ? AND a.studentId = ? AND a.attemptNumber = ? '
    . 'ORDER BY a.questionId';

$stmt = $mysqli->prepare($query);
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

$questions = [];
$answers = [];
$outcomes = [];
$comments = [];
$fileUploads = [];

while ($row = $result->fetch_assoc()) {
    $qid = (int) $row['questionId'];
    $answers[$qid] = $row['answer'];
    $outcomes[$qid] = $row['outcome'] ?: 'NOT ACHIEVED';
    $comments[$qid] = $row['comment'] ?? '';

    $decodedUploads = json_decode($row['fileUploads'] ?? '', true);
    $fileUploads[$qid] = is_array($decodedUploads) ? $decodedUploads : [];

    $questions[] = [
        'id' => $qid,
        'QuestionRef' => $row['QuestionRef'] ?? null,
        'Question' => $row['Question'] ?? null,
        'uploadPermitted' => $row['uploadPermitted'] ?? 0,
        'MCAnswer' => $row['MCAnswer'],
    ];
}

send_response(['data' => [
    'questions' => $questions,
    'answers' => $answers,
    'outcomes' => $outcomes,
    'comments' => $comments,
    'fileUploads' => $fileUploads,
    'attemptNumber' => $attemptNumber,
]]);
