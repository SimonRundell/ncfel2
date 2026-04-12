<?php
/**
 * Get questions and answers for an activity attempt.
 *
 * Request body:
 * - activityId (int, required)
 * - studentId (int, required)
 * - attemptNumber (int, optional)
 */
include 'setup.php';

$activityId = $receivedData['activityId'] ?? null;
$studentId  = $receivedData['studentId'] ?? null;
$attemptNumber = isset($receivedData['attemptNumber']) ? (int) $receivedData['attemptNumber'] : null;

if ($activityId === null || $studentId === null) {
    send_response('Missing activityId or studentId', 400);
}

$activityId = (int)$activityId;
$studentId  = (int)$studentId;

if (!$attemptNumber) {
    $attemptNumber = get_current_attempt($activityId, $studentId, $mysqli);
}

/**
 * 1) Get courseId + unitId (and optionally assessorComment) from currentactivity
 *    We do NOT return currentactivity rows; we only use them to filter questions.
 */
$caStmt = $mysqli->prepare('
    SELECT courseId, unitId, assessorComment, assessorId
    FROM currentactivity
    WHERE id = ? AND studentId = ?
    LIMIT 1
');

if (!$caStmt) {
    log_info('Prepare failed (currentactivity): ' . $mysqli->error);
    send_response('Database error', 500);
}

$caStmt->bind_param('ii', $activityId, $studentId);

if (!$caStmt->execute()) {
    log_info('Execute failed (currentactivity): ' . $caStmt->error);
    send_response('Database error', 500);
}

$caRes = $caStmt->get_result();
$caRow = $caRes ? $caRes->fetch_assoc() : null;

if (!$caRow) {
    send_response('Activity not found for this student', 404);
}

$courseId = (int)$caRow['courseId'];
$unitId   = (int)$caRow['unitId'];
$assessorId = (int)$caRow['assessorId'];
$assessorComment = $caRow['assessorComment'] ?? '';

/**
 * 2) Combined query:
 *    - All questions for (courseId, unitId)
 *    - LEFT JOIN answers for (activityId, studentId, questionId)
 *
 *    This returns both:
 *      questions.QuestionRef, questions.Question, questions.uploadPermitted
 *      answers.* for that question (if exists)
 */
$stmt = $mysqli->prepare('
    SELECT
        q.id               AS questionId,
        q.QuestionRef      AS QuestionRef,
        q.Question         AS Question,
        q.uploadPermitted  AS uploadPermitted,
        q.unitId           AS unitId,
        q.courseId         AS courseId,

        a.id               AS answerRowId,
        a.answer           AS answer,
        a.`references`     AS `references`,
        a.status           AS status,
        a.outcome          AS outcome,
        a.comment          AS comment,
        a.updatedAt        AS updatedAt,
        a.fileUploads      AS fileUploads

    FROM questions q
    LEFT JOIN answers a
        ON a.questionId = q.id
       AND a.activityId = ?
       AND a.studentId  = ?
       AND a.attemptNumber = ?

    WHERE q.courseid = ?
      AND q.unitid   = ?

    ORDER BY q.id
');

if (!$stmt) {
    log_info('Prepare failed (combined): ' . $mysqli->error);
    send_response('Database error', 500);
}

$stmt->bind_param('iiiii', $activityId, $studentId, $attemptNumber, $courseId, $unitId);

if (!$stmt->execute()) {
    log_info('Execute failed (combined): ' . $stmt->error);
    send_response('Database error', 500);
}

$result = $stmt->get_result();

$rows = [];
$status = 'INPROGRESS'; // default if there are no answers yet

while ($row = $result->fetch_assoc()) {

    // Decode JSON fields safely (answers table may be NULL due to LEFT JOIN)
    $decodedAnswer  = null;
    $decodedRefs    = null;
    $decodedUploads = null;

    if (isset($row['answer']) && $row['answer'] !== null && $row['answer'] !== '') {
        $tmp = json_decode($row['answer'], true);
        $decodedAnswer = ($tmp !== null) ? $tmp : $row['answer'];
    } else {
        $decodedAnswer = null;
    }

    if (isset($row['references']) && $row['references'] !== null && $row['references'] !== '') {
        $tmp = json_decode($row['references'], true);
        $decodedRefs = is_array($tmp) ? $tmp : [];
    } else {
        $decodedRefs = [];
    }

    if (isset($row['fileUploads']) && $row['fileUploads'] !== null && $row['fileUploads'] !== '') {
        $tmp = json_decode($row['fileUploads'], true);
        $decodedUploads = is_array($tmp) ? $tmp : [];
    } else {
        $decodedUploads = [];
    }

    // Track overall activity status if present on any answer row
    if (!empty($row['status'])) {
        $status = $row['status'];
    }

    $rows[] = [
        // questions.*
        'questionId'       => (int)$row['questionId'],
        'QuestionRef'      => $row['QuestionRef'],
        'Question'         => $row['Question'],
        'uploadPermitted'  => (int)$row['uploadPermitted'],

        // answers.* (may be null if not answered yet)
        'answerRowId'      => isset($row['answerRowId']) ? (int)$row['answerRowId'] : null,
        'answer'           => $decodedAnswer,
        'references'       => $decodedRefs,
        'status'           => $row['status'] ?? null,
        'outcome'          => $row['outcome'] ?? 'NOT ACHIEVED',
        'comment'          => $row['comment'] ?? '',
        'updatedAt'        => $row['updatedAt'] ?? null,
        'fileUploads'      => $decodedUploads,
    ];
}

send_response([
    'data' => [
        'activityId' => $activityId,
        'studentId'  => $studentId,
        'courseId'   => $courseId,
        'unitId'     => $unitId,
        'attemptNumber' => $attemptNumber,
        'status'     => $status,
        'assessorId' => $assessorId,
        'assessorComment' => $assessorComment,
        'rows'       => $rows
    ]
], 200);
?>