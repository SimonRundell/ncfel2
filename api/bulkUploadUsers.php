<?php
include 'setup.php';

$required = ['classCode', 'defaultPassword', 'csvContent'];
foreach ($required as $field) {
    if (!isset($receivedData[$field]) || trim((string)$receivedData[$field]) === '') {
        send_response('Missing ' . $field, 400);
    }
}

$classCodeDefault = trim($receivedData['classCode']);
$defaultPassword = trim($receivedData['defaultPassword']);
$csvContent = (string) $receivedData['csvContent'];

$hash = md5($defaultPassword);
$status = 0; // student
$avatar = null;

$handle = fopen('php://memory', 'r+');
fwrite($handle, $csvContent);
rewind($handle);

$header = fgetcsv($handle);
if ($header === false) {
    send_response('CSV appears empty or invalid', 400);
}

$header = array_map(function ($h) {
    $h = preg_replace('/^\xEF\xBB\xBF/', '', (string) $h); // strip BOM
    return strtolower(trim($h));
}, $header);

// Map expected fields
$emailIdx = array_search('email', $header, true);
$userIdx = array_search('username', $header, true);
$classIdx = array_search('classcode', $header, true);

if ($emailIdx === false || $userIdx === false) {
    send_response('CSV must include email and userName columns', 400);
}

$query = 'INSERT INTO user (email, passwordHash, userName, classCode, status, avatar) VALUES (?, ?, ?, ?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$stmt->bind_param('ssssis', $email, $passwordHash, $userName, $classCode, $status, $avatar);
$inserted = 0;
$skipped = 0;
$errors = [];

$mysqli->begin_transaction();

try {
    while (($row = fgetcsv($handle)) !== false) {
        // Skip completely empty rows
        if (count(array_filter($row, fn($v) => trim((string)$v) !== '')) === 0) {
            continue;
        }

        $email = $emailIdx !== false ? trim((string) ($row[$emailIdx] ?? '')) : '';
        $userName = $userIdx !== false ? trim((string) ($row[$userIdx] ?? '')) : '';
        $classCode = $classIdx !== false ? trim((string) ($row[$classIdx] ?? '')) : $classCodeDefault;
        $passwordHash = $hash;

        if ($email === '' || $userName === '') {
            $skipped++;
            $errors[] = 'Skipped row: missing email or userName';
            continue;
        }

        if ($classCode === '') {
            $skipped++;
            $errors[] = 'Skipped row: missing classCode';
            continue;
        }

        if (!$stmt->execute()) {
            $skipped++;
            $errors[] = 'Row failed: ' . $stmt->error;
            continue;
        }
        $inserted++;
    }

    $mysqli->commit();
} catch (Exception $e) {
    $mysqli->rollback();
    log_info('Bulk upload failed: ' . $e->getMessage());
    send_response('Bulk upload failed: ' . $e->getMessage(), 500);
}

$response = [
    'message' => 'Bulk upload complete',
    'inserted' => $inserted,
    'skipped' => $skipped,
    'errors' => $errors,
];

send_response($response, 200);
