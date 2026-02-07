/**
 * @fileoverview Login Component for NCFE Level 2 Certificate System
 * 
 * Provides user authentication interface with:
 * - Email and password input fields
 * - MD5 password hashing for server comparison
 * - Password reset request functionality
 * - Loading states and error handling
 * - Message of the day display (MOTD - currently disabled)
 * 
 * Authentication Flow:
 * 1. User enters email (used as username) and password
 * 2. Password is hashed with MD5 client-side
 * 3. Credentials sent to /api/getLogin.php
 * 4. On success, user object stored in parent state (App.jsx)
 * 5. On failure, error message displayed
 * 
 * Password Reset Flow:
 * 1. User clicks "Forgotten your password?"
 * 2. Enters email address
 * 3. Request sent to /api/requestPasswordReset.php
 * 4. Email sent to teachers/admins for manual reset
 * 5. Student must see teacher in person for security
 * 
 * @requires react - State and effect hooks
 * @requires crypto-js - MD5 password hashing
 * @requires antd - Spin component for loading indicator
 * @requires axios - HTTP client for API requests
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { Spin } from 'antd';
import axios from 'axios';


/****************************************************************
 * Login Component
 * 
 * Renders the login form for user authentication.
 * Includes email/password fields, login button, and password reset.
 * Displays a message of the day (MOTD) - currently showing "Beta Test".
 * 
 * Registration function currently disabled; student upload is bulk only.
 * 
 * @param {Object} props Component properties
 * @param {Object} props.config Application configuration with API endpoint
 * @param {Function} props.setCurrentUser Callback to set authenticated user in parent
 * @param {Function} props.setSendSuccessMessage Callback to display success messages
 * @param {Function} props.setSendErrorMessage Callback to display error messages
 * @returns {JSX.Element} Login form interface
 * 
 * @example
 * <Login
 *   config={{ api: 'http://localhost/api' }}
 *   setCurrentUser={(user) => setUser(user)}
 *   setSendSuccessMessage={(msg) => showSuccess(msg)}
 *   setSendErrorMessage={(msg) => showError(msg)}
 * />
 *****************************************************************/

const Login = ({ config, setCurrentUser, setSendSuccessMessage, setSendErrorMessage}) => {
  /** @type {[string, Function]} User email/username */
  const [email, setEmail] = useState('');
  
  /** @type {[string, Function]} User password (plain text, hashed before sending) */
  const [password, setPassword] = useState('');
  
  /** @type {[boolean, Function]} Loading state during API calls */
  const [isLoading, setIsLoading] = useState(false);
  
  /** @type {[string, Function]} Message of the day content */
  const [motdContent, setMotdContent] = useState('Beta Test'); // Default fallback
  
  /** @type {[boolean, Function]} Toggle password reset interface */
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // Fetch MOTD content on component mount
  useEffect(() => {
    const fetchMotd = async () => {
      try {
        const response = await fetch('/MOTD.txt');
        if (response.ok) {
          const text = await response.text();
          setMotdContent(text.trim());
        }
      } catch (error) {
        // console.log('Could not load MOTD.txt, using default message');
        // console.log(error);
        setMotdContent("Beta Test");
      }
    };

    fetchMotd();
  }, []);

  /**
   * Handle Login Form Submission
   * 
   * Process Flow:
   * 1. Prevents default form submission
   * 2. Sets loading state to show spinner
   * 3. Hashes password with MD5
   * 4. Converts email to lowercase (case-insensitive)
   * 5. Sends credentials to /api/getLogin.php
   * 6. On success: Sets current user and shows success message
   * 7. On failure: Shows error message
   * 8. Clears loading state
   * 
   * Response Format from API:
   * {
   *   status_code: 200,
   *   message: "[{user_object}]"  // JSON string containing user array
   * }
   * 
   * User Object Structure:
   * {
   *   id: number,
   *   email: string,
   *   userName: string,
   *   classCode: string,
   *   status: number,  // 0=student, 2=teacher, 3=admin
   *   avatar: string   // Base64 encoded image
   * }
   * 
   * @async
   * @param {Event} e Form submit event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Hash the password with MD5
    const hashedPassword = CryptoJS.MD5(password).toString();
    // Convert email to lowercase for case-insensitive login
    const JSONData = { email: email.toLowerCase(), passwordHash: hashedPassword };

    // console.log("JSONData:", JSONData);

    try {
      const response = await axios.post(config.api + '/getLogin.php', JSONData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      // console.log('Response:', data);

      // Handle the response data here
      if (data.status_code === 200) {
        const user = JSON.parse(data.message)[0]; // Parse the JSON string and get the first user object
        if (user) {

          setCurrentUser(user);
          // setSendSuccessMessage('Login successful');
          setIsLoading(false);
        } else {
          setSendErrorMessage('User not found');
          setIsLoading(false);
        }
      } else {
        // Login failed

        setSendErrorMessage('Login failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      setSendErrorMessage('Network error. Please try again.');
  }
  };
  
  /**
   * Handle Password Reset Request
   * 
   * Sends password reset request to teachers/admins for manual processing.
   * This is intentionally a manual process for security - students must
   * verify their identity in person with a teacher during lesson time.
   * 
   * Process Flow:
   * 1. Validates email field is not empty
   * 2. Sets loading state
   * 3. Sends email to /api/requestPasswordReset.php
   * 4. API sends notification to all teachers/admins
   * 5. Shows success message to student
   * 6. Hides password reset interface
   * 
   * Security Note:
   * Password reset is manual to prevent unauthorized access.
   * Teachers must verify student identity before resetting password.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handlePasswordReset = async () => {
    if (!email) {
      setSendErrorMessage('Please enter your email address first');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(config.api + '/requestPasswordReset.php', { email }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.data.status_code === 200) {
        setSendSuccessMessage('Password reset request sent to your teacher. Please see them during lesson time.');
        setShowPasswordReset(false);
      } else {
        setSendErrorMessage('Failed to send password reset request');
      }
    } catch (error) {
      console.error('Error:', error);
      setSendErrorMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {isLoading && <div className="central-overlay-spinner">            
          <div className="spinner-text">&nbsp;&nbsp;
              <Spin size="large" />
              Logging in...
            </div> 
          </div>}
  
        <>

          
          <div className="login-container">
            <div className="login-form">
            <div className="login-header">
              Enter your login details
            </div>
              <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>eMail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
              <div className='form-group'>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <div className='form-group-button'>
                <button type="submit">Login</button>
              </div>
            </form>
            
            <div className='form-group' style={{ textAlign: 'center', marginTop: '15px' }}>
              {!showPasswordReset ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={(e) => { e.preventDefault(); setShowPasswordReset(true); }}
                >
                  Forgotten your password?
                </button>
              ) : (
                <div>
                  <p style={{ marginBottom: '10px' }}>
                    Enter your email above and click below to request a password reset from your teacher.
                  </p>
                  <button 
                    type="button"
                    onClick={handlePasswordReset}
                    style={{ marginRight: '10px' }}
                  >
                    Request Password Reset
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowPasswordReset(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            </div>
            <div className="motd" dangerouslySetInnerHTML={{ __html: motdContent }} />
          </div>
        </>
      
    </>
  );
};

export default Login;