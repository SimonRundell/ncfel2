<?php
include 'setup.php';

$filters = [
    'id' => ['column' => 'id', 'type' => 'i'],
    'studentId' => ['column' => 'studentId', 'type' => 'i'],
    'courseId' => ['column' => 'courseId', 'type' => 'i'],
    'unitId' => ['column' => 'unitId', 'type' => 'i'],
    'status' => ['column' => 'status', 'type' => 's'],
];

$conditions = [];
$params = [];
$types = '';

foreach ($filters as $key => $meta) {
    if (isset($receivedData[$key]) && $receivedData[$key] !== '') {
        $conditions[] = $meta['column'] . ' = ?';
        $params[] = $meta['type'] === 'i' ? (int) $receivedData[$key] : $receivedData[$key];
        $types .= $meta['type'];
    }
}

$query = 'SELECT * FROM currentactivity';
if (!empty($conditions)) {
    $query .= ' WHERE ' . implode(' AND ', $conditions);
}
$query .= ' ORDER BY id DESC';

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
