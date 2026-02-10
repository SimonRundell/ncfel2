import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { normalizeListResponse } from './adminApiHelpers';
import { formatDateTime } from './dateUtils';

const READY_STATUSES = ['SUBMITTED', 'RESUBMITTED'];
const MARKING_STATUSES = ['INMARKING', 'INREMARKING'];
const OUTCOME_ACHIEVED = 'ACHIEVED';
const OUTCOME_NOT_ACHIEVED = 'NOT ACHIEVED';
const DEFAULT_ASSESSOR_COMMENT = '';

const AnswerPreview = ({ content }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    editable: false,
  });

  useEffect(() => {
    if (editor) {
      if (content) {
        editor.commands.setContent(content);
      } else {
        editor.commands.clearContent(true);
      }
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
};

/**
 * Marking dashboard for teachers/admins to review and grade submissions.
 * Loads courses/units/students/activities, filters submissions, renders answers, and saves outcomes/comments.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  currentUser: { status: number, classCode?: string } | null,
 *  onError?: (msg: string) => void,
 *  onSuccess?: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const MarkingDashboard = ({ config, currentUser, onError, onSuccess }) => {
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [outcomes, setOutcomes] = useState({});
  const [comments, setComments] = useState({});
  const [assessorComment, setAssessorComment] = useState(DEFAULT_ASSESSOR_COMMENT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileUploads, setFileUploads] = useState({});
  const [lightbox, setLightbox] = useState(null);

  const isTeacher = currentUser?.status === 2;
  const isAdmin = currentUser?.status === 3;

  useEffect(() => {
    const loadCourses = async () => {
      if (!config?.api) return;
      const response = await axios.get(`${config.api}/getCourses.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      setCourses(normalizeListResponse(response.data));
    };

    const loadUnits = async () => {
      if (!config?.api) return;
      const response = await axios.get(`${config.api}/getUnits.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      setUnits(normalizeListResponse(response.data));
    };

    const loadStudents = async () => {
      if (!config?.api) return;
      const payload = {};
      if (isTeacher && currentUser?.classCode) {
        payload.classCode = currentUser.classCode;
      } else {
        payload.status = 0; // students
      }
      const response = await axios.post(`${config.api}/getUsers.php`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      setStudents(normalizeListResponse(response.data));
    };

    const loadActivities = async () => {
      if (!config?.api) return;
      const response = await axios.get(`${config.api}/getCurrentActivities.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const allRows = normalizeListResponse(response.data);
      setActivities(Array.isArray(allRows) ? allRows : []);
    };

    loadCourses().catch((err) => console.error('loadCourses', err));
    loadUnits().catch((err) => console.error('loadUnits', err));
    loadStudents().catch((err) => console.error('loadStudents', err));
    loadActivities().catch((err) => console.error('loadActivities', err));
  }, [config, currentUser?.classCode, isTeacher]);

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

  const studentMap = useMemo(() => {
    return students.reduce((acc, s) => {
      acc[s.id] = s.userName || s.email || `Student ${s.id}`;
      return acc;
    }, {});
  }, [students]);

  const allowedStudentIds = useMemo(() => {
    if (isAdmin) return null;
    return students.map((s) => s.id);
  }, [isAdmin, students]);

  const buildFileUrl = useCallback(
    (questionId, fileId, activity) => {
      const target = activity || selectedSubmission;
      if (!config?.api || !target?.id || !target?.studentId || !fileId) return '';
      return `${config.api}/downloadAnswerFile.php?activityId=${target.id}&studentId=${target.studentId}&questionId=${questionId}&fileId=${encodeURIComponent(fileId)}`;
    },
    [config?.api, selectedSubmission]
  );

  const normalizeUploads = useCallback(
    (uploads, questionId, activity) => {
      if (!Array.isArray(uploads)) return [];
      return uploads.map((u) => ({ ...u, url: u?.url || buildFileUrl(questionId, u?.id, activity) }));
    },
    [buildFileUrl]
  );

  const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const relevantActivities = useMemo(() => {
    const allowedStatuses = [...READY_STATUSES, ...MARKING_STATUSES];
    return activities.filter((act) => {
      const statusMatch = allowedStatuses.includes(act.status);
      const studentMatch = !allowedStudentIds || allowedStudentIds.includes(act.studentId);
      return statusMatch && studentMatch;
    });
  }, [activities, allowedStudentIds]);

  const unitStats = useMemo(() => {
    const stats = {};
    relevantActivities.forEach((act) => {
      const bucket = stats[act.unitId] || { ready: 0, remark: 0 };
      if (act.status === 'SUBMITTED') bucket.ready += 1;
      if (act.status === 'RESUBMITTED') bucket.remark += 1;
      stats[act.unitId] = bucket;
    });
    return stats;
  }, [relevantActivities]);

  const submissionsForUnit = useMemo(() => {
    return relevantActivities.filter((act) => act.unitId === selectedUnitId);
  }, [relevantActivities, selectedUnitId]);

  useEffect(() => {
    setSelectedSubmission(null);
    setQuestions([]);
    setAnswers({});
    setOutcomes({});
    setComments({});
    setFileUploads({});
  }, [selectedUnitId]);

  const loadSubmissionDetail = async (activity) => {
    if (!activity || !config?.api) return;
    setLoading(true);
    setSelectedSubmission(activity);
    try {
      const [questionsRes, answersRes] = await Promise.all([
        axios.post(
          `${config.api}/getQuestions.php`,
          { unitId: activity.unitId, courseId: activity.courseId },
          { headers: { 'Content-Type': 'application/json' } }
        ),
        axios.post(
          `${config.api}/getAnswers.php`,
          { activityId: activity.id, studentId: activity.studentId },
          { headers: { 'Content-Type': 'application/json' } }
        ),
      ]);

      const qs = normalizeListResponse(questionsRes.data);
      const normalizedQs = Array.isArray(qs)
        ? qs.map((q) => ({
            ...q,
            uploadPermitted: Number(q?.uploadPermitted ?? q?.uploadpermitted ?? 0) === 1,
          }))
        : [];
      setQuestions(normalizedQs);

      const answersPayload = answersRes.data?.data || {};
      setAnswers(answersPayload.answers || {});
      setOutcomes(answersPayload.outcomes || {});
      setComments(answersPayload.comments || {});
      setAssessorComment(answersPayload.assessorComment || DEFAULT_ASSESSOR_COMMENT);
      const uploadsFromServer = answersPayload.fileUploads || {};
      setFileUploads(() => {
        const mapped = {};
        Object.keys(uploadsFromServer).forEach((qid) => {
          mapped[qid] = normalizeUploads(uploadsFromServer[qid], qid, activity);
        });
        return mapped;
      });

      if (READY_STATUSES.includes(activity.status)) {
        const nextStatus = activity.status === 'SUBMITTED' ? 'INMARKING' : 'INREMARKING';
        await axios.post(
          `${config.api}/updateCurrentActivity.php`,
          {
            id: activity.id,
            studentId: activity.studentId,
            courseId: activity.courseId,
            unitId: activity.unitId,
            status: nextStatus,
            dateSet: activity.dateSet || null,
            dateSubmitted: activity.dateSubmitted || new Date().toISOString().slice(0, 19).replace('T', ' '),
            dateMarked: null,
            dateResubmitted: activity.dateResubmitted || null,
            dateComplete: null,
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        setSelectedSubmission((prev) => (prev && prev.id === activity.id ? { ...prev, status: nextStatus } : prev));
        setActivities((prev) =>
          prev.map((row) => (row.id === activity.id ? { ...row, status: nextStatus } : row))
        );
      }
    } catch (err) {
      console.error('Error loading submission detail', err);
      if (onError) onError('Could not load submission detail');
    } finally {
      setLoading(false);
    }
  };

  const handleOutcomeToggle = (questionId, achieved) => {
    setOutcomes((prev) => ({ ...prev, [questionId]: achieved ? OUTCOME_ACHIEVED : OUTCOME_NOT_ACHIEVED }));
  };

  const handleCommentChange = (questionId, value) => {
    setComments((prev) => ({ ...prev, [questionId]: value.slice(0, 300) }));
  };

  const saveMarking = async () => {
    if (!selectedSubmission) return;
    const finalStatus = Object.values(outcomes).some((v) => v === OUTCOME_NOT_ACHIEVED) ? 'REDOING' : 'PASSED';
    const marksPayload = {};
    questions.forEach((q) => {
      marksPayload[q.id] = {
        outcome: outcomes[q.id] || OUTCOME_ACHIEVED,
        comment: comments[q.id] || '',
      };
    });

    setSaving(true);
    try {
      await axios.post(
        `${config.api}/markAnswers.php`,
        {
          activityId: selectedSubmission.id,
          studentId: selectedSubmission.studentId,
          marks: marksPayload,
          assessorComment,
          finalStatus,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      await axios.post(
        `${config.api}/updateCurrentActivity.php`,
        {
          id: selectedSubmission.id,
          studentId: selectedSubmission.studentId,
          courseId: selectedSubmission.courseId,
          unitId: selectedSubmission.unitId,
          status: finalStatus,
          dateSet: selectedSubmission.dateSet || null,
          dateSubmitted: selectedSubmission.dateSubmitted || null,
          dateMarked: new Date().toISOString().slice(0, 19).replace('T', ' '),
          dateResubmitted: selectedSubmission.dateResubmitted || null,
          dateComplete: finalStatus === 'PASSED' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (onSuccess) onSuccess('Marking saved');
      setSelectedSubmission(null);
      setQuestions([]);
      setAnswers({});
      setOutcomes({});
      setComments({});
      setFileUploads({});
      setAssessorComment(DEFAULT_ASSESSOR_COMMENT);

      const refreshed = await axios.get(`${config.api}/getCurrentActivities.php`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const allRows = normalizeListResponse(refreshed.data);
      setActivities(Array.isArray(allRows) ? allRows : []);
    } catch (err) {
      console.error('Error saving marking', err);
      if (onError) onError('Could not save marking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="marking-section">
      <div className="marking-header">
        <div className="marking-title">Marking</div>
        <div className="marking-subtitle">Units with submissions ready to mark or remark</div>
      </div>

      <div className="marking-unit-grid">
        {Object.entries(unitStats).length === 0 && <div className="marking-empty">No submissions waiting.</div>}
        {Object.entries(unitStats).map(([unitId, stats]) => {
          const unitActivities = relevantActivities.filter((act) => act.unitId === Number(unitId));
          const courseLabel = unitActivities.length
            ? courseMap[unitActivities[0].courseId] || `Course ${unitActivities[0].courseId}`
            : '—';

          return (
            <button
              key={unitId}
              type="button"
              className={`marking-unit-card${Number(unitId) === selectedUnitId ? ' active' : ''}`}
              onClick={() => setSelectedUnitId(Number(unitId))}
            >
              <div className="marking-unit-name"><strong>Unit {unitId} {unitMap[unitId] || `Unit ${unitId}`}</strong></div>
              <div className="marking-unit-meta">Course: {courseLabel}</div>
              <div className="marking-unit-stats">
                <span className="stat-chip">To mark: {stats.ready}</span>
                <span className="stat-chip">To remark: {stats.remark}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedUnitId && (  
        <>
          <div className="marking-subtitle">Submissions for <strong>Unit {selectedUnitId} {unitMap[selectedUnitId] || `Unit ${selectedUnitId}`}</strong></div>
          <div className="marking-submissions">
            {submissionsForUnit.length === 0 && <div className="marking-empty">No submissions for this unit.</div>}
          {submissionsForUnit.map((act) => (
            <button
              key={act.id}
              type="button"
              className={`marking-submission-card${selectedSubmission?.id === act.id ? ' active' : ''}`}
              onClick={() => loadSubmissionDetail(act)}
              disabled={loading}
            >
              <div className="marking-submission-title">{studentMap[act.studentId] || `Student ${act.studentId}`}</div>
              <div className="marking-submission-meta">Status: {act.status}</div>
              {act.dateSubmitted && (
                <div className="marking-submission-meta">Submitted: {formatDateTime(act.dateSubmitted)}</div>
              )}
              {act.dateResubmitted && (
                <div className="marking-submission-meta">Resubmitted: {formatDateTime(act.dateResubmitted)}</div>
              )}
            </button>
          ))}
        </div>
        </>
      )}

      {selectedSubmission && (
        <div className="marking-workspace">
          <div className="marking-workspace-header">
            <div>
              <div className="marking-workspace-title">{studentMap[selectedSubmission.studentId] || 'Student'}</div>
              <div className="marking-workspace-meta">{unitMap[selectedSubmission.unitCode] || `Unit ${selectedSubmission.unitCode}`} · {courseMap[selectedSubmission.courseId] || `Course ${selectedSubmission.courseId}`}</div>
              <div className="marking-workspace-meta">Current status: {selectedSubmission.status}</div>
            </div>
            <div className="marking-workspace-actions">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmission(null);
                  setFileUploads({});
                }}
                disabled={saving || loading}
              >
                Close
              </button>
              <button type="button" onClick={saveMarking} disabled={saving || loading || questions.length === 0}>
                Finish marking &amp; return
              </button>
            </div>
          </div>

          {loading && <div className="marking-empty">Loading submission…</div>}

          {!loading && questions.map((q) => (
            <div className="marking-question" key={q.id}>
              <div className="marking-question-header">
                <div className="marking-question-ref">{q.QuestionRef || `Q${q.id}`}</div>
                <div className="marking-question-text" dangerouslySetInnerHTML={{ __html: q.Question }} />
              </div>
              <div className="marking-answer-box">
                <AnswerPreview content={answers[q.id]} />
              </div>
              {q.uploadPermitted ? (
                <div className="upload-section readonly">
                  <div className="upload-header">Attachments</div>
                  <div className="upload-list">
                    {(!fileUploads[q.id] || fileUploads[q.id].length === 0) && (
                      <div className="answer-meta">No files uploaded.</div>
                    )}
                    {fileUploads[q.id]?.map((file) => {
                      const label = file?.originalName || file?.id || 'File';
                      const url = file?.url || buildFileUrl(q.id, file?.id, selectedSubmission);
                      const nameLower = label.toLowerCase();
                      const isImg = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.gif');
                      return (
                        <div className="upload-chip" key={`${q.id}-${file?.id || label}`}>
                          {isImg ? (
                            <button
                              type="button"
                              className="upload-thumb"
                              onClick={() => (url ? openLightbox(url, label) : null)}
                              disabled={!url}
                              aria-label={`Preview ${label}`}
                            >
                              {url ? <img src={url} alt={label} /> : <span>No preview</span>}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="upload-doc"
                              onClick={() => url && window.open(url, '_blank')}
                              disabled={!url}
                            >
                              {label}
                            </button>
                          )}
                          {url && (
                            <a className="upload-download" href={url} target="_blank" rel="noreferrer">
                              Download
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="marking-controls">
                <label className="marking-toggle">
                  <input
                    type="checkbox"
                    checked={(outcomes[q.id] || OUTCOME_ACHIEVED) === OUTCOME_ACHIEVED}
                    onChange={(e) => handleOutcomeToggle(q.id, e.target.checked)}
                  />
                  <span>Achieved</span>
                </label>
                <textarea
                  className="marking-comment"
                  placeholder="Assessor comment (optional)"
                  value={comments[q.id] || ''}
                  onChange={(e) => handleCommentChange(q.id, e.target.value)}
                  rows={2}
                  maxLength={300}
                />
              </div>
            </div>
          ))}

          {!loading && (
            <div className="marking-question">
              <div className="marking-question-header">
                <div className="marking-question-ref">Assessor feedback</div>
                <div className="marking-question-text">Overall feedback for this assessment</div>
              </div>
              <div className="marking-controls">
                <textarea
                  className="marking-comment"
                  placeholder="Assessor comment (optional)"
                  value={assessorComment}
                  onChange={(e) => setAssessorComment(e.target.value.slice(0, 500))}
                  rows={3}
                  maxLength={500}
                />
                <div className="marking-comment-help">Shared for both marking and remarking.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div className="lightbox-backdrop" onClick={closeLightbox}>
          <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lightbox-close" onClick={closeLightbox}>
              Close
            </button>
            <div className="lightbox-image-wrap">
              <img src={lightbox.src} alt={lightbox.alt || 'Attachment'} />
            </div>
            {lightbox.alt && <div className="lightbox-caption">{lightbox.alt}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkingDashboard;
