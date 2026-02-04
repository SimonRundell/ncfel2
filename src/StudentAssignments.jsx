import { useEffect, useState } from 'react';
import axios from 'axios';
import { normalizeListResponse } from './adminApiHelpers';
import StudentAnswer from './StudentAnswer.jsx';

const StudentAssignments = ({ config, currentUser, onError }) => {
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const loadCourses = async () => {
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
  };

  const loadUnits = async () => {
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
  };

  const loadActivities = async () => {
    if (!config?.api || !currentUser?.id) return;
    setLoading(true);
    try {
      const response = await axios.post(
        `${config.api}/getCurrentActivities.php`,
        { studentId: currentUser.id, status: 'INPROGRESS' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = normalizeListResponse(response.data);
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading assignments', error);
      if (onError) onError('Error loading assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    loadUnits();
  }, [config]);

  useEffect(() => {
    loadActivities();
  }, [currentUser]);

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
          onClose={() => setSelectedActivity(null)}
          onSubmitted={() => {
            setSelectedActivity(null);
            loadActivities();
          }}
          onError={onError}
        />
      )}
    </div>
  );
};

export default StudentAssignments;
