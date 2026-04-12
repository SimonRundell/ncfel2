import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, '../../api/.config.json');

const readConfig = () => {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  if (!config.api) {
    throw new Error('api base URL missing in api/.config.json');
  }
  return config;
};

const nowDateTime = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const randomSuffix = () => crypto.randomBytes(3).toString('hex');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const pick = (data, fallback) => (data?.message?.data ?? data?.data ?? data?.message ?? fallback);

const api = (() => {
  const config = readConfig();
  const baseURL = config.api.replace(/\/$/, '') + '/api';
  const client = axios.create({ baseURL });

  const apiUser = process.env.API_AUTH_USER || '';
  const apiPassword = process.env.API_AUTH_PASSWORD || '';
  const bearerToken = process.env.API_AUTH_TOKEN || '';

  const tokenPromise = (() => {
    if (bearerToken) {
      return Promise.resolve(bearerToken);
    }
    if (!apiUser || !apiPassword) {
      return Promise.reject(new Error('Set API_AUTH_USER and API_AUTH_PASSWORD (or API_AUTH_TOKEN) before running tests.'));
    }
    return axios.post(`${baseURL}/authToken.php`, {
      username: apiUser,
      password: apiPassword,
    }).then((res) => res.data?.message?.token || res.data?.token);
  })();

  const request = async (method, url, body) => {
    const token = await tokenPromise;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const response = await client.request({ method, url, data: body, headers });
    return response.data;
  };

  return { request };
})();

const createStudent = async (suffix) => {
  const email = `mc-test-${suffix}@example.com`;
  const passwordHash = crypto.createHash('md5').update('password123').digest('hex');
  const response = await api.request('post', '/createUser.php', {
    email,
    passwordHash,
    userName: `MC Test ${suffix}`,
    status: 0,
    classCode: 'MC-TEST',
    plainPassword: 'password123',
  });
  const id = response?.id || response?.message?.id;
  assert(id, 'createUser did not return id');
  return { id, email };
};

const createTeacher = async (suffix) => {
  const email = `mc-teacher-${suffix}@example.com`;
  const passwordHash = crypto.createHash('md5').update('password123').digest('hex');
  const response = await api.request('post', '/createUser.php', {
    email,
    passwordHash,
    userName: `MC Teacher ${suffix}`,
    status: 2,
    classCode: 'MC-TEST',
    plainPassword: 'password123',
  });
  const id = response?.id || response?.message?.id;
  assert(id, 'createUser (teacher) did not return id');
  return { id, email };
};

const createCourse = async (suffix) => {
  const response = await api.request('post', '/createCourse.php', {
    courseName: `MC Course ${suffix}`,
    courseCode: `MC-${suffix}`,
  });
  const id = response?.id || response?.message?.id;
  assert(id, 'createCourse did not return id');
  return id;
};

const createUnit = async (courseId, suffix) => {
  const response = await api.request('post', '/createUnit.php', {
    courseid: courseId,
    unitName: `MC Unit ${suffix}`,
    unitCode: `MCU-${suffix}`,
    assessmentType: 'MultiChoice',
  });
  const id = response?.id || response?.message?.id;
  assert(id, 'createUnit did not return id');
  return id;
};

const createQuestion = async (courseId, unitId, questionRef, questionHtml, mcAnswer) => {
  const response = await api.request('post', '/createQuestion.php', {
    courseid: courseId,
    unitid: unitId,
    QuestionRef: questionRef,
    Question: questionHtml,
    uploadPermitted: 0,
    MCAnswer: mcAnswer,
  });
  const id = response?.id || response?.message?.id;
  assert(id, 'createQuestion did not return id');
  return id;
};

const createActivity = async (studentId, teacherId, courseId, unitId) => {
  const response = await api.request('post', '/createCurrentActivity.php', {
    studentId,
    assessorId: teacherId,
    courseId,
    unitId,
    status: 'INPROGRESS',
    dateSet: nowDateTime(),
  });
  const id = response?.id || response?.message?.id;
  assert(id, 'createCurrentActivity did not return id');
  return id;
};

const getActivity = async (activityId) => {
  const response = await api.request('post', '/getCurrentActivities.php', { id: activityId });
  const rows = JSON.parse(response.message || '[]');
  return rows[0];
};

const saveAnswers = async (activityId, studentId, answers, status, attemptNumber) => {
  return api.request('post', '/saveAnswers.php', {
    activityId,
    studentId,
    answers,
    references: {},
    fileUploads: {},
    status,
    attemptNumber,
  });
};

const markAnswers = async (activityId, studentId, marks, assessorComment, finalStatus) => {
  return api.request('post', '/markAnswers.php', {
    activityId,
    studentId,
    marks,
    assessorComment,
    finalStatus,
  });
};

