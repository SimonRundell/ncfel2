<?php
include 'setup.php';

$id = $receivedData['id'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'GET' || !$id) {
    $query = 'SELECT * FROM course ORDER BY courseName';
    $stmt = $mysqli->prepare($query);
    if (!$stmt) {
        log_info('Prepare failed: ' . $mysqli->error);
        send_response('Prepare failed: ' . $mysqli->error, 500);
    }
} else {
    $query = 'SELECT * FROM course WHERE id = ?';
    $stmt = $mysqli->prepare($query);
    if (!$stmt) {
        log_info('Prepare failed: ' . $mysqli->error);
        send_response('Prepare failed: ' . $mysqli->error, 500);
    }
    $stmt->bind_param('i', $id);
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
