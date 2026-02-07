# Frontend Component Documentation

## Overview

This document provides detailed documentation for all React components in the NCFE Level 2 Certificate System. Components are built with React 19.2 and use Ant Design for UI elements.

## Component Architecture

```
App.jsx (Root)
├── Login.jsx (Unauthenticated)
└── Authenticated Views
    ├── Menu.jsx (Navigation with view switching)
    ├── StudentProfile.jsx (Modal with forced change support)
    ├── CMFloatAd.jsx (Floating credit banner)
    └── Role-Based Content (activeView)
        ├── AdminPanel.jsx (Status=3, view='admin')
        │   ├── UserManager.jsx
        │   ├── CourseManager.jsx
        │   ├── UnitManager.jsx
        │   ├── CurrentActivityManager.jsx
        │   └── AssignUnit.jsx
        ├── StudentAssignments.jsx (view='assignments')
        │   └── StudentAnswer.jsx
        ├── MarkingDashboard.jsx (Status>=2, view='marking')
        └── AssessmentReport.jsx (Status>=2, view='report')
            └── IndividualAssessment.jsx (Modal)
```

## Core Components

### App.jsx
**Purpose**: Root application component managing global state and view routing

**State Management:**
```javascript
- config: Application configuration from .config.json
- currentUser: Authenticated user object or null
- sendSuccessMessage: Success notification message
- sendErrorMessage: Error notification message
- activeView: Current view ('assignments', 'marking', 'report', 'admin')
- showProfile: Toggle profile modal
- mustChangePassword: Boolean flag if user.changeLogin is set
```

**Flow:**
1. Loads configuration on mount
2. Displays Login if no currentUser
3. Checks if mustChangePassword (user.changeLogin === 1)
4. If mustChangePassword, forces profile modal open and locks navigation
5. Renders Menu + appropriate view based on user.status and activeView
6. Handles global error/success messages

**Props**: None (root component)

**Key Features:**
- Cache-busting config load
- Ant Design message notifications
- View-based routing (not URL-based)
- Profile modal management
- Forced password change enforcement
- View locking during mandatory operations

**View Selection Logic:**
```javascript
useEffect(() => {
  if (!currentUser) return;
  if (mustChangePassword) {
    setShowProfile(true);
  } else if (currentUser.status === 3) {
    setActiveView('admin');
  } else if (currentUser.status === 2) {
    setActiveView('marking');
  } else {
    setActiveView('assignments');
  }
}, [currentUser, mustChangePassword]);
```

---

### login.jsx
**Purpose**: User authentication and password reset interface

**Props:**
```javascript
{
  config: Object,                      // API configuration
  setCurrentUser: Function,            // Set authenticated user
  setSendSuccessMessage: Function,     // Display success
  setSendErrorMessage: Function        // Display error
}
```

**State:**
```javascript
- email: string                   // User email/username
- password: string                // Password (plain text)
- isLoading: boolean              // API call in progress
- motdContent: string             // Message of the day
- showPasswordReset: boolean      // Toggle reset interface
```

**Authentication Flow:**
1. User enters email and password
2. Password hashed with MD5 client-side
3. POST to /api/getLogin.php
4. On success: setCurrentUser with response
5. On failure: show error message

**Password Reset Flow:**
1. User clicks "Forgotten your password?"
2. Interface shows reset button
3. Validates email entered
4. POST to /api/requestPasswordReset.php
5. Email sent to teachers/admins
6. Success message displayed

**Key Methods:**
- `handleSubmit(e)` - Process login
- `handlePasswordReset()` - Request password reset

**Notes:**
- Email converted to lowercase for case-insensitive login
- MD5 hashing via CryptoJS
- Loading spinner during API calls
- MOTD feature currently disabled
- "Forgotten your password?" now uses a styled small button (`link-button` class) instead of inline-styled link

---

### AssessmentReport.jsx
**Purpose**: Printable class/assessment overview for teachers/admins

**Features:**
- Filters: class (auto-selected for teachers), status
- Table view with dates formatted dd/mm/yyyy hh:mm; blanks when data missing
- Printable layout (A4 landscape) with dedicated Print button
- Collapses repeated student names on consecutive rows for readability

**Data Sources:**
- GET `/api/getCurrentActivities.php`
- GET `/api/getCourses.php`
- GET `/api/getUnits.php`
- POST `/api/getUsers.php` (students by class/status)

