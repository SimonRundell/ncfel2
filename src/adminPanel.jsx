import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import CourseManager from './CourseManager.jsx';
import UnitManager from './UnitManager.jsx';
import UserManager from './UserManager.jsx';
import AssignUnit from './AssignUnit.jsx';
import IndividualAssessment from './individualAssessment.jsx';
import { normalizeListResponse } from './adminApiHelpers';

/**
 * Administrative console for managing courses, units, users, rosters, and assignments.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  currentUser: object,
 *  setSendSuccessMessage: (msg: string) => void,
 *  setSendErrorMessage: (msg: string) => void,
 *  initialSection?: string,
 *  onSectionChange?: (section: string) => void
 * }} props
 * @returns {JSX.Element}
 */
function AdminPanel({
    config,
    currentUser,
    setSendSuccessMessage,
    setSendErrorMessage,
    initialSection = 'roster',
    onSectionChange,
}) {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [classCodes, setClassCodes] = useState([]);
    const [students, setStudents] = useState([]);
    const [rosterSearch, setRosterSearch] = useState('');
    const [selectedClass, setSelectedClass] = useState(null);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);


    const notifySuccess = (msg) => setSendSuccessMessage(msg);
    const notifyError = useCallback((msg) => setSendErrorMessage(msg), [setSendErrorMessage]);

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
                // notifySuccess('Class codes loaded');
            } catch (error) {
                console.error('Error loading class codes:', error);
                setClassCodes([]);
                notifyError('Error loading class codes');
            } finally {
                setLoadingRoster(false);
            }
        };

        fetchClassCodes();
    }, [config, notifyError]);

    const fetchStudents = async (classCode) => {
        setSelectedClass(classCode);
        setRosterSearch('');
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
            // notifySuccess('Students loaded');
        } catch (error) {
            console.error('Error loading students:', error);
            notifyError('Error loading students');
        } finally {
            setLoadingRoster(false);
        }
    };


    const sections = useMemo(() => {
        const adminSections = [
            { key: 'roster', label: 'Class roster' },
            { key: 'courses', label: 'Courses' },
            { key: 'units', label: 'Units' },
            { key: 'assign', label: 'Set Assessments' },
            { key: 'users', label: 'Users' },
        ];
        const teacherSections = [
            { key: 'roster', label: 'Class roster' },
            { key: 'assign', label: 'Set Assessments' },
        ];

        return currentUser?.status === 3 ? adminSections : teacherSections;
    }, [currentUser?.status]);

    useEffect(() => {
        if (initialSection && sections.some((section) => section.key === initialSection)) {
            setActiveSection(initialSection);
        }
    }, [initialSection, sections]);

    useEffect(() => {
        if (!sections.some((section) => section.key === activeSection)) {
            setActiveSection(sections[0]?.key || 'roster');
        }
    }, [activeSection, sections]);

    useEffect(() => {
        if (onSectionChange && sections.some((section) => section.key === activeSection)) {
            onSectionChange(activeSection);
        }
    }, [activeSection, onSectionChange, sections]);

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
                            <h3 className="roster-header">Students of {selectedClass}:
                            <span className="biggergap">
                            <input
                                type="text"
                                value={rosterSearch}
                                onChange={(e) => setRosterSearch(e.target.value)}
                                placeholder="Search student name"
                                className="admin-filter-input"
                            /> </span></h3>
                            <ul className="student-table">
                                {students
                                    .filter((student) => {
                                        if (!rosterSearch.trim()) return true;
                                        return (student.userName || '').toLowerCase().includes(rosterSearch.trim().toLowerCase());
                                    })
                                    .map((student, index) => (
                                        <li className="student-row"
                                            key={index}>
                                            <span onClick={() => {
                                                setSelectedUserForEdit(student);
                                                setActiveSection('users');
                                            }}>{student.userName}</span>
                                            <span className="biggergap">
                                                <IndividualAssessment 
                                                    config={config} 
                                                    notifyError={notifyError} 
                                                    id={student.id}
                                                    studentName={student.userName}
                                                />
                                            </span>
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
                <AssignUnit config={config} currentUser={currentUser} onSuccess={notifySuccess} onError={notifyError} />
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
