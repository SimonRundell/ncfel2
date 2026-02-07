# API Documentation - NCFE Level 2 Certificate System

## Overview

This document provides detailed documentation for all API endpoints in the NCFE Level 2 system. All endpoints are located in the `/api` directory and follow RESTful principles where applicable.

## Base Configuration

**Base URL**: Configured in `/.config.json`
```json
{
  "api": "http://localhost/api"
}
```

**Headers**: All requests should include:
```
Content-Type: application/json
```

**CORS**: Cross-origin requests are enabled for all origins (configure for production)

## Standard Response Format

All API endpoints return JSON with this structure:

### Success Response
```json
{
  "status_code": 200,
  "message": "..." // or object/array with data
}
```

### Error Response
```json
{
  "status_code": 400|500,
  "message": "Error description",
  "errors": [] // optional array of specific errors
}
```

## Authentication

### POST /api/getLogin.php
Authenticate user and retrieve account information.

**Request Body:**
```json
{
  "email": "user@example.com",
  "passwordHash": "5f4dcc3b5aa765d61d8327deb882cf99" // MD5 hash
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{\"id\":1,\"email\":\"user@example.com\",\"userName\":\"John Doe\",\"classCode\":\"CS101\",\"status\":0,\"avatar\":\"data:image/...\"}]"
}
```

**User Object:**
- `id` (int): Unique user identifier
- `email` (string): Email address (used for login)
- `userName` (string): Display name
- `classCode` (string): Class code (null for teachers/admins)
- `status` (int): 0=Student, 2=Teacher, 3=Admin
- `avatar` (string): Base64 encoded image or null

**Error Response (500):**
```json
{
  "status_code": 500,
  "message": "Login failed"
}
```

### POST /api/requestPasswordReset.php
Request password reset (sends email to teachers/admins).

**Request Body:**
```json
{
  "email": "student@example.com"
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Password reset request has been sent to your teacher. Please see them during lesson time."
}
```

**Notes:**
- Always returns 200 even if user not found (security)
- Sends email to all users with status 2 or 3 and the configured `adminEmail`
- Manual process requiring in-person verification

## User Management

### GET /api/getUsers.php
Retrieve user(s) with optional filtering.

**Query Parameters (in POST body):**
```json
{
  "id": 123,             // optional: filter by user ID
  "classCode": "CS101",  // optional: filter by class
  "status": 0            // optional: filter by role (0,2,3)
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{user1},{user2},...]"
}
```

### POST /api/createUser.php
Create a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "passwordHash": "5f4dcc3b5aa765d61d8327deb882cf99",
  "userName": "Jane Smith",
  "classCode": "CS101",    // optional, null for teachers/admins
  "status": 0,              // 0=student, 2=teacher, 3=admin
  "avatar": null,           // optional: base64 image
  "plainPassword": "temp123" // optional: for welcome email
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "message": "User created",
  "id": 456
}
```

**Notes:**
- Sends welcome email automatically if status=0
- Email must be unique
- `plainPassword` is NOT stored, only used for welcome email
- New users created via bulk upload have `changeLogin` set to 1, forcing password change on first login

### POST /api/updateUser.php
Update existing user account.

**Request Body:**
```json
{
  "id": 123,
  "email": "updated@example.com",    // optional
  "passwordHash": "new_hash",         // optional
  "userName": "Updated Name",         // optional
  "classCode": "CS102",               // optional
  "status": 0,                        // optional
  "avatar": "data:image/..."          // optional
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "User updated"
}
```

### POST /api/deleteUser.php
Delete a user account.

**Request Body:**
```json
{
  "id": 123
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "User deleted"
}
```

### POST /api/bulkUploadUsers.php
Create multiple users from CSV data.

**Request Body:**
```json
{
  "classCode": "CS101",
  "defaultPassword": "welcome123",
  "csvContent": "email,username,classcode\nstudent1@example.com,Student One,CS101\n..."
}
```

**CSV Format:**
- Headers: email, username, classcode (case-insensitive)
- classcode column optional (uses classCode from request if not provided)
- UTF-8 with BOM supported

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Bulk upload complete",
  "inserted": 25,
  "skipped": 3,
  "errors": ["Row failed: Duplicate entry", ...]
}
```

