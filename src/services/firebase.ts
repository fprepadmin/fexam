import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  Auth,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  Database,
  Unsubscribe as RtdbUnsubscribe,
} from 'firebase/database';
import { TeacherUser, Exam, ClassRoom, Student, ExamSession, ExamSubmission, ViolationRecord } from '../types';

// Default Firebase Configuration provided by user
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAq3zpNY3tYrKlkINGPdaIsb9QWLtk4ufg",
  authDomain: "fexambythongtran.firebaseapp.com",
  projectId: "fexambythongtran",
  storageBucket: "fexambythongtran.firebasestorage.app",
  messagingSenderId: "830538568816",
  appId: "1:830538568816:web:4ef7ba3f351ac699cad0b5",
  databaseURL: "https://fexambythongtran-default-rtdb.asia-southeast1.firebasedatabase.app",
};

export const getFirebaseConfig = () => {
  const saved = localStorage.getItem('fexam_firebase_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return DEFAULT_FIREBASE_CONFIG;
};

// Singleton instances
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let realtimeDb: Database | null = null;
let isConnected = false;

export const initFirebase = (customConfig?: any) => {
  const cfg = customConfig || getFirebaseConfig();
  if (cfg && cfg.apiKey && cfg.projectId) {
    try {
      firebaseApp = getApps().length === 0 ? initializeApp(cfg) : getApp();
      firebaseAuth = getAuth(firebaseApp);
      firestoreDb = getFirestore(firebaseApp);
      try {
        realtimeDb = getDatabase(firebaseApp);
      } catch (rtdbErr) {
        console.warn('Realtime Database init note:', rtdbErr);
      }
      isConnected = true;
      return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb, rtdb: realtimeDb, isConnected: true };
    } catch (e) {
      console.warn('Firebase initialization notice:', e);
    }
  }
  return { app: null, auth: null, db: null, rtdb: null, isConnected: false };
};

// Initialize immediately on load
const initResult = initFirebase();
firebaseApp = initResult.app;
firebaseAuth = initResult.auth;
firestoreDb = initResult.db;
realtimeDb = initResult.rtdb;
isConnected = initResult.isConnected;

export { firebaseApp, firebaseAuth, firestoreDb, realtimeDb, isConnected };

/**
 * Universal Sanitizer: Removes all undefined keys to prevent Firestore & RTDB write crashes
 */
export const sanitizeForFirebase = <T>(data: T): T => {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
};

// ----------------------------------------------------
// AUTH: GOOGLE SIGN-IN ONLY
// ----------------------------------------------------
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  if (!firebaseAuth) throw new Error('Firebase Auth chưa được khởi tạo');
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
};

export const logoutFirebase = async () => {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
};

// ----------------------------------------------------
// FIRESTORE: REALTIME LISTENERS & CRUD (ZERO MOCK DATA)
// ----------------------------------------------------

// 1. TEACHERS
export const subscribeTeachersFirestore = (callback: (teachers: TeacherUser[]) => void): Unsubscribe | null => {
  if (!firestoreDb) return null;
  const colRef = collection(firestoreDb, 'teachers');
  return onSnapshot(colRef, (snapshot) => {
    const list: TeacherUser[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as TeacherUser;
      if (data && data.email) {
        list.push({ ...data, id: data.id || d.id });
      }
    });

    // Deduplicate by email in memory
    const map = new Map<string, TeacherUser>();
    list.forEach((t) => {
      const email = t.email.trim().toLowerCase();
      if (!map.has(email)) {
        map.set(email, t);
      } else {
        const current = map.get(email)!;
        if (current.id.startsWith('teacher-') && !t.id.startsWith('teacher-')) {
          map.set(email, t);
        }
      }
    });

    callback(Array.from(map.values()));
  }, (err) => {
    console.warn('Firestore subscribeTeachers error:', err);
  });
};

