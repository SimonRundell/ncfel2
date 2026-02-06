import { useEffect, useState } from 'react';
import axios from 'axios';
import { normalizeListResponse, getMessageFromResponse } from './adminApiHelpers';

/**
 * Admin CRUD interface for units with optional course filtering.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  onSuccess: (msg: string) => void,
 *  onError: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const UnitManager = ({ config, onSuccess, onError }) => {
  const [units, setUnits] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState('');
  const [form, setForm] = useState({ id: null, courseid: '', unitName: '', unitCode: '' });

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

  const loadUnits = async () => {
    if (!config?.api) {
      setUnits([]);
      return;
    }
    setLoading(true);
    try {
      const hasFilter = filterCourseId !== '';
      const response = hasFilter
        ? await axios.post(
            `${config.api}/getUnits.php`,
            { courseid: Number(filterCourseId) },
            { headers: { 'Content-Type': 'application/json' } }
          )
        : await axios.get(`${config.api}/getUnits.php`, {
            headers: { 'Content-Type': 'application/json' },
          });

      const data = normalizeListResponse(response.data);
      setUnits(Array.isArray(data) ? data : []);
      onSuccess('Units loaded');
    } catch (error) {
      console.error('Error loading units', error);
      onError('Error loading units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [config]);

  useEffect(() => {
    loadUnits();
  }, [config, filterCourseId]);

  const resetForm = () => setForm({ id: null, courseid: '', unitName: '', unitCode: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseid || !form.unitName.trim() || !form.unitCode.trim()) {
      onError('Course, unit name and unit code required');
      return;
    }

    setLoading(true);
    try {
      const payload = { courseid: Number(form.courseid), unitName: form.unitName.trim(), unitCode: form.unitCode.trim() };
      if (form.id) {
        await axios.post(
          `${config.api}/updateUnit.php`,
          { ...payload, id: form.id },
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess('Unit updated');
      } else {
        const response = await axios.post(
          `${config.api}/createUnit.php`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess(getMessageFromResponse(response.data, 'Unit created'));
      }
      resetForm();
      loadUnits();
    } catch (error) {
      console.error('Error saving unit', error);
      onError('Error saving unit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unit) => {
    setForm({ id: unit.id, courseid: unit.courseid, unitName: unit.unitName || '', unitCode: unit.unitCode || '' });
  };

  const handleDelete = async (unit) => {
    if (!window.confirm(`Delete unit "${unit.unitName}"?`)) return;
    setLoading(true);
    try {
      await axios.post(
        `${config.api}/deleteUnit.php`,
        { id: unit.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
      onSuccess('Unit deleted');
      if (form.id === unit.id) resetForm();
      loadUnits();
    } catch (error) {
      console.error('Error deleting unit', error);
      onError('Error deleting unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Units</div>
          <div className="admin-section-subtitle">Attach units to courses.</div>
        </div>
        <div className="admin-inline">
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="admin-select"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.courseName}
              </option>
            ))}
          </select>
          <button type="button" onClick={loadUnits} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="admin-label">
          Course
          <select
            value={form.courseid}
            onChange={(e) => setForm((prev) => ({ ...prev, courseid: e.target.value }))}
            required
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.courseName}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-label">
          Unit name
          <input
            type="text"
            value={form.unitName}
            onChange={(e) => setForm((prev) => ({ ...prev, unitName: e.target.value }))}
            placeholder="e.g. Networking"
          />
        </label>
        <label className="admin-label">
          Unit code
          <input
            type="text"
            value={form.unitCode}
            onChange={(e) => setForm((prev) => ({ ...prev, unitCode: e.target.value }))}
            placeholder="e.g. NET-201"
          />
        </label>
        <div className="admin-form-actions">
          {form.id && (
            <button type="button" onClick={resetForm} disabled={loading}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading}>
            {form.id ? 'Update unit' : 'Add unit'}
          </button>
        </div>
      </form>

      <div className="admin-list">
        {units.map((unit) => (
          <div className="admin-row" key={unit.id}>
            <div>
              <div className="admin-row-title">{unit.unitName}</div>
              <div className="admin-row-subtitle">
                ID: {unit.id} · Code: {unit.unitCode || '—'} · Course ID: {unit.courseid}
              </div>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => handleEdit(unit)} disabled={loading}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(unit)} disabled={loading}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {units.length === 0 && <div className="admin-empty">No units yet.</div>}
      </div>
    </div>
  );
};

export default UnitManager;
