import { useState, useEffect } from 'react'
import './App.css'
import {Spin, message} from 'antd';
import Login from './login.jsx';
import AdminPanel from './adminPanel.jsx';
import Menu from './menu.jsx';
import StudentProfile from './StudentProfile.jsx';
import StudentAssignments from './StudentAssignments.jsx';
import axios from 'axios';


function App() {
  const [config, setConfig] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [currentUser, setCurrentUser] = useState(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState(false);
  const [sendErrorMessage, setSendErrorMessage] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

   useEffect(() => {
    // Add cache busting parameter to force fresh config load
    const timestamp = new Date().getTime();
    axios.get(`/.config.json?t=${timestamp}`)
      .then(response => {
        setConfig(response.data);
        console.log('Config loaded:', response.data);
        messageApi.success('Config loaded');
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        messageApi.error('Error fetching config');
      });
  }, [messageApi]);

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
          <div className="app-title">NCFE Level 2 Certificate</div>
          <img className="logo" src="images/exeter_logo.png" alt="Exeter College" />
        </div>
      </div>
      <div className="app-container">

        {currentUser ? (
          <>
            <Menu
               currentUser={currentUser}
               onAdmin={() => currentUser?.status === 3 && setShowAdmin(true)}
               onProfile={() => setShowProfile(true)}
               onLogout={() => setCurrentUser(null)}
            />
            {currentUser.status === 3 ? (
              <AdminPanel
                config={config}
                currentUser={currentUser}
                setSendSuccessMessage={setSendSuccessMessage}
                setSendErrorMessage={setSendErrorMessage}
              />
            ) : (
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
    </>
  )
}

export default App
