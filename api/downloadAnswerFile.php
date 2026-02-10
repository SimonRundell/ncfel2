<?php
include 'setup.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_response('Method not allowed', 405);
}

$activityId = $_GET['activityId'] ?? null;
$studentId = $_GET['studentId'] ?? null;
$questionId = $_GET['questionId'] ?? null;
$fileId = $_GET['fileId'] ?? null;

if ($activityId === null || $studentId === null || $questionId === null || !$fileId) {
    send_response('Missing activityId, studentId, questionId, or fileId', 400);
}

$selectStmt = $mysqli->prepare('SELECT fileUploads FROM answers WHERE activityId = ? AND studentId = ? AND questionId = ? LIMIT 1');
if (!$selectStmt) {
    log_info('downloadAnswerFile prepare failed: ' . $mysqli->error);
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
$entry = null;
foreach ($uploads as $upload) {
    if (($upload['id'] ?? '') === $fileId) {
        $entry = $upload;
        break;
    }
}

if (!$entry) {
    send_response('File not found for this answer', 404);
}

$basePath = rtrim($config['fileStoragePath'] ?? '', '/\\');
if ($basePath === '') {
    send_response('File storage path is not configured', 500);
}

$filePath = $basePath . DIRECTORY_SEPARATOR . $studentId . DIRECTORY_SEPARATOR . basename($fileId);
if (!is_file($filePath)) {
    send_response('Stored file missing', 404);
}

$mime = $entry['mimeType'] ?? mime_content_type($filePath) ?: 'application/octet-stream';
$downloadName = $entry['originalName'] ?? basename($fileId);

header_remove('Content-Type');
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: inline; filename="' . basename($downloadName) . '"');
readfile($filePath);
exit;
