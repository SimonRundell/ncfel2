import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { normalizeListResponse } from './adminApiHelpers';
import StudentAnswer from './StudentAnswer.jsx';

/**
 * Student dashboard listing current activities and launching the answer workspace.
 * Filters out discontinued activities and reloads after submit/save.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  currentUser: { id: number } | null,
 *  onError?: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const StudentAssignments = ({ config, currentUser, onError }) => {
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const loadCourses = useCallback(async () => {
    if (!config?.api) return;
    try {
      const response = await axios.get(`${config.api}/getCourses.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = normalizeListResponse(response.data);
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading courses', error);
    }
  }, [config]);

  const loadUnits = useCallback(async () => {
    if (!config?.api) return;
    try {
      const response = await axios.get(`${config.api}/getUnits.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = normalizeListResponse(response.data);
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading units', error);
    }
  }, [config]);

  const loadActivities = useCallback(async () => {
    if (!config?.api || !currentUser?.id) return;
    setLoading(true);
    try {
      const response = await axios.post(
        `${config.api}/getCurrentActivities.php`,
        { studentId: currentUser.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = normalizeListResponse(response.data);
      const filtered = Array.isArray(data) ? data.filter((row) => row.status !== 'DISCONTINUED') : [];
      setActivities(filtered);
    } catch (error) {
      console.error('Error loading assignments', error);
      if (onError) onError('Error loading assignments');
    } finally {
      setLoading(false);
    }
  }, [config, currentUser, onError]);

  useEffect(() => {
    loadCourses();
    loadUnits();
  }, [loadCourses, loadUnits]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const courseMap = courses.reduce((acc, course) => {
    acc[course.id] = course.courseName;
    return acc;
  }, {});

  const unitMap = units.reduce((acc, unit) => {
    acc[unit.id] = unit.unitName;
    return acc;
  }, {});

  return (
    <div className="student-assignment-section">
      <div className="student-assignment-header">
        <div className="student-assignment-title">Your assessments</div>
        {loading && <div className="student-assignment-sub">Loading…</div>}
      </div>
      {activities.length === 0 && !loading && (
        <div className="student-assignment-empty">No assessments in progress.</div>
      )}
      <div className="student-assignment-grid">
        {activities.map((act) => (
          <button
            className="student-assignment-card student-assignment-card-button"
            key={act.id}
            type="button"
            onClick={() => setSelectedActivity(act)}
          >
            <div className="student-assignment-label">Unit</div>
            <div className="student-assignment-value">{unitMap[act.unitId] || `Unit ${act.unitId}`}</div>
            <div className="student-assignment-meta">Course: {courseMap[act.courseId] || act.courseId}</div>
            <div className="student-assignment-meta">Status: {act.status}</div>
            {act.dateSet && (
              <div className="student-assignment-meta">Set: {act.dateSet}</div>
            )}
          </button>
        ))}
      </div>

      {selectedActivity && (
        <StudentAnswer
          config={config}
          activity={selectedActivity}
          onClose={() => {
            setSelectedActivity(null);
            loadActivities();
          }}
          onSubmitted={() => {
            setSelectedActivity(null);
            loadActivities();
          }}
          onDraftSaved={loadActivities}
          onError={onError}
        />
      )}
    </div>
  );
};

export default StudentAssignments;
