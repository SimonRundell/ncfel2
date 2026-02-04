import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import axios from 'axios';
import { normalizeListResponse } from './adminApiHelpers';

const BLOCKED_MESSAGE_TIMEOUT = 1200;

const StudentAnswer = ({ config, activity, onClose, onSubmitted, onError }) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [courseName, setCourseName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [refsMap, setRefsMap] = useState({}); // questionId -> array of refs
  const [blockMessage, setBlockMessage] = useState('');
  const [statusText, setStatusText] = useState(activity?.status || 'INPROGRESS');
  const [answers, setAnswers] = useState({}); // questionId -> {json}
  const storageKey = useMemo(() => `answer-${activity?.id || 'unknown'}`, [activity?.id]);
  const refsKey = useMemo(() => `answer-refs-${activity?.id || 'unknown'}`, [activity?.id]);
  const blockTimer = useRef(null);
  const editorsRef = useRef({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (blockTimer.current) {
        clearTimeout(blockTimer.current);
      }
    };
  }, []);

  const questionStorageKey = (qid) => `${storageKey}-q-${qid}`;

  useEffect(() => {
    const rawRefs = localStorage.getItem(refsKey);
    if (rawRefs) {
      try {
        const parsed = JSON.parse(rawRefs);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setRefsMap(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    setRefsMap({});
  }, [refsKey]);

  useEffect(() => {
    if (!questions.length) return;
    const initialAnswers = {};
    const nextRefs = {};
    questions.forEach((q) => {
      const raw = localStorage.getItem(questionStorageKey(q.id));
      if (raw) {
        try {
          initialAnswers[q.id] = JSON.parse(raw);
        } catch (e) {
          // ignore
        }
      }
      if (!initialAnswers[q.id]) {
        initialAnswers[q.id] = null; // empty to allow placeholder
      }

      const savedRefs = refsMap[q.id];
      nextRefs[q.id] = Array.isArray(savedRefs) && savedRefs.length ? savedRefs.slice(0, 5) : [''];
    });
    setAnswers(initialAnswers);
    setRefsMap((prev) => ({ ...nextRefs, ...prev }));
  }, [questions]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!config?.api || !activity?.unitId) return;
      setQuestionsLoading(true);
      setQuestionsError('');
      try {
        const response = await axios.post(
          `${config.api}/getQuestions.php`,
          {
            unitId: activity.unitId,
            courseId: activity.courseId,
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const data = normalizeListResponse(response.data);
        setQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading questions', err);
        setQuestionsError('Could not load questions');
        if (onError) onError('Could not load questions');
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [activity?.unitId, activity?.courseId, config?.api]);

  useEffect(() => {
    const fetchCourseName = async () => {
      if (!config?.api || !activity?.courseId) return;
      try {
        const response = await axios.post(
          `${config.api}/getCourses.php`,
          { id: activity.courseId },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const data = normalizeListResponse(response.data);
        if (Array.isArray(data) && data.length) {
          setCourseName(data[0].courseName || '');
        }
      } catch (err) {
        // keep silent fallback
      }
    };

    fetchCourseName();
  }, [activity?.courseId, config?.api]);

  useEffect(() => {
    const fetchUnitName = async () => {
      if (!config?.api || !activity?.unitId) return;
      try {
        const response = await axios.post(
          `${config.api}/getUnits.php`,
          { id: activity.unitId },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const data = normalizeListResponse(response.data);
        if (Array.isArray(data) && data.length) {
          setUnitName(data[0].unitName || '');
        }
      } catch (err) {
        // silent fallback to id
      }
    };

    fetchUnitName();
  }, [activity?.unitId, config?.api]);

  useEffect(() => {
    const fetchSavedAnswers = async () => {
      if (!config?.api || !activity?.id || !activity?.studentId) return;
      try {
        const response = await axios.post(
          `${config.api}/getAnswers.php`,
          { activityId: activity.id, studentId: activity.studentId },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const payload = response.data?.data || response.data || {};
        const serverAnswers = payload.answers || {};
        const serverRefs = payload.references || {};
        const serverStatus = payload.status || 'IN PROGRESS';

        if (!Object.keys(serverAnswers).length) return;

        setStatusText(
          serverStatus === 'SUBMITTED'
            ? 'SUBMITTED · Read-only'
            : `${displayStatus(serverStatus)} · Loaded from server`
        );

        setAnswers(serverAnswers);
        setRefsMap((prev) => {
          const next = { ...prev };
          Object.keys(serverRefs).forEach((qid) => {
            const list = Array.isArray(serverRefs[qid]) ? serverRefs[qid] : [];
            next[qid] = list.length ? list.slice(0, 5) : [''];
          });
          return next;
        });

        localStorage.setItem(storageKey, JSON.stringify(serverAnswers));
        localStorage.setItem(refsKey, JSON.stringify(serverRefs));
      } catch (err) {
        console.error('Error loading saved answers', err);
      }
    };

    fetchSavedAnswers();
  }, [activity?.id, activity?.studentId, config?.api, storageKey, refsKey]);

  const displayStatus = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return 'SUBMITTED · Read-only';
      case 'INPROGRESS':
        return 'IN PROGRESS';
      default:
        return status;
    }
  };

  const showBlocked = (msg) => {
    setBlockMessage(msg);
    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => setBlockMessage(''), BLOCKED_MESSAGE_TIMEOUT);
  };

  const handleRefChange = (qid, idx, value) => {
    setRefsMap((prev) => {
      const current = Array.isArray(prev[qid]) ? prev[qid].slice() : [''];
      current[idx] = value;
      const next = { ...prev, [qid]: current };
      localStorage.setItem(refsKey, JSON.stringify(next));
      return next;
    });
  };

  const addReferenceField = (qid) => {
    setRefsMap((prev) => {
      const current = Array.isArray(prev[qid]) ? prev[qid].slice() : [''];
      if (current.length >= 5) return prev;
      const nextList = [...current, ''];
      const next = { ...prev, [qid]: nextList };
      localStorage.setItem(refsKey, JSON.stringify(next));
      return next;
    });
  };

  const removeReferenceField = (qid, idx) => {
    setRefsMap((prev) => {
      const current = Array.isArray(prev[qid]) ? prev[qid].slice() : [];
      const nextList = current.filter((_, i) => i !== idx);
      const normalized = nextList.length ? nextList : [''];
      const next = { ...prev, [qid]: normalized };
      localStorage.setItem(refsKey, JSON.stringify(next));
      return next;
    });
  };

  const validateRefs = (qid) => {
    const list = Array.isArray(refsMap[qid]) ? refsMap[qid] : [];
    const lines = list.map((l) => (l || '').trim()).filter(Boolean);
    if (lines.length === 0) return '';
    const bad = lines.filter((line) => !/^https?:\/\/.+/i.test(line));
    return bad.length ? `Invalid URLs: ${bad.join(', ')}` : 'URLs look valid';
  };

  const handleSubmit = async () => {
    if (!config?.api || !activity?.id) return;
    setLoading(true);
    try {
      // Persist draft locally (placeholder until backend storage is added)
      const perQuestionRefs = {};
      Object.keys(refsMap).forEach((qid) => {
        const cleaned = (refsMap[qid] || []).map((r) => (r || '').trim()).filter(Boolean);
        perQuestionRefs[qid] = cleaned;
      });
      localStorage.setItem(refsKey, JSON.stringify(perQuestionRefs));

      const answersPayload = {};
      questions.forEach((q) => {
        const ed = editorsRef.current[q.id];
        if (ed) {
          answersPayload[q.id] = ed.getJSON();
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(answersPayload));

      await axios.post(
        `${config.api}/saveAnswers.php`,
        {
          activityId: activity.id,
          studentId: activity.studentId,
          answers: answersPayload,
          references: perQuestionRefs,
          status: 'SUBMITTED',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setAnswers(answersPayload);

      // Update activity status
      await axios.post(
        `${config.api}/updateCurrentActivity.php`,
        {
          id: activity.id,
          status: 'SUBMITTED',
          dateSubmitted: new Date().toISOString().slice(0, 19).replace('T', ' '),
          references: perQuestionRefs,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setStatusText('SUBMITTED · Read-only');
      if (onSubmitted) onSubmitted();
    } catch (error) {
      console.error('Error submitting answer', error);
      if (onError) onError('Error submitting answer');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!config?.api || !activity?.id) return;
    setLoading(true);
    try {
      const perQuestionRefs = {};
      Object.keys(refsMap).forEach((qid) => {
        const cleaned = (refsMap[qid] || []).map((r) => (r || '').trim()).filter(Boolean);
        perQuestionRefs[qid] = cleaned;
      });
      localStorage.setItem(refsKey, JSON.stringify(perQuestionRefs));

      const answersPayload = {};
      questions.forEach((q) => {
        const ed = editorsRef.current[q.id];
        if (ed) {
          answersPayload[q.id] = ed.getJSON();
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(answersPayload));

      const jsonData = {
        activityId: activity.id,
        studentId: activity.studentId,
        answers: answersPayload,
        references: perQuestionRefs,
        status: 'DRAFT',
      };

      console.log('Saving draft with data:', jsonData);

      await axios.post(`${config.api}/saveAnswers.php`, jsonData, {
        headers: { 'Content-Type': 'application/json' },
      });
      setAnswers(answersPayload);
      setStatusText('IN PROGRESS · Draft saved to server');
    } catch (error) {
      console.error('Error saving draft', error);
      if (onError) onError('Error saving draft');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(refsKey);
    questions.forEach((q) => {
      localStorage.removeItem(questionStorageKey(q.id));
    });
    setAnswers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = null;
      });
      return next;
    });
    setRefsMap({});
    setStatusText('IN PROGRESS · Draft cleared');
  };

  const icons = {
    bold: <img src="/images/bold.png" alt="Bold" width="50" height="50" />,
    italic: <img src="/images/italic.png" alt="Italic" width="50" height="50" />,
    bullet: <img src="/images/unorderedlist.png" alt="Bullet list" width="50" height="50" />,
    ordered: <img src="/images/orderedlist.png" alt="Ordered list" width="50" height="50" />,
    undo: <img src="/images/undo.png" alt="Undo" width="50" height="50" />,
    redo: <img src="/images/redo.png" alt="Redo" width="50" height="50" />,
  };

  const ToolbarButton = ({ icon, label, isActive, onClick, disabled }) => (
    <button
      type="button"
      className={`answer-toolbar-button${isActive ? ' active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );

  const QuestionAnswerItem = ({ question, disabled }) => {
    const saved = answers[question.id];
    const saveTimer = useRef(null);
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Type your answer here…',
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content: saved || '',
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        const json = ed.getJSON();
        const str = JSON.stringify(json);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          localStorage.setItem(questionStorageKey(question.id), str);
        }, 250);
      },
      editorProps: {
        handleDOMEvents: {
          copy: (_, event) => {
            event.preventDefault();
            showBlocked('copy blocked');
            return true;
          },
          cut: (_, event) => {
            event.preventDefault();
            showBlocked('cut blocked');
            return true;
          },
          paste: (_, event) => {
            event.preventDefault();
            showBlocked('paste blocked');
            return true;
          },
          drop: (_, event) => {
            event.preventDefault();
            showBlocked('drop blocked');
            return true;
          },
          contextmenu: () => {
            showBlocked('context menu blocked');
            return false;
          },
        },
        handlePaste: () => true,
        handleDrop: () => true,
        handleKeyDown: (_, event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
            event.preventDefault();
            showBlocked('keyboard paste blocked');
            return true;
          }
          return false;
        },
      },
    });

    useEffect(() => {
      if (editor) {
        editorsRef.current[question.id] = editor;
      }
      return () => {
        delete editorsRef.current[question.id];
      };
    }, [editor, question.id]);

    useEffect(() => {
      if (!disabled) return;
      if (editor) editor.setEditable(false);
    }, [disabled, editor]);

    useEffect(() => {
      if (!editor) return;
      if (saved) {
        editor.commands.setContent(saved);
      } else {
        editor.commands.clearContent(true);
      }
    }, [saved, editor]);

    return (
      <div className="qa-block">
        <div className="qa-question">
          <span className="question-ref">{question.QuestionRef || `Q${question.id}`}</span>
          <span className="question-text" dangerouslySetInnerHTML={{ __html: question.Question }} />
        </div>
        <div className="qa-answer">
          <div className="answer-toolbar">
            <ToolbarButton
              icon={icons.bold}
              label="Bold"
              isActive={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor || disabled}
            />
            <ToolbarButton
              icon={icons.italic}
              label="Italic"
              isActive={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor || disabled}
            />
            <ToolbarButton
              icon={icons.bullet}
              label="Bullet list"
              isActive={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!editor || disabled}
            />
            <ToolbarButton
              icon={icons.ordered}
              label="Numbered list"
              isActive={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={!editor || disabled}
            />
            <ToolbarButton
              icon={icons.undo}
              label="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor || disabled}
            />
            <ToolbarButton
              icon={icons.redo}
              label="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor || disabled}
            />
          </div>
          <div className="answer-editor">
            <EditorContent editor={editor} />
          </div>
          <div className="admin-label">
            References (optional, up to 5)
            <div className="references-group">
              {(refsMap[question.id] || ['']).map((ref, idx) => (
                <div className="reference-row" key={`ref-${question.id}-${idx}`}>
                  <input
                    className="reference-input"
                    type="url"
                    value={ref}
                    onChange={(e) => handleRefChange(question.id, idx, e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={disabled}
                  />
                  {(refsMap[question.id] || ['']).length > 1 && !disabled && (
                    <button
                      type="button"
                      className="reference-remove"
                      onClick={() => removeReferenceField(question.id, idx)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <div className="reference-actions">
                <button
                  type="button"
                  className="reference-add"
                  onClick={() => addReferenceField(question.id)}
                  disabled={disabled || (refsMap[question.id]?.length ?? 1) >= 5}
                >
                  + Add reference
                </button>
                <div className="reference-note">Enter full URLs; up to five references.</div>
              </div>
            </div>
            {validateRefs(question.id) && <div className="answer-meta">{validateRefs(question.id)}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Assessment</div>
            <div className="modal-subtitle">
              Status: {statusText} {blockMessage ? ` · ${blockMessage}` : ''}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading}>
            Close
          </button>
        </div>

        <div className="modal-body">

          <div className="student-assignment-card">
            <div className="student-assignment-value">
              Unit: {activity?.unitId}
              {unitName ? ` · ${unitName}` : ''}
             <span className="normal">Course: {courseName || activity?.courseId}</span>
             <span className="normal"> Current status: {displayStatus(activity?.status)}</span>
            </div>
          </div>

          <div className="question-list">
            {questionsLoading && <div className="answer-meta">Loading questions…</div>}
            {questionsError && <div className="answer-meta error">{questionsError}</div>}
            {!questionsLoading && !questionsError && questions.length === 0 && (
              <div className="answer-meta">No questions found for this unit.</div>
            )}
            {!questionsLoading && !questionsError && questions.length > 0 && (
              <div className="question-scroll qa-list">
                {questions.map((q) => (
                  <QuestionAnswerItem key={q.id} question={q} disabled={statusText.startsWith('SUBMITTED')} />
                ))}
              </div>
            )}
          </div>

          {/* per-question editors above */}
          {blockMessage && <div className="answer-blocked">{blockMessage}</div>}

          <div className="modal-actions">
            <button type="button" onClick={handleSaveDraft} disabled={loading}>
              Save draft
            </button>
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={loading}>
              Submit
            </button>
          </div>
        </div>

        {confirmOpen && (
          <div className="confirm-backdrop">
            <div className="confirm-modal">
              <div className="confirm-title">Submit assessment?</div>
              <div className="confirm-text">Submitting will lock your answers. Continue?</div>
              <div className="confirm-actions">
                <button type="button" onClick={() => setConfirmOpen(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="button" onClick={() => { setConfirmOpen(false); handleSubmit(); }} disabled={loading}>
                  Confirm submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnswer;