export const fetchAllTeachersFromFirestore = async (): Promise<TeacherUser[]> => {
  if (!firestoreDb) return [];
  try {
    const colRef = collection(firestoreDb, 'teachers');
    const snap = await getDocs(colRef);
    const list: TeacherUser[] = [];
    snap.forEach((d) => {
      const data = d.data() as TeacherUser;
      if (data && data.email) {
        list.push({ ...data, id: data.id || d.id });
      }
    });

    const map = new Map<string, TeacherUser>();
    list.forEach((t) => {
      const email = t.email.trim().toLowerCase();
      if (!map.has(email)) {
        map.set(email, t);
      } else {
        const current = map.get(email)!;
        if (current.id.startsWith('teacher-') && !t.id.startsWith('teacher-')) {
          map.set(email, t);
        }
      }
    });
    return Array.from(map.values());
  } catch (err) {
    console.warn('Firestore fetchAllTeachers error:', err);
    return [];
  }
};

export const syncTeacherToFirestore = async (teacher: TeacherUser, oldId?: string): Promise<{ success: boolean; error?: string }> => {
  if (!firestoreDb) return { success: false, error: 'Chưa kết nối Firebase' };
  try {
    const clean = sanitizeForFirebase(teacher);
    const teacherRef = doc(firestoreDb, 'teachers', clean.id);
    await setDoc(teacherRef, clean, { merge: true });

    // If an old temporary ID exists, delete it
    if (oldId && oldId !== clean.id) {
      deleteDoc(doc(firestoreDb, 'teachers', oldId)).catch(() => {});
      if (realtimeDb) {
        remove(ref(realtimeDb, `teachers/${oldId}`)).catch(() => {});
      }
    }

    // Mirror to Realtime Database if available
    if (realtimeDb) {
      const rRef = ref(realtimeDb, `teachers/${clean.id}`);
      set(rRef, clean).catch(() => {});
    }
    return { success: true };
  } catch (err: any) {
    console.error('Firestore syncTeacher error:', err);
    return { success: false, error: err?.message || 'Lỗi lưu Firestore' };
  }
};

export const syncAllTeachersToFirestore = async (teachers: TeacherUser[]): Promise<{ success: boolean; count: number; error?: string }> => {
  if (!firestoreDb) return { success: false, count: 0, error: 'Chưa kết nối Firebase' };
  try {
    let saved = 0;
    for (const t of teachers) {
      const clean = sanitizeForFirebase(t);
      const teacherRef = doc(firestoreDb, 'teachers', clean.id);
      await setDoc(teacherRef, clean, { merge: true });
      if (realtimeDb) {
        const rRef = ref(realtimeDb, `teachers/${clean.id}`);
        set(rRef, clean).catch(() => {});
      }
      saved++;
    }
    return { success: true, count: saved };
  } catch (err: any) {
    console.error('Firestore syncAllTeachers error:', err);
    return { success: false, count: 0, error: err?.message || 'Lỗi đồng bộ danh sách giáo viên' };
  }
};

export const fetchTeacherFromFirestore = async (uid: string): Promise<TeacherUser | null> => {
  if (!firestoreDb) return null;
  try {
    const teacherRef = doc(firestoreDb, 'teachers', uid);
    const snap = await getDoc(teacherRef);
    if (snap.exists()) {
      return snap.data() as TeacherUser;
    }
  } catch (err) {
    console.warn('Firestore fetchTeacher error:', err);
  }
  return null;
};

export const fetchTeacherByEmailOrUid = async (uid: string, email: string): Promise<TeacherUser | null> => {
  if (!firestoreDb) return null;
  try {
    // 1. Try doc by uid
    const teacherRef = doc(firestoreDb, 'teachers', uid);
    const snap = await getDoc(teacherRef);
    if (snap.exists()) {
      return snap.data() as TeacherUser;
    }

    // 2. Query by email
    const colRef = collection(firestoreDb, 'teachers');
    const q = query(colRef, where('email', '==', email.trim().toLowerCase()));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as TeacherUser;
    }
  } catch (err) {
    console.warn('Firestore fetchTeacherByEmailOrUid error:', err);
  }
  return null;
};

