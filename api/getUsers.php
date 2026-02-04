<?php
include 'setup.php';

$id = $receivedData['id'] ?? null;
$classCode = $receivedData['classCode'] ?? null;
$status = isset($receivedData['status']) ? (int) $receivedData['status'] : null;

$conditions = [];
$params = [];
$types = '';

if ($id) {
    $conditions[] = 'id = ?';
    $params[] = (int) $id;
    $types .= 'i';
}

if ($classCode) {
    $conditions[] = 'classCode = ?';
    $params[] = $classCode;
    $types .= 's';
}

if ($status !== null) {
    $conditions[] = 'status = ?';
    $params[] = $status;
    $types .= 'i';
}

$query = 'SELECT * FROM user';
if (!empty($conditions)) {
    $query .= ' WHERE ' . implode(' AND ', $conditions);
}
$query .= ' ORDER BY userName';

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