---

### MarkingDashboard.jsx
**Purpose**: Teacher marking workspace for submissions

**Recent Updates:**
- Sticky workspace header keeps actions visible while scrolling
- Primary action renamed to "Finish marking & return" to clarify status update

---

### menu.jsx
**Purpose**: Top navigation menu for switching views, opening profile, and logging out

**Props:**
```javascript
{
  currentUser: Object,         // Current authenticated user
  activeView: string,          // Current view identifier
  onViewChange: Function,      // Change view callback
  onProfile: Function,         // Open profile modal
  onLogout: Function,          // Log out user
  viewLocked: boolean          // Disable view switching (default: false)
}
```

**Features:**
- Displays user avatar (or default)
- Shows username
- Role-based view switching buttons:
  - Teachers/Admins: "Assessment Overview", "Marking"
  - Admins only: "Admin"
- Profile and logout buttons
- View locking when mustChangePassword is true

**User Avatar Display:**
```javascript
if (currentUser.avatar && currentUser.avatar !== 'null') {
  // Show user's avatar
} else {
  // Show default avatar from /images/default_avatar.png
}
```

**View Buttons:**
```javascript
// Teachers and Admins
<button 
  onClick={() => onViewChange('report')}
  className={activeView === 'report' ? 'menu-toggle active' : 'menu-toggle'}
  disabled={viewLocked}
>
  Assessment Overview
</button>

<button 
  onClick={() => onViewChange('marking')}
  className={activeView === 'marking' ? 'menu-toggle active' : 'menu-toggle'}
  disabled={viewLocked}
>
  Marking
</button>

// Admins only
<button 
  onClick={() => onViewChange('admin')}
  className={activeView === 'admin' ? 'menu-toggle active' : 'menu-toggle'}
  disabled={viewLocked}
>
  Admin
</button>
```

---

### StudentProfile.jsx
**Purpose**: User profile editing modal with forced password change support

**Props:**
```javascript
{
  config: Object,                  // API configuration
  currentUser: Object,             // Current user data
  onClose: Function,               // Close modal callback
  onUpdated: Function,             // Update user in parent state
  onError: Function,               // Display error
  forceChangeLogin: boolean        // Force password change (default: false)
}
```

**State:**
```javascript
- userName: string         // Editable display name
- password: string         // New password (optional unless forced)
- confirmPassword: string  // Password confirmation
- avatar: string           // Base64 avatar image
- isLoading: boolean       // Save in progress
```

**Features:**
- Update display name
- Change password (with confirmation)
- Upload/change avatar image
- Real-time avatar preview
- MD5 password hashing before save
- Forced password change mode
  - Modal cannot be closed until password is changed
  - Password field becomes required
  - Close button disabled
  - Special messaging to user

**Forced Password Change Flow:**
```javascript
if (forceChangeLogin) {
  // Password is required
  if (!password.trim()) {
    onError('You must change your password before continuing.');
    return;
  }
  // Close button is disabled
  // Modal shows special message
}
```

**Validation:**
- Password match confirmation
- Required fields check
- Image format validation (jpg, png, gif)
- File size limits
- Password required when forceChangeLogin=true

**API Call:**
- POST to /api/updateSelf.php
- Updates only provided fields
- Cannot change email, classCode, or status
- Clears changeLogin flag when password is changed

**Avatar Upload:**
```javascript
const reader = new FileReader();
reader.onload = (e) => {
  setAvatar(e.target.result); // Base64 string
};
reader.readAsDataURL(file);
```

---

### StudentAssignments.jsx
**Purpose**: Display and access assigned units

**Props:**
```javascript
{
  config: Object,         // API configuration
  currentUser: Object,    // Current user
  onError: Function       // Error callback
}
```

**State:**
```javascript
- activities: Array      // Current activity assignments
- units: Array           // Unit details for activities
- selectedActivity: Object // Activity being worked on
- showAnswer: boolean    // Toggle answer interface
- isLoading: boolean     // Data loading state
```

**Data Flow:**
1. Load activities for current user
2. Load unit details for each activity
3. Merge activity + unit data
4. Display as cards with deadlines

**Activity Display:**
```javascript
For each activity:
- Unit name and description
- Assigned date
- Deadline date
- "Start/Continue" button
- Progress indicator (if answers exist)
```

