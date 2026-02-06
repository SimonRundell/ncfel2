import { useEffect, useState } from 'react';
import axios from 'axios';
import { normalizeListResponse, getMessageFromResponse } from './adminApiHelpers';

const AssignUnit = ({ config, currentUser, onSuccess, onError }) => {
  const [classCodes, setClassCodes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [loading, setLoading] = useState(false);

  const loadClassCodes = async () => {
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
  };

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
      onError('Error loading courses');
    }
  };

  const loadUnits = async (courseId) => {
    if (!config?.api) return;
    if (!courseId) {
      setUnits([]);
      return;
    }
    try {
      const response = await axios.post(
        `${config.api}/getUnits.php`,
        { courseid: Number(courseId) },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = normalizeListResponse(response.data);
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading units', error);
      onError('Error loading units');
    }
  };

  useEffect(() => {
    loadClassCodes();
    loadCourses();
  }, [config]);

  useEffect(() => {
    setSelectedUnit('');
    loadUnits(selectedCourse);
  }, [selectedCourse]);

  const handleAssign = async () => {
    if (!selectedClass || !selectedCourse || !selectedUnit) {
      onError('Class, course, and unit are required');
      return;
    }
    if (!currentUser?.id) {
      onError('User not logged in');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${config.api}/assignUnitToClass.php`,
        {
          classCode: selectedClass,
          courseId: Number(selectedCourse),
          unitId: Number(selectedUnit),
          assessorId: currentUser.id,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const payload = response.data || {};
      console.log('Assign unit response:', payload);
      const baseMsg = getMessageFromResponse(payload, 'Unit assigned');
      const detail = typeof payload.inserted === 'number' ? ` (${payload.inserted} added, ${payload.skipped ?? 0} skipped)` : '';
      onSuccess(`${baseMsg}${detail}`);
    } catch (error) {
      console.error('Error assigning unit', error);
      onError('Error assigning unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Set assessments</div>
          <div className="admin-section-subtitle">Assign a unit to an entire class.</div>
        </div>
        <button type="button" onClick={() => { loadClassCodes(); loadCourses(); loadUnits(selectedCourse); }} disabled={loading}>
          Refresh lists
        </button>
      </div>

      <div className="admin-form">
        <div className="admin-grid">
          <label className="admin-label">
            Class
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select class</option>
              {classCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Course
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Unit
            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="button" onClick={handleAssign} disabled={loading}>
            Assign unit to class
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignUnit;
