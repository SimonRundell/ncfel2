import { useEffect, useRef, useState } from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const maxAvatarBytes = 10 * 1024 * 1024; // 10MB

/**
 * Modal for students to update email, password, and avatar.
 * Handles avatar upload/validation and MD5 hashing for password changes.
 *
 * @component
 * @param {{
 *  config: { api: string },
 *  currentUser: { id: number, email: string, avatar?: string } | null,
 *  onClose: () => void,
 *  onUpdated?: (user: object) => void,
 *  onError: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const StudentProfile = ({ config, currentUser, onClose, onUpdated, onError }) => {
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [avatarName, setAvatarName] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setEmail(currentUser?.email || '');
    setAvatar(currentUser?.avatar || '');
    setPassword('');
    setConfirmPassword('');
    setAvatarName('');
  }, [currentUser]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatar('');
      setAvatarName('');
      return;
    }
    if (file.size > maxAvatarBytes) {
      onError('Avatar must be 10MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result || '');
      setAvatarName(file.name);
    };
    reader.onerror = () => onError('Could not read avatar file');
    reader.readAsDataURL(file);
  };

  const triggerAvatarBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      onError('No user context');
      return;
    }

    if (password && password !== confirmPassword) {
      onError('Passwords do not match');
      return;
    }

    const payload = {
      id: currentUser.id,
      email: email.trim(),
      avatar: avatar || null,
    };

    if (password.trim()) {
      payload.passwordHash = CryptoJS.MD5(password.trim()).toString();
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${config.api}/updateSelf.php`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const updatedUser = response.data?.user || { ...currentUser, avatar: avatar || currentUser.avatar, email: email.trim() };
      if (onUpdated) onUpdated(updatedUser);
      onClose();
    } catch (error) {
      console.error('Error updating profile', error);
      onError('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Your profile</div>
            <div className="modal-subtitle">Update your email, password, or avatar.</div>
          </div>
          <button type="button" onClick={onClose} disabled={loading}>
            Close
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="modal-row">
            <label className="admin-label">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="admin-label">
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </label>
            <label className="admin-label">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="admin-label">
              Avatar (max 10MB)
              <div className="admin-avatar-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="file-input-hidden"
                />
                <button
                  type="button"
                  className="file-input-button"
                  onClick={triggerAvatarBrowse}
                  disabled={loading}
                >
                  Choose file
                </button>
                {avatarName && <span className="file-chosen">{avatarName}</span>}
                {avatar && (
                  <img src={avatar} alt="Avatar preview" className="avatar-thumb" />
                )}
              </div>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentProfile;
