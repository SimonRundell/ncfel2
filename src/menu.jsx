import './App.css';

/**
 * Top navigation menu for switching views, opening profile, and logging out.
 * Shows role-based buttons for teachers/admins.
 *
 * @component
 * @param {{
 *  currentUser: { status: number, avatar?: string, userName?: string } | null,
 *  onLogout: () => void,
 *  onProfile: () => void,
 *  activeView: string,
 *  onViewChange: (view: string) => void
 * }} props
 * @returns {JSX.Element}
 */
function Menu({ currentUser, onLogout, onProfile, activeView, onViewChange }) {
  const isAdmin = currentUser && currentUser.status === 3;
  const isTeacher = currentUser && currentUser.status >= 2;

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

        {isTeacher && (
          <>
            <button
              type="button"
              onClick={() => onViewChange('report')}
              className={activeView === 'report' ? 'menu-toggle active' : 'menu-toggle'}
            >
              Assessment Overview
            </button>
            <button
              type="button"
              onClick={() => onViewChange('marking')}
              className={activeView === 'marking' ? 'menu-toggle active' : 'menu-toggle'}
            >
              Marking
            </button>
          </>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onViewChange('admin')}
            className={activeView === 'admin' ? 'menu-toggle active' : 'menu-toggle'}
          >
            Admin
          </button>
        )}
        <button type="button" onClick={onProfile}>
          Profile
        </button>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Menu;
