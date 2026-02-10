<?php
include 'setup.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response('Method not allowed', 405);
}

$activityId = $receivedData['activityId'] ?? null;
$studentId = $receivedData['studentId'] ?? null;
$questionId = $receivedData['questionId'] ?? null;
$fileId = $receivedData['fileId'] ?? null;

if ($activityId === null || $studentId === null || $questionId === null || !$fileId) {
    send_response('Missing activityId, studentId, questionId, or fileId', 400);
}

$selectStmt = $mysqli->prepare('SELECT fileUploads FROM answers WHERE activityId = ? AND studentId = ? AND questionId = ? LIMIT 1');
if (!$selectStmt) {
    log_info('deleteAnswerFile prepare failed: ' . $mysqli->error);
    send_response('Database error', 500);
}

$selectStmt->bind_param('iii', $activityId, $studentId, $questionId);
$selectStmt->execute();
$result = $selectStmt->get_result();
if (!$result || !($row = $result->fetch_assoc())) {
    send_response('Answer record not found', 404);
}

$decodedUploads = json_decode($row['fileUploads'] ?? '', true);
$uploads = is_array($decodedUploads) ? $decodedUploads : [];
$remaining = [];
$found = false;
foreach ($uploads as $upload) {
    if (($upload['id'] ?? '') === $fileId) {
        $found = true;
        continue;
    }
    $remaining[] = $upload;
}

if (!$found) {
    send_response('File not found for this answer', 404);
}

$updateStmt = $mysqli->prepare('UPDATE answers SET fileUploads = ?, updatedAt = NOW() WHERE activityId = ? AND studentId = ? AND questionId = ? LIMIT 1');
if (!$updateStmt) {
    log_info('deleteAnswerFile update prepare failed: ' . $mysqli->error);
    send_response('Database error', 500);
}

$uploadsJson = json_encode($remaining);
$updateStmt->bind_param('siii', $uploadsJson, $activityId, $studentId, $questionId);
if (!$updateStmt->execute()) {
    log_info('deleteAnswerFile execute failed: ' . $updateStmt->error);
    send_response('Database error', 500);
}

$basePath = rtrim($config['fileStoragePath'] ?? '', '/\\');
if ($basePath !== '') {
    $filePath = $basePath . DIRECTORY_SEPARATOR . $studentId . DIRECTORY_SEPARATOR . basename($fileId);
    if (is_file($filePath)) {
        @unlink($filePath);
    }
}

send_response([
    'message' => 'File removed',
    'fileUploads' => $remaining,
]);