const updateActivity = async (activity, status, extraFields = {}) => {
  return api.request('post', '/updateCurrentActivity.php', {
    id: activity.id,
    studentId: activity.studentId,
    courseId: activity.courseId,
    unitId: activity.unitId,
    status,
    ...extraFields,
  });
};

const getBundle = async (activityId, studentId, attemptNumber) => {
  const response = await api.request('post', '/getMarkingBundle.php', {
    activityId,
    studentId,
    attemptNumber,
  });
  return pick(response, {});
};

const deleteById = async (endpoint, id) => {
  try {
    await api.request('post', endpoint, { id });
  } catch (err) {
    // ignore cleanup errors
  }
};

const run = async () => {
  const suffix = randomSuffix();
  const cleanup = { questions: [], unitId: null, courseId: null, activityId: null, studentId: null, teacherId: null };

  try {
    const student = await createStudent(suffix);
    cleanup.studentId = student.id;
    const teacher = await createTeacher(suffix);
    cleanup.teacherId = teacher.id;

    const courseId = await createCourse(suffix);
    cleanup.courseId = courseId;
    const unitId = await createUnit(courseId, suffix);
    cleanup.unitId = unitId;

    const q1 = await createQuestion(courseId, unitId, 'Q1', '<p>Q1</p><ol><li>A</li><li>B</li></ol>', 1);
    const q2 = await createQuestion(courseId, unitId, 'Q2', '<p>Q2</p><ol><li>A</li><li>B</li></ol>', 2);
    cleanup.questions.push(q1, q2);

    const activityId = await createActivity(student.id, teacher.id, courseId, unitId);
    cleanup.activityId = activityId;

    let activity = await getActivity(activityId);
    assert(activity.status === 'INPROGRESS', 'Expected INPROGRESS after creation');
    assert(Number(activity.attemptNumber || activity.currentAttempt || 1) === 1, 'Expected attempt 1 after creation');

    await saveAnswers(activityId, student.id, { [q1]: 1, [q2]: 1 }, 'SUBMITTED', 1);

    const bundleAttempt1 = await getBundle(activityId, student.id, 1);
    assert(bundleAttempt1.answers, 'Bundle did not return answers for attempt 1');

    await markAnswers(activityId, student.id, {
      [q1]: { outcome: 'ACHIEVED', comment: '' },
      [q2]: { outcome: 'NOT ACHIEVED', comment: '' },
    }, 'Try again', 'REDOING');

    activity = await getActivity(activityId);
    assert(activity.status === 'RETURNED', 'Expected RETURNED after REDOING');
    assert(Number(activity.attemptNumber || activity.currentAttempt) === 2, 'Expected attemptNumber = 2 after REDOING');

    const returnedBundle = await getBundle(activityId, student.id, 1);
    assert(returnedBundle.outcomes?.[q1] === 'ACHIEVED', 'Attempt 1 outcome for Q1 not ACHIEVED');
    assert(returnedBundle.outcomes?.[q2] === 'NOT ACHIEVED', 'Attempt 1 outcome for Q2 not NOT ACHIEVED');

    await updateActivity(activity, 'REDOING', { attemptNumber: 2 });
    activity = await getActivity(activityId);
    assert(activity.status === 'REDOING', 'Expected REDOING after student resumes attempt 2');

    await saveAnswers(activityId, student.id, { [q1]: 1, [q2]: 2 }, 'RESUBMITTED', 2);
    await updateActivity(activity, 'RESUBMITTED', { attemptNumber: 2, dateResubmitted: nowDateTime() });

    activity = await getActivity(activityId);
    assert(activity.status === 'RESUBMITTED', 'Expected RESUBMITTED after resubmission');
    assert(Number(activity.attemptNumber || activity.currentAttempt) === 2, 'Expected attemptNumber to remain 2 after resubmission');

    await markAnswers(activityId, student.id, {
      [q1]: { outcome: 'ACHIEVED', comment: '' },
      [q2]: { outcome: 'ACHIEVED', comment: '' },
    }, 'Good', 'PASSED');

    activity = await getActivity(activityId);
    assert(activity.status === 'PASSED', 'Expected PASSED after final marking');

    console.log('All attempt status tests passed.');
  } finally {
    if (cleanup.activityId) {
      await deleteById('/deleteCurrentActivity.php', cleanup.activityId);
    }
    for (const qid of cleanup.questions) {
      await deleteById('/deleteQuestion.php', qid);
    }
    if (cleanup.unitId) {
      await deleteById('/deleteUnit.php', cleanup.unitId);
    }
    if (cleanup.courseId) {
      await deleteById('/deleteCourse.php', cleanup.courseId);
    }
    if (cleanup.studentId) {
      await deleteById('/deleteUser.php', cleanup.studentId);
    }
    if (cleanup.teacherId) {
      await deleteById('/deleteUser.php', cleanup.teacherId);
    }
  }
};

run().catch((err) => {
  console.error('Attempt status tests failed:', err.message || err);
  process.exit(1);
});