export const deleteTeacherFromFirestore = async (uid: string) => {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, 'teachers', uid));
    if (realtimeDb) {
      remove(ref(realtimeDb, `teachers/${uid}`)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore deleteTeacher error:', err);
  }
};

// 2. EXAMS
export const subscribeExamsFirestore = (callback: (exams: Exam[]) => void): Unsubscribe | null => {
  if (!firestoreDb) return null;
  const colRef = collection(firestoreDb, 'exams');
  return onSnapshot(colRef, (snapshot) => {
    const list: Exam[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as Exam);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore subscribeExams error:', err);
  });
};

export const saveExamFirestore = async (exam: Exam) => {
  if (!firestoreDb) return;
  try {
    const clean = sanitizeForFirebase(exam);
    await setDoc(doc(firestoreDb, 'exams', clean.id), clean, { merge: true });
    if (realtimeDb) {
      set(ref(realtimeDb, `exams/${clean.id}`), clean).catch(() => {});
    }
  } catch (err) {
    console.error('Firestore saveExam error:', err);
  }
};

export const deleteExamFirestore = async (id: string) => {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, 'exams', id));
    if (realtimeDb) {
      remove(ref(realtimeDb, `exams/${id}`)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore deleteExam error:', err);
  }
};

export const fetchExamByIdOrCode = async (identifier: string): Promise<Exam | null> => {
  if (!firestoreDb || !identifier) return null;
  const cleanId = identifier.trim();
  const cleanUpper = cleanId.toUpperCase();
  try {
    // 1. Try getDoc by direct ID
    const directSnap = await getDoc(doc(firestoreDb, 'exams', cleanId));
    if (directSnap.exists()) {
      return directSnap.data() as Exam;
    }

    // 2. Try query by code (exact or uppercase)
    const colRef = collection(firestoreDb, 'exams');
    const q1 = query(colRef, where('code', '==', cleanUpper));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs[0].data() as Exam;
    }

    const q2 = query(colRef, where('code', '==', cleanId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return snap2.docs[0].data() as Exam;
    }
  } catch (err) {
    console.warn('fetchExamByIdOrCode error:', err);
  }
  return null;
};

// 3. SESSIONS (CA THI)
export const subscribeSessionsFirestore = (callback: (sessions: ExamSession[]) => void): Unsubscribe | null => {
  if (!firestoreDb) return null;
  const colRef = collection(firestoreDb, 'sessions');
  return onSnapshot(colRef, (snapshot) => {
    const list: ExamSession[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ExamSession);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore subscribeSessions error:', err);
  });
};

export const fetchSessionByCodeOrId = async (identifier: string): Promise<ExamSession | null> => {
  if (!firestoreDb || !identifier) return null;
  const cleanId = identifier.trim();
  const cleanUpper = cleanId.toUpperCase();
  try {
    // 1. Try getDoc by direct ID
    const directSnap = await getDoc(doc(firestoreDb, 'sessions', cleanId));
    if (directSnap.exists()) {
      return directSnap.data() as ExamSession;
    }

    // 2. Try query by code (exact or uppercase)
    const colRef = collection(firestoreDb, 'sessions');
    const q1 = query(colRef, where('code', '==', cleanUpper));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs[0].data() as ExamSession;
    }

    const q2 = query(colRef, where('code', '==', cleanId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return snap2.docs[0].data() as ExamSession;
    }

    // 3. Search in all sessions snapshot for candidateCode / mshs / fuzzy match
    const allSnap = await getDocs(colRef);
    // Prioritize candidate matching first
    for (const d of allSnap.docs) {
      const sess = d.data() as ExamSession;
      if (sess.candidates && sess.candidates.some(c => c.candidateCode?.toUpperCase() === cleanUpper || c.mshs?.toUpperCase() === cleanUpper)) {
        return sess;
      }
    }
    for (const d of allSnap.docs) {
      const sess = d.data() as ExamSession;
      if (sess.code?.toUpperCase() === cleanUpper || sess.id === cleanId) {
        return sess;
      }
    }
  } catch (err) {
    console.warn('fetchSessionByCodeOrId error:', err);
  }
  return null;
};

