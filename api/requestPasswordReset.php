<?php
include 'setup.php';
require_once __DIR__ . '/emailHelper.php';

$required = ['email'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$email = trim($receivedData['email']);

// Get user details
$query = 'SELECT id, email, userName, classCode, status FROM user WHERE email = ?';
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Prepare failed: ' . $mysqli->error);
    send_response('Prepare failed: ' . $mysqli->error, 500);
}

$stmt->bind_param('s', $email);

if (!$stmt->execute()) {
    log_info('Execute failed: ' . $stmt->error);
    send_response('Execute failed: ' . $stmt->error, 500);
}

$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    // Don't reveal if user exists or not for security
    send_response('Password reset request received', 200);
}

// Get all admin/teacher users (status = 2 or 3)
$adminQuery = 'SELECT email, userName FROM user WHERE status IN (2, 3)';
$adminResult = $mysqli->query($adminQuery);

if (!$adminResult) {
    log_info('Failed to get admin users: ' . $mysqli->error);
    send_response('Failed to process request', 500);
}

$adminEmails = [];
while ($admin = $adminResult->fetch_assoc()) {
    $adminEmails[] = $admin['email'];
}

if (empty($adminEmails)) {
    log_info('No admin users found for password reset notification');
    send_response('Password reset request received', 200);
}

// Send email to all admins/teachers
try {
    $emailHelper = new EmailHelper();
    $logoUrl = $config['api'] . '/images/exeter_bw.png';
    $timestamp = date('Y-m-d H:i:s');
    
    $emailHelper->sendTemplateEmail(
        $adminEmails,
        'Password Reset Request - ' . $user['userName'],
        'password-reset-request.html',
        [
            'USER_NAME' => $user['userName'],
            'EMAIL' => $user['email'],
            'CLASS_CODE' => $user['classCode'] ?? 'N/A',
            'TIMESTAMP' => $timestamp,
            'LOGO_URL' => $logoUrl
        ]
    );
    
    log_info('Password reset request email sent for user: ' . $email);
} catch (Exception $e) {
    log_info('Failed to send password reset email: ' . $e->getMessage());
}

send_response('Password reset request has been sent to your teacher. Please see them during lesson time.', 200);