**Clicking Activity:**
- Sets selectedActivity
- Shows StudentAnswer component
- Passes activity and unit data

**API Calls:**
- GET /api/getCurrentActivities.php?studentId={id}
- GET /api/getUnits.php (for each unique unitId)

---

### StudentAnswer.jsx
**Purpose**: Rich text answer editor for unit questions

**Props:**
```javascript
{
  config: Object,         // API configuration
  currentUser: Object,    // Current user
  activity: Object,       // Activity being answered
  unit: Object,           // Unit with questions
  onClose: Function,      // Close editor
  onError: Function       // Error callback
}
```

**State:**
```javascript
- questions: Array       // Questions from unit
- answers: Object        // Map of questionId => TipTap content
- references: Object     // Map of questionId => URL array
- editors: Object        // Map of questionId => TipTap editor instance
- isSaving: boolean      // Save in progress
- isSubmitting: boolean  // Submit in progress
```

**Features:**
- TipTap rich text editor for each question
- Multiple reference URL inputs per question
- Auto-save draft functionality
- Submit for marking
- Load existing answers

**TipTap Configuration:**
```javascript
useEditor({
  extensions: [StarterKit, Placeholder],
  content: existingAnswer || '',
  onUpdate: ({ editor }) => {
    // Update answers state
  }
})
```

**Save Operations:**

**Save Draft:**
```javascript
POST /api/saveAnswers.php
{
  activityId, studentId,
  status: "DRAFT",  // Converted to INPROGRESS
  answers: { qId: content },
  references: { qId: [urls] }
}
```

**Submit:**
```javascript
POST /api/saveAnswers.php
{
  activityId, studentId,
  status: "SUBMITTED",  // Triggers teacher email
  answers: { qId: content },
  references: { qId: [urls] }
}
```