export const saveSessionFirestore = async (session: ExamSession) => {
  if (!firestoreDb) return;
  try {
    const clean = sanitizeForFirebase(session);
    await setDoc(doc(firestoreDb, 'sessions', clean.id), clean, { merge: true });
    if (realtimeDb) {
      set(ref(realtimeDb, `sessions/${clean.id}`), clean).catch(() => {});
    }
  } catch (err) {
    console.error('Firestore saveSession error:', err);
  }
};

export const deleteSessionFirestore = async (id: string) => {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, 'sessions', id));
    if (realtimeDb) {
      remove(ref(realtimeDb, `sessions/${id}`)).catch(() => {});
      remove(ref(realtimeDb, `live_proctor/${id}`)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore deleteSession error:', err);
  }
};

// 4. CLASSES
export const subscribeClassesFirestore = (callback: (classes: ClassRoom[]) => void): Unsubscribe | null => {
  if (!firestoreDb) return null;
  const colRef = collection(firestoreDb, 'classes');
  return onSnapshot(colRef, (snapshot) => {
    const list: ClassRoom[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ClassRoom);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore subscribeClasses error:', err);
  });
};

export const saveClassFirestore = async (cls: ClassRoom) => {
  if (!firestoreDb) return;
  try {
    const clean = sanitizeForFirebase(cls);
    await setDoc(doc(firestoreDb, 'classes', clean.id), clean, { merge: true });
    if (realtimeDb) {
      set(ref(realtimeDb, `classes/${clean.id}`), clean).catch(() => {});
    }
  } catch (err) {
    console.error('Firestore saveClass error:', err);
  }
};

export const deleteClassFirestore = async (id: string) => {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, 'classes', id));
    if (realtimeDb) {
      remove(ref(realtimeDb, `classes/${id}`)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore deleteClass error:', err);
  }
};

// 5. STUDENTS
export const subscribeStudentsFirestore = (callback: (students: Student[]) => void): Unsubscribe | null => {
  if (!firestoreDb) return null;
  const colRef = collection(firestoreDb, 'students');
  return onSnapshot(colRef, (snapshot) => {
    const list: Student[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as Student);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore subscribeStudents error:', err);
  });
};