**Notes:**
- Sends welcome email to all created students
- Transactional: rolls back all on critical error
- Continues on individual row errors
- All bulk-created users have `changeLogin` set to 1, requiring password change on first login

### POST /api/updateSelf.php
Update own profile (student self-service).

**Request Body:**
```json
{
  "id": 123,
  "passwordHash": "new_hash",  // optional
  "userName": "New Name",       // optional
  "avatar": "data:image/..."    // optional
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Profile updated"
}
```

**Restrictions:**
- Can only update own record
- Cannot change email, classCode, or status
- If password is changed and user had `changeLogin=1`, it will be cleared to 0

## Course Management

### GET /api/getCourses.php
Retrieve all courses or specific course.

**Query Parameters (optional):**
```json
{
  "id": 5  // optional: get specific course
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{\"id\":1,\"name\":\"Health & Safety\",\"description\":\"...\"},...]"
}
```

### POST /api/createCourse.php
Create a new course.

**Request Body:**
```json
{
  "name": "New Course Name",
  "description": "Course description text"
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "message": "Course created",
  "id": 789
}
```

### POST /api/updateCourse.php
Update existing course.

**Request Body:**
```json
{
  "id": 5,
  "name": "Updated Name",          // optional
  "description": "New description" // optional
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Course updated"
}
```

### POST /api/deleteCourse.php
Delete a course.

**Request Body:**
```json
{
  "id": 5
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Course deleted"
}
```

**Notes:**
- Cascade deletes associated units
- Use with caution

## Unit Management

### GET /api/getUnits.php
Retrieve units, optionally filtered by course.

**Query Parameters (optional):**
```json
{
  "courseId": 3  // optional: filter by course
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{\"id\":10,\"courseId\":3,\"name\":\"Unit 1\",\"description\":\"...\",\"questions\":[...]},...]"
}
```

**Questions Format (JSON array):**
```json
[
  {
    "id": 1,
    "text": "Question text here",
    "type": "essay|multiple_choice|...",
    "points": 10
  }
]
```

### POST /api/createUnit.php
Create a new unit.

**Request Body:**
```json
{
  "courseId": 3,
  "name": "Unit Name",
  "description": "Unit description",
  "questions": [{"id":1,"text":"Question 1",...}]
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "message": "Unit created",
  "id": 234
}
```

### POST /api/updateUnit.php
Update existing unit.

**Request Body:**
```json
{
  "id": 10,
  "name": "Updated Name",          // optional
  "description": "New description", // optional
  "questions": [...]                // optional: new questions array
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Unit updated"
}
```

### POST /api/deleteUnit.php
Delete a unit.

**Request Body:**
```json
{
  "id": 10
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Unit deleted"
}
```

### POST /api/assignUnitToClass.php
Assign unit to all students in a class.

**Request Body:**
```json
{
  "unitId": 10,
  "classCode": "CS101",
  "assigned": "2026-02-04",
  "deadline": "2026-03-04"
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Unit assigned to N students"
}
```

**Notes:**
- Creates currentActivities records for each student
- Students must exist in the specified class
- Dates in YYYY-MM-DD format

## Activity Management

### GET /api/getCurrentActivities.php
Retrieve current activities with filtering.

**Query Parameters:**
```json
{
  "studentId": 123,  // optional
  "unitId": 10,      // optional
  "classCode": "CS101" // optional
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{\"id\":50,\"unitId\":10,\"studentId\":123,\"assigned\":\"2026-02-04\",\"deadline\":\"2026-03-04\"},...]"
}
```

### POST /api/createCurrentActivity.php
Create activity assignment.

**Request Body:**
```json
{
  "unitId": 10,
  "studentId": 123,
  "assigned": "2026-02-04",
  "deadline": "2026-03-04"
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "message": "Activity created",
  "id": 567
}
```

### POST /api/updateCurrentActivity.php
Update activity details.

**Request Body:**
```json
{
  "id": 50,
  "deadline": "2026-03-15"  // optional
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Activity updated"
}
```

### POST /api/deleteCurrentActivity.php
Delete activity assignment.

**Request Body:**
```json
{
  "id": 50
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Activity deleted"
}
```

## Questions & Answers

### GET /api/getQuestions.php
Get questions for a unit.

