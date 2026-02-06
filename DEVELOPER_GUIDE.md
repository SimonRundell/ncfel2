# Developer Onboarding Guide

Welcome to the NCFE Level 2 Certificate System development team! This guide will help you get up to speed quickly.

## Quick Start

### 1. Read the Documentation (30 minutes)
Start with these files in order:
1. [README.md](README.md) - Project overview and architecture
2. [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Backend API reference
3. [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) - React components
4. [api/EMAIL_SETUP.md](api/EMAIL_SETUP.md) - Email system

### 2. Set Up Your Environment (1-2 hours)

**Prerequisites:**
```bash
# Check versions
node --version  # Should be 18+
php --version   # Should be 8.0+
mysql --version # Should be 8.0+
composer --version
```

**Clone and Install:**
```bash
git clone <repository-url>
cd ncfel2

# Frontend
npm install

# Backend
cd api
composer install
cd ..
```

**Configure:**
```bash
# Frontend config
cp .config.example.json .config.json
# Edit with your API URL

# Backend config
cd api
cp .config.example.json .config.json
# Edit with database, SMTP credentials, and adminEmail (extra notification target)
```

**Database:**
```bash
mysql -u root -p
CREATE DATABASE ncfel2;
exit

mysql -u root -p ncfel2 < data/ncfel2_v3.sql
```

**Start Development:**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend (if not using Apache/Nginx)
cd api
php -S localhost:8000
```

Visit: http://localhost:5173

### 3. Test Login (5 minutes)

**Default Admin (from SQL file):**
- Email: `simonrundell@exe-coll.ac.uk`
- Password: `1234` (MD5 hash stored in DB)

**Or Create Test User:**
```sql
INSERT INTO user (email, passwordHash, userName, status) 
VALUES ('dev@example.com', '81dc9bdb52d04dc20036dbd8313ed055', 'Developer', 3);
-- Password is '1234' (MD5 hashed)
```

## Understanding the Codebase

### Application Flow

**Unauthenticated User:**
```
Browser
  ↓
App.jsx (no currentUser)
  ↓
Login.jsx
  ↓ (form submit)
POST /api/getLogin.php
  ↓ (success)
App.jsx (sets currentUser)
  ↓
Authenticated view
```

**Student Workflow:**
```
StudentAssignments.jsx
  ↓ (loads activities)
GET /api/getCurrentActivities.php
GET /api/getUnits.php
  ↓ (student clicks unit)
StudentAnswer.jsx
  ↓ (loads questions & answers)
GET /api/getQuestions.php
GET /api/getAnswers.php
  ↓ (student works on answers)
TipTap editor
  ↓ (student saves)
POST /api/saveAnswers.php (status: DRAFT)
  ↓ (student submits)
POST /api/saveAnswers.php (status: SUBMITTED)
  ↓
Email sent to teachers
```

**Admin Workflow:**
```
AdminPanel.jsx (Tabs)
  ↓
Tab 1: UserManager.jsx
  ├─ List users: GET /api/getUsers.php
  ├─ Create: POST /api/createUser.php → Email sent
  ├─ Edit: POST /api/updateUser.php
  └─ Bulk: POST /api/bulkUploadUsers.php → Emails sent

Tab 2: CourseManager.jsx
  └─ CRUD operations on courses

Tab 3: UnitManager.jsx
  ├─ Manage units
  └─ Edit questions (JSON array)

Tab 4: CurrentActivityManager.jsx
  └─ Manually assign units to students

Tab 5: AssignUnit.jsx
  └─ Bulk assign unit to entire class
```

### Key Files to Know

**Must understand:**
1. `src/App.jsx` - Application entry, routing logic
2. `api/setup.php` - Database connection, utilities
3. `src/login.jsx` - Authentication
4. `api/getLogin.php` - Authentication endpoint

**Important for features:**
5. `src/StudentAnswer.jsx` - TipTap editor, answer submission
6. `api/saveAnswers.php` - Answer persistence, email triggers
7. `api/emailHelper.php` - Email sending

**Admin features:**
8. `src/UserManager.jsx` - User CRUD
9. `src/UnitManager.jsx` - Questions editor
10. `api/bulkUploadUsers.php` - CSV import

### Database Schema Mental Model

```
user (students, teachers, admins)
  ↓
currentActivities (assignments)
  ↓
unit (with questions as JSON)
  ↓
answers (student responses with status)
```

**Key Relationships:**
- Each `currentActivity` links a `student` to a `unit`
- Each `answer` belongs to an `activity` and references a `question` by ID
- `questions` are stored as JSON array in `unit.questions`

### Common Tasks

**Add a New API Endpoint:**
1. Create `api/myEndpoint.php`
2. Start with `include 'setup.php';`
3. Validate inputs: Check `$receivedData`
4. Use prepared statements
5. Log with `log_info()`
6. Return with `send_response()`

Example:
```php
<?php
include 'setup.php';

$required = ['id'];
foreach ($required as $field) {
    if (!isset($receivedData[$field])) {
        send_response('Missing ' . $field, 400);
    }
}

$id = (int) $receivedData['id'];

$query = 'SELECT * FROM tableName WHERE id = ?';
$stmt = $mysqli->prepare($query);
$stmt->bind_param('i', $id);
$stmt->execute();

$result = $stmt->get_result();
$data = mysqli_fetch_all($result, MYSQLI_ASSOC);

send_response($data, 200);
```

**Add a New React Component:**
1. Create `src/MyComponent.jsx`
2. Add JSDoc comments
3. Define props with PropTypes or JSDoc
4. Handle loading/error states
5. Use axios for API calls
6. Return JSX

Example:
```javascript
/**
 * @component MyComponent
 * @param {Object} props
 * @param {Object} props.config
 * @returns {JSX.Element}
 */
const MyComponent = ({ config }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await axios.get(config.api + '/endpoint.php');
      setData(JSON.parse(response.data.message));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Spin />;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};

export default MyComponent;
```

**Add a New Email Template:**
1. Create `api/templates/my-template.html`
2. Use `{{VARIABLE}}` for placeholders
3. Test with `api/emailExample.php`
4. Call with `EmailHelper::sendTemplateEmail()`

**Add a Database Table:**
1. Update `data/ncfel2_v3.sql`
2. Add CREATE TABLE statement
3. Add foreign keys if needed
4. Import fresh: `mysql -u root -p ncfel2 < data/ncfel2_v3.sql`
5. Create API endpoints for CRUD
6. Update related components

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Start dev servers
npm run dev          # Terminal 1
cd api && php -S localhost:8000  # Terminal 2 (if needed)

# 3. Make changes
# - Edit files
# - Save (Vite hot-reloads)
# - Test in browser

# 4. Check logs
tail -f api/server.log  # Terminal 3

# 5. Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature-branch
```

### Testing Your Changes

**Frontend:**
1. Check browser console (F12)
2. Use React DevTools
3. Verify UI responsiveness
4. Test as different user roles

**Backend:**
1. Check `api/server.log`
2. Test with curl or Postman
3. Verify database changes
4. Test error cases

**Example curl test:**
```bash
curl -X POST http://localhost:8000/getUsers.php \
  -H "Content-Type: application/json" \
  -d '{"status": 0}'
```

### Debugging Tips

**Frontend Issues:**
```javascript
// Add temporary console logs
console.log('State:', state);
console.log('Props:', props);
console.log('API Response:', response.data);

// Check state in React DevTools
// Components tab → Find component → See props/state
```

**Backend Issues:**
```php
// Add logging
log_info('Variable value: ' . json_encode($variable));
log_info('Query: ' . $query);
log_info('MySQL error: ' . $mysqli->error);

// Check server.log
tail -f api/server.log
```

**Database Issues:**
```sql
-- Check data
SELECT * FROM user WHERE email = 'test@example.com';

-- Check answer status flow
SELECT id, questionId, status, updatedAt 
FROM answers 
WHERE activityId = 1 
ORDER BY updatedAt DESC;
```

## Code Style Guide

### PHP

**File Structure:**
```php
<?php
/**
 * @fileoverview Description
 * @author Your Name
 */

include 'setup.php';
require_once 'otherfile.php';

// Validate input
$required = ['field1', 'field2'];
// ...

// Main logic
$query = '...';
// ...

// Response
send_response($result, 200);
```

**Naming:**
- Variables: `$camelCase`
- Functions: `snake_case()`
- Constants: `UPPER_CASE`

**Security:**
- Always use prepared statements
- Never concatenate SQL
- Validate all input
- Log operations

### JavaScript/React

**File Structure:**
```javascript
/**
 * @fileoverview Description
 * @component ComponentName
 */

import { useState } from 'react';
import axios from 'axios';

/**
 * Component description
 * @param {Object} props
 * @returns {JSX.Element}
 */
const ComponentName = ({ prop1, prop2 }) => {
  // State declarations
  const [state, setState] = useState(initial);

  // Effects
  useEffect(() => {
    // ...
  }, [dependencies]);

  // Event handlers
  const handleEvent = async () => {
    // ...
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

**Naming:**
- Components: `PascalCase`
- Variables: `camelCase`
- Constants: `UPPER_CASE`
- Event handlers: `handle*` or `on*`

**Best Practices:**
- Destructure props
- Use meaningful variable names
- Extract complex logic to functions
- Keep components focused (single responsibility)
- Add loading/error states
- Handle edge cases

### Git Commit Messages

```
type: subject line (max 50 chars)

Detailed description if needed (wrap at 72 chars)

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- style: Code style (formatting, missing semi-colons, etc)
- refactor: Code change that neither fixes a bug nor adds a feature
- test: Adding tests
- chore: Maintenance tasks
```

Examples:
```
feat: add bulk user upload functionality
fix: correct date format in activity assignment
docs: update API documentation for saveAnswers endpoint
refactor: extract email sending to helper class
```

## Common Issues and Solutions

### "Config not loading"
**Problem**: Frontend can't load .config.json
**Solution**: 
```bash
# Check file exists
ls -la .config.json

# Check JSON syntax
cat .config.json | python -m json.tool

# Check browser network tab for 404
```

### "Database connection failed"
**Problem**: PHP can't connect to MySQL
**Solution**:
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in api/.config.json
# Try manual connection
mysql -u developer -p -h localhost ncfel2
```

### "Email not sending"
**Problem**: PHPMailer not working
**Solution**:
```bash
# Check composer installed
ls api/vendor

# Install if missing
cd api && composer install

# Check SMTP credentials
# Enable debug mode in emailHelper.php
$this->mailer->SMTPDebug = 2;

# Check logs
tail -f api/server.log
```

### Password reset notifications
- Recipients: all users with status 2 or 3 plus `adminEmail` from `api/.config.json`.
- Template: edit `api/templates/password-reset-request.html` for copy/branding.
- Logo URL comes from `api` base in config (`/images/exeter_bw.png` by default).

### "CORS error"
**Problem**: Frontend can't call API
**Solution**:
```php
// Check setup.php has CORS headers
header("Access-Control-Allow-Origin: *");

// For preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

### "Password won't hash"
**Problem**: MD5 not working
**Solution**:
```javascript
// Check CryptoJS import
import CryptoJS from 'crypto-js';

// Verify hashing
const hash = CryptoJS.MD5('password').toString();
console.log(hash); // Should be: 5f4dcc3b5aa765d61d8327deb882cf99

// Test in PHP
echo md5('password'); // Same hash
```

## Resources

### External Documentation
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Ant Design](https://ant.design/)
- [TipTap Editor](https://tiptap.dev/)
- [PHPMailer](https://github.com/PHPMailer/PHPMailer)
- [Axios](https://axios-http.com/)

### Internal Documentation
- [README.md](README.md) - Project overview
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) - Components
- [api/EMAIL_SETUP.md](api/EMAIL_SETUP.md) - Email system

### Useful Tools
- **React DevTools**: Browser extension for inspecting React components
- **Postman**: API testing (alternative to curl)
- **MySQL Workbench**: Database GUI
- **VS Code Extensions**:
  - ESLint
  - Prettier
  - PHP Intelephense
  - Thunder Client (API testing)

## Getting Help

1. **Check Documentation**: Start with files above
2. **Check Logs**: `api/server.log` and browser console
3. **Search Code**: Grep for similar implementations
4. **Ask Team**: Don't struggle alone
5. **Test Hypothesis**: Make small, testable changes

## Next Steps

After completing setup:

1. **Explore Features** (1 hour)
   - Log in as admin
   - Create a test student
   - Create a course and unit
   - Assign unit to student
   - Log in as student
   - Complete assignment
   - Check teacher email notification

2. **Read Code** (2-3 hours)
   - Walk through App.jsx
   - Follow login flow
   - Trace API call from frontend to backend
   - Understand TipTap editor in StudentAnswer.jsx
   - Review email helper implementation

3. **Make a Change** (2-3 hours)
   - Pick a small feature or bug
   - Make the change
   - Test thoroughly
   - Commit with good message
   - Create pull request

4. **Review Architecture** (1 hour)
   - Review entity relationships
   - Understand data flow
   - Study component hierarchy
   - Review security considerations

## Checklist for New Developers

- [ ] Environment setup complete
- [ ] Can run frontend dev server
- [ ] Can access backend API
- [ ] Can log in as admin
- [ ] Can create and edit users
- [ ] Can create courses and units
- [ ] Can assign units to students
- [ ] Can log in as student
- [ ] Can complete an assignment
- [ ] Understand JSDoc comments requirement
- [ ] Read all documentation files
- [ ] Know where to find logs
- [ ] Can debug frontend issues
- [ ] Can debug backend issues
- [ ] Understand database schema
- [ ] Know git commit message format
- [ ] Have required VS Code extensions
- [ ] Understand email system
- [ ] Have contacted team lead

Welcome aboard! 🚀
