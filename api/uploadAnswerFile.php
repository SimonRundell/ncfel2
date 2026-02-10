<?php
include 'setup.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response('Method not allowed', 405);
}

$activityId = $_POST['activityId'] ?? null;
$studentId = $_POST['studentId'] ?? null;
$questionId = $_POST['questionId'] ?? null;

if ($activityId === null || $studentId === null || $questionId === null) {
    send_response('Missing activityId, studentId, or questionId', 400);
}

if (!isset($_FILES['file'])) {
    send_response('No file uploaded', 400);
}

$file = $_FILES['file'];
if (!isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
    send_response('File upload failed', 400);
}

$questionStmt = $mysqli->prepare('SELECT uploadPermitted FROM questions WHERE id = ? LIMIT 1');
if ($questionStmt) {
    $questionStmt->bind_param('i', $questionId);
    $questionStmt->execute();
    $questionResult = $questionStmt->get_result();
    $questionRow = $questionResult ? $questionResult->fetch_assoc() : null;
    if (!$questionRow || (int) ($questionRow['uploadPermitted'] ?? 0) !== 1) {
        send_response('Uploads are not permitted for this question', 403);
    }
}

$allowedExtensions = ['gif', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsm', 'pdf'];
$originalName = $file['name'] ?? 'file';
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
if (!in_array($extension, $allowedExtensions, true)) {
    send_response('File type not permitted', 415);
}

$sizeLimit = 15 * 1024 * 1024; // 15 MB
if (($file['size'] ?? 0) > $sizeLimit) {
    send_response('File too large (max 15 MB)', 413);
}

$tmpPath = $file['tmp_name'];
$detectedMime = mime_content_type($tmpPath) ?: 'application/octet-stream';
$basePath = rtrim($config['fileStoragePath'] ?? '', '/\\');
if ($basePath === '') {
    send_response('File storage path is not configured', 500);
}

// Ensure root storage folder exists
if (!is_dir($basePath) && !mkdir($basePath, 0775, true)) {
    send_response('Failed to create storage root', 500);
}

$studentDir = $basePath . DIRECTORY_SEPARATOR . $studentId;
if (!is_dir($studentDir) && !mkdir($studentDir, 0775, true)) {
    send_response('Failed to create storage directory', 500);
}

$uuid = bin2hex(random_bytes(16));
$fileName = $extension ? ($uuid . '.' . $extension) : $uuid;
$targetPath = $studentDir . DIRECTORY_SEPARATOR . $fileName;

if (!move_uploaded_file($tmpPath, $targetPath)) {
    send_response('Failed to save uploaded file', 500);
}

$existingAnswer = '';
$existingRefs = '[]';
$existingStatus = 'INPROGRESS';
$currentUploads = [];

$selectStmt = $mysqli->prepare('SELECT answer, `references`, status, fileUploads FROM answers WHERE activityId = ? AND studentId = ? AND questionId = ? LIMIT 1');
if ($selectStmt) {
    $selectStmt->bind_param('iii', $activityId, $studentId, $questionId);
    $selectStmt->execute();
    $selectResult = $selectStmt->get_result();
    if ($selectResult && $row = $selectResult->fetch_assoc()) {
        $existingAnswer = $row['answer'] ?? '';
        $existingRefs = $row['references'] ?? '[]';
        $existingStatus = $row['status'] ?? 'INPROGRESS';
        $decodedUploads = json_decode($row['fileUploads'] ?? '', true);
        $currentUploads = is_array($decodedUploads) ? $decodedUploads : [];
    }
}

$fileEntry = [
    'id' => $fileName,
    'originalName' => $originalName,
    'mimeType' => $detectedMime,
    'size' => (int) ($file['size'] ?? 0),
    'uploadedAt' => date('c'),
    'path' => $studentId . '/' . $fileName,
];
$currentUploads[] = $fileEntry;

$uploadsJson = json_encode($currentUploads);

$insert = $mysqli->prepare('INSERT INTO answers (activityId, studentId, questionId, answer, `references`, status, updatedAt, fileUploads) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?) ON DUPLICATE KEY UPDATE fileUploads = VALUES(fileUploads), updatedAt = VALUES(updatedAt)');
if (!$insert) {
    log_info('uploadAnswerFile prepare failed: ' . $mysqli->error);
    send_response('Database error', 500);
}

$insert->bind_param('iiissss', $activityId, $studentId, $questionId, $existingAnswer, $existingRefs, $existingStatus, $uploadsJson);
if (!$insert->execute()) {
    log_info('uploadAnswerFile execute failed: ' . $insert->error);
    send_response('Database error', 500);
}

$downloadUrl = rtrim($config['api'], '/') . '/downloadAnswerFile.php?activityId=' . urlencode($activityId) . '&studentId=' . urlencode($studentId) . '&questionId=' . urlencode($questionId) . '&fileId=' . urlencode($fileName);

send_response([
    'message' => 'File uploaded',
    'file' => array_merge($fileEntry, ['url' => $downloadUrl]),
    'fileUploads' => $currentUploads,
]);
