import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { Spin } from 'antd';
import axios from 'axios';


/****************************************************************
 * Login Component
 * Renders the login form for user authentication.
 * Includes email/password fields and a login button.
 * Displays a message of the day (MOTD) loaded from an external file.
 * Registration function currently disabled, but structure in place
 * because student upload is bulk only at the moment.
*****************************************************************/

const Login = ({ config, setCurrentUser, setSendSuccessMessage, setSendErrorMessage}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [motdContent, setMotdContent] = useState('Beta Test'); // Default fallback

  // Fetch MOTD content on component mount
  // useEffect(() => {
  //   const fetchMotd = async () => {
  //     try {
  //       const response = await fetch('/MOTD.txt');
  //       if (response.ok) {
  //         const text = await response.text();
  //         setMotdContent(text.trim());
  //       }
  //     } catch (error) {
  //       // console.log('Could not load MOTD.txt, using default message');
  //       // console.log(error);
  //       setMotdContent("Beta Test");
  //     }
  //   };

  //   fetchMotd();
  // }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Hash the password with MD5
    const hashedPassword = CryptoJS.MD5(password).toString();
    // Convert email to lowercase for case-insensitive login
    const JSONData = { email: email.toLowerCase(), passwordHash: hashedPassword };

    console.log("JSONData:", JSONData);

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
          setSendSuccessMessage('Login successful');
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

            </div>
            <div className="motd" dangerouslySetInnerHTML={{ __html: motdContent }} />
          </div>
        </>
      
    </>
  );
};

export default Login;