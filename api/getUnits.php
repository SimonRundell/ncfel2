<?php
include 'setup.php';

$courseId = $receivedData['courseid'] ?? null;
$id = $receivedData['id'] ?? null;

$conditions = [];
$params = [];
$types = '';

if ($id) {
    $conditions[] = 'id = ?';
    $params[] = (int) $id;
    $types .= 'i';
}

if ($courseId) {
    $conditions[] = 'courseid = ?';
    $params[] = (int) $courseId;
    $types .= 'i';
}

$query = 'SELECT * FROM unit';
if (!empty($conditions)) {
    $query .= ' WHERE ' . implode(' AND ', $conditions);
}
$query .= ' ORDER BY id';

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$result = $stmt->get_result();

if ($result) {
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    $json = json_encode($rows);
    send_response($json, 200);
} else {
    log_info('Query failed: ' . $mysqli->error);
    send_response('Query failed: ' . $mysqli->error, 500);
}