**Answer Format (TipTap JSON):**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "Answer text..."}
      ]
    }
  ]
}
```

**Reference Management:**
- Add multiple URLs per question
- Stored as JSON array in database
- Validation: must be valid URLs

---

## Teacher Components

### MarkingDashboard.jsx
**Purpose**: Teacher marking workspace for reviewing and grading student submissions

**Props:**
```javascript
{
  config: Object,         // API configuration
  currentUser: Object,    // Current user (teacher/admin)
  onError: Function,      // Error callback
  onSuccess: Function     // Success callback
}
```

**State:**
```javascript
- courses: Array           // All courses
- units: Array             // All units
- students: Array          // Filtered students (class-based for teachers)
- activities: Array        // All activities
- selectedUnitId: number   // Filter by unit
- selectedSubmission: Object // Activity being marked
- questions: Array         // Questions for selected unit
- answers: Object          // Student answers map (questionId => content)
- outcomes: Object         // Marking outcomes map (questionId => ACHIEVED/NOT ACHIEVED)
- comments: Object         // Individual comments map (questionId => comment)
- assessorComment: string  // Overall assessor comment
- loading: boolean
- saving: boolean
```

**Features:**
- Filter submissions by unit
- View submissions ready for marking (SUBMITTED, RESUBMITTED)
- View submissions in progress (INMARKING, INREMARKING)
- Sticky workspace header keeps actions visible while scrolling
- Rich text answer preview with TipTap
- Per-question outcome selection (ACHIEVED/NOT ACHIEVED)
- Per-question comment field
- Overall assessor comment
- "Finish marking & return" action updates status

**Submission Statuses:**
- Ready to mark: SUBMITTED, RESUBMITTED
- In progress: INMARKING, INREMARKING

**Marking Flow:**
1. Select unit from dropdown
2. Click submission from list
3. Review each answer
4. Set outcome (ACHIEVED/NOT ACHIEVED) for each question
5. Add individual comments (optional)
6. Add overall assessor comment
7. Click "Finish marking & return"
8. Status updated based on outcomes:
   - All ACHIEVED → PASSED
   - Any NOT ACHIEVED → Chosen by teacher (PASSED, NOTPASSED, REDOING)

**API Calls:**
- GET /api/getCourses.php
- GET /api/getUnits.php
- POST /api/getUsers.php (filtered by class for teachers)
- GET /api/getCurrentActivities.php
- POST /api/getQuestions.php
- POST /api/getAnswers.php
- POST /api/markAnswers.php

---

### AssessmentReport.jsx
**Purpose**: Filterable and printable assessment overview for teachers/admins

**Props:**
```javascript
{
  config: Object,         // API configuration
  currentUser: Object,    // Current user (teacher/admin)
  onError: Function       // Error callback
}
```

**State:**
```javascript
- students: Array          // All students (filtered by teacher's class)
- activities: Array        // All activities
- courses: Array           // All courses
- units: Array             // All units
- selectedClass: string    // Filter by class
- selectedStatus: string   // Filter by status
- loading: boolean
```

**Features:**
- Auto-filter by teacher's class (teachers only)
- Filter by class code (admins)
- Filter by activity status
- Table shows:
  - Student name (collapsed for consecutive rows)
  - Class code
  - Course name
  - Unit name
  - Status
  - Date set (dd/mm/yyyy hh:mm)
  - Date submitted
  - Date resubmitted
  - Date marked
  - Date complete
- Print button generates printable page
- Landscape A4 layout for printing
- Click student name opens IndividualAssessment modal

**Date Formatting:**
```javascript
import { formatDateTime } from './dateUtils';
// Returns 'dd/mm/yyyy hh:mm' or empty string for null dates
```

**Print Functionality:**
```javascript
const buildPrintHtml = () => {
  // Generates complete HTML page with:
  // - Filter information (class, status)
  // - Generation timestamp
  // - Full table with all data
  // - Print styles (@media print)
  // Opens in new window
};
```

**API Calls:**
- POST /api/getUsers.php (with classCode for teachers)
- GET /api/getCurrentActivities.php
- GET /api/getCourses.php
- GET /api/getUnits.php

---

### IndividualAssessment.jsx
**Purpose**: Modal view of individual student's complete assessment history with printable feedback

**Props:**
```javascript
{
  id: number,              // Student ID
  config: Object,          // API configuration
  notifyError: Function,   // Error callback
  studentName: string      // Student display name
}
```

**State:**
```javascript
- assessment: Array        // All assessments for student
- selectedAssessment: Object // Assessment being viewed in detail
- modalOpen: boolean       // Detail modal toggle
- questions: Array         // Questions for selected assessment
- answers: Object          // Answers and outcomes
- loading: boolean
- assessorName: string     // Name of teacher who marked
```

**Features:**
- Table of all student's assessments with:
  - Course and unit names
  - Status
  - Key dates (assigned, submitted, marked)
- Click assessment to view details in modal
- Detailed view shows:
  - All questions with student answers
  - Outcomes (ACHIEVED/NOT ACHIEVED)
  - Individual question comments
  - Overall assessor comment
  - Assessor name
  - Timestamps
- Print button for feedback sheet
- Printable format with proper layout

**API Calls:**
- POST /api/getAssessments.php (with studentId)
- POST /api/getQuestions.php
- POST /api/getAnswers.php
- POST /api/getUsers.php (to fetch assessor name)

---

### CMFloatAd.jsx
**Purpose**: Floating Exeter College credit banner with hover expansion

**Props:**
```javascript
{
  color: string,       // Text color (default: '#ffffff')
  bgColor: string      // Background color (default: 'transparent')
}
```

**State:**
```javascript
- isHovered: boolean   // Hover state
- isMobile: boolean    // Mobile detection
```

**Features:**
- Fixed position at bottom-right
- Hover to expand and show full text
- Mobile-responsive layout
- Displays:
  - Exeter College logo
  - Copyright year (auto-updated)
  - Designer credit (Simon Rundell)
  - College address and contact
  - Email link
- Smooth CSS transitions
- Responsive text wrapping on mobile

**Styling:**
```javascript
// Collapsed state: 30px wide
// Expanded state: 75% width (desktop), 90% (mobile)
// Transitions: 1s ease-in-out
```

---

## Utility Files

### adminApiHelpers.js
**Purpose**: Helper functions for API data normalization

**Functions:**

**normalizeListResponse(responseData)**
```javascript
// Handles various API response formats:
// - Direct array
// - {message: "[...]"} (JSON string)
// - {message: [...]} (already parsed)
// Returns: Normalized array
```

**Usage:**
```javascript
import { normalizeListResponse } from './adminApiHelpers';

