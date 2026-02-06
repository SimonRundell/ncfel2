import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { normalizeListResponse } from './adminApiHelpers';
import { formatDateTime } from './dateUtils';

/**
 * Assessment report view for teachers/admins.
 * Fetches students, activities, courses, and units, then renders a filterable/printable table.
 * Collapses duplicate student names, supports class/status filters, and pre-filters for teacher class.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  currentUser: { status: number, classCode?: string } | null,
 *  onError?: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const AssessmentReport = ({ config, currentUser, onError }) => {
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const isTeacher = currentUser?.status === 2;
  const teacherClass = currentUser?.classCode || '';

  useEffect(() => {
    if (!config?.api) return;
    const loadAll = async () => {
      setLoading(true);
      try {
        const studentPayload = { status: 0 };
        if (isTeacher && teacherClass) {
          studentPayload.classCode = teacherClass;
        }

        const [studentsRes, activitiesRes, coursesRes, unitsRes] = await Promise.all([
          axios.post(`${config.api}/getUsers.php`, studentPayload, { headers: { 'Content-Type': 'application/json' } }),
          axios.get(`${config.api}/getCurrentActivities.php`, { headers: { 'Content-Type': 'application/json' } }),
          axios.get(`${config.api}/getCourses.php`, { headers: { 'Content-Type': 'application/json' } }),
          axios.get(`${config.api}/getUnits.php`, { headers: { 'Content-Type': 'application/json' } }),
        ]);

        setStudents(normalizeListResponse(studentsRes.data));
        setActivities(normalizeListResponse(activitiesRes.data));
        setCourses(normalizeListResponse(coursesRes.data));
        setUnits(normalizeListResponse(unitsRes.data));
      } catch (err) {
        console.error('Error loading assessment report data', err);
        if (onError) onError('Error loading assessment report data');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [config, isTeacher, teacherClass, onError]);

  const courseMap = useMemo(() => {
    return courses.reduce((acc, c) => {
      acc[c.id] = c.courseName || `Course ${c.id}`;
      return acc;
    }, {});
  }, [courses]);

  const unitMap = useMemo(() => {
    return units.reduce((acc, u) => {
      acc[u.id] = u.unitName || `Unit ${u.id}`;
      return acc;
    }, {});
  }, [units]);

  const classOptions = useMemo(() => {
    const codes = new Set();
    students.forEach((s) => {
      if (s.classCode) codes.add(s.classCode);
    });
    return Array.from(codes).sort();
  }, [students]);

  const statusOptions = useMemo(() => {
    const statuses = new Set();
    activities.forEach((a) => {
      if (a.status) statuses.add(a.status);
    });
    return Array.from(statuses).sort();
  }, [activities]);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (isTeacher && teacherClass) {
      setSelectedClass(teacherClass);
    } else if (!selectedClass && classOptions.length) {
      setSelectedClass(classOptions[0]);
    }
  }, [classOptions, isTeacher, teacherClass, selectedClass]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => (selectedClass ? s.classCode === selectedClass : true));
  }, [students, selectedClass]);

  const studentMap = useMemo(() => {
    return filteredStudents.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});
  }, [filteredStudents]);

  const activitiesForSelected = useMemo(() => {
    if (!filteredStudents.length) return [];
    const allowedIds = new Set(filteredStudents.map((s) => s.id));
    return activities
      .filter((a) => allowedIds.has(Number(a.studentId)))
      .filter((a) => (selectedStatus ? a.status === selectedStatus : true))
      .sort((a, b) => (a.dateSet || '').localeCompare(b.dateSet || ''));
  }, [activities, filteredStudents, selectedStatus]);

  const rows = useMemo(() => {
    if (!filteredStudents.length) return [];
    const map = new Map();
    filteredStudents.forEach((s) => map.set(s.id, []));
    activitiesForSelected.forEach((act) => {
      const list = map.get(Number(act.studentId));
      if (list) list.push(act);
    });
    return Array.from(map.entries()).flatMap(([studentId, acts]) => {
      if (!acts.length) {
        return [
          {
            studentId,
            classCode: studentMap[studentId]?.classCode || '',
            studentName: studentMap[studentId]?.userName || `Student ${studentId}`,
            courseLabel: '',
            unitLabel: '',
            status: '—',
            dateSet: '',
            dateSubmitted: '',
            dateResubmitted: '',
            dateMarked: '',
            dateComplete: '',
          },
        ];
      }
      return acts.map((act) => ({
        studentId,
        classCode: studentMap[studentId]?.classCode || '',
        studentName: studentMap[studentId]?.userName || `Student ${studentId}`,
        courseLabel: courseMap[act.courseId] || `Course ${act.courseId}`,
        unitLabel: unitMap[act.unitId] || `Unit ${act.unitId}`,
        status: act.status,
        dateSet: act.dateSet,
        dateSubmitted: act.dateSubmitted,
        dateResubmitted: act.dateResubmitted,
        dateMarked: act.dateMarked,
        dateComplete: act.dateComplete,
      }));
    });
  }, [activitiesForSelected, courseMap, filteredStudents, studentMap, unitMap]);

  const displayRows = useMemo(() => {
    let lastStudent = null;
    return rows.map((row) => {
      const displayName = row.studentName === lastStudent ? '' : row.studentName;
      lastStudent = row.studentName;
      return { ...row, displayName };
    });
  }, [rows]);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Assessment Report</div>
          <div className="admin-section-subtitle">Overview of assessments by class and student.</div>
        </div>
        <div className="admin-inline">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={isTeacher}
          >
            {!isTeacher && <option value="">All classes</option>}
            {classOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" onClick={handlePrint} className="hide-on-print" disabled={loading}>
            Print
          </button>
          {loading && <span>Loading…</span>}
        </div>
      </div>

      <div className="admin-list">
        {rows.length === 0 ? (
          <div className="admin-empty">No data to display.</div>
        ) : (
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Course</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Date set</th>
                  <th>Submitted</th>
                  <th>Resubmitted</th>
                  <th>Marked</th>
                  <th>Complete</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => (
                  <tr key={`${row.studentId}-${row.unitLabel}-${idx}`}>
                    <td>{row.displayName}</td>
                    <td>{row.classCode || '—'}</td>
                    <td>{row.courseLabel}</td>
                    <td>{row.unitLabel}</td>
                    <td>{row.status}</td>
                    <td>{formatDateTime(row.dateSet)}</td>
                    <td>{formatDateTime(row.dateSubmitted)}</td>
                    <td>{formatDateTime(row.dateResubmitted)}</td>
                    <td>{formatDateTime(row.dateMarked)}</td>
                    <td>{formatDateTime(row.dateComplete)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentReport;
