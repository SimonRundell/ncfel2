# NCFE Level 2 Certificate System

A comprehensive web-based learning management system for NCFE Level 2 Certificate courses at Exeter College. This application provides student assignment management, teacher administration tools, and automated email notifications.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Database Schema](#database-schema)
- [Email System](#email-system)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Frontend Components](#frontend-components)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

The NCFE Level 2 Certificate System is a full-stack web application designed to facilitate online learning for vocational qualifications. It enables students to complete coursework, submit assignments, and track progress, while providing teachers with tools to manage courses, mark submissions, and monitor student performance.

### Key Capabilities

- **Student Portal**: Access assignments, complete coursework with rich text editing, track progress
- **Teacher Dashboard**: Manage students, courses, and units; review submissions
- **Admin Panel**: Full system administration including user management, course creation, and bulk operations
- **Email Automation**: Automated notifications for user creation, password resets, and submissions
- **Real-time Collaboration**: Current activities tracking and assignment management
- **Responsive UI**: Mobile-friendly layouts for narrow screens (<430px)

## Features

### For Students (Status: 0)
- Login with email credentials
- View assigned units and activities
- Complete assignments using rich text editor (TipTap)
- Complete MultiChoice units with single-click answers and autosave
- Add references/citations to answers
- Save drafts and submit for marking
- Track submission status
- Request password resets
- Update profile and avatar
- Forced password change on first login (when required)
- View individual assessment history

### For Teachers (Status: 2)
- All student features plus:
- View student submissions via Marking Dashboard
- Mark and provide feedback (sticky marking header with "Finish marking & return" action)
- Auto-score MultiChoice submissions with per-question outcomes
- Assessment Report: filter by class/status, printable landscape table with key dates
- Individual Assessment view: detailed student assessment history with printable feedback
- Monitor class progress
- Receive email notifications for submissions
- Navigate between Assignments, Marking, and Assessment Overview

### For Administrators (Status: 3)
- Full system access
- User management (create, edit, delete, bulk upload with forced password change)
- Course and unit management
- Set unit assessment type and MultiChoice correct answers
- Activity assignment to classes
- Reporting and analytics
- System configuration
- Access to all teacher features
- Navigate between Admin, Marking, Assessment Overview, and Assignments

## Architecture

### Frontend (React + Vite)
```
┌─────────────────────────────────────────┐
│           App.jsx (Root)                │
│  - Config management                    │
│  - User authentication state            │
│  - Message notifications                │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌─────▼──────────┐
│  Login     │   │  Authenticated │
│  Component │   │  Views         │
└────────────┘   └────────┬───────┘
                          │
              ┌───────────┼────────────┐
              │           │            │
       ┌──────▼─────┐ ┌──▼────────┐ ┌─▼─────────────┐
       │ Student    │ │ Teacher   │ │ Admin Panel   │
       │ Assignments│ │ View      │ │ - User Mgmt   │
       └────────────┘ └───────────┘ │ - Course Mgmt │
                                    │ - Unit Mgmt   │
                                    │ - Activities  │
                                    └───────────────┘
```

### Backend (PHP + MySQL)
```
┌─────────────────────────────────────────┐
│         setup.php (Core)                │
│  - Database connection                  │
│  - Request handling                     │
│  - Logging utilities                    │
│  - Response formatting                  │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────────┐
       │                    │
┌──────▼─────────┐   ┌──────▼──────────┐
│ API Endpoints  │   │ Helper Classes  │
│ - CRUD ops     │   │ - emailHelper   │
│ - Auth         │   │                 │
│ - Assessments  │   │                 │
└────────────────┘   └─────────────────┘
```

## Technology Stack

### Frontend
- **React 19.2** - UI framework
- **Vite 7.2** - Build tool and dev server
- **Ant Design 6.2** - UI component library
- **TipTap 2.10** - Rich text editor
- **Axios 1.13** - HTTP client
- **CryptoJS 4.2** - Password hashing (MD5)

### Backend
- **PHP 8+** - Server-side language
- **MySQL 8.4** - Database
- **PHPMailer 6.9** - Email sending
- **Composer** - PHP dependency management

### Development Tools
- **ESLint** - JavaScript linting
- **Vite HMR** - Hot module replacement
- **Git** - Version control

## Installation

### Prerequisites
- Node.js 18+ and npm
- PHP 8.0+
- MySQL 8.0+
- Composer
- Web server (Apache/Nginx) with PHP support

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ncfel2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:5173`

### Backend Setup

1. **Configure database**
   ```bash
   # Import database schema
   mysql -u root -p < data/ncfel2_v3.sql
   ```

2. **Configure API**
   ```bash
   cd api
   cp .config.example.json .config.json
   # Edit .config.json with your database credentials
   ```

3. **Install PHP dependencies**
   ```bash
   composer install
   ```

4. **Configure web server**
   - Point document root to project directory
   - Ensure `/api` directory is accessible
   - Enable PHP processing

### Email System Setup

See [api/EMAIL_SETUP.md](api/EMAIL_SETUP.md) for detailed email configuration.

## Configuration

### Frontend Configuration (`/.config.json`)
```json
{
  "api": "http://localhost/api"
}
```

### Backend Configuration (`/api/.config.json`)
```json
{
  "servername": "localhost",
  "port": 3306,
  "username": "developer",
  "password": "your_password",
  "dbname": "ncfel2",
  "api": "http://localhost",
  "smtpServer": "smtp.example.com",
  "smtpPort": 587,
  "smtpUser": "email@example.com",
  "smtpPass": "password",
  "smtpFrom": "System Name",
  "smtpFromEmail": "noreply@example.com"
}
```

## Project Structure

```
ncfel2/
├── api/                          # Backend PHP API
│   ├── templates/                # Email templates
│   │   ├── welcome.html
│   │   ├── password-reset-request.html
│   │   └── unit-submission.html
│   ├── .config.json              # API configuration (gitignored)
│   ├── .config.example.json      # Config template
│   ├── setup.php                 # Core setup and utilities
│   ├── emailHelper.php           # Email functionality
│   ├── adminApiHelpers.js        # Admin utilities
│   ├── getLogin.php              # Authentication endpoint
│   ├── createUser.php            # User creation
│   ├── updateUser.php            # User updates
│   ├── deleteUser.php            # User deletion
│   ├── bulkUploadUsers.php       # Bulk user import
│   ├── getUsers.php              # User retrieval
│   ├── getCourses.php            # Course retrieval
│   ├── createCourse.php          # Course creation
│   ├── updateCourse.php          # Course updates
│   ├── deleteCourse.php          # Course deletion
│   ├── getUnits.php              # Unit retrieval
│   ├── createUnit.php            # Unit creation
│   ├── updateUnit.php            # Unit updates
│   ├── deleteUnit.php            # Unit deletion
│   ├── assignUnitToClass.php     # Unit assignment
│   ├── getCurrentActivities.php  # Activity retrieval
│   ├── createCurrentActivity.php # Activity creation
│   ├── updateCurrentActivity.php # Activity updates
│   ├── deleteCurrentActivity.php # Activity deletion
│   ├── getQuestions.php          # Question retrieval
│   ├── getAnswers.php            # Answer retrieval
│   ├── getMarkingBundle.php      # Marking bundle (questions + answers + outcomes)
│   ├── saveAnswers.php           # Answer submission
│   ├── getClassCodes.php         # Class code retrieval
│   ├── getStudents.php           # Student retrieval
│   ├── getAssessments.php        # Assessment retrieval
│   ├── markAnswers.php           # Batch marking operations
│   ├── requestPasswordReset.php  # Password reset requests
│   ├── updateSelf.php            # Self-service profile update
│   └── server.log                # Application logs
├── data/
│   └── ncfel2_v4.sql             # Database schema
├── public/
│   └── images/                   # Static assets
├── src/                          # Frontend React application
│   ├── App.jsx                   # Root component
│   ├── App.css                   # Global styles
│   ├── main.jsx                  # Entry point
│   ├── login.jsx                 # Login component
│   ├── menu.jsx                  # Navigation menu with view switching
│   ├── adminPanel.jsx            # Admin dashboard
│   ├── UserManager.jsx           # User CRUD interface
│   ├── CourseManager.jsx         # Course CRUD interface
│   ├── UnitManager.jsx           # Unit CRUD interface
│   ├── CurrentActivityManager.jsx # Activity CRUD interface
│   ├── AssignUnit.jsx            # Unit assignment interface
│   ├── StudentAssignments.jsx    # Student assignment view
│   ├── StudentAnswer.jsx         # Answer submission interface
│   ├── StudentProfile.jsx        # Profile management
│   ├── MarkingDashboard.jsx      # Teacher marking workspace
│   ├── AssessmentReport.jsx      # Printable assessment overview
│   ├── individualAssessment.jsx  # Individual student assessment view
│   ├── CMFloatAd.jsx             # Floating Exeter College credit banner
│   ├── adminApiHelpers.js        # API helper functions
│   └── dateUtils.js              # Date formatting utilities
├── .config.json                  # Frontend config (gitignored)
├── package.json                  # NPM dependencies
├── vite.config.js                # Vite configuration
├── eslint.config.js              # ESLint configuration
└── README.md                     # This file
```

## User Roles

The system supports three user roles defined by the `status` field:

| Status | Role          | Permissions                                      |
|--------|---------------|--------------------------------------------------|
| 0      | Student       | View assignments, submit work, update profile    |
| 2      | Teacher       | Student permissions + view submissions, mark     |
| 3      | Administrator | Full system access, user/course/unit management  |

## Database Schema

### Core Tables

**user**
- `id` (INT, PK) - Unique identifier
- `email` (VARCHAR) - Login username and email
- `passwordHash` (VARCHAR) - MD5 hashed password
- `userName` (VARCHAR) - Display name
- `classCode` (VARCHAR) - Student's class
- `status` (INT) - User role (0=student, 2=teacher, 3=admin)
- `avatar` (LONGTEXT) - Base64 encoded profile image
- `changeLogin` (TINYINT) - Force password change on next login (0=No, 1=Yes)

**course**
- `id` (INT, PK)
- `name` (VARCHAR)
- `description` (TEXT)

**unit**
- `id` (INT, PK)
- `courseId` (INT, FK)
- `name` (VARCHAR)
- `description` (TEXT)
- `assessmentType` (ENUM) - 'Open' or 'MultiChoice'

**questions**
- `id` (INT, PK)
- `courseid` (INT, FK)
- `unitid` (INT, FK)
- `QuestionRef` (VARCHAR)
- `Question` (TEXT) - Stored HTML
- `uploadPermitted` (TINYINT)
- `MCAnswer` (SMALLINT) - Correct option index for MultiChoice

**currentActivities**
- `id` (INT, PK)
- `unitId` (INT, FK)
- `studentId` (INT, FK)
- `assigned` (DATE) - Assignment date
- `deadline` (DATE) - Due date

**answers**
- `id` (INT, PK)
- `activityId` (INT, FK)
- `studentId` (INT, FK)
- `questionId` (INT)
- `attemptNumber` (INT)
- `answer` (TEXT) - JSON formatted answer or MC option index
- `outcome` (ENUM) - 'ACHIEVED' or 'NOT ACHIEVED'
- `comment` (TEXT) - Teacher feedback
- `references` (JSON) - Citation URLs
- `status` (ENUM) - Submission status
- `fileUploads` (JSON) - Uploaded file metadata per question
- `updatedAt` (DATETIME)

### Status Values

**Answer Status Flow**:
```
NOTSET → INPROGRESS → SUBMITTED → INMARKING → 
  ├─→ PASSED
  ├─→ NOTPASSED
  ├─→ REDOING → RESUBMITTED → INREMARKING → [PASSED/NOTPASSED]
  └─→ DISCONTINUED
```

## Email System

The application includes automated email notifications using PHPMailer:

### Email Types

1. **Welcome Emails**
   - Triggered: User creation (manual or bulk)
   - Recipients: New students (status=0)
   - Contains: Login credentials, temporary password

2. **Password Reset Requests**
   - Triggered: Student clicks "Forgotten password"
   - Recipients: All teachers/admins
   - Contains: Student details, timestamp
   - Note: Manual process for security

3. **Submission Notifications**
   - Triggered: Student submits unit (status=SUBMITTED)
   - Recipients: Teachers
   - Contains: Student info, unit details, submission time

See [api/EMAIL_SETUP.md](api/EMAIL_SETUP.md) for detailed documentation.

## Development

### Running Development Server

```bash
# Frontend
npm run dev

# Backend - use PHP built-in server for testing
cd api
php -S localhost:8000
```

### Building for Production

```bash
npm run build
# Output in /dist directory
```

### Linting

```bash
npm run lint
```

### Database Migrations

When modifying schema:
1. Update `data/ncfel2_v4.sql`
2. Document changes
3. Test with fresh import
4. Update affected API endpoints

### Adding New Features

1. **New API Endpoint**:
   - Create PHP file in `/api`
   - Include `setup.php`
   - Use prepared statements
   - Log operations
   - Return standardized responses

2. **New React Component**:
   - Create in `/src`
   - Add JSDoc comments
   - Handle errors gracefully
   - Update parent components

3. **New Email Template**:
   - Create HTML in `/api/templates`
   - Use `{{VARIABLE}}` syntax
   - Test with emailExample.php

## API Documentation

All API endpoints follow a consistent pattern:

### Request Format
```javascript
{
  // Endpoint-specific parameters
}
```

### Response Format
```javascript
{
  "status_code": 200,  // HTTP status code
  "message": "...",    // Data or error message
  "errors": []         // Optional error details
}
```

### Common Endpoints

#### Authentication
- `POST /api/getLogin.php` - User login
- `POST /api/requestPasswordReset.php` - Request password reset

#### User Management
- `GET /api/getUsers.php` - List users
- `POST /api/createUser.php` - Create user
- `POST /api/updateUser.php` - Update user
- `POST /api/deleteUser.php` - Delete user
- `POST /api/bulkUploadUsers.php` - Bulk import
- `POST /api/updateSelf.php` - Update own profile

#### Course/Unit Management
- `GET /api/getCourses.php` - List courses
- `POST /api/createCourse.php` - Create course
- `GET /api/getUnits.php` - List units
- `POST /api/createUnit.php` - Create unit

#### Activities & Answers
- `GET /api/getCurrentActivities.php` - List activities
- `POST /api/createCurrentActivity.php` - Assign activity
- `GET /api/getQuestions.php` - Get unit questions
- `GET /api/getAnswers.php` - Get student answers
- `POST /api/getMarkingBundle.php` - Get questions/answers/outcomes in one call
- `POST /api/saveAnswers.php` - Submit answers
- `POST /api/getAssessments.php` - Get assessment records
- `POST /api/markAnswers.php` - Batch mark answers

See individual PHP files for detailed parameter documentation.

## Frontend Components

### Core Components

- **App.jsx** - Root application component, handles authentication and view routing (assignments, marking, report, admin)
- **login.jsx** - User authentication with password reset
- **menu.jsx** - Navigation menu with role-based view switching and view locking during forced password change
- **adminPanel.jsx** - Administrative dashboard with tabbed interface

### Admin Components

- **UserManager.jsx** - User CRUD operations with bulk upload
- **CourseManager.jsx** - Course management
- **UnitManager.jsx** - Unit management with question editor
- **CurrentActivityManager.jsx** - Activity assignment and tracking
- **AssignUnit.jsx** - Unit-to-class assignment interface

### Student Components

- **StudentAssignments.jsx** - View and access assigned units
- **StudentAnswer.jsx** - Rich text answer submission with TipTap editor
- **StudentProfile.jsx** - Profile management and avatar upload with forced password change support

### Teacher Components

- **MarkingDashboard.jsx** - Teacher marking workspace with sticky header and "Finish marking & return" action
- **AssessmentReport.jsx** - Filterable and printable assessment overview with date formatting
- **individualAssessment.jsx** - Individual student assessment history with printable feedback

### Utility Components

- **CMFloatAd.jsx** - Floating Exeter College credit banner with hover expansion
- **adminApiHelpers.js** - Helper functions for API data normalization
- **dateUtils.js** - Date formatting utilities (dd/mm/yyyy hh:mm format)

See JSDoc comments in each file for detailed component documentation.

## Security

### Authentication
- MD5 password hashing (consider upgrading to bcrypt)
- API JWT stored in localStorage (`ncfel2_api_token`)
- Email-based usernames (unique constraint)
- Service credentials in `/.config.json` used to request tokens
- Bearer token required for all API endpoints (except `/api/authToken.php`)

**Apache note:** ensure `/api/.htaccess` forwards the `Authorization` header to PHP.

### Authorization
- Role-based access control (status field)
- Server-side permission checks
- API endpoints validate user roles

### Data Protection
- Prepared statements prevent SQL injection
- Input validation on frontend and backend
- HTTPS recommended for production
- Sensitive configs in gitignored files

### Email Security
- Manual password reset process
- In-person verification required
- Teacher verification for sensitive operations

### Recommendations for Production
1. Implement bcrypt/Argon2 password hashing
2. Add CSRF token protection
3. Implement rate limiting
4. Use HTTPS exclusively
5. Regular security audits
6. Implement session timeout
7. Add audit logging

## Troubleshooting

### Common Issues

**Frontend won't start**
- Check Node.js version (18+)
- Delete `node_modules` and `package-lock.json`, reinstall
- Check `.config.json` exists and is valid JSON

**API errors**
- Check PHP error log
- Verify database credentials in `api/.config.json`
- Check database connection
- Review `api/server.log`

**Database connection failed**
- Verify MySQL is running
- Check credentials
- Ensure database exists
- Check firewall settings

**Emails not sending**
- Verify SMTP credentials
- Check `api/server.log` for errors
- Enable PHPMailer debugging
- Test with `api/emailExample.php`

**Login fails**
- Verify user exists in database
- Check password hash (MD5)
- Review browser console for errors
- Check API response in Network tab

### Debugging

**Enable verbose logging**:
In `api/setup.php`, adjust error reporting:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

**Frontend debugging**:
- Open browser DevTools (F12)
- Check Console for errors
- Monitor Network tab for API calls
- Use React DevTools extension

**Backend debugging**:
- Check `api/server.log`
- Review PHP error log
- Add `log_info()` calls
- Use database query logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add JSDoc comments to new code
4. Test thoroughly
5. Submit pull request with description

## License

[Specify license]

## Support

For issues or questions:
- Check documentation in `/api/EMAIL_SETUP.md`
- Review `api/server.log` for errors
- Contact system administrator

## Authors

Exeter College IT Development Team

## Acknowledgments

- NCFE for curriculum standards
- Exeter College for institutional support
- Open source community for tools and libraries