**Query Parameters:**
```json
{
  "unitId": 10
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{\"id\":1,\"text\":\"Question 1\",\"type\":\"essay\"},...]"
}
```

### GET /api/getAnswers.php
Get student answers for an activity.

**Query Parameters:**
```json
{
  "activityId": 50,
  "studentId": 123
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{\"id\":100,\"activityId\":50,\"questionId\":1,\"answer\":\"{json}\",\"status\":\"SUBMITTED\",\"outcome\":\"NOT ACHIEVED\",\"comment\":null,\"references\":[],\"updatedAt\":\"2026-02-04 10:30:00\"},...]"
}
```

**Answer Status Values:**
- `NOTSET` - Not started
- `INPROGRESS` - Working on it
- `SUBMITTED` - Submitted for marking
- `INMARKING` - Teacher reviewing
- `REDOING` - Needs revision
- `RESUBMITTED` - Resubmitted after revision
- `INREMARKING` - Teacher reviewing resubmission
- `PASSED` - Successfully completed
- `NOTPASSED` - Did not meet criteria
- `DISCONTINUED` - Abandoned

### POST /api/getAssessments.php
Get assessment records for a specific student with joined course and unit information.

**Request Body:**
```json
{
  "studentId": 123
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": [
    {
      "id": 50,
      "unitId": 10,
      "studentId": 123,
      "courseId": 3,
      "assigned": "2026-02-04",
      "deadline": "2026-03-04",
      "dateSet": "2026-02-04 09:00:00",
      "dateSubmitted": "2026-02-15 14:30:00",
      "dateResubmitted": null,
      "dateMarked": "2026-02-16 10:00:00",
      "dateComplete": "2026-02-16 10:00:00",
      "assessorId": 5,
      "assessorComment": "Well done",
      "status": "PASSED",
      "courseName": "Health & Safety",
      "courseCode": "HS101",
      "unitName": "Unit 1",
      "unitCode": "HS101/U1"
    }
  ]
}
```

**Notes:**
- Returns all current activities for the student with enriched course and unit data
- Used by IndividualAssessment component for detailed student assessment view
- Includes all date tracking fields and assessor information

### POST /api/markAnswers.php
Batch mark answers for an activity with outcomes and comments.

**Request Body:**
```json
{
  "activityId": 50,
  "studentId": 123,
  "outcomes": {
    "1": "ACHIEVED",
    "2": "NOT ACHIEVED",
    "3": "ACHIEVED"
  },
  "comments": {
    "1": "Excellent work",
    "2": "Needs more detail",
    "3": "Good understanding"
  },
  "assessorComment": "Overall good effort. Please review question 2.",
  "assessorId": 5,
  "newStatus": "PASSED"
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Marking complete. 3 answers updated."
}
```

**Notes:**
- Updates multiple answer records in a single transaction
- Sets outcome (ACHIEVED/NOT ACHIEVED) and individual comments per question
- Updates activity status and overall assessor comment
- Records assessor ID and completion date
- Used by MarkingDashboard component

### POST /api/saveAnswers.php
Save or submit student answers.

**Request Body:**
```json
{
  "activityId": 50,
  "studentId": 123,
  "status": "SUBMITTED",
  "answers": {
    "1": "{\"type\":\"doc\",\"content\":[...]}",  // TipTap JSON
    "2": "{\"type\":\"doc\",\"content\":[...]}"
  },
  "references": {
    "1": ["http://example.com/source1"],
    "2": []
  }
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Answers saved",
  "status": "SUBMITTED",
  "saved": 2
}
```

**Notes:**
- Uses UPSERT logic (insert or update)
- `status: "DRAFT"` is converted to `INPROGRESS`
- `status: "SUBMITTED"` triggers email to teachers
- Answer format is TipTap JSON
- References are URLs as JSON array

## Utility Endpoints

