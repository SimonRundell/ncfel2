import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { normalizeListResponse, getMessageFromResponse } from './adminApiHelpers';

const emptyForm = {
  id: null,
  courseid: '',
  unitid: '',
  QuestionRef: '',
  Question: '',
  uploadPermitted: false,
};

/**
 * Admin CRUD interface for questions by course/unit.
 * Supports the uploadPermitted flag which enables student attachments per question.
 *
 * Endpoints:
 * - GET /api/getCourses.php
 * - POST /api/getUnits.php
 * - POST /api/getQuestions.php
 * - POST /api/createQuestion.php
 * - POST /api/updateQuestion.php
 * - POST /api/deleteQuestion.php
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  onSuccess: (msg: string) => void,
 *  onError: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const QuestionsManager = ({ config, onSuccess, onError }) => {
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState('');
  const [filterUnitId, setFilterUnitId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

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
      onError('Error loading courses');
    }
  }, [config, onError]);

  const loadUnits = useCallback(
    async (courseId) => {
      if (!config?.api || !courseId) {
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
    },
    [config, onError]
  );

  const loadQuestions = useCallback(async () => {
    if (!config?.api) {
      setQuestions([]);
      return;
    }
    if (!filterUnitId) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${config.api}/getQuestions.php`,
        {
          unitId: Number(filterUnitId),
          courseId: filterCourseId ? Number(filterCourseId) : undefined,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = normalizeListResponse(response.data);
      setQuestions(Array.isArray(data) ? data : []);
      // onSuccess('Questions loaded');
    } catch (error) {
      console.error('Error loading questions', error);
      onError('Error loading questions');
    } finally {
      setLoading(false);
    }
  }, [config, filterCourseId, filterUnitId, onError]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (!filterCourseId) {
      setUnits([]);
      setFilterUnitId('');
      setQuestions([]);
      return;
    }
    loadUnits(filterCourseId);
  }, [filterCourseId, loadUnits]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resetForm = () => setForm(emptyForm);

  const closeEditor = () => {
    resetForm();
    setShowEditor(false);
  };

  const handleAdd = () => {
    if (!filterCourseId || !filterUnitId) {
      onError('Select a course and unit before adding a question');
      return;
    }
    setForm({
      ...emptyForm,
      courseid: filterCourseId,
      unitid: filterUnitId,
    });
    setShowEditor(true);
  };

  const handleEdit = (question) => {
    const courseid = String(question.courseid ?? '');
    const unitid = String(question.unitid ?? '');
    setFilterCourseId(courseid);
    setFilterUnitId(unitid);
    setForm({
      id: question.id,
      courseid,
      unitid,
      QuestionRef: question.QuestionRef || '',
      Question: question.Question || '',
      uploadPermitted: Number(question.uploadPermitted) === 1,
    });
    setShowEditor(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.courseid || !form.unitid || !form.Question.trim()) {
      onError('Course, unit, and question text are required');
      return;
    }

    const payload = {
      courseid: Number(form.courseid),
      unitid: Number(form.unitid),
      QuestionRef: form.QuestionRef.trim() || null,
      Question: form.Question.trim(),
      uploadPermitted: form.uploadPermitted ? 1 : 0,
    };

    setLoading(true);
    try {
      if (form.id) {
        await axios.post(
          `${config.api}/updateQuestion.php`,
          { ...payload, id: Number(form.id) },
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess('Question updated');
      } else {
        const response = await axios.post(
          `${config.api}/createQuestion.php`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        onSuccess(getMessageFromResponse(response.data, 'Question created'));
      }
      closeEditor();
      loadQuestions();
    } catch (error) {
      console.error('Error saving question', error);
      onError('Error saving question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (question) => {
    setQuestionToDelete(question);
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    setLoading(true);
    try {
      await axios.post(
        `${config.api}/deleteQuestion.php`,
        { id: questionToDelete.id },
        { headers: { 'Content-Type': 'application/json' } }
      );
      onSuccess('Question deleted');
      if (form.id === questionToDelete.id) closeEditor();
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question', error);
      onError('Error deleting question');
    } finally {
      setLoading(false);
      setQuestionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setQuestionToDelete(null);
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <div className="admin-section-title">Questions</div>
          <div className="admin-section-subtitle">Create, edit, or remove assessment questions.</div>
        </div>
        <div className="admin-inline">
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="admin-select"
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.courseName}
              </option>
            ))}
          </select>
          <select
            value={filterUnitId}
            onChange={(e) => setFilterUnitId(e.target.value)}
            className="admin-select"
            disabled={!filterCourseId}
          >
            <option value="">Select unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unitName}
              </option>
            ))}
          </select>
          <button type="button" onClick={loadQuestions} disabled={loading || !filterUnitId}>
            Refresh
          </button>
          <button type="button" onClick={handleAdd} disabled={loading}>
            Add question
          </button>
        </div>
      </div>

      <div className={showEditor ? 'admin-editor is-open' : 'admin-editor'} aria-hidden={!showEditor}>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-label">
            Course
            <select
              value={form.courseid}
              onChange={(e) => {
                const courseId = e.target.value;
                setForm((prev) => ({ ...prev, courseid: courseId, unitid: '' }));
                setFilterCourseId(courseId);
                setFilterUnitId('');
              }}
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
            Unit
            <select
              value={form.unitid}
              onChange={(e) => setForm((prev) => ({ ...prev, unitid: e.target.value }))}
              required
            >
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitName}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Question reference
            <input
              type="text"
              value={form.QuestionRef}
              onChange={(e) => setForm((prev) => ({ ...prev, QuestionRef: e.target.value }))}
              placeholder="e.g. Q1a"
            />
          </label>
          <label className="admin-label">
            Question text
            <textarea
              rows="4"
              value={form.Question}
              onChange={(e) => setForm((prev) => ({ ...prev, Question: e.target.value }))}
              placeholder="Enter the question prompt"
            />
          </label>
          <div className="admin-form-actions">
            <label className="admin-switch">
              <input
                type="checkbox"
                checked={form.uploadPermitted}
                onChange={(e) => setForm((prev) => ({ ...prev, uploadPermitted: e.target.checked }))}
              />
              <span className="admin-switch-track" aria-hidden="true">
                <span className="admin-switch-thumb" />
              </span>
              <span className="admin-switch-label">Allow uploads</span>
            </label>
            <button type="button" onClick={closeEditor} disabled={loading}>
              Close
            </button>
            <button type="submit" disabled={loading}>
              {form.id ? 'Update question' : 'Add question'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-list">
        {!filterUnitId && <div className="admin-empty">Select a course and unit to view questions.</div>}
        {filterUnitId && questions.length === 0 && <div className="admin-empty">No questions yet.</div>}
        {questions.map((question) => (
          <div className="admin-row" key={question.id}>
            <div>
              <div className="admin-row-title">{question.QuestionRef || 'Untitled question'}</div>
              <div className="admin-row-subtitle">
                ID: {question.id} · Unit ID: {question.unitid} · Uploads: {Number(question.uploadPermitted) === 1 ? 'Yes' : 'No'}
              </div>
              <div className="admin-row-subtitle">{question.Question}</div>
            </div>
            <div className="admin-row-actions">
              <button type="button" onClick={() => handleEdit(question)} disabled={loading}>
                Edit
              </button>
              <button type="button" onClick={() => handleDeleteRequest(question)} disabled={loading}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {questionToDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Delete question</div>
                <div className="modal-subtitle">This action cannot be undone.</div>
              </div>
              <button type="button" onClick={handleDeleteCancel} disabled={loading}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete {questionToDelete.QuestionRef || 'this question'}?</p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={handleDeleteCancel} disabled={loading}>
                Cancel
              </button>
              <button type="button" onClick={handleDeleteConfirm} disabled={loading}>
                Delete question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsManager;
