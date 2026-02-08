import { useEffect, useRef, useState, useCallback } from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { Spin } from 'antd';
import { normalizeListResponse, getMessageFromResponse } from './adminApiHelpers';

const emptyForm = {
  id: null,
  email: '',
  userName: '',
  classCode: '',
  status: 0,
  password: '',
  passwordHash: '',
  avatar: '',
};

/**
 * Admin user management (create/update/delete, search, bulk upload, avatar handling).
 * Supports CSV bulk import, MD5 password hashing, class code filtering, and user editing.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  onSuccess: (msg: string) => void,
 *  onError: (msg: string) => void,
 *  selectedUser?: object | null,
 *  clearSelectedUser?: () => void
 * }} props
 * @returns {JSX.Element}
 */
const UserManager = ({ config, onSuccess, onError, selectedUser, clearSelectedUser }) => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsOnly, setStudentsOnly] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [classCodes, setClassCodes] = useState([]);
  const [bulkClassCode, setBulkClassCode] = useState('');
  const [bulkNewClassCode, setBulkNewClassCode] = useState('');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('');
  const [bulkCsvName, setBulkCsvName] = useState('');
  const [bulkCsvContent, setBulkCsvContent] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const needsClassCode = form.status === 0;
  const fileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);
  const maxAvatarBytes = 10 * 1024 * 1024; // 10MB cap
  const maxCsvBytes = 5 * 1024 * 1024; // 5MB cap for bulk CSV

  const loadUsers = useCallback(async () => {
    if (!config?.api) return;
    setLoading(true);
    try {
      const response = await axios.get(`${config.api}/getUsers.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = normalizeListResponse(response.data);
      setUsers(Array.isArray(data) ? data : []);
      onSuccess('Users loaded');
    } catch (error) {
      console.error('Error loading users', error);
      onError('Error loading users');
    } finally {
      setLoading(false);
    }
  }, [config, onSuccess, onError]);

  const loadClassCodes = useCallback(async () => {
    if (!config?.api) return;
    try {
      const response = await axios.get(`${config.api}/getClassCodes.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = normalizeListResponse(response.data);
      const uniqueCodes = Array.from(new Set((data || []).map((row) => row.classCode).filter(Boolean)));
      setClassCodes(uniqueCodes);
    } catch (error) {
      console.error('Error loading class codes', error);
      onError('Error loading class codes');
    }
  }, [config, onError]);

  const handleEdit = useCallback((user) => {
    setForm({
      id: user.id ?? user.ID ?? null,
      email: user.email || '',
      userName: user.userName || '',
        classCode: user.classCode || '',
        status: Number(user.status ?? 0),
      password: '',
      passwordHash: user.passwordHash || '',
      avatar: user.avatar || '',
    });
    setShowEditor(true);
  }, []);

  useEffect(() => {
    loadUsers();
    loadClassCodes();
  }, [loadUsers, loadClassCodes]);

  useEffect(() => {
    if (selectedUser && selectedUser.id) {
      handleEdit(selectedUser);
      if (clearSelectedUser) clearSelectedUser();
    }
  }, [selectedUser, clearSelectedUser, handleEdit]);

  const resetForm = () => setForm(emptyForm);

  const closeEditor = () => {
    resetForm();
    setShowEditor(false);
  };

  const handleAdd = () => {
    resetForm();
    setShowEditor(true);
  };

  const resolvePasswordHash = () => {
    if (form.password && form.password.trim() !== '') {
      return CryptoJS.MD5(form.password.trim()).toString();
    }
    return form.passwordHash ? form.passwordHash.trim() : '';
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setForm((prev) => ({ ...prev, avatar: '' }));
      return;
    }

    if (file.size > maxAvatarBytes) {
      onError('Avatar must be 10MB or smaller');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      setForm((prev) => ({ ...prev, avatar: result }));
    };
    reader.onerror = () => {
      onError('Could not read avatar file');
    };
    reader.readAsDataURL(file);
  };

  const triggerAvatarBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setBulkCsvContent('');
      setBulkCsvName('');
      return;
    }
    if (file.size > maxCsvBytes) {
      onError('CSV must be 5MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result || '';
      setBulkCsvContent(String(text));
      setBulkCsvName(file.name);
    };
    reader.onerror = () => onError('Could not read CSV file');
    reader.readAsText(file);
  };

  const triggerBulkBrowse = () => {
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
      bulkFileInputRef.current.click();
    }
  };

  const resetBulkState = () => {
    setBulkClassCode('');
    setBulkNewClassCode('');
    setBulkDefaultPassword('');
    setBulkCsvName('');
    setBulkCsvContent('');
    setBulkLoading(false);
  };

  const handleOpenBulk = () => {
    setShowBulkModal(true);
    loadClassCodes();
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const selectedClass = (bulkNewClassCode || bulkClassCode).trim();
    if (!selectedClass) {
      onError('Choose or enter a class code');
      return;
    }
    if (!bulkDefaultPassword.trim()) {
      onError('Default password is required');
      return;
    }
    if (!bulkCsvContent.trim()) {
      onError('CSV file is required');
      return;
    }

    setBulkLoading(true);
    let uploadCompleted = false;
    try {
      const response = await axios.post(
        `${config.api}/bulkUploadUsers.php`,
        {
          classCode: selectedClass,
          defaultPassword: bulkDefaultPassword,
          csvContent: bulkCsvContent,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const successMessage = getMessageFromResponse(response.data, 'Bulk upload has been sent');
      onSuccess(successMessage);
      uploadCompleted = true;
      loadUsers();
    } catch (error) {
      console.error('Error bulk uploading users', error);
      onError('Error bulk uploading users');
    } finally {
      setBulkLoading(false);
      if (uploadCompleted) {
        setShowBulkModal(false);
        resetBulkState();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.userName) {
      onError('Email and username required');
      return;
    }

    const isUpdating = form.id !== null && form.id !== undefined;

    const passwordHash = resolvePasswordHash();
    if (!passwordHash) {
      onError('Password or password hash required');
      return;
    }

    if (isUpdating && !form.id) {
      onError('User id missing for update');
      return;
    }

    const payload = {
      ...(isUpdating ? { id: Number(form.id) } : {}),
      email: form.email.trim(),
      userName: form.userName.trim(),
      classCode: needsClassCode && form.classCode.trim() ? form.classCode.trim() : null,
      status: Number(form.status),
      passwordHash,
      avatar: form.avatar || null,
    };

    console.log('Submitting user payload:', payload);

    setLoading(true);
    try {
      if (isUpdating) {
        await axios.post(
          `${config.api}/updateUser.php`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess('User updated');
      } else {
        const response = await axios.post(
          `${config.api}/createUser.php`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess(getMessageFromResponse(response.data, 'User created'));
      }
      closeEditor();
      loadUsers();
    } catch (error) {
      console.error('Error saving user', error);
      onError('Error saving user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (user) => {
    setUserToDelete(user);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await axios.post(
        `${config.api}/deleteUser.php`,
        { id: userToDelete.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
      onSuccess('User deleted');
      if (form.id === userToDelete.id) closeEditor();
      loadUsers();
    } catch (error) {
      console.error('Error deleting user', error);
      onError('Error deleting user');
    } finally {
      setLoading(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setUserToDelete(null);
  };

  const filteredUsers = users.filter((user) => {
    if (studentsOnly && Number(user.status) !== 0) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return [user.userName, user.email, user.classCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const status = (statusCode) => {
    switch (statusCode) {
        case 0:
            return 'Student';
        case 2:
            return 'Teacher';
        case 3:
            return 'Admin'; 
        default:
            return 'Unknown';
    }
};

  return (
    <div className="admin-section">
      {bulkLoading && (
        <div className="central-overlay-spinner">
          <div className="spinner-text">
            <Spin size="large" /> Uploading students... please wait
          </div>
        </div>
      )}
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Users</div>
          <div className="admin-section-subtitle">Manage logins and roles.</div>
        </div>
        <div className="admin-inline">
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Search users (name, email, class code)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label className="admin-filter-check">
            <input
              type="checkbox"
              checked={studentsOnly}
              onChange={(e) => setStudentsOnly(e.target.checked)}
            />
            Students only
          </label>
          <button type="button" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={handleAdd} disabled={loading}>
            Add user
          </button>
          <button type="button" onClick={handleOpenBulk} disabled={loading}>
            Add bulk users
          </button>
        </div>
      </div>

      <div className={showEditor ? 'admin-editor is-open' : 'admin-editor'} aria-hidden={!showEditor}>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid">
            <label className="admin-label">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label className="admin-label">
              Username
              <input
                type="text"
                value={form.userName}
                onChange={(e) => setForm((prev) => ({ ...prev, userName: e.target.value }))}
                required
              />
            </label>
            <label className="admin-label">
              Role
              <select
                value={form.status}
                onChange={(e) => {
                  const newStatus = Number(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    status: newStatus,
                    // keep classCode intact; optional for all roles now
                  }));
                }}
              >
                <option value={0}>Student</option>
                <option value={2}>Teacher</option>
                <option value={3}>Admin</option>
              </select>
            </label>
            {needsClassCode && (
              <label className="admin-label">
                Class code (optional)
                <select
                  value={form.classCode || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, classCode: e.target.value }))}
                >
                  <option value="">No class</option>
                  {classCodes.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="admin-grid">
            <label className="admin-label">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Only fill to change password"
              />
            </label>
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
                {form.avatar && (
                  <img
                    src={form.avatar}
                    alt="Avatar preview"
                    className="avatar-thumb"
                  />
                )}
              </div>
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={closeEditor} disabled={loading}>
              Close
            </button>
            <button type="submit" disabled={loading}>
              {form.id ? 'Update this user' : 'Add this user'}
            </button>
          </div>
        </form>
      </div>


      <div className="admin-list">
        {filteredUsers.map((user) => (
          <div className="admin-row" key={user.id}>
            <div>
              <div className="admin-row-title">{user.userName}</div>
              <div className="admin-row-subtitle">
                {user.email} · {user.status === 0 ? `Class ${user.classCode || '—'}` : 'No class'} · Role: {status(user.status)}
              </div>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => handleEdit(user)} disabled={loading}>
                Edit
              </button>
              <button type="button" onClick={() => handleDeleteRequest(user)} disabled={loading}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && <div className="admin-empty">No users found.</div>}
      </div>

      {showBulkModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Bulk upload students</div>
                <div className="modal-subtitle">Select a class, default password, and upload CSV.</div>
              </div>
              <button type="button" onClick={() => { setShowBulkModal(false); resetBulkState(); }} disabled={bulkLoading}>
                Close
              </button>
            </div>

            <form className="modal-body" onSubmit={handleBulkSubmit}>
              <div className="modal-row">
                <label className="admin-label">
                  Choose class
                  <select
                    value={bulkClassCode}
                    onChange={(e) => setBulkClassCode(e.target.value)}
                  >
                    <option value="">Select existing class</option>
                    {classCodes.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-label">
                  Or add new class
                  <input
                    type="text"
                    value={bulkNewClassCode}
                    onChange={(e) => setBulkNewClassCode(e.target.value)}
                    placeholder="e.g. CS101"
                  />
                </label>
              </div>

              <div className="modal-row">
                <label className="admin-label">
                  Default password
                  <input
                    type="text"
                    value={bulkDefaultPassword}
                    onChange={(e) => setBulkDefaultPassword(e.target.value)}
                    placeholder="Password applied to all uploaded students"
                  />
                </label>
                <label className="admin-label">
                  CSV file
                  <div className="admin-avatar-row">
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      accept="text/csv,.csv"
                      onChange={handleBulkFileChange}
                      className="file-input-hidden"
                    />
                    <button
                      type="button"
                      className="file-input-button"
                      onClick={triggerBulkBrowse}
                      disabled={bulkLoading}
                    >
                      Choose CSV
                    </button>
                    {bulkCsvName && <span className="file-chosen">{bulkCsvName}</span>}
                  </div>
                </label>
              </div>

              <div className="modal-guide">
                <div><strong>CSV format:</strong> first row headers like <code>email,userName,classCode</code>. 
                Class code column optional; if omitted, the selected/entered class is applied. 
                Role is set to Student; avatar left blank.</div>
                <div>Save as UTF-8 CSV (Excel "CSV UTF-8") to avoid encoding issues.</div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowBulkModal(false); resetBulkState(); }} disabled={bulkLoading}>
                  Cancel
                </button>
                <button type="submit" disabled={bulkLoading}>
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Delete user</div>
                <div className="modal-subtitle">This action cannot be undone.</div>
              </div>
              <button type="button" onClick={handleDeleteCancel} disabled={loading}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete {userToDelete.userName}?</p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={handleDeleteCancel} disabled={loading}>
                Cancel
              </button>
              <button type="button" onClick={handleDeleteConfirm} disabled={loading}>
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
