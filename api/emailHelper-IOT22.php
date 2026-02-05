<?php
/**
 * @fileoverview Email Helper Class for NCFE Level 2 System
 * 
 * Provides a wrapper around PHPMailer for sending emails using SMTP.
 * Automatically loads configuration from .config.json and supports:
 * - Plain text emails
 * - HTML emails
 * - Template-based emails with variable substitution
 * - Multiple recipients
 * - File attachments
 * 
 * Configuration Requirements (.config.json):
 * - smtpServer: SMTP server hostname
 * - smtpPort: SMTP port (usually 587 for TLS)
 * - smtpUser: SMTP authentication username
 * - smtpPass: SMTP authentication password
 * - smtpFromEmail: Default sender email address
 * - smtpFrom: Default sender name
 * 
 * @requires PHPMailer - Install via: composer require phpmailer/phpmailer
 * @author Exeter College IT Team
 * @version 1.0
 * @date 4th February 2026
 * 
 * @example
 * // Basic usage
 * $emailHelper = new EmailHelper();
 * $emailHelper->sendEmail('user@example.com', 'Subject', '<p>Body</p>');
 * 
 * @example
 * // Template usage
 * $emailHelper->sendTemplateEmail(
 *     'user@example.com',
 *     'Welcome',
 *     'welcome.html',
 *     ['USER_NAME' => 'John']
 * );
 */

/**
 * Email Helper for NCFE2
 * Uses PHPMailer with SMTP configuration from .config.json
 */

require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * E/**
     * @var array Configuration loaded from .config.json
     */
    private $config;
    
    /**
     * @var PHPMailer PHPMailer instance for sending emails
     */
    private $mailer;
    
    /**
     * Constructor - Initializes email helper and configures SMTP
     * 
     * Loads configuration from .config.json and sets up PHPMailer
     * with SMTP settings. Throws exception if config file is missing.
     * 
     * @throws Exception If .config.json file not found
     * 
     * @example
     * try {
     *     $emailHelper = new EmailHelper();
     * } catch (Exception $e) {
     *     error_log('Email setup failed: ' . $e->getMessage());
     * }
     */anages email sending functionality with automatic SMTP configuration.
 * P/**
     * Configure SMTP Settings
     * 
     * Sets up PHPMailer with SMTP configuration from .config.json:
     * - Enables SMTP mode
     * - Configures server, port, and authentication
     * - Sets default "From" address
     * - Uses STARTTLS encryption
     * 
     * Debug mode can be enabled by uncommenting SMTPDebug line.
     * 
     * @private
     * @return void
     */
    rovides methods for sending plain, HTML, and template-based emails.
 * 
 * @class
 */
class EmailHelper {
    private $config;
    private $mailer;
    Email
     * 
     * Primary method for sending emails. Supports both plain text and HTML,
     * multiple recipients, and file attachments.
     * 
     * Process Flow:
     * 1. Clears any previous recipients/attachments
     * 2. Adds recipient(s)
     * 3. Sets content type (HTML/plain text)
     * 4. Sets subject and body
     * 5. Generates plain text alternative for HTML emails
     * 6. Adds attachments if provided
     * 7. Sends email
     * 8. Logs errors if send fails
     * 
     * @param string|array $to Recipient email address(es)
     *                         Single: 'user@example.com'
     *                         Multiple: ['user1@example.com', 'user2@example.com']
     * @param string $subject Email subject line
     * @param string $body Email body content (HTML or plain text)
     * @param bool $isHTML Whether body is HTML (default: true)
     * @param array $attachments Optional array of file paths to attach
     * @return bool True on success, false on failure
     * 
     * @example
     * // Simple HTML email
     * $success = $emailHelper->sendEmail(
     *     'student@example.com',
     *     'Assignment Graded',
     *     '<h1>Your assignment has been marked</h1><p>See feedback...</p>'
     * );
     * 
     * @example
     * // Multiple recipients with attachment
     * $emailHelper->sendEmail(
     *     ['teacher1@example.com', 'teacher2@example.com'],
     *     'Student Submission',
     *     '<p>New submission from John Doe</p>',
     *     true,
     *     ['/path/to/submission.pdf']
     * );
        $this->config = json_decode(file_get_contents($configFile), true);
        
