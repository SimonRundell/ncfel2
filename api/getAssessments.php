<?php
include 'setup.php';

$query = "SELECT currentactivity.*, course.courseName, unit.unitName 
          FROM currentactivity
          INNER JOIN course ON currentactivity.courseId = course.id
          INNER JOIN unit ON currentactivity.unitId = unit.id
          WHERE studentId = ?";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("i", $receivedData['studentId']);


if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
}

$result = $stmt->get_result();

if ($result) {
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    log_info("Found " . count($rows) . " assessment records");
    send_response(['message' => $rows], 200);
} else {
    log_info("Query failed: " . $mysqli->error);
    send_response("Query failed: " . $mysqli->error, 500);
}