const response = await axios.get(config.api + '/getUsers.php');
const users = normalizeListResponse(response.data);
```

---

### dateUtils.js
**Purpose**: Date formatting utilities

**Functions:**

**formatDateTime(dateString)**
```javascript
// Converts ISO date string to 'dd/mm/yyyy hh:mm' format
// Returns empty string for null/undefined/invalid dates
// Example: '2026-02-04T10:30:00' → '04/02/2026 10:30'
```

**Usage:**
```javascript
import { formatDateTime } from './dateUtils';

const formatted = formatDateTime(activity.dateSubmitted);
// Returns: '04/02/2026 14:30' or ''
```

---

## Admin Components

### adminPanel.jsx
**Purpose**: Tabbed admin dashboard

**Props:**
```javascript
{
  config: Object,                  // API configuration
  currentUser: Object,             // Admin user
  setSendSuccessMessage: Function, // Success notifications
  setSendErrorMessage: Function    // Error notifications
}
```

**State:**
```javascript
- activeTab: string  // Current tab key
```

**Tabs:**
1. **"1"** - UserManager
2. **"2"** - CourseManager  
3. **"3"** - UnitManager
4. **"4"** - CurrentActivityManager
5. **"5"** - AssignUnit

**Features:**
- Persistent tab state
- Full-width layout
- Passes config and message callbacks to children

---

### UserManager.jsx
**Purpose**: User CRUD operations and bulk upload

**Props:**
```javascript
{
  config: Object,
  setSendSuccessMessage: Function,
  setSendErrorMessage: Function
}
```

**State:**
```javascript
- users: Array               // All users
- editingUser: Object|null   // User being edited
- isModalVisible: boolean    // Edit modal toggle
- isBulkModalVisible: boolean // Bulk upload modal
- classCode: string          // For bulk upload
- defaultPassword: string    // For bulk upload
- csvContent: string         // CSV data
- isLoading: boolean         // Operations in progress
```

**Features:**

**User List:**
- Displays all users in table
- Columns: Email, Name, Class, Status, Avatar
- Actions: Edit, Delete buttons
- Color-coded status badges

**Create/Edit User:**
- Modal form for user details
- Role selection (Student/Teacher/Admin)
- Password input (hashed to MD5)
- Avatar upload
- Validation

**Bulk Upload:**
- CSV paste area
- Class code input
- Default password
- Preview/validate before upload
- Error reporting per row
- All bulk-created users have `changeLogin` set to 1, forcing password change on first login

**CSV Format:**
```csv
email,username,classcode
student1@example.com,Student One,CS101
student2@example.com,Student Two,CS101
```

**API Calls:**
- GET /api/getUsers.php
- POST /api/createUser.php
- POST /api/updateUser.php
- POST /api/deleteUser.php
- POST /api/bulkUploadUsers.php

**Status Values:**
```javascript
0: <Tag color="blue">Student</Tag>
2: <Tag color="green">Teacher</Tag>
3: <Tag color="red">Administrator</Tag>
```

---

### CourseManager.jsx
**Purpose**: Course CRUD operations

**Props:**
```javascript
{
  config: Object,
  setSendSuccessMessage: Function,
  setSendErrorMessage: Function
}
```

**State:**
```javascript
- courses: Array             // All courses
- editingCourse: Object|null // Course being edited
- isModalVisible: boolean    // Modal toggle
- isLoading: boolean         // Operations in progress
```

**Features:**
- Course list with name and description
- Create new courses
- Edit existing courses
- Delete courses (cascade deletes units)

**Form Fields:**
- Name (required)
- Description (textarea)

**API Calls:**
- GET /api/getCourses.php
- POST /api/createCourse.php
- POST /api/updateCourse.php
- POST /api/deleteCourse.php

**Delete Confirmation:**
```javascript
Modal.confirm({
  title: 'Delete course?',
  content: 'This will also delete all associated units.',
  onOk: () => deleteCourse(id)
});
```

---

### UnitManager.jsx
**Purpose**: Unit CRUD operations with question editor

**Props:**
```javascript
{
  config: Object,
  setSendSuccessMessage: Function,
  setSendErrorMessage: Function
}
```

**State:**
```javascript
- units: Array               // All units
- courses: Array             // For course selection
- editingUnit: Object|null   // Unit being edited
- questions: Array           // Questions for unit
- isModalVisible: boolean    // Modal toggle
- isLoading: boolean
```

**Features:**

**Unit List:**
- Grouped/filterable by course
- Shows name, description, question count
- Edit/Delete actions

**Unit Editor:**
- Select course (dropdown)
- Unit name and description
- Dynamic question list
- Add/remove questions
- Question text editor

**Question Structure:**
```javascript
{
  id: number,         // Auto-incremented
  text: string,       // Question text
  type: string,       // Question type (not currently used)
  points: number      // Point value (not currently used)
}
```

**Question Management:**
```javascript
// Add question
setQuestions([...questions, {
  id: questions.length + 1,
  text: '',
  type: 'essay',
  points: 10
}]);

