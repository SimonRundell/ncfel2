import { useEffect, useState } from 'react';
import axios from 'axios';
import { normalizeListResponse, getMessageFromResponse } from './adminApiHelpers';

/**
 * Admin CRUD interface for courses (create, update, delete, list).
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  onSuccess: (msg: string) => void,
 *  onError: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const CourseManager = ({ config, onSuccess, onError }) => {
  const [courses, setCourses] = useState([]);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCourses = async () => {
    if (!config?.api) {
      setCourses([]);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${config.api}/getCourses.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = normalizeListResponse(response.data);
      setCourses(Array.isArray(data) ? data : []);
      onSuccess('Courses loaded');
    } catch (error) {
      console.error('Error loading courses', error);
      onError('Error loading courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [config]);

  const resetForm = () => {
    setCourseName('');
    setCourseCode('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCode.trim()) {
      onError('Course name and code required');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await axios.post(
          `${config.api}/updateCourse.php`,
          { id: editingId, courseName: courseName.trim(), courseCode: courseCode.trim() },
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess('Course updated');
      } else {
        const response = await axios.post(
          `${config.api}/createCourse.php`,
          { courseName: courseName.trim(), courseCode: courseCode.trim() },
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess(getMessageFromResponse(response.data, 'Course created'));
      }
      resetForm();
      loadCourses();
    } catch (error) {
      console.error('Error saving course', error);
      onError('Error saving course');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    setEditingId(course.id);
    setCourseName(course.courseName || '');
    setCourseCode(course.courseCode || '');
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete course "${course.courseName}"?`)) return;
    setLoading(true);
    try {
      await axios.post(
        `${config.api}/deleteCourse.php`,
        { id: course.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
      onSuccess('Course deleted');
      if (editingId === course.id) {
        resetForm();
      }
      loadCourses();
    } catch (error) {
      console.error('Error deleting course', error);
      onError('Error deleting course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Courses</div>
          <div className="admin-section-subtitle">Create, rename or remove courses.</div>
        </div>
        <button type="button" onClick={loadCourses} disabled={loading}>
          Refresh
        </button>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="admin-label">
          Course name
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. Cyber Security"
          />
        </label>
        <label className="admin-label">
          Course code
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="e.g. CS101"
          />
        </label>
        <div className="admin-form-actions">
          {editingId && (
            <button type="button" onClick={resetForm} disabled={loading}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading}>
            {editingId ? 'Update course' : 'Add course'}
          </button>
        </div>
      </form>

      <div className="admin-list">
        {courses.map((course) => (
          <div className="admin-row" key={course.id}>
            <div>
              <div className="admin-row-title">{course.courseName}</div>
                <div className="admin-row-subtitle">ID: {course.id} · Code: {course.courseCode || '—'}</div>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => handleEdit(course)} disabled={loading}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(course)} disabled={loading}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {courses.length === 0 && <div className="admin-empty">No courses yet.</div>}
      </div>
    </div>
  );
};

export default CourseManager;
