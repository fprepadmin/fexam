export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface TrueFalseItem {
  id: string;
  label: string; // 'a', 'b', 'c', 'd'
  statement: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  prompt: string;
  imageUrl?: string;
  points: number;
  explanation?: string;
  options?: {
    id: string;
    label: string;
    text: string;
    imageUrl?: string;
  }[];
  correctOptionId?: string;
  trueFalseItems?: TrueFalseItem[];
  shortAnswerCorrect?: string[];
  caseSensitive?: boolean;
  scoringModel?: 'moet_2025' | 'proportional' | 'custom'; // 'moet_2025' (10%-25%-50%-100%), 'proportional' (chia đều), 'custom' (tự do)
}

export type ScoreDisplayMode = 'immediate' | 'after_close' | 'hidden';
export type ShowSolutionMode = 'always' | 'after_close' | 'never';
export type AntiCheatLevel = 'none' | 'standard' | 'strict' | 'maximum';
export type TrueFalseBarem = 'moet_2025' | 'proportional';

export interface ExamSettings {
  durationMinutes: number;
  password?: string;
  maxAttempts: number;
  openTime?: string;
  closeTime?: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  antiCheatLevel: AntiCheatLevel;
  scoreDisplayMode: ScoreDisplayMode;
  showSolutionMode: ShowSolutionMode;
  allowReviewAnswers: boolean;
  requireFullscreen: boolean;
  maxViolationsAllowed: number;
  scoringModel?: TrueFalseBarem; // Barem tính điểm chung cho câu đúng sai
  isPracticeMode?: boolean; // Chế độ Ôn tập & Luyện tập (tắt hoàn toàn chống gian lận)
  isPublished: boolean;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  description?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  code: string;
  settings: ExamSettings;
  questions: Question[];
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  mshs: string; // Mã số học sinh (MSHS)
  name: string; // Họ và tên học sinh
  className: string; // Lớp học (VD: 12A1)
  classId: string; // ID lớp học
  email?: string; // Email học sinh
  phone?: string;
  notes?: string;
  teacherId?: string;
  teacherEmail?: string;
  teacherName?: string;
  studentCode?: string; // Tương thích mã cũ
  createdAt: string;
}

export interface SessionCandidate {
  id: string;
  studentId: string;
  mshs: string; // Mã số học sinh
  name: string; // Họ và tên
  className: string; // Lớp học
  email?: string; // Email học sinh
  candidateCode: string; // Mã dự thi tự sinh (VD: SBD001, 12A1-01)
  status?: 'not_started' | 'in_progress' | 'submitted';
}

export interface ClassRoom {
  id: string;
  name: string;
  code: string;
  grade: string;
  schoolYear: string;
  studentCount: number;
  teacherId?: string;
  teacherEmail?: string;
  teacherName?: string;
  hasPassword?: boolean;
  password?: string;
  createdAt: string;
}

export type SessionStatus = 'active' | 'upcoming' | 'closed';

export interface ExamSession {
  id: string;
  title: string; // e.g. "Ca thi khảo sát Toán 12 - Sáng 26/09"
  code: string; // Mã ca thi e.g. "CA-TOAN-01"
  examId: string;
  examTitle: string;
  examCode: string;
  teacherId?: string;
  teacherEmail?: string;
  teacherName?: string;
  mode: 'class' | 'free'; // 'class' = Theo lớp học (nhập mã dự thi), 'free' = Tự do (nhập tên qua link)
  targetClassIds: string[];
  targetClassNames?: string[];
  candidates?: SessionCandidate[]; // Danh sách thí sinh & Mã dự thi tự động gen
  durationMinutes: number;
  startTime: string; // ISO
  endTime: string; // ISO
  password?: string;
  antiCheatLevel: AntiCheatLevel;
  maxViolationsAllowed: number;
  sessionType?: 'exam' | 'practice'; // 'exam' = Ca thi chính thức, 'practice' = Ca ôn tập / luyện tập
  allowReviewAnswers?: boolean; // Cho phép học sinh xem lại chi tiết bài làm & đáp án
  scoreDisplayMode?: ScoreDisplayMode; // Hiển thị điểm số (immediate | after_close | hidden)
  showSolutionMode?: ShowSolutionMode; // Hiển thị lời giải chi tiết (always | after_close | never)
  status: SessionStatus;
  createdAt: string;
}

export interface ViolationRecord {
  id: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'devtools' | 'copy_paste' | 'mouse_leave' | 'multiple_tabs';
  message: string;
  timestamp: string;
}

export interface QuestionTimelineEntry {
  questionId: string;
  questionOrder: number;
  answeredAt: string;
  timeSpentSeconds?: number;
  summary?: string;
  type?: QuestionType;
}

export interface StudentAnswer {
  questionId: string;
  type: QuestionType;
  selectedOptionId?: string;
  trueFalseAnswers?: { [itemId: string]: boolean };
  shortAnswerText?: string;
  isCorrect?: boolean;
  awardedPoints?: number;
  answeredAt?: string;
  timeSpentSeconds?: number;
}

export type StudentExamStatus = 'not_started' | 'in_progress' | 'submitted' | 'disconnected' | 'flagged';

export interface ExamSubmission {
  id: string;
  sessionId?: string; // ID ca thi
  sessionCode?: string;
  examId: string;
  examCode: string;
  examTitle: string;
  studentId?: string;
  studentName: string; // Họ và tên
  studentCode: string; // Mã dự thi (SBD)
  mshs?: string; // Mã số học sinh (MSHS)
  className?: string; // Lớp học
  email?: string; // Email học sinh
  startTime: string;
  submitTime?: string;
  lastActiveTime: string;
  durationSecondsUsed: number;
  status: StudentExamStatus;
  answers: { [questionId: string]: StudentAnswer };
  score: number;
  maxScore: number;
  answeredCount: number;
  totalQuestions: number;
  correctCount?: number;
  wrongCount?: number;
  violations: ViolationRecord[];
  isFlagged: boolean;
  teacherNote?: string;
  bonusMinutes?: number;
  questionTimeline?: { [questionId: string]: QuestionTimelineEntry };
  averageSpeedSecondsPerQuestion?: number;
  lastAnsweredQuestion?: QuestionTimelineEntry;
}

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  subject: string; // Môn giảng dạy: Toán, Vật lý, Hóa học, Sinh học, Ngữ văn, Tiếng Anh, Lịch sử, Địa lý, Tin học, v.v.
  plan: 'standard' | 'pro' | 'vip';
  role: 'admin' | 'teacher';
  status: 'active' | 'pending' | 'suspended';
  avatar?: string;
  phone?: string;
  school?: string;
  maxExams?: number;
  maxStudents?: number;
  createdAt: string;
}

export interface SystemConfig {
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  cloudinaryConfig?: {
    cloudName: string;
    uploadPreset: string;
    apiKey?: string;
  };
}