// Remove question
setQuestions(questions.filter(q => q.id !== qId));

// Update question
setQuestions(questions.map(q => 
  q.id === qId ? {...q, text: newText} : q
));
```

**API Calls:**
- GET /api/getUnits.php
- GET /api/getCourses.php
- POST /api/createUnit.php
- POST /api/updateUnit.php
- POST /api/deleteUnit.php

**Validation:**
- Course must be selected
- Unit name required
- At least one question required
- All questions must have text

---

### CurrentActivityManager.jsx
**Purpose**: View and manage activity assignments

**Props:**
```javascript
{
  config: Object,
  setSendSuccessMessage: Function,
  setSendErrorMessage: Function
}
```

**State:**
```javascript
- activities: Array          // All activities
- students: Array            // All students
- units: Array               // All units
- editingActivity: Object|null
- isModalVisible: boolean
- isLoading: boolean
```

**Features:**

**Activity List:**
- Table with columns: Student, Unit, Assigned, Deadline
- Sortable and filterable
- Edit/Delete actions
- Date formatting

**Create/Edit Activity:**
- Student selection (dropdown)
- Unit selection (dropdown)
- Assigned date picker
- Deadline date picker

**Data Loading:**
```javascript
// Parallel loads for performance
Promise.all([
  axios.get('/api/getCurrentActivities.php'),
  axios.get('/api/getStudents.php'),
  axios.get('/api/getUnits.php')
]).then(...)
```

**API Calls:**
- GET /api/getCurrentActivities.php
- GET /api/getStudents.php
- GET /api/getUnits.php
- POST /api/createCurrentActivity.php
- POST /api/updateCurrentActivity.php
- POST /api/deleteCurrentActivity.php

**Date Handling:**
```javascript
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

<DatePicker 
  value={dayjs(assigned)} 
  onChange={(date) => setAssigned(date.format('YYYY-MM-DD'))}
/>
```

---

### AssignUnit.jsx
**Purpose**: Bulk assign unit to entire class

**Props:**
```javascript
{
  config: Object,
  setSendSuccessMessage: Function,
  setSendErrorMessage: Function
}
```

**State:**
```javascript
- units: Array           // Available units
- classCodes: Array      // Available class codes
- selectedUnit: number   // Selected unit ID
- selectedClass: string  // Selected class code
- assignedDate: string   // Assignment date
- deadline: string       // Due date
- isLoading: boolean
```

**Features:**
- Unit selection dropdown
- Class code selection dropdown
- Date pickers for assigned and deadline
- Preview student count
- Bulk create activities

**Flow:**
1. Select unit from dropdown
2. Select class code
3. Set assigned and deadline dates
4. Click "Assign Unit"
5. API creates activity for each student in class
6. Success message with count

**API Call:**
```javascript
POST /api/assignUnitToClass.php
{
  unitId: number,
  classCode: string,
  assigned: "YYYY-MM-DD",
  deadline: "YYYY-MM-DD"
}
```

**Validation:**
- All fields required
- Deadline must be after assigned date
- Class must have students

---

## Common Patterns

### API Call Pattern
```javascript
const loadData = async () => {
  setIsLoading(true);
  try {
    const response = await axios.get(
      config.api + '/endpoint.php',
      { params: {...} }
    );
    if (response.data.status_code === 200) {
      const data = JSON.parse(response.data.message);
      setState(data);
    }
  } catch (error) {
    setSendErrorMessage('Error loading data');
  } finally {
    setIsLoading(false);
  }
};
```

### Form Submission Pattern
```javascript
const handleSubmit = async () => {
  setIsLoading(true);
  try {
    const response = await axios.post(
      config.api + '/endpoint.php',
      { ...formData }
    );
    if (response.data.status_code === 200/201) {
      setSendSuccessMessage('Success!');
      closeModal();
      reloadData();
    }
  } catch (error) {
    setSendErrorMessage('Operation failed');
  } finally {
    setIsLoading(false);
  }
};
```

### Password Hashing Pattern
```javascript
import CryptoJS from 'crypto-js';