        // Initialize PHPMailer
        $this->mailer = new PHPMailer(true);
        $this->setupSMTP();
    }
    
    private function setupSMTP() {
        // Server settings
        $this->mailer->isSMTP();
        $this->mailer->Host       = $this->config['smtpServer'];
        $this->mailer->SMTPAuth   = true;
        $this->mailer->Username   = $this->config['smtpUser'];
        $this->mailer->Password   = $this->config['smtpPass'];
        $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $this->mailer->Port       = $this->config['smtpPort'];
        
        // Default from address
        $this->mailer->setFrom(
            $this->config['smtpFromEmail'],
            $this->config['smtpFrom']
        );
        
        // For debugging (disable in production)
        // $this->mailer->SMTPDebug = 2;
    }
    
    /**
     * Send an email
     * 
     * @param string|array $to Recipient email address(es)
     * @param Plain Text Email
     * 
     * Convenience method for sending plain text emails.
     * Wraps sendEmail() with isHTML set to false.
     * 
     * @param string|array $to Recipient email address(es)
     * @param string $subject Email subject line
     * @param sEmail Using a Template
     * 
     * Loads an HTML template file, replaces variables, and sends as HTML email.
     * Templates use {{VARIABLE_NAME}} syntax for placeholders.
     * 
     * Template Location: /api/templates/
     * 
     * Variable Substitution:
     * - All variables are HTML-escaped for security
     * - Variables not found in template are ignored
     * - Missing variables in data are left as {{VARIABLE_NAME}}
     * 
     * Available Templates:
     * - welcome.html - New user welcome with credentials
     * - password-reset-request.html - Password reset notification
     * - unit-submission.html - Assignment submission notification
     * 
     * @param string|array $to Recipient email address(es)
     * @param string $subject Email subject line
     * @param string $templateFile Template filename (without path)
     *                             e.g., 'welcome.html'
     * @param array $variables Associative array of variable=>value pairs
     *                        e.g., ['USER_NAME' => 'John', 'EMAIL' => 'john@example.com']
     * @return bool True on success, false on failure
     * 
     * @example
     * $emailHelper->sendTemplateEmail(
     *     'newstudent@example.com',
     *     'Welcome to NCFE Level 2',
     *     'welcome.html',
     *     [
     *         'USER_NAME' => 'Jane Smith',
     *         'EMAIL' => 'jane@example.com',
     *         'PASSWORD' => 'temp123',
     *         'LOGO_URL' => 'http://example.com/logo.png',
     *         'LOGIN_URL' => 'http://example.com/login'
     *     ]
     * );
     * 
     * @example
     * // Multiple teachers notification
     * $emailHelper->sendTemplateEmail(
     *     ['teacher1@example.com', 'teacher2@example.com'],
     *     'New Submission: John Doe',
     *     'unit-submission.html',
     *     [
     *         'TEACHER_NAME' => 'Teacher',
     *         'STUDENT_NAME' => 'John Doe',
     *         'UNIT_NAME' => 'Health and Safety',
     *         'TIMESTAMP' => date('Y-m-d H:i:s')
     *     ]
     * );
     * 
     * @note Returns false if template file not found
     * @note Logs error to PHP error log if template missing
     *     "Your password has been reset.\nNew password: xyz123"
     * );Email subject
     * @param string $body Email body (can be HTML)
     * @param bool $isHTML Whether the body is HTML (default: true)
     * @param array $attachments Optional array of file paths to attach
     * @return bool Success status
     */
    public function sendEmail($to, $subject, $body, $isHTML = true, $attachments = []) {
        try {
            // Clear any previous recipients
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            
            // Add recipient(s)
            if (is_array($to)) {
                foreach ($to as $email) {
                    $this->mailer->addAddress($email);
                }
            } else {
                $this->mailer->addAddress($to);
            }
            
            // Content
            $this->mailer->isHTML($isHTML);
            $this->mailer->Subject = $subject;
            $this->mailer->Body    = $body;
            
            // Add plain text version if HTML
            if ($isHTML) {
                $this->mailer->AltBody = strip_tags($body);
            }
            
            // Add attachments if any
            foreach ($attachments as $attachment) {
                $this->mailer->addAttachment($attachment);
            }
            
            // Send
            $this->mailer->send();
            return true;
            
        } catch (Exception $e) {
            error_log("Email send failed: {$this->mailer->ErrorInfo}");
            return false;
        }
    }
    
    /**
     * Send a plain text email
     */
    public function sendTextEmail($to, $subject, $body) {
        return $this->sendEmail($to, $subject, $body, false);
    }
    
    /**
     * Send an email using a template
     * 
     * @param string|array $to Recipient email address(es)
     * @param string $subject Email subject
     * @param string $templateFile Template filename (without path)
     * @param array $variables Key-value pairs to replace in template
     * @return bool Success status
     */
    public function sendTemplateEmail($to, $subject, $templateFile, $variables = []) {
        $templatePath = __DIR__ . '/templates/' . $templateFile;
        
        if (!file_exists($templatePath)) {
            error_log("Email template not found: $templatePath");
            return false;
        }
        
        $body = file_get_contents($templatePath);
        
        // Replace variables in template
        foreach ($variables as $key => $value) {
            $body = str_replace('{{' . $key . '}}', htmlspecialchars($value), $body);
        }
        
        return $this->sendEmail($to, $subject, $body, true);
    }
}
