/**
 * @fileoverview Main application component for NCFE Level 2 Certificate System
 * 
 * This is the root component that orchestrates the entire application. It handles:
 * - Configuration loading from .config.json
 * - User authentication state management
 * - Message notifications (success/error)
 * - Conditional rendering based on user role and login status
 * - Role-based view routing (Admin Panel vs Student Assignments)
 * 
 * @requires react
 * @requires antd - Ant Design UI library for message notifications
 * @requires axios - HTTP client for API requests
 */

import { useState, useEffect } from 'react'
import './App.css'
import {Spin, message} from 'antd';
import Login from './login.jsx';
import AdminPanel from './adminPanel.jsx';
import Menu from './menu.jsx';
import StudentProfile from './StudentProfile.jsx';
import StudentAssignments from './StudentAssignments.jsx';
import AssessmentReport from './AssessmentReport.jsx';
import MarkingDashboard from './MarkingDashboard.jsx';
import CMFloatAd from './CMFloatAd.jsx';
import axios from 'axios';

/**
 * App Component - Root component of the NCFE Level 2 Certificate System
 * 
 * Flow:
 * 1. On mount, loads configuration from /.config.json with cache-busting
 * 2. If no user is logged in, displays Login component
 * 3. Once authenticated, displays appropriate view based on user status:
 *    - Status 3 (Admin): Full AdminPanel with all management tabs
 *    - Status 0/2 (Student/Teacher): StudentAssignments view
 * 4. Provides global error/success message handling via Ant Design
 * 
 * @component
 * @returns {JSX.Element} The main application interface
 * 
 * @example
 * // In main.jsx
 * import App from './App.jsx'
 * createRoot(document.getElementById('root')).render(<App />)
 */
function App() {
  /**
   * @type {[Object|null, Function]} Configuration object loaded from .config.json
   * @property {string} api - Base URL for API endpoints
   */
  const [config, setConfig] = useState(null);
  
  /**
   * @type {[Object, Function]} Ant Design message API for notifications
   */
  const [messageApi, contextHolder] = message.useMessage();
  
  /**
   * @type {[Object|null, Function]} Currently logged-in user object
   * @property {number} id - User ID
   * @property {string} email - User email (also username)
   * @property {string} userName - Display name
   * @property {string} classCode - Class code (for students)
   * @property {number} status - User role (0=student, 2=teacher, 3=admin)
   * @property {string} avatar - Base64 encoded avatar image
   */
  const [currentUser, setCurrentUser] = useState(null);
  
  /**
   * @type {[string|boolean, Function]} Success message to display
   */
  const [sendSuccessMessage, setSendSuccessMessage] = useState(false);
  
  /**
   * @type {[string|boolean, Function]} Error message to display
   */
  const [sendErrorMessage, setSendErrorMessage] = useState(false);

  /**
  * @type {[string, Function]} Active view: assignments, marking, admin, report
   */
  const [activeView, setActiveView] = useState('assignments');
  
  /**
   * @type {[boolean, Function]} Toggle profile modal visibility
   */
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.status === 3) {
      setActiveView('admin');
    } else if (currentUser.status === 2) {
      setActiveView('marking');
    } else {
      setActiveView('assignments');
    }
  }, [currentUser]);

  /**
   * Configuration Loading Effect
   * 
   * Loads application configuration from /.config.json on component mount.
   * Uses cache-busting timestamp to ensure fresh config on reload.
   * 
   * @effect
   * @dependency {Function} messageApi - For displaying load status
   */
   useEffect(() => {
    // Add cache busting parameter to force fresh config load
    const timestamp = new Date().getTime();
    axios.get(`/.config.json?t=${timestamp}`)
      .then(response => {
        setConfig(response.data);
        // console.log('Config loaded:', response.data);
        messageApi.success('Config loaded');
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        messageApi.error('Error fetching config');
      });
  }, [messageApi]);

/**
 * Success Message Display Effect
 * 
 * Monitors sendSuccessMessage state and displays success notification
 * when value changes. Automatically resets message after display.
 * 
 * @effect
 * @dependency {string|boolean} sendSuccessMessage - Message to display
 */

useEffect(() => {
    if (sendSuccessMessage) {
       messageApi.success(sendSuccessMessage);
    }
      setSendSuccessMessage(false);
    
  }, [sendSuccessMessage, messageApi]);

  useEffect(() => {
    if (sendErrorMessage) {
      messageApi.error(sendErrorMessage);
    }
  }, [sendErrorMessage, messageApi]);


  return (
    <>
    {contextHolder}
      <div className="app-header">
        <div className="header-row">
          <img className="logo" src="images/ncfe.png" alt="NCFE Logo" />
          <div className="app-title">Level 2 Certificate</div>
          <img className="logo" src="images/exeter_logo.png" alt="Exeter College" />
        </div>
      </div>
      <div className="app-container">

        {currentUser ? (
          <>
            <Menu
               currentUser={currentUser}
               activeView={activeView}
               onViewChange={setActiveView}
               onProfile={() => setShowProfile(true)}
               onLogout={() => setCurrentUser(null)}
            />
            {activeView === 'admin' && currentUser.status === 3 && (
              <AdminPanel
                config={config}
                currentUser={currentUser}
                setSendSuccessMessage={setSendSuccessMessage}
                setSendErrorMessage={setSendErrorMessage}
              />
            )}
            {activeView === 'marking' && currentUser.status >= 2 && (
              <MarkingDashboard
                config={config}
                currentUser={currentUser}
                onSuccess={(msg) => setSendSuccessMessage(msg)}
                onError={(msg) => setSendErrorMessage(msg)}
              />
            )}
            {activeView === 'report' && currentUser.status >= 2 && (
              <AssessmentReport
                config={config}
                currentUser={currentUser}
                onError={(msg) => setSendErrorMessage(msg)}
              />
            )}
            {activeView === 'assignments' && (
              <StudentAssignments
                config={config}
                currentUser={currentUser}
                onError={(msg) => setSendErrorMessage(msg)}
              />
            )}
            {showProfile && (
              <StudentProfile
                config={config}
                currentUser={currentUser}
                onClose={() => setShowProfile(false)}
                onUpdated={(user) => setCurrentUser(user)}
                onError={(msg) => setSendErrorMessage(msg)}
              />
            )}
          </>
        ) : (
          <Login
            config={config}
            setCurrentUser={setCurrentUser}
            setSendErrorMessage={setSendErrorMessage}
            setSendSuccessMessage={setSendSuccessMessage}
          />
        )}

      </div>
      <CMFloatAd bgColor='#242424'/>
    </>
  )
}

export default App
