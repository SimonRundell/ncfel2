import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import axios from 'axios';
import { normalizeListResponse } from './adminApiHelpers';

const BLOCKED_MESSAGE_TIMEOUT = 1200;

const icons = {
  bold: <img src="/images/bold.png" alt="Bold" width="28" height="28" />,
  italic: <img src="/images/italic.png" alt="Italic" width="28" height="28" />,
  bullet: <img src="/images/unorderedlist.png" alt="Bullet list" width="28" height="28" />,
  ordered: <img src="/images/orderedlist.png" alt="Ordered list" width="28" height="28" />,
  undo: <img src="/images/undo.png" alt="Undo" width="28" height="28" />,
  redo: <img src="/images/redo.png" alt="Redo" width="28" height="28" />,
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

/**
 * Parse a multi-choice prompt that uses a single ordered list for options.
 * The prompt is the HTML before the ordered list; each <li> becomes an option.
 *
 * @param {string} html
 * @returns {{ promptHtml: string, options: Array<{ index: number, html: string }>, error: string }}
 */
const parseMultiChoiceQuestion = (html) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const lists = Array.from(doc.querySelectorAll('ol'));
    if (lists.length !== 1) {
      return { promptHtml: doc.body.innerHTML.trim(), options: [], error: 'Expected exactly one numbered list.' };
    }
    const list = lists[0];
    const items = Array.from(list.children).filter((node) => node.tagName === 'LI');
    list.remove();
    const promptHtml = doc.body.innerHTML.trim();
    const options = items.map((item, idx) => ({ index: idx + 1, html: item.innerHTML }));
    if (!options.length) {
      return { promptHtml, options: [], error: 'Numbered list has no options.' };
    }
    return { promptHtml, options, error: '' };
  } catch {
    return { promptHtml: html || '', options: [], error: 'Could not parse options.' };
  }
};

