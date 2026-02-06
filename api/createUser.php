<?php
include 'setup.php';
require_once __DIR__ . '/emailHelper.php';

$required = ['email', 'passwordHash', 'userName'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$status = isset($receivedData['status']) ? (int) $receivedData['status'] : 0;
$avatar = $receivedData['avatar'] ?? null;

$query = 'INSERT INTO user (email, passwordHash, userName, classCode, status, avatar, changeLogin) VALUES (?, ?, ?, ?, ?, ?, ?)';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$email = trim($receivedData['email']);
$passwordHash = trim($receivedData['passwordHash']);
$userName = trim($receivedData['userName']);
$classCode = isset($receivedData['classCode']) && $receivedData['classCode'] !== '' ? trim($receivedData['classCode']) : null;
// Store the plain text password temporarily for the email (if provided)
$plainPassword = $receivedData['plainPassword'] ?? 'your-temporary-password';
$changeLogin = 1; // force first-login password change

$stmt->bind_param('ssssisi', $email, $passwordHash, $userName, $classCode, $status, $avatar, $changeLogin);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$userId = $mysqli->insert_id;

// Send welcome email to new user (only if status = 0, i.e., student)
if ($status == 0) {
    try {
        $emailHelper = new EmailHelper();
        $logoUrl = $config['api'] . '/images/exeter_bw.png';
        $loginUrl = $config['api'];
        
        $emailHelper->sendTemplateEmail(
            $email,
            'Welcome to NCFE Level 2 Certificate System',
            'welcome.html',
            [
                'USER_NAME' => $userName,
                'EMAIL' => $email,
                'PASSWORD' => $plainPassword,
                'LOGO_URL' => $logoUrl,
                'LOGIN_URL' => $loginUrl
            ]
        );
        log_info('Welcome email sent to ' . $email);
    } catch (Exception $e) {
        log_info('Failed to send welcome email: ' . $e->getMessage());
        // Don't fail the user creation if email fails
    }
}

$response = [
    'message' => 'User created',
    'id' => $userId,
];

send_response($response, 201);
