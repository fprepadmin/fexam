import { Exam, ClassRoom, Student, ExamSubmission, TeacherUser, ViolationRecord, ExamSession } from '../types';
import {
  firestoreDb,
  syncTeacherToFirestore,
  deleteTeacherFromFirestore,
  saveExamFirestore,
  deleteExamFirestore,
  saveSessionFirestore,
  deleteSessionFirestore,
  saveClassFirestore,
  deleteClassFirestore,
  saveStudentsFirestore,
  deleteStudentFirestore,
  saveSubmissionFirestore,
  updateSubmissionLiveFirestore,
  recordViolationRealtime,
} from './firebase';

const STORAGE_KEYS = {
  CURRENT_USER: 'fexam_current_user',
  TEACHERS: 'fexam_teachers_list',
  CLASSES: 'fexam_classes',
  STUDENTS: 'fexam_students',
  EXAMS: 'fexam_exams',
  SESSIONS: 'fexam_sessions',
  SUBMISSIONS: 'fexam_submissions',
  PURGE_FLAG: 'fexam_purged_mock_v3',
};

export const ADMIN_EMAILS = [
  'thongtnmfct31178@gmail.com',
];

class FexamStorage {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.purgeStaleMockData();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('fexam_')) {
          this.notify();
        }
      });
    }
  }

  // Purge any stale mock data left in the user's browser localStorage
  private purgeStaleMockData() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.PURGE_FLAG)) {
      localStorage.removeItem(STORAGE_KEYS.EXAMS);
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
      localStorage.removeItem(STORAGE_KEYS.CLASSES);
      localStorage.removeItem(STORAGE_KEYS.STUDENTS);
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PURGE_FLAG, 'true');
    }
    // Ensure active Cloudinary keys
    const currentCloud = localStorage.getItem('fexam_cloudinary_name');
    if (!currentCloud || currentCloud === 'demo') {
      localStorage.setItem('fexam_cloudinary_name', 'dvpj3etcm');
    }
    const currentPreset = localStorage.getItem('fexam_cloudinary_preset');
    if (!currentPreset || currentPreset === 'docs_upload_example_preset') {
      localStorage.setItem('fexam_cloudinary_preset', 'fexambythongtran');
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // ==========================================
  // CURRENT USER / AUTH STATE
  // ==========================================
  getTeacher(): TeacherUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;
      const user: TeacherUser = JSON.parse(data);
      const emailLower = user.email ? user.email.trim().toLowerCase() : '';
      const isAdmin = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === emailLower);
      return {
        ...user,
        role: isAdmin ? 'admin' : 'teacher',
      };
    } catch {
      return null;
    }
  }

  updateTeacher(teacher: TeacherUser) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(teacher));
    this.saveTeacher(teacher);
    this.notify();
  }

  setCurrentUser(teacher: TeacherUser | null) {
    if (teacher) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(teacher));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  // ==========================================
  // TEACHERS DIRECTORY (ADMIN WHITELIST)
  // ==========================================
  getAllTeachers(): TeacherUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (!data) return [];
      const list: TeacherUser[] = JSON.parse(data);
      const map = new Map<string, TeacherUser>();
      list.forEach((t) => {
        const email = (t.email || '').trim().toLowerCase();
        if (email) {
          map.set(email, t);
        }
      });
      return Array.from(map.values());
    } catch {
      return [];
    }
  }

  setAllTeachers(teachers: TeacherUser[]) {
    const map = new Map<string, TeacherUser>();
    teachers.forEach((t) => {
      const email = (t.email || '').trim().toLowerCase();
      if (email) map.set(email, t);
    });
    const unique = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(unique));
    this.notify();
  }

  saveTeacher(teacher: TeacherUser, oldId?: string) {
    const emailLower = teacher.email.trim().toLowerCase();
    const isAdmin = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === emailLower);
    const sanitizedTeacher: TeacherUser = {
      ...teacher,
      role: isAdmin ? 'admin' : 'teacher',
    };

    const list = this.getAllTeachers();
    const index = list.findIndex(
      (t) => (oldId && t.id === oldId) || t.id === sanitizedTeacher.id || t.email.trim().toLowerCase() === emailLower
    );
    const prevOldId = index >= 0 && list[index].id !== sanitizedTeacher.id ? list[index].id : oldId;

    if (index >= 0) {
      list[index] = { ...list[index], ...sanitizedTeacher };
    } else {
      list.push(sanitizedTeacher);
    }

    const map = new Map<string, TeacherUser>();
    list.forEach((t) => {
      const email = (t.email || '').trim().toLowerCase();
      if (email) map.set(email, t);
    });
    const uniqueList = Array.from(map.values());

    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(uniqueList));

    syncTeacherToFirestore(sanitizedTeacher, prevOldId);

    const cur = this.getTeacher();
    if (cur && (cur.id === sanitizedTeacher.id || cur.email.toLowerCase() === emailLower)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ ...cur, ...sanitizedTeacher }));
    }

    this.notify();
  }

  deleteTeacher(id: string) {
    const list = this.getAllTeachers().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(list));
    deleteTeacherFromFirestore(id);
    this.notify();
  }

  findTeacherByEmail(email: string): TeacherUser | undefined {
    const list = this.getAllTeachers();
    return list.find((t) => t.email.trim().toLowerCase() === email.trim().toLowerCase());
  }

  // ==========================================
  // CLASSES (ISOLATED BY TEACHER)
  // ==========================================
  getClasses(forTeacherId?: string): ClassRoom[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
      const all: ClassRoom[] = data ? JSON.parse(data) : [];
      const currentUser = this.getTeacher();

      if (forTeacherId) {
        return all.filter((c) => c.teacherId === forTeacherId);
      }
      if (currentUser?.role === 'admin') {
        return all;
      }
      return all.filter((c) => !c.teacherId || c.teacherId === currentUser?.id);
    } catch {
      return [];
    }
  }

  setClasses(classes: ClassRoom[]) {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    this.notify();
  }

  saveClass(cls: ClassRoom) {
    const current = this.getTeacher();
    if (current) {
      if (!cls.teacherId) cls.teacherId = current.id;
      if (!cls.teacherEmail) cls.teacherEmail = current.email;
      if (!cls.teacherName) cls.teacherName = current.name;
    }
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const classes: ClassRoom[] = data ? JSON.parse(data) : [];
    const index = classes.findIndex((c) => c.id === cls.id);
    if (index >= 0) {
      classes[index] = cls;
    } else {
      classes.unshift(cls);
    }
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    saveClassFirestore(cls);
    this.notify();
  }

  deleteClass(id: string) {
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const classes: ClassRoom[] = data ? JSON.parse(data) : [];
    const filtered = classes.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(filtered));
    deleteClassFirestore(id);
    this.notify();
  }

  // ==========================================
  // STUDENTS
  // ==========================================
  getStudents(classId?: string, forTeacherId?: string): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let all: Student[] = data ? JSON.parse(data) : [];
      const currentUser = this.getTeacher();

      if (forTeacherId) {
        all = all.filter((s) => s.teacherId === forTeacherId);
      } else if (currentUser?.role !== 'admin') {
        all = all.filter((s) => !s.teacherId || s.teacherId === currentUser?.id);
      }

      if (classId) {
        return all.filter((s) => s.classId === classId);
      }
      return all;
    } catch {
      return [];
    }
  }

  setStudents(students: Student[]) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.notify();
  }

  saveStudents(newStudents: Student[]) {
    const currentUser = this.getTeacher();
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const existing: Student[] = data ? JSON.parse(data) : [];
    const map = new Map<string, Student>();
    existing.forEach((s) => map.set(s.id, s));
    
    newStudents.forEach((s) => {
      if (currentUser) {
        if (!s.teacherId) s.teacherId = currentUser.id;
        if (!s.teacherEmail) s.teacherEmail = currentUser.email;
      }
      map.set(s.id, s);
    });

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(merged));

    // Update student counts on classes
    const classesData = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const classes: ClassRoom[] = classesData ? JSON.parse(classesData) : [];
    classes.forEach((cls) => {
      cls.studentCount = merged.filter((s) => s.classId === cls.id).length;
    });
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));

    saveStudentsFirestore(newStudents);
    this.notify();
  }

  deleteStudent(id: string) {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const existing: Student[] = data ? JSON.parse(data) : [];
    const filtered = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));

    const classesData = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const classes: ClassRoom[] = classesData ? JSON.parse(classesData) : [];
    classes.forEach((cls) => {
      cls.studentCount = filtered.filter((s) => s.classId === cls.id).length;
    });
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));

    deleteStudentFirestore(id);
    this.notify();
  }

  // ==========================================
  // EXAMS (ISOLATED BY TEACHER)
  // ==========================================
  getAllExamsRaw(): Exam[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getExams(forTeacherId?: string): Exam[] {
    try {
      const all = this.getAllExamsRaw();
      const currentUser = this.getTeacher();

      if (forTeacherId) {
        return all.filter((e) => e.authorId === forTeacherId);
      }
      if (currentUser?.role === 'admin') {
        return all;
      }
      return all.filter((e) => !e.authorId || e.authorId === currentUser?.id || e.authorEmail === currentUser?.email);
    } catch {
      return [];
    }
  }

  setExams(exams: Exam[]) {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    this.notify();
  }

  getExamById(id: string): Exam | undefined {
    const all = this.getAllExamsRaw();
    return all.find((e) => e.id === id || e.code.toUpperCase() === id.toUpperCase());
  }

  saveExam(exam: Exam) {
    const currentUser = this.getTeacher();
    if (currentUser) {
      if (!exam.authorId || exam.authorId === 'teacher-01') exam.authorId = currentUser.id;
      if (!exam.authorName || exam.authorName === 'Giáo viên') exam.authorName = currentUser.name;
      if (!exam.authorEmail || exam.authorEmail === 'gv@fexam.edu.vn') exam.authorEmail = currentUser.email;
    }

    // Ensure all questions have unique IDs and proper order
    if (exam.questions && Array.isArray(exam.questions)) {
      exam.questions = exam.questions.map((q, idx) => ({
        ...q,
        id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        order: q.order || idx + 1,
      }));
    }

    const exams = this.getAllExamsRaw();
    const index = exams.findIndex((e) => e.id === exam.id);
    if (index >= 0) {
      exams[index] = exam;
    } else {
      exams.unshift(exam);
    }
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    saveExamFirestore(exam);
    this.notify();
  }

  deleteExam(id: string) {
    const exams = this.getAllExamsRaw();
    const targetExam = exams.find((e) => e.id === id);
    const filtered = exams.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(filtered));
    deleteExamFirestore(id);

    // Cascade delete any sessions linked to this deleted exam
    const sessions = this.getAllSessionsRaw();
    const sessionsToDelete = sessions.filter(
      (s) => s.examId === id || (targetExam && s.examCode === targetExam.code)
    );

    if (sessionsToDelete.length > 0) {
      const remainingSessions = sessions.filter(
        (s) => s.examId !== id && (!targetExam || s.examCode !== targetExam.code)
      );
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(remainingSessions));
      sessionsToDelete.forEach((s) => {
        deleteSessionFirestore(s.id);
      });
    }

    // Clean up any stale submissions belonging to this deleted exam / sessions
    const deletedSessionIds = new Set(sessionsToDelete.map((s) => s.id));
    const subs = this.getSubmissions();
    const remainingSubs = subs.filter(
      (sub) => sub.examId !== id && (!sub.sessionId || !deletedSessionIds.has(sub.sessionId))
    );
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(remainingSubs));

    this.notify();
  }

  // ==========================================
  // SESSIONS (CA THI - ISOLATED BY TEACHER)
  // ==========================================
  getAllSessionsRaw(): ExamSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getSessions(forTeacherId?: string): ExamSession[] {
    try {
      const all = this.getAllSessionsRaw();
      const currentUser = this.getTeacher();

      if (forTeacherId) {
        return all.filter((s) => s.teacherId === forTeacherId);
      }
      if (currentUser?.role === 'admin') {
        return all;
      }
      return all.filter((s) => !s.teacherId || s.teacherId === currentUser?.id || s.teacherEmail === currentUser?.email);
    } catch {
      return [];
    }
  }

  setSessions(sessions: ExamSession[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    this.notify();
  }

  getSessionById(id: string): ExamSession | undefined {
    const all = this.getAllSessionsRaw();
    return all.find((s) => s.id === id || s.code.toUpperCase() === id.toUpperCase());
  }

  saveSession(session: ExamSession) {
    const currentUser = this.getTeacher();
    if (currentUser) {
      if (!session.teacherId) session.teacherId = currentUser.id;
      if (!session.teacherEmail) session.teacherEmail = currentUser.email;
      if (!session.teacherName) session.teacherName = currentUser.name;
    }

    const sessions = this.getAllSessionsRaw();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    saveSessionFirestore(session);
    this.notify();
  }

  deleteSession(id: string) {
    const sessions = this.getAllSessionsRaw();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
    deleteSessionFirestore(id);

    // Clean up submissions for this deleted session
    const subs = this.getSubmissions();
    const remainingSubs = subs.filter((sub) => sub.sessionId !== id);
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(remainingSubs));

    this.notify();
  }

  // ==========================================
  // SUBMISSIONS & PROCTORING
  // ==========================================
  getSubmissions(sessionId?: string): ExamSubmission[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      const all: ExamSubmission[] = data ? JSON.parse(data) : [];
      if (sessionId) {
        return all.filter((s) => s.sessionId === sessionId);
      }
      return all;
    } catch {
      return [];
    }
  }

  setSubmissions(subs: ExamSubmission[]) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
    this.notify();
  }

  saveSubmission(submission: ExamSubmission) {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const subs: ExamSubmission[] = data ? JSON.parse(data) : [];
    const index = subs.findIndex((s) => s.id === submission.id);
    if (index >= 0) {
      subs[index] = submission;
    } else {
      subs.unshift(submission);
    }
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
    saveSubmissionFirestore(submission);
    this.notify();
  }

  updateLiveProgress(submissionId: string, updates: Partial<ExamSubmission>) {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const subs: ExamSubmission[] = data ? JSON.parse(data) : [];
    const target = subs.find((s) => s.id === submissionId);
    if (target) {
      Object.assign(target, updates, { lastActiveTime: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
      updateSubmissionLiveFirestore(submissionId, updates, target.sessionId);
      this.notify();
    }
  }

  addViolation(submissionId: string, violation: ViolationRecord) {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const subs: ExamSubmission[] = data ? JSON.parse(data) : [];
    const target = subs.find((s) => s.id === submissionId);
    if (target) {
      target.violations = target.violations || [];
      target.violations.unshift(violation);
      target.isFlagged = true;
      target.lastActiveTime = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
      recordViolationRealtime(submissionId, target.sessionId, violation, target.violations);
      this.notify();
    }
  }

  clearAllData() {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));
    this.notify();
  }
}

export const storage = new FexamStorage();