const hashedPassword = CryptoJS.MD5(plainPassword).toString();
```

### Avatar Display Pattern
```javascript
const avatarSrc = currentUser.avatar && currentUser.avatar !== 'null'
  ? currentUser.avatar
  : '/images/default_avatar.png';

<img src={avatarSrc} alt="Avatar" />
```

### Delete Confirmation Pattern
```javascript
import { Modal } from 'antd';

const handleDelete = (id) => {
  Modal.confirm({
    title: 'Are you sure?',
    content: 'This action cannot be undone.',
    onOk: async () => {
      await deleteRecord(id);
    }
  });
};
```

## State Management

Currently uses React component state (useState). No global state management library.

**Parent-Child Communication:**
- Props for data down
- Callbacks for events up
- Lift state to common ancestor when needed

**Example:**
```javascript
// App.jsx (parent)
const [currentUser, setCurrentUser] = useState(null);

<Login setCurrentUser={setCurrentUser} />

// Login.jsx (child)
const handleLogin = () => {
  props.setCurrentUser(userData);
};
```

## Styling

**Global Styles**: `App.css`

**Ant Design**: Used for:
- Buttons
- Forms (Input, Select, DatePicker)
- Tables
- Modals
- Messages/Notifications
- Tags
- Spin (loading)

**Custom CSS Classes:**
```css
.app-header
.app-container
.login-container
.menu-container
.admin-panel
/* etc. */
```

## Performance Considerations

**Optimization Techniques:**
1. Conditional rendering to avoid unnecessary components
2. useEffect dependencies array to prevent infinite loops
3. Async/await for clean async code
4. Try-catch for error handling
5. Loading states for UX feedback

**Potential Improvements:**
1. Implement React.memo for expensive components
2. Add pagination for large lists
3. Implement virtual scrolling for tables
4. Use React Query for caching
5. Add service workers for offline support

## Testing Recommendations

**Unit Tests:**
- Test individual components with React Testing Library
- Mock API calls with MSW or jest.mock
- Test user interactions and form submissions

**Integration Tests:**
- Test component communication
- Test authentication flow
- Test CRUD operations

**E2E Tests:**
- Use Playwright or Cypress
- Test complete user workflows
- Test across different user roles

## Accessibility

**Current Status:**
- Basic semantic HTML
- Form labels present
- Alt text on images
- Keyboard navigation via Ant Design

**Improvements Needed:**
- ARIA labels for dynamic content
- Focus management in modals
- Screen reader testing
- Color contrast verification
- Keyboard-only navigation testing

## Browser Compatibility

**Supported:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Key Dependencies:**
- ES6+ features
- Fetch API
- LocalStorage
- FileReader API

## Mobile Responsiveness

**Current Status:**
- Basic responsive design
- Fixed-width layouts in places
- Limited mobile testing

**Improvements Needed:**
- Media queries for mobile layouts
- Touch-friendly button sizes
- Mobile-optimized modals
- Responsive tables
- Mobile navigation menu

## Future Enhancements

1. **Real-time Updates**: WebSocket for live notifications
2. **Rich Media**: Support for images/videos in answers
3. **Collaborative Editing**: Multiple users on same document
4. **Progress Tracking**: Visual dashboards and charts
5. **Export Functionality**: PDF generation for submissions
6. **Advanced Search**: Filter and search across all content
7. **Notifications**: In-app notification center
8. **Dark Mode**: Theme switching capability
9. **Internationalization**: Multi-language support
10. **Analytics**: Usage tracking and reporting

## Component Checklist

When creating new components:

- [ ] Add JSDoc comments
- [ ] Include prop types validation (or TypeScript)
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Add try-catch for async operations
- [ ] Clean up effects (return cleanup function)
- [ ] Test with different user roles
- [ ] Test with missing/invalid data
- [ ] Verify accessibility
- [ ] Test on mobile viewport
- [ ] Document in this file

## Support and Maintenance

For component-related issues:
1. Check browser console for errors
2. Verify props being passed
3. Check API responses in Network tab
4. Review component documentation above
5. Check React DevTools for state/props
6. Review related API endpoint documentation

## Contributors

Exeter College IT Development Team
