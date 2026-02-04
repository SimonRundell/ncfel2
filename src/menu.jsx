import './App.css';

function Menu({ currentUser, onLogout, onAdmin, onProfile }) {
  const isAdmin = currentUser && currentUser.status === 3;

  return (
    <div className="menu-block">
      <div className="menu-info">

        {currentUser && (
          <div className="menu-user">
            <span className="menu-user-inline">
              <img
                className="menu-avatar"
                src={currentUser.avatar || '/images/default_avatar.png'}
                alt={currentUser.userName}
              />
              {currentUser.userName}
            </span>
          </div>
        )}
      </div>
      <div className="menu-actions">
        <button type="button" onClick={onProfile}>
          Profile
        </button>
        <button type="button" onClick={onAdmin} disabled={!isAdmin}>
          Admin
        </button>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Menu;
