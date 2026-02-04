<?php
/**
 * Email Helper Class for NCFE Level 2 System
 *
 * Thin wrapper around PHPMailer configured via .config.json.
 * Supports HTML/plain emails and simple template substitution.
 */

require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailHelper {
    private $config;
    private $mailer;

    public function __construct() {
        $configFile = __DIR__ . '/.config.json';
        if (!file_exists($configFile)) {
            throw new Exception('.config.json not found for email configuration');
        }

        $this->config = json_decode(file_get_contents($configFile), true);
        if (!is_array($this->config)) {
            throw new Exception('Invalid email configuration');
        }

        $this->mailer = new PHPMailer(true);
        $this->setupSMTP();
    }

    private function setupSMTP() {
        $this->mailer->isSMTP();
        $this->mailer->Host       = $this->config['smtpServer'];
        $this->mailer->SMTPAuth   = true;
        $this->mailer->Username   = $this->config['smtpUser'];
        $this->mailer->Password   = $this->config['smtpPass'];
        $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $this->mailer->Port       = $this->config['smtpPort'];

        $this->mailer->setFrom(
            $this->config['smtpFromEmail'],
            $this->config['smtpFrom']
        );

        // $this->mailer->SMTPDebug = 2; // enable if debugging SMTP
    }

    /**
     * Send an email (HTML or plain text).
     */
    public function sendEmail($to, $subject, $body, $isHTML = true, $attachments = []) {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();

            if (is_array($to)) {
                foreach ($to as $email) {
                    $this->mailer->addAddress($email);
                }
            } else {
                $this->mailer->addAddress($to);
            }

            $this->mailer->isHTML($isHTML);
            $this->mailer->Subject = $subject;
            $this->mailer->Body    = $body;
            if ($isHTML) {
                $this->mailer->AltBody = strip_tags($body);
            }

            foreach ($attachments as $attachment) {
                $this->mailer->addAttachment($attachment);
            }

            $this->mailer->send();
            return true;
        } catch (Exception $e) {
            error_log('Email send failed: ' . $this->mailer->ErrorInfo);
            return false;
        }
    }

    /**
     * Convenience method for plain text emails.
     */
    public function sendTextEmail($to, $subject, $body) {
        return $this->sendEmail($to, $subject, $body, false);
    }

    /**
     * Send an email using an HTML template from /api/templates.
     */
    public function sendTemplateEmail($to, $subject, $templateFile, $variables = []) {
        $templatePath = __DIR__ . '/templates/' . $templateFile;
        if (!file_exists($templatePath)) {
            error_log('Email template not found: ' . $templatePath);
            return false;
        }

        $body = file_get_contents($templatePath);
        foreach ($variables as $key => $value) {
            $body = str_replace('{{' . $key . '}}', htmlspecialchars($value), $body);
        }

        return $this->sendEmail($to, $subject, $body, true);
    }
}
