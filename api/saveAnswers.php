<?php
include 'setup.php';
require_once __DIR__ . '/emailHelper.php';

$activityId = $receivedData['activityId'] ?? null;
$studentId = $receivedData['studentId'] ?? null;
$answers = $receivedData['answers'] ?? null; // expected map: questionId => answer JSON
$references = $receivedData['references'] ?? []; // expected map: questionId => [urls]
$fileUploads = $receivedData['fileUploads'] ?? null; // expected map: questionId => [file metadata]
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
$query = 'INSERT INTO answers (activityId, studentId, questionId, answer, `references`, status, updatedAt, fileUploads) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?) ' .
         'ON DUPLICATE KEY UPDATE answer = VALUES(answer), `references` = VALUES(`references`), status = VALUES(status), fileUploads = IFNULL(VALUES(fileUploads), fileUploads), updatedAt = VALUES(updatedAt)';

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$referencesMap = is_array($references) ? $references : [];
$fileUploadsMap = is_array($fileUploads) ? $fileUploads : [];
$saved = 0;
foreach ($answers as $questionId => $answerContent) {
    $qid = (int) $questionId;
    $answerJson = is_string($answerContent) ? $answerContent : json_encode($answerContent);
    $refList = $referencesMap[$questionId] ?? [];
    $uploadsForQuestion = array_key_exists($questionId, $fileUploadsMap) ? $fileUploadsMap[$questionId] : null;
    $refsJson = json_encode(is_array($refList) ? $refList : []);
    $uploadsJson = is_array($uploadsForQuestion) ? json_encode($uploadsForQuestion) : null;

    log_info('saveAnswers begin question ' . $qid . ' answerLen=' . strlen($answerJson) . ' refsCount=' . count($refList) . ' uploads=' . ($uploadsForQuestion === null ? 'kept' : count((array)$uploadsForQuestion)));

    $stmt->bind_param('iiissss', $activityId, $studentId, $qid, $answerJson, $refsJson, $status, $uploadsJson);

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

// Send email to teachers if status is SUBMITTED
if ($status === 'SUBMITTED') {
    try {
        // Get student details
        $studentQuery = 'SELECT email, userName, classCode FROM user WHERE id = ?';
        $stmtStudent = $mysqli->prepare($studentQuery);
        if ($stmtStudent) {
            $stmtStudent->bind_param('i', $studentId);
            $stmtStudent->execute();
            $studentResult = $stmtStudent->get_result();
            $student = $studentResult->fetch_assoc();
            
            if ($student) {
                // Get activity/unit details
                $activityQuery = 'SELECT ca.id, ca.unitId, u.name as unitName 
                                 FROM currentActivities ca 
                                 LEFT JOIN unit u ON ca.unitId = u.id 
                                 WHERE ca.id = ?';
                $stmtActivity = $mysqli->prepare($activityQuery);
                if ($stmtActivity) {
                    $stmtActivity->bind_param('i', $activityId);
                    $stmtActivity->execute();
                    $activityResult = $stmtActivity->get_result();
                    $activity = $activityResult->fetch_assoc();
                    
                    // Get teachers (status = 2) for this class
                    $teacherQuery = 'SELECT email, userName FROM user WHERE status = 2';
                    if ($student['classCode']) {
                        $teacherQuery .= ' AND (classCode = ? OR classCode IS NULL)';
                    }
                    $stmtTeacher = $mysqli->prepare($teacherQuery);
                    
                    if ($stmtTeacher) {
                        if ($student['classCode']) {
                            $stmtTeacher->bind_param('s', $student['classCode']);
                        }
                        $stmtTeacher->execute();
                        $teacherResult = $stmtTeacher->get_result();
                        
                        $teacherEmails = [];
                        while ($teacher = $teacherResult->fetch_assoc()) {
                            $teacherEmails[] = $teacher['email'];
                        }
                        
                        if (!empty($teacherEmails)) {
                            $emailHelper = new EmailHelper();
                            $logoUrl = $config['api'] . '/images/exeter_bw.png';
                            $systemUrl = $config['api'];
                            $timestamp = date('Y-m-d H:i:s');
                            
                            $emailHelper->sendTemplateEmail(
                                $teacherEmails,
                                'Unit Submission: ' . $student['userName'] . ' - ' . ($activity['unitName'] ?? 'Unit'),
                                'unit-submission.html',
                                [
                                    'TEACHER_NAME' => 'Teacher',
                                    'STUDENT_NAME' => $student['userName'],
                                    'STUDENT_EMAIL' => $student['email'],
                                    'CLASS_CODE' => $student['classCode'] ?? 'N/A',
                                    'UNIT_NAME' => $activity['unitName'] ?? 'Unknown Unit',
                                    'ACTIVITY_ID' => $activityId,
                                    'TIMESTAMP' => $timestamp,
                                    'QUESTIONS_COUNT' => $total,
                                    'LOGO_URL' => $logoUrl,
                                    'SYSTEM_URL' => $systemUrl
                                ]
                            );
                            log_info('Submission notification emails sent to ' . count($teacherEmails) . ' teachers');
                        }
                    }
                }
            }
        }
    } catch (Exception $e) {
        log_info('Failed to send submission notification email: ' . $e->getMessage());
        // Don't fail the save operation if email fails
    }
}

send_response($response, 200);
