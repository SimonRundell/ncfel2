import { useState, useEffect } from 'react';
import axios from 'axios';
import CourseManager from './CourseManager.jsx';
import UnitManager from './UnitManager.jsx';
import UserManager from './UserManager.jsx';
import AssignUnit from './AssignUnit.jsx';
import { normalizeListResponse } from './adminApiHelpers';

function AdminPanel({ config, setSendSuccessMessage, setSendErrorMessage }) {
    const [activeSection, setActiveSection] = useState('roster');
    const [classCodes, setClassCodes] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

    const notifySuccess = (msg) => setSendSuccessMessage(msg);
    const notifyError = (msg) => setSendErrorMessage(msg);

    useEffect(() => {
        const fetchClassCodes = async () => {
            if (!config?.api) {
                setClassCodes([]);
                return;
            }

            setLoadingRoster(true);
            try {
                const response = await axios.get(`${config.api}/getClassCodes.php`, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const codes = normalizeListResponse(response.data);
                setClassCodes(Array.isArray(codes) ? codes : []);
                notifySuccess('Class codes loaded');
            } catch (error) {
                console.error('Error loading class codes:', error);
                setClassCodes([]);
                notifyError('Error loading class codes');
            } finally {
                setLoadingRoster(false);
            }
        };

        fetchClassCodes();
    }, [config]);

    const fetchStudents = async (classCode) => {
        setSelectedClass(classCode);
        if (!classCode) {
            setStudents([]);
            return;
        }

        setLoadingRoster(true);
        try {
            const response = await axios.post(
                `${config.api}/getStudents.php`,
                { classCode },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            const tmpStudents = normalizeListResponse(response.data);
            setStudents(Array.isArray(tmpStudents) ? tmpStudents : []);
            notifySuccess('Students loaded');
        } catch (error) {
            console.error('Error loading students:', error);
            notifyError('Error loading students');
        } finally {
            setLoadingRoster(false);
        }
    };

    const sections = [
        { key: 'roster', label: 'Class roster' },
        { key: 'courses', label: 'Courses' },
        { key: 'units', label: 'Units' },
        { key: 'assign', label: 'Set assessments' },
        { key: 'users', label: 'Users' },

    ];

    return (
        <div className="admin-panel">
            <div className="admin-nav">
                {sections.map((section) => (
                    <button
                        key={section.key}
                        type="button"
                        className={activeSection === section.key ? 'admin-nav-button active' : 'admin-nav-button'}
                        onClick={() => setActiveSection(section.key)}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {activeSection === 'roster' && (
                <div className="admin-section">
                    {loadingRoster ? (
                        <div className="central-overlay-spinner">
                            <div className="spinner-text">Loading classes…</div>
                        </div>
                    ) : classCodes.length === 0 ? (
                        <div>No class codes found.</div>
                    ) : (
                        <select onChange={(e) => fetchStudents(e.target.value)} value={selectedClass || ''}>
                            <option value="">Select a class</option>
                            {classCodes
                                .filter((code) => {
                                    const label = code.classCode || code.name || '';
                                    return label.trim().toLowerCase() !== 'untitled' && label.trim() !== '';
                                })
                                .map((code, idx) => {
                                    const value = code.classCode || code.id || `class-${idx}`;
                                    const label = code.classCode || code.name;
                                    return (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    );
                                })}
                        </select>
                    )}

                    {students.length > 0 && (
                        <div>
                            <h3>Students of {selectedClass}:</h3>
                            <ul className="student-table">
                                {students.map((student, index) => (
                                                    <li
                                                        className="student-row"
                                                        key={index}
                                                        onClick={() => {
                                                            setSelectedUserForEdit(student);
                                                            setActiveSection('users');
                                                        }}
                                                    >
                                                        {student.userName}
                                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'courses' && (
                <CourseManager config={config} onSuccess={notifySuccess} onError={notifyError} />
            )}

            {activeSection === 'units' && (
                <UnitManager config={config} onSuccess={notifySuccess} onError={notifyError} />
            )}

            {activeSection === 'assign' && (
                <AssignUnit config={config} onSuccess={notifySuccess} onError={notifyError} />
            )}

            {activeSection === 'users' && (
                <UserManager
                    config={config}
                    onSuccess={notifySuccess}
                    onError={notifyError}
                    selectedUser={selectedUserForEdit}
                    clearSelectedUser={() => setSelectedUserForEdit(null)}
                />
            )}

        </div>
    );
}

export default AdminPanel;
