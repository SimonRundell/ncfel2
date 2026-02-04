<?php
include 'setup.php';

$unitId = $receivedData['unitId'] ?? $receivedData['unitid'] ?? ($_GET['unitId'] ?? $_GET['unitid'] ?? null);
$courseId = $receivedData['courseId'] ?? $receivedData['courseid'] ?? ($_GET['courseId'] ?? $_GET['courseid'] ?? null);

if ($unitId === null) {
    send_response('Missing unitId', 400);
}

$unitId = (int)$unitId;
$courseId = $courseId !== null ? (int)$courseId : null;

$query = 'SELECT * FROM questions WHERE unitid = ?';
$params = [$unitId];
$types = 'i';

if ($courseId !== null) {
    $query .= ' AND courseid = ?';
    $params[] = $courseId;
    $types .= 'i';
}

$query .= ' ORDER BY id ASC';

$stmt = $mysqli->prepare($query);
if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$result = $stmt->get_result();
if ($result) {
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    send_response(['message' => $rows], 200);
}

send_response(['message' => []], 200);
