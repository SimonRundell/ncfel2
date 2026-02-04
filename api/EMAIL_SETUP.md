# Email System Setup and Usage

## Overview
This email system integrates PHPMailer with your NCFE Level 2 application to send automated emails for:
1. Welcome emails when users are created
2. Password reset requests to teachers/admins
3. Unit submission notifications to teachers

## Installation Steps

### 1. Install Composer (if not already installed)
1. Download Composer from https://getcomposer.org/download/
2. Run the Windows installer (Composer-Setup.exe)
3. Follow the setup wizard
4. Restart your terminal/PowerShell

### 2. Install PHPMailer
Open PowerShell and run:
```powershell
cd "C:\Users\simonrundell\OneDrive - Exeter College\Development\ncfel2\api"
composer install
```

This will create a `vendor` folder and install PHPMailer.

### 3. SMTP Configuration
Your SMTP settings are already configured in `/api/.config.json`:
- Server: smtp.dreamhost.com
- Port: 587 (STARTTLS)
- Username: server@exeter-itdd.com
- From Name: NCFE Level 2 Certificate Server

## Files Created

### Email Templates (`/api/templates/`)
1. **welcome.html** - Sent when new users are created
2. **password-reset-request.html** - Sent to teachers when students request password resets
3. **unit-submission.html** - Sent to teachers when students submit units

### PHP Files
1. **emailHelper.php** - Core email functionality wrapper around PHPMailer
2. **requestPasswordReset.php** - New API endpoint for password reset requests

### Modified Files
1. **createUser.php** - Now sends welcome emails to new students
2. **bulkUploadUsers.php** - Sends welcome emails to all bulk-uploaded users
3. **saveAnswers.php** - Sends notifications when status is "SUBMITTED"
4. **login.jsx** - Added "Forgotten Password" link

## How It Works

### Welcome Emails
**Triggered when:**
- A new user is created via the admin panel (createUser.php)
- Users are bulk uploaded (bulkUploadUsers.php)

**Only sent to:** Students (status = 0)

**Contains:**
- User's email address (username)
- Temporary password
- Login link
- Instructions to change password

### Password Reset Requests
**Triggered when:**
- Student clicks "Forgotten your password?" on login page
- Student enters email and clicks "Request Password Reset"

**Email sent to:** All teachers (status = 2) and admins (status = 3)

**Contains:**
- Student's name and email
- Class code
- Timestamp of request
- Instructions for manual password reset

**Note:** This is intentionally a manual process for security. Teachers must verify the student's identity in person before resetting passwords.

### Unit Submission Notifications
**Triggered when:**
- A student saves answers with status = "SUBMITTED"
- Called from saveAnswers.php

**Email sent to:** All teachers (status = 2), optionally filtered by class code

**Contains:**
- Student details
- Unit information
- Activity ID
- Number of questions answered
- Timestamp
- Link to system

## Template Variables

Templates use `{{VARIABLE_NAME}}` syntax. Available variables:

### welcome.html
- `{{USER_NAME}}` - Student's full name
- `{{EMAIL}}` - Student's email address
- `{{PASSWORD}}` - Temporary password
- `{{LOGO_URL}}` - Path to exeter_bw.png
- `{{LOGIN_URL}}` - System URL

### password-reset-request.html
- `{{USER_NAME}}` - Student's full name
- `{{EMAIL}}` - Student's email
- `{{CLASS_CODE}}` - Student's class code
- `{{TIMESTAMP}}` - When request was made
- `{{LOGO_URL}}` - Path to exeter_bw.png

### unit-submission.html
- `{{TEACHER_NAME}}` - Teacher's name
- `{{STUDENT_NAME}}` - Student's name
- `{{STUDENT_EMAIL}}` - Student's email
- `{{CLASS_CODE}}` - Student's class code
- `{{UNIT_NAME}}` - Name of the unit
- `{{ACTIVITY_ID}}` - Activity ID
- `{{TIMESTAMP}}` - Submission time
- `{{QUESTIONS_COUNT}}` - Number of questions answered
- `{{LOGO_URL}}` - Path to exeter_bw.png
- `{{SYSTEM_URL}}` - System URL

## Customizing Templates

Templates are standard HTML files in `/api/templates/`. You can:
1. Edit the HTML/CSS directly
2. Add new template variables
3. Create new templates

To use custom templates:
```php
$emailHelper = new EmailHelper();
$emailHelper->sendTemplateEmail(
    'recipient@example.com',
    'Subject Line',
    'your-template.html',
    [
        'VARIABLE_1' => 'value1',
        'VARIABLE_2' => 'value2'
    ]
);
```

## User Status Codes
- **0** = Student
- **2** = Teacher
- **3** = Admin

## Troubleshooting

### Emails not sending
1. Check server.log in `/api/` for error messages
2. Verify SMTP credentials in `.config.json`
3. Ensure PHPMailer is installed (`vendor` folder exists)
4. Check that composer autoload is working

### Enable debugging
In `emailHelper.php`, uncomment this line:
```php
// $this->mailer->SMTPDebug = 2;
```

### Test email sending
Use the provided `emailExample.php`:
```php
<?php
require_once __DIR__ . '/emailHelper.php';

$emailHelper = new EmailHelper();
$result = $emailHelper->sendEmail(
    'test@example.com',
    'Test Email',
    '<h1>Test</h1><p>This is a test email.</p>'
);

echo $result ? 'Success!' : 'Failed!';
```

### Template not found
Ensure templates are in `/api/templates/` folder with correct names:
- welcome.html
- password-reset-request.html
- unit-submission.html

## Security Notes

1. **Password Reset**: Intentionally manual process requiring in-person verification
2. **Email Logging**: All email operations are logged to server.log
3. **Error Handling**: Email failures don't block user creation or submission operations
4. **Plain Passwords**: Only sent once in welcome email; stored as MD5 hash in database

## Future Enhancements

Consider adding:
- Email preferences per user
- HTML email previews in admin panel
- Email queue for batch processing
- Email delivery status tracking
- Resend functionality
- Additional templates for other events

## Support

For issues with:
- **SMTP Connection**: Contact your email administrator
- **Template Rendering**: Check HTML/CSS syntax
- **PHPMailer**: Refer to https://github.com/PHPMailer/PHPMailer
- **Application Integration**: Check server.log for details