const QuestionAnswerItem = ({
  question,
  savedAnswer,
  disabled,
  outcome,
  comment,
  refs,
  onRefChange,
  onAddRef,
  onRemoveRef,
  refValidation,
  activityStatus,
  questionStorageKey,
  showBlocked,
  editorsRef,
  uploads,
  onUploadFiles,
  onDeleteFile,
  uploading,
  onOpenLightbox,
}) => {
  const saveTimer = useRef(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Type your answer here…',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: savedAnswer || '',
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
  }, [editor, question.id, editorsRef]);

  useEffect(() => {
    if (!disabled) return;
    if (editor) editor.setEditable(false);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (savedAnswer) {
      editor.commands.setContent(savedAnswer);
    } else {
      editor.commands.clearContent(true);
    }
  }, [savedAnswer, editor]);

  const isImageFile = (file) => {
    const name = (file?.originalName || file?.id || '').toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif');
  };

  const handleFileInputChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length && onUploadFiles) {
      onUploadFiles(selectedFiles);
    }
    event.target.value = '';
  };

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
            {(refs || ['']).map((ref, idx) => (
              <div className="reference-row" key={`ref-${question.id}-${idx}`}>
                <input
                  className="reference-input"
                  type="url"
                  value={ref}
                  onChange={(e) => onRefChange(idx, e.target.value)}
                  placeholder="https://example.com/article"
                  disabled={disabled}
                />
                {(refs || ['']).length > 1 && !disabled && (
                  <button
                    type="button"
                    className="reference-remove"
                    onClick={() => onRemoveRef(idx)}
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
                onClick={onAddRef}
                disabled={disabled || (refs?.length ?? 1) >= 5}
              >
                + Add reference
              </button>
              <div className="reference-note">Enter full URLs; up to five references.</div>
            </div>
          </div>
          {refValidation && <div className="answer-meta">{refValidation}</div>}
          {outcome && activityStatus !== 'INPROGRESS' && (
            <div className="answer-meta">Outcome: {outcome}{comment ? ` · ${comment}` : ''}</div>
          )}

          {question.uploadPermitted ? (
            <div className="upload-section">
              <div className="upload-header">Attachments</div>
              <div className="upload-actions">
                <label className={`upload-button${disabled ? ' disabled' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/gif,.doc,.docx,.xls,.xlsm,.pdf"
                    onChange={handleFileInputChange}
                    disabled={disabled || uploading}
                  />
                  {uploading ? 'Uploading…' : 'Upload files'}
                </label>
                <div className="upload-note">Images show as thumbnails; documents download.</div>
              </div>

              <div className="upload-list">
                {(!uploads || uploads.length === 0) && (
                  <div className="answer-meta">No files uploaded yet.</div>
                )}
                {uploads?.map((file) => {
                  const isImg = isImageFile(file);
                  const label = file?.originalName || file?.id || 'File';
                  const url = file?.url || '';
                  return (
                    <div className="upload-chip" key={`${question.id}-${file?.id || label}`}>
                      {isImg ? (
                        <button
                          type="button"
                          className="upload-thumb"
                          onClick={() => (url && onOpenLightbox ? onOpenLightbox(url, label) : null)}
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
                      {!disabled && (
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => onDeleteFile && onDeleteFile(file?.id)}
                          disabled={uploading}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/**
 * Render a multi-choice question with radio inputs and autosave status.
 *
 * @param {{
 *  question: { id: number, QuestionRef?: string, Question?: string },
 *  selectedIndex: number | null,
 *  disabled: boolean,
 *  onSelect: (index: number) => void,
 *  isSaving: boolean
 * }} props
 * @returns {JSX.Element}
 */
const MultiChoiceItem = ({
  question,
  selectedIndex,
  disabled,
  onSelect,
  isSaving,
  showResultTag,
}) => {
  const { promptHtml, options, error } = parseMultiChoiceQuestion(question.Question || '');
  const normalizedSelected = selectedIndex === null || selectedIndex === undefined
    ? null
    : Number(selectedIndex);
  const normalizedCorrect = question.MCAnswer === null || question.MCAnswer === undefined || question.MCAnswer === ''
    ? null
    : Number(question.MCAnswer);
  const isCorrect = normalizedSelected !== null && normalizedCorrect !== null && normalizedSelected === normalizedCorrect;
  const isIncorrect = normalizedSelected !== null && normalizedCorrect !== null && normalizedSelected !== normalizedCorrect;

  return (
    <div className="qa-block">
      <div className="qa-question">
        <span className="question-ref">{question.QuestionRef || `Q${question.id}`}</span>
        {promptHtml && <span className="mc-question-text" dangerouslySetInnerHTML={{ __html: promptHtml }} />}
        {showResultTag && (isCorrect || isIncorrect) && (
          <span className={`mc-result-tag${isCorrect ? ' correct' : ' incorrect'}`}>
            {isCorrect ? 'Correct' : 'Incorrect'}
          </span>
        )}
      </div>
      <div className="qa-answer">
        {error && <div className="answer-meta error">{error}</div>}
        {!error && (
          <div className="mc-options">
            {options.map((opt) => (
              <label className="mc-option" key={`${question.id}-opt-${opt.index}`}>
                <input
                  type="radio"
                  name={`mc-${question.id}`}
                  checked={Number(selectedIndex) === opt.index}
                  onChange={() => onSelect(opt.index)}
                  disabled={disabled}
                />
                <span className="mc-option-label" dangerouslySetInnerHTML={{ __html: opt.html }} />
              </label>
            ))}
          </div>
        )}
        {!error && null}
      </div>
    </div>
  );
};

/**
 * Student answer workspace for a specific activity.
 * Loads questions, manages rich-text editors, persists drafts locally, submits answers, and tracks outcomes/comments.
 * Handles draft autosave, status transitions, and reference links per question.
 *
 * @component
 * @param {{
 *  config: { api: string } | null,
 *  activity: { id: number, unitId: number, courseId: number, status?: string } | null,
 *  onClose: () => void,
 *  onSubmitted: () => void,
 *  onDraftSaved: () => void,
 *  onError?: (msg: string) => void
 * }} props
 * @returns {JSX.Element}
 */
const StudentAnswer = ({ config, activity, onClose, onSubmitted, onDraftSaved, onError }) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [courseName, setCourseName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [assessmentType, setAssessmentType] = useState('Open');
  const [refsMap, setRefsMap] = useState({}); // questionId -> array of refs
  const [blockMessage, setBlockMessage] = useState('');
  const [activityStatus, setActivityStatus] = useState(activity?.status || 'INPROGRESS');
  const [statusText, setStatusText] = useState(activity?.status || 'INPROGRESS');
  const [answers, setAnswers] = useState({}); // questionId -> {json}
  const [outcomes, setOutcomes] = useState({}); // questionId -> outcome
  const [markerComments, setMarkerComments] = useState({}); // questionId -> marker comment
  const [assessorComment, setAssessorComment] = useState('');
  const [fileUploads, setFileUploads] = useState({}); // questionId -> [uploads]
  const [uploadingMap, setUploadingMap] = useState({}); // questionId -> bool
  const [attemptNumber, setAttemptNumber] = useState(activity?.attemptNumber || activity?.currentAttempt || 1);
  const storageKey = useMemo(
    () => `answer-${activity?.id || 'unknown'}-attempt-${attemptNumber}`,
    [activity?.id, attemptNumber]
  );
  const refsKey = useMemo(
    () => `answer-refs-${activity?.id || 'unknown'}-attempt-${attemptNumber}`,
    [activity?.id, attemptNumber]
  );
  const blockTimer = useRef(null);
  const editorsRef = useRef({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const mcSaveTimer = useRef(null);
  const [mcSaving, setMcSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (blockTimer.current) {
        clearTimeout(blockTimer.current);
      }
      if (mcSaveTimer.current) {
        clearTimeout(mcSaveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    setAttemptNumber(activity?.attemptNumber || activity?.currentAttempt || 1);
  }, [activity?.attemptNumber, activity?.currentAttempt]);

  const questionStorageKey = useCallback((qid) => `${storageKey}-q-${qid}`, [storageKey]);

  const buildFileUrl = useCallback(
    (questionId, fileId) => {
      if (!config?.api || !activity?.id || !activity?.studentId || !fileId) return '';
      return `${config.api}/downloadAnswerFile.php?activityId=${activity.id}&studentId=${activity.studentId}&questionId=${questionId}&attemptNumber=${attemptNumber}&fileId=${encodeURIComponent(fileId)}`;
    },
    [config?.api, activity?.id, activity?.studentId, attemptNumber]
  );

  const normalizeUploadsForQuestion = useCallback(
    (uploads, questionId) => {
      if (!Array.isArray(uploads)) return [];
      return uploads.map((u) => ({ ...u, url: u?.url || buildFileUrl(questionId, u?.id) }));
    },
    [buildFileUrl]
  );

  const serializeFileUploads = useCallback(() => {
    const payload = {};
    Object.keys(fileUploads).forEach((qid) => {
      const list = fileUploads[qid];
      if (!Array.isArray(list)) return;
      payload[qid] = list.map(({ url, ...rest }) => rest);
    });
    return payload;
  }, [fileUploads]);

  useEffect(() => {
    const rawRefs = localStorage.getItem(refsKey);
    if (rawRefs) {
      try {
        const parsed = JSON.parse(rawRefs);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setRefsMap(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    setRefsMap({});
  }, [refsKey]);

  useEffect(() => {
    if (!questions.length) return;

    // Seed answers/refs from localStorage only when a question has no value yet
    setAnswers((prev) => {
      const next = { ...prev };
      questions.forEach((q) => {
        if (next[q.id] !== undefined && next[q.id] !== null) return;
        const raw = localStorage.getItem(questionStorageKey(q.id));
        if (raw) {
          try {
            next[q.id] = JSON.parse(raw);
            return;
          } catch {
            // ignore malformed local storage entries
          }
        }
        next[q.id] = null; // empty to allow placeholder
      });
      return next;
    });
    if (assessmentType !== 'MultiChoice') {
      setRefsMap((prev) => {
        const next = { ...prev };
        questions.forEach((q) => {
          if (Array.isArray(next[q.id]) && next[q.id].length) {
            next[q.id] = next[q.id].slice(0, 5);
            return;
          }
          next[q.id] = [''];
        });
        return next;
      });

      setFileUploads((prev) => {
        const next = { ...prev };
        questions.forEach((q) => {
          next[q.id] = normalizeUploadsForQuestion(next[q.id], q.id);
        });
        return next;
      });
    }
  }, [questions, questionStorageKey, normalizeUploadsForQuestion, assessmentType]);

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
            includeMCAnswer: true,
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const data = normalizeListResponse(response.data);
        const normalized = Array.isArray(data)
          ? data.map((q) => ({
              ...q,
              uploadPermitted: Number(q?.uploadPermitted ?? q?.uploadpermitted ?? 0) === 1,
            }))
          : [];
        setQuestions(normalized);
      } catch (err) {
        console.error('Error loading questions', err);
        setQuestionsError('Could not load questions');
        if (onError) onError('Could not load questions');
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [activity?.unitId, activity?.courseId, config?.api, onError]);

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
      } catch {
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
          setAssessmentType(data[0].assessmentType || 'Open');
        }
      } catch {
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
          { activityId: activity.id, studentId: activity.studentId, attemptNumber },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const payload = response.data?.data || response.data || {};
        const serverAnswers = payload.answers || {};
        const serverRefs = payload.references || {};
        const serverStatus = payload.status || 'INPROGRESS';
        const serverOutcomes = payload.outcomes || {};
        const serverComments = payload.comments || {};
        const serverAssessorComment = payload.assessorComment || '';
        const serverUploads = payload.fileUploads || {};
        const serverAttempt = payload.currentAttempt || payload.attemptNumber || attemptNumber;

        if (!Object.keys(serverAnswers).length) return;

        setActivityStatus(serverStatus);
        setStatusText(displayStatus(serverStatus));

        setAttemptNumber(serverAttempt);
        setAnswers(serverAnswers);
        setOutcomes(serverOutcomes);
        setMarkerComments(serverComments);
        setAssessorComment(serverAssessorComment);
        setFileUploads((prev) => {
          const next = { ...prev };
          Object.keys(serverUploads).forEach((qid) => {
            next[qid] = normalizeUploadsForQuestion(serverUploads[qid], qid);
          });
          return next;
        });
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
  }, [activity?.id, activity?.studentId, config?.api, storageKey, refsKey, normalizeUploadsForQuestion, attemptNumber]);

  const displayStatus = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return 'SUBMITTED · Read-only';
      case 'INPROGRESS':
        return 'IN PROGRESS';
      case 'INMARKING':
        return 'IN MARKING · Read-only';
      case 'INREMARKING':
        return 'IN REMARKING · Read-only';
      case 'REDOING':
        return 'REDOING';
      case 'RESUBMITTED':
        return 'RESUBMITTED · Read-only';
      case 'PASSED':
        return 'PASSED · Read-only';
      case 'RETURNED':
        return 'RETURNED · Review feedback';
      case 'NOTPASSED':
        return 'NOT PASSED · Read-only';
      default:
        return status;
    }
  };

  useEffect(() => {
    const initialStatus = activity?.status || 'INPROGRESS';
    setActivityStatus(initialStatus);
    setStatusText(displayStatus(initialStatus));
  }, [activity?.status]);

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

  const handleFileUpload = async (questionId, files) => {
    if (!config?.api || !activity?.id || !activity?.studentId || !Array.isArray(files) || files.length === 0) return;
    setUploadingMap((prev) => ({ ...prev, [questionId]: true }));
    try {
      // Upload sequentially to simplify server logging and progress tracking
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('activityId', activity.id);
        formData.append('studentId', activity.studentId);
        formData.append('questionId', questionId);
        formData.append('attemptNumber', attemptNumber);

        const resp = await axios.post(`${config.api}/uploadAnswerFile.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploaded = resp.data?.file;
        const updatedList = resp.data?.fileUploads;
        setFileUploads((prev) => {
          const next = { ...prev };
          if (Array.isArray(updatedList)) {
            next[questionId] = normalizeUploadsForQuestion(updatedList, questionId);
          } else if (uploaded) {
            const list = Array.isArray(next[questionId]) ? next[questionId].slice() : [];
            list.push({ ...uploaded, url: uploaded.url || buildFileUrl(questionId, uploaded.id) });
            next[questionId] = list;
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Error uploading file', error);
      if (onError) onError('Error uploading file');
    } finally {
      setUploadingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleFileDelete = async (questionId, fileId) => {
    if (!config?.api || !activity?.id || !activity?.studentId || !fileId) return;
    setUploadingMap((prev) => ({ ...prev, [questionId]: true }));
    try {
      const resp = await axios.post(
        `${config.api}/deleteAnswerFile.php`,
        {
          activityId: activity.id,
          studentId: activity.studentId,
          questionId,
          attemptNumber,
          fileId,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const updatedList = resp.data?.fileUploads;
      setFileUploads((prev) => {
        const next = { ...prev };
        next[questionId] = normalizeUploadsForQuestion(updatedList, questionId);
        return next;
      });
    } catch (error) {
      console.error('Error deleting file', error);
      if (onError) onError('Error deleting file');
    } finally {
      setUploadingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const updateActivityStatus = async (status, extraFields = {}) => {
    if (!config?.api || !activity?.id || !activity?.studentId || !activity?.courseId || !activity?.unitId) return;
    await axios.post(
      `${config.api}/updateCurrentActivity.php`,
      {
        id: activity.id,
        studentId: activity.studentId,
        courseId: activity.courseId,
        unitId: activity.unitId,
        status,
        ...extraFields,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  };

  /**
   * Persist multi-choice selections immediately as INPROGRESS answers.
   *
   * @param {Record<string, number|null>} nextAnswers
   * @returns {Promise<void>}
   */
  const saveMcDraft = async (nextAnswers) => {
    if (!config?.api || !activity?.id || !activity?.studentId) return;
    setMcSaving(true);
    const answersPayload = {};
    questions.forEach((q) => {
      answersPayload[q.id] = nextAnswers[q.id] ?? null;
    });
    localStorage.setItem(storageKey, JSON.stringify(answersPayload));
    const payload = {
      activityId: activity.id,
      studentId: activity.studentId,
      answers: answersPayload,
      references: {},
      fileUploads: {},
      status: 'INPROGRESS',
      attemptNumber,
    };
    const response = await axios.post(
      `${config.api}/saveAnswers.php`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    const nextStatus = activityStatus === 'RETURNED' ? 'REDOING' : 'INPROGRESS';
    if (activityStatus !== nextStatus) {
      await updateActivityStatus(nextStatus, { attemptNumber });
      setActivityStatus(nextStatus);
      setStatusText(displayStatus(nextStatus));
    }
    setMcSaving(false);
  };

  const handleSubmit = async () => {
    if (!config?.api || !activity?.id) return;
    setLoading(true);
    try {
      const isRedoAttempt = attemptNumber >= 2 || activityStatus === 'REDOING' || activityStatus === 'RETURNED';
      const nextStatus = isRedoAttempt ? 'RESUBMITTED' : 'SUBMITTED';
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      // Persist draft locally (placeholder until backend storage is added)
      const perQuestionRefs = {};
      if (assessmentType !== 'MultiChoice') {
        Object.keys(refsMap).forEach((qid) => {
          const cleaned = (refsMap[qid] || []).map((r) => (r || '').trim()).filter(Boolean);
          perQuestionRefs[qid] = cleaned;
        });
        localStorage.setItem(refsKey, JSON.stringify(perQuestionRefs));
      }

      const answersPayload = {};
      questions.forEach((q) => {
        const ed = editorsRef.current[q.id];
        if (assessmentType === 'MultiChoice' || !ed) {
          answersPayload[q.id] = answers[q.id] ?? null;
          return;
        }
        answersPayload[q.id] = ed.getJSON();
      });
      localStorage.setItem(storageKey, JSON.stringify(answersPayload));

      if (assessmentType === 'MultiChoice') {
        const missing = questions.filter((q) => answersPayload[q.id] === null || answersPayload[q.id] === undefined);
        if (missing.length > 0) {
          if (onError) onError('Select an answer for every question before submitting.');
          setLoading(false);
          return;
        }
      }

      const payload = {
        activityId: activity.id,
        studentId: activity.studentId,
        answers: answersPayload,
        references: perQuestionRefs,
        fileUploads: assessmentType === 'MultiChoice' ? {} : serializeFileUploads(),
        status: nextStatus,
        attemptNumber,
      };
      const response = await axios.post(
        `${config.api}/saveAnswers.php`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      setAnswers(answersPayload);

      // Update activity status
      await updateActivityStatus(nextStatus, {
        dateSubmitted: nextStatus === 'SUBMITTED' ? now : activity.dateSubmitted || now,
        dateResubmitted: nextStatus === 'RESUBMITTED' ? now : activity.dateResubmitted || null,
      });
      setActivityStatus(nextStatus);
      setStatusText(displayStatus(nextStatus));
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
      const isRedoAttempt = attemptNumber >= 2 || activityStatus === 'REDOING' || activityStatus === 'RETURNED';
      const draftStatus = isRedoAttempt ? 'REDOING' : 'INPROGRESS';
      const perQuestionRefs = {};
      if (assessmentType !== 'MultiChoice') {
        Object.keys(refsMap).forEach((qid) => {
          const cleaned = (refsMap[qid] || []).map((r) => (r || '').trim()).filter(Boolean);
          perQuestionRefs[qid] = cleaned;
        });
        localStorage.setItem(refsKey, JSON.stringify(perQuestionRefs));
      }

      const answersPayload = {};
      questions.forEach((q) => {
        const ed = editorsRef.current[q.id];
        if (assessmentType === 'MultiChoice' || !ed) {
          answersPayload[q.id] = answers[q.id] ?? null;
          return;
        }
        answersPayload[q.id] = ed.getJSON();
      });
      localStorage.setItem(storageKey, JSON.stringify(answersPayload));

      const jsonData = {
        activityId: activity.id,
        studentId: activity.studentId,
        answers: answersPayload,
        references: perQuestionRefs,
        fileUploads: assessmentType === 'MultiChoice' ? {} : serializeFileUploads(),
        status: 'DRAFT',
        attemptNumber,
      };
      await axios.post(`${config.api}/saveAnswers.php`, jsonData, {
        headers: { 'Content-Type': 'application/json' },
      });
      setAnswers(answersPayload);
      await updateActivityStatus(draftStatus, { attemptNumber });
      if (onDraftSaved) onDraftSaved();
      setActivityStatus(draftStatus);
      setStatusText(`${displayStatus(draftStatus)} · Draft saved`);
    } catch (error) {
      console.error('Error saving draft', error);
      if (onError) onError('Error saving draft');
    } finally {
      setLoading(false);
    }
  };

  // const handleReset = () => {
  //   localStorage.removeItem(storageKey);
  //   localStorage.removeItem(refsKey);
  //   questions.forEach((q) => {
  //     localStorage.removeItem(questionStorageKey(q.id));
  //   });
  //   setAnswers((prev) => {
  //     const next = { ...prev };
  //     Object.keys(next).forEach((k) => {
  //       next[k] = null;
  //     });
  //     return next;
  //   });
  //   setRefsMap({});
  //   setOutcomes({});
  //   setMarkerComments({});
  //   setAssessorComment('');
  //   setActivityStatus('INPROGRESS');
  //   setStatusText('IN PROGRESS · Draft cleared');
  // };


  const isQuestionEditable = (qid) => {
    const lockedStatuses = [
      'SUBMITTED',
      'INMARKING',
      'INREMARKING',
      'RESUBMITTED',
      'PASSED',
      'NOTPASSED',
      'DISCONTINUED',
    ];
    if (lockedStatuses.includes(activityStatus)) return false;
    if ((activityStatus === 'REDOING' || activityStatus === 'RETURNED') && (outcomes[qid] || 'NOT ACHIEVED') === 'ACHIEVED') return false;
    return true;
  };

  const formLocked = [
    'SUBMITTED',
    'INMARKING',
    'INREMARKING',
    'RESUBMITTED',
    'PASSED',
    'NOTPASSED',
    'DISCONTINUED',
  ].includes(activityStatus);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Assessment</div>
            <div className="modal-subtitle">
              Status: {statusText} · Attempt {attemptNumber} {blockMessage ? ` · ${blockMessage}` : ''}
              <span className="mc-saving" aria-live="polite">
                {mcSaving ? 'Saving…' : ''}
              </span>
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
             <span className="normal"> Current status: {displayStatus(activityStatus)} (Attempt {attemptNumber})</span>
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
                {questions.map((q) => {
                  if (assessmentType === 'MultiChoice') {
                    return (
                      <MultiChoiceItem
                        key={q.id}
                        question={q}
                        selectedIndex={answers[q.id]}
                        disabled={!isQuestionEditable(q.id)}
                        isSaving={mcSaving}
                        showResultTag={activityStatus === 'RETURNED' || activityStatus === 'REDOING'}
                        onSelect={(index) => {
                          setAnswers((prev) => {
                            const next = { ...prev, [q.id]: index };
                            localStorage.setItem(questionStorageKey(q.id), JSON.stringify(index));
                            if (mcSaveTimer.current) clearTimeout(mcSaveTimer.current);
                            setMcSaving(true);
                            mcSaveTimer.current = setTimeout(() => {
                              saveMcDraft(next).catch((error) => {
                                console.error('Error saving MC draft', error);
                                if (onError) onError('Error saving multi-choice answer');
                                setMcSaving(false);
                              });
                            }, 300);
                            return next;
                          });
                        }}
                      />
                    );
                  }
                  return (
                    <QuestionAnswerItem
                      key={q.id}
                      question={q}
                      savedAnswer={answers[q.id]}
                      disabled={!isQuestionEditable(q.id)}
                      outcome={outcomes[q.id]}
                      comment={markerComments[q.id]}
                      refs={refsMap[q.id]}
                      onRefChange={(idx, value) => handleRefChange(q.id, idx, value)}
                      onAddRef={() => addReferenceField(q.id)}
                      onRemoveRef={(idx) => removeReferenceField(q.id, idx)}
                      refValidation={validateRefs(q.id)}
                      activityStatus={activityStatus}
                      questionStorageKey={questionStorageKey}
                      showBlocked={showBlocked}
                      editorsRef={editorsRef}
                      uploads={fileUploads[q.id]}
                      onUploadFiles={(files) => handleFileUpload(q.id, files)}
                      onDeleteFile={(fileId) => handleFileDelete(q.id, fileId)}
                      uploading={!!uploadingMap[q.id]}
                      onOpenLightbox={openLightbox}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* per-question editors above */}
          {blockMessage && <div className="answer-blocked">{blockMessage}</div>}

          {assessorComment && (
            <div className="student-assignment-card">
              <div className="student-assignment-title">Assessor feedback</div>
              <div className="student-assignment-meta">Overall feedback from your assessor</div>
              <div className="student-assignment-value">{assessorComment}</div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={handleSaveDraft} disabled={loading || formLocked}>
              Save draft
            </button>
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={loading || formLocked}>
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
    </div>
  );
};

export default StudentAnswer;