export const saveStudentsFirestore = async (students: Student[]) => {
  if (!firestoreDb) return;
  try {
    for (const st of students) {
      const clean = sanitizeForFirebase(st);
      await setDoc(doc(firestoreDb, 'students', clean.id), clean, { merge: true });
      if (realtimeDb) {
        set(ref(realtimeDb, `students/${clean.id}`), clean).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Firestore saveStudents error:', err);
  }
};

export const deleteStudentFirestore = async (id: string) => {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, 'students', id));
    if (realtimeDb) {
      remove(ref(realtimeDb, `students/${id}`)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore deleteStudent error:', err);
  }
};

// 6. SUBMISSIONS & PROCTORING (FIRESTORE & REALTIME DB)
export const subscribeSubmissionsFirestore = (callback: (submissions: ExamSubmission[]) => void): Unsubscribe | null => {
  if (!firestoreDb) return null;
  const colRef = collection(firestoreDb, 'submissions');
  return onSnapshot(colRef, (snapshot) => {
    const list: ExamSubmission[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ExamSubmission);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore subscribeSubmissions error:', err);
  });
};

export const saveSubmissionFirestore = async (sub: ExamSubmission) => {
  if (!firestoreDb) return;
  try {
    const clean = sanitizeForFirebase(sub);
    await setDoc(doc(firestoreDb, 'submissions', clean.id), clean, { merge: true });
    // Also push to Realtime Database for instant teacher monitor (<50ms)
    const channelId = clean.sessionId || clean.examId;
    if (realtimeDb && channelId) {
      const rtdbPayload = sanitizeForFirebase({
        id: clean.id,
        sessionId: clean.sessionId || '',
        examId: clean.examId,
        studentName: clean.studentName,
        studentCode: clean.studentCode,
        mshs: clean.mshs || '',
        className: clean.className || '',
        status: clean.status,
        answeredCount: clean.answeredCount ?? 0,
        totalQuestions: clean.totalQuestions ?? 0,
        averageSpeedSecondsPerQuestion: clean.averageSpeedSecondsPerQuestion ?? 0,
        questionTimeline: clean.questionTimeline || {},
        lastAnsweredQuestion: clean.lastAnsweredQuestion || null,
        answers: clean.answers || {},
        violationsCount: clean.violations?.length || 0,
        lastViolation: clean.violations && clean.violations.length > 0 ? clean.violations[0] : null,
        lastActiveTime: clean.lastActiveTime || new Date().toISOString(),
        score: clean.score,
        bonusMinutes: clean.bonusMinutes || 0,
        teacherNote: clean.teacherNote || '',
      });
      set(ref(realtimeDb, `live_proctor/${channelId}/${clean.id}`), rtdbPayload).catch(() => {});
    }
  } catch (err) {
    console.error('Firestore saveSubmission error:', err);
  }
};

export const updateSubmissionLiveFirestore = async (
  subId: string,
  updates: Partial<ExamSubmission>,
  channelId?: string
) => {
  if (!firestoreDb) return;
  try {
    const clean = sanitizeForFirebase({ ...updates, lastActiveTime: new Date().toISOString() });
    const subRef = doc(firestoreDb, 'submissions', subId);
    await setDoc(subRef, clean, { merge: true });
    if (realtimeDb && channelId) {
      update(ref(realtimeDb, `live_proctor/${channelId}/${subId}`), clean).catch(() => {});
    }
  } catch (err) {
    console.error('Firestore updateSubmission error:', err);
  }
};

export const recordViolationRealtime = async (
  subId: string,
  channelId: string | undefined,
  violation: ViolationRecord,
  currentViolations: ViolationRecord[]
) => {
  const updatedViolations = sanitizeForFirebase([violation, ...(currentViolations || [])]);
  if (firestoreDb) {
    try {
      await setDoc(
        doc(firestoreDb, 'submissions', subId),
        sanitizeForFirebase({
          violations: updatedViolations,
          isFlagged: true,
          lastActiveTime: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.error('Firestore recordViolation error:', err);
    }
  }
  if (realtimeDb && channelId) {
    update(ref(realtimeDb, `live_proctor/${channelId}/${subId}`), sanitizeForFirebase({
      violationsCount: updatedViolations.length,
      lastViolation: violation,
      isFlagged: true,
      lastActiveTime: new Date().toISOString(),
    })).catch(() => {});
  }
};

export const subscribeLiveProctorSession = (
  sessionId: string,
  callback: (data: Record<string, any>) => void
): (() => void) | null => {
  if (!realtimeDb || !sessionId) return null;
  const proctorRef = ref(realtimeDb, `live_proctor/${sessionId}`);
  return onValue(
    proctorRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() || {});
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('subscribeLiveProctorSession error:', err);
    }
  );
};

export const subscribeLiveProctorExam = (
  examId: string,
  callback: (data: Record<string, any>) => void
): (() => void) | null => {
  if (!realtimeDb || !examId) return null;
  const proctorRef = ref(realtimeDb, `live_proctor/${examId}`);
  return onValue(
    proctorRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() || {});
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('subscribeLiveProctorExam error:', err);
    }
  );
};
