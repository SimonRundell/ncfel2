import { useEffect, useState } from 'react';
import axios from 'axios';
import { normalizeListResponse, getMessageFromResponse } from './adminApiHelpers';

const statusOptions = [
  'NOTSET',
  'INPROGRESS',
  'SUBMITTED',
  'INMARKING',
  'REDOING',
  'RESUBMITTED',
  'INREMARKING',
  'PASSED',
  'NOTPASSED',
  'DISCONTINUED',
];

const emptyForm = {
  id: null,
  studentId: '',
  courseId: '',
  unitId: '',
  status: 'NOTSET',
  dateSet: '',
  dateSubmitted: '',
  dateMarked: '',
  dateResubmitted: '',
  dateComplete: '',
};

/**
 * Admin interface for managing current activities (assessments) including filters and CRUD.
 * Supports creation/update with status and date fields and filtering by student/course/status.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  onSuccess: (msg: string) => void,
 *  onError: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const CurrentActivityManager = ({ config, onSuccess, onError }) => {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ studentId: '', courseId: '', status: '' });

  const loadActivities = async () => {
    if (!config?.api) return;
    setLoading(true);
    try {
      const hasFilters = Object.values(filters).some((val) => val !== '');
      const payload = {};
      if (filters.studentId) payload.studentId = Number(filters.studentId);
      if (filters.courseId) payload.courseId = Number(filters.courseId);
      if (filters.status) payload.status = filters.status;

      const response = hasFilters
        ? await axios.post(`${config.api}/getCurrentActivities.php`, payload, {
            headers: { 'Content-Type': 'application/json' },
          })
        : await axios.get(`${config.api}/getCurrentActivities.php`, {
            headers: { 'Content-Type': 'application/json' },
          });

      const data = normalizeListResponse(response.data);
      setActivities(Array.isArray(data) ? data : []);
      onSuccess('Current activities loaded');
    } catch (error) {
      console.error('Error loading current activities', error);
      onError('Error loading current activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [config]);

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.courseId || !form.unitId) {
      onError('Student, course and unit are required');
      return;
    }

    const payload = {
      studentId: Number(form.studentId),
      courseId: Number(form.courseId),
      unitId: Number(form.unitId),
      status: form.status,
      dateSet: form.dateSet || null,
      dateSubmitted: form.dateSubmitted || null,
      dateMarked: form.dateMarked || null,
      dateResubmitted: form.dateResubmitted || null,
      dateComplete: form.dateComplete || null,
    };

    setLoading(true);
    try {
      if (form.id) {
        await axios.post(
          `${config.api}/updateCurrentActivity.php`,
          { ...payload, id: form.id },
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess('Current activity updated');
      } else {
        const response = await axios.post(
          `${config.api}/createCurrentActivity.php`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess(getMessageFromResponse(response.data, 'Current activity created'));
      }
      resetForm();
      loadActivities();
    } catch (error) {
      console.error('Error saving current activity', error);
      onError('Error saving current activity');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (activity) => {
    setForm({
      id: activity.id,
      studentId: activity.studentId,
      courseId: activity.courseId,
      unitId: activity.unitId,
      status: activity.status,
      dateSet: activity.dateSet || '',
      dateSubmitted: activity.dateSubmitted || '',
      dateMarked: activity.dateMarked || '',
      dateResubmitted: activity.dateResubmitted || '',
      dateComplete: activity.dateComplete || '',
    });
  };

  const handleDelete = async (activity) => {
    if (!window.confirm(`Delete activity #${activity.id}?`)) return;
    setLoading(true);
    try {
      await axios.post(
        `${config.api}/deleteCurrentActivity.php`,
        { id: activity.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
      onSuccess('Current activity deleted');
      if (form.id === activity.id) resetForm();
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity', error);
      onError('Error deleting activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Current Activity</div>
          <div className="admin-section-subtitle">Track progress per student/unit.</div>
        </div>
        <div className="admin-inline">
          <input
            type="number"
            value={filters.studentId}
            onChange={(e) => setFilters((prev) => ({ ...prev, studentId: e.target.value }))}
            placeholder="Filter studentId"
          />
          <input
            type="number"
            value={filters.courseId}
            onChange={(e) => setFilters((prev) => ({ ...prev, courseId: e.target.value }))}
            placeholder="Filter courseId"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Any status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" onClick={loadActivities} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-grid">
          <label className="admin-label">
            Student ID
            <input
              type="number"
              value={form.studentId}
              onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
              required
            />
          </label>
          <label className="admin-label">
            Course ID
            <input
              type="number"
              value={form.courseId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
              required
            />
          </label>
          <label className="admin-label">
            Unit ID
            <input
              type="number"
              value={form.unitId}
              onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value }))}
              required
            />
          </label>
          <label className="admin-label">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-grid">
          <label className="admin-label">
            Date set (YYYY-MM-DD HH:MM:SS)
            <input
              type="text"
              value={form.dateSet}
              onChange={(e) => setForm((prev) => ({ ...prev, dateSet: e.target.value }))}
              placeholder="2024-01-01 12:00:00"
            />
          </label>
          <label className="admin-label">
            Date submitted
            <input
              type="text"
              value={form.dateSubmitted}
              onChange={(e) => setForm((prev) => ({ ...prev, dateSubmitted: e.target.value }))}
            />
          </label>
          <label className="admin-label">
            Date marked
            <input
              type="text"
              value={form.dateMarked}
              onChange={(e) => setForm((prev) => ({ ...prev, dateMarked: e.target.value }))}
            />
          </label>
          <label className="admin-label">
            Date resubmitted
            <input
              type="text"
              value={form.dateResubmitted}
              onChange={(e) => setForm((prev) => ({ ...prev, dateResubmitted: e.target.value }))}
            />
          </label>
          <label className="admin-label">
            Date complete
            <input
              type="text"
              value={form.dateComplete}
              onChange={(e) => setForm((prev) => ({ ...prev, dateComplete: e.target.value }))}
            />
          </label>
        </div>

        <div className="admin-form-actions">
          {form.id && (
            <button type="button" onClick={resetForm} disabled={loading}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading}>
            {form.id ? 'Update activity' : 'Add activity'}
          </button>
        </div>
      </form>

      <div className="admin-list">
        {activities.map((activity) => (
          <div className="admin-row" key={activity.id}>
            <div>
              <div className="admin-row-title">
                #{activity.id} · Student {activity.studentId} · Unit {activity.unitId}
              </div>
              <div className="admin-row-subtitle">
                Status {activity.status} · Course {activity.courseId}
              </div>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => handleEdit(activity)} disabled={loading}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(activity)} disabled={loading}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {activities.length === 0 && <div className="admin-empty">No current activity rows.</div>}
      </div>
    </div>
  );
};

export default CurrentActivityManager;