### GET /api/getClassCodes.php
Get distinct class codes from user table.

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[\"CS101\",\"CS102\",\"ENG201\",...]"
}
```

### GET /api/getStudents.php
Get all students (status=0).

**Query Parameters (optional):**
```json
{
  "classCode": "CS101"  // optional: filter by class
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "[{user1},{user2},...]"
}
```

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing required fields, invalid JSON |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database error, connection failure |

## Common Error Messages

**"Missing [field]"**
- Cause: Required field not provided in request
- Solution: Include all required fields

**"Connection failed"**
- Cause: Cannot connect to database
- Solution: Check database server, credentials in .config.json

**"Prepare failed" / "Execute failed"**
- Cause: SQL query error
- Solution: Check server.log for details, verify data types

**"Invalid JSON payload"**
- Cause: Request body is not valid JSON
- Solution: Verify JSON syntax, Content-Type header

## Database Schema Reference

### user table
```sql
CREATE TABLE `user` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `userName` VARCHAR(255) NOT NULL,
  `classCode` VARCHAR(50) NULL,
  `status` INT NOT NULL DEFAULT 0,  -- 0=student, 2=teacher, 3=admin
  `avatar` LONGTEXT NULL,
  `changeLogin` TINYINT(1) NOT NULL DEFAULT 0  -- 0=No change required, 1=Must change password on next login
);
```

### course table
```sql
CREATE TABLE `course` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL
);
```

### unit table
```sql
CREATE TABLE `unit` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `courseId` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `questions` JSON NULL,
  FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON DELETE CASCADE
);
```

### currentActivities table
```sql
CREATE TABLE `currentActivities` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `unitId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `assigned` DATE NOT NULL,
  `deadline` DATE NOT NULL,
  FOREIGN KEY (`unitId`) REFERENCES `unit`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
```

### answers table
```sql
CREATE TABLE `answers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `activityId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `questionId` INT NOT NULL,
  `answer` TEXT NULL,
  `outcome` ENUM('ACHIEVED','NOT ACHIEVED') DEFAULT 'NOT ACHIEVED',
  `comment` TEXT NULL,
  `references` JSON NULL,
  `status` ENUM(...) DEFAULT 'NOTSET',
  `updatedAt` DATETIME NULL,
  UNIQUE KEY (`activityId`, `studentId`, `questionId`)
);
```

## Testing Examples

### Using curl

**Login:**
```bash
curl -X POST http://localhost/api/getLogin.php \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","passwordHash":"5f4dcc3b5aa765d61d8327deb882cf99"}'
```

**Create User:**
```bash
curl -X POST http://localhost/api/createUser.php \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "passwordHash":"098f6bcd4621d373cade4e832627b4f6",
    "userName":"New User",
    "classCode":"CS101",
    "status":0
  }'
```

### Using JavaScript/Axios

```javascript
// Login
const response = await axios.post(config.api + '/getLogin.php', {
  email: 'test@example.com',
  passwordHash: CryptoJS.MD5('password').toString()
});

// Create course
await axios.post(config.api + '/createCourse.php', {
  name: 'New Course',
  description: 'Course description'
});

// Save answers
await axios.post(config.api + '/saveAnswers.php', {
  activityId: 50,
  studentId: 123,
  status: 'SUBMITTED',
  answers: {
    1: JSON.stringify(tiptapContent)
  },
  references: {
    1: ['http://example.com']
  }
});
```

## Logging

All API operations are logged to `/api/server.log`:

**Format:**
```
YYYY-MM-DD HH:MM:SS : [log message]
```

**What's Logged:**
- Database connections
- Received POST data
- Query execution results
- Email sending attempts
- Errors and warnings

**Example:**
```
2026-02-04 10:30:15 : Connected successfully to the database.
2026-02-04 10:30:16 : Received: {"email":"test@example.com","passwordHash":"..."}
2026-02-04 10:30:17 : Welcome email sent to test@example.com
```

## Security Considerations

1. **Authentication**: Currently uses MD5 password hashing
   - **Recommendation**: Upgrade to bcrypt or Argon2

2. **CORS**: Currently allows all origins
   - **Recommendation**: Restrict to specific domains in production

3. **SQL Injection**: Protected via prepared statements
   - All queries use parameterized statements

4. **XSS Prevention**: Email templates escape variables
   - Template system uses htmlspecialchars()

5. **Rate Limiting**: Not implemented
   - **Recommendation**: Add rate limiting for authentication endpoints

6. **HTTPS**: Not enforced
   - **Recommendation**: Require HTTPS in production

7. **Session Management**: Uses client-side storage
   - **Recommendation**: Implement server-side sessions with timeout

## Support

For issues or questions:
- Check `/api/server.log` for errors
- Review this documentation
- Contact system administrator
