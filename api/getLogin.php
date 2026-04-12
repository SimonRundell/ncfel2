<?php
/**
 * Validate login credentials and return user record(s).
 *
 * Request body:
 * - email (string, required)
 * - passwordHash (string, required)
 */
include 'setup.php';

$query = "SELECT * FROM user WHERE email = ? AND passwordHash = ?";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("ss", $receivedData['email'], $receivedData['passwordHash']);

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
}

$result = $stmt->get_result();

if ($result) {
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    $json = json_encode($rows);
    log_info("Query successful: " . $json);
    send_response($json, 200);
} else {
    log_info("Query failed: " . $mysqli->error);
    send_response("Query failed: " . $mysqli->error, 500);
}