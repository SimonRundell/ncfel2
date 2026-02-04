<?php
/**
 * Example: How to use the EmailHelper
 * 
 * This demonstrates sending emails using the SMTP configuration
 * from .config.json
 */

require_once __DIR__ . '/emailHelper.php';

// Example 1: Send a simple HTML email
function sendWelcomeEmail($userEmail, $userName) {
    $emailHelper = new EmailHelper();
    
    $subject = "Welcome to NCFEL2";
    $body = "
        <h1>Welcome, $userName!</h1>
        <p>Your account has been created successfully.</p>
        <p>You can now log in to access your courses.</p>
    ";
    
    return $emailHelper->sendEmail($userEmail, $subject, $body);
}

// Example 2: Send a plain text email
function sendPasswordResetEmail($userEmail, $resetToken) {
    $emailHelper = new EmailHelper();
    
    $subject = "Password Reset Request";
    $body = "
        You have requested a password reset.
        
        Your reset token is: $resetToken
        
        This token will expire in 24 hours.
    ";
    
    return $emailHelper->sendTextEmail($userEmail, $subject, $body);
}

// Example 3: Send email to multiple recipients
function sendNotificationToAdmins($message) {
    $emailHelper = new EmailHelper();
    
    $admins = ['admin1@example.com', 'admin2@example.com'];
    $subject = "System Notification";
    $body = "<p>$message</p>";
    
    return $emailHelper->sendEmail($admins, $subject, $body);
}

// Example 4: Send email with attachment
function sendReportEmail($userEmail, $reportPath) {
    $emailHelper = new EmailHelper();
    
    $subject = "Your Report is Ready";
    $body = "<p>Please find your report attached.</p>";
    $attachments = [$reportPath];
    
    return $emailHelper->sendEmail($userEmail, $subject, $body, true, $attachments);
}

// Test the email functionality (uncomment to test)
// if (sendWelcomeEmail('test@example.com', 'Test User')) {
//     echo "Email sent successfully!";
// } else {
//     echo "Email failed to send.";
// }
