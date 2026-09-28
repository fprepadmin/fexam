import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Flag,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Type,
  Check,
  X,
  FileQuestion,
} from 'lucide-react';
import { Exam, ExamSession, Question, StudentAnswer, ExamSubmission, ViolationRecord } from '../../types';
import { useExam } from '../../context/ExamContext';
import { calculateExamScore } from '../../lib/grading';
import { ObfuscatedText } from '../common/ObfuscatedText';
import { ObfuscatedImage } from '../common/ObfuscatedImage';
import { ExamGuard } from '../common/ExamGuard';
import { KeystrokeDynamicsTracker, soundEngine, exitFullscreen } from '../../lib/anti-cheat';

interface StudentExamRoomProps {
  exam: Exam;
  session?: ExamSession;
  studentName: string;
  studentCode: string;
  mshs?: string;
  className?: string;
  email?: string;
  onFinishExam: (submission: ExamSubmission) => void;
}

export const StudentExamRoom: React.FC<StudentExamRoomProps> = ({
  exam,
  session,
  studentName,
  studentCode,
  mshs,
  className,
  email,
  onFinishExam,
}) => {
  const { saveSubmission, updateLiveProgress, recordViolation, submissions } = useExam();

  // Deterministic Submission ID based on session/exam and studentCode (avoids creating duplicate ghost submissions)
  const cleanStudentCodeKey = (studentCode || mshs || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const submissionId = useRef(
    session?.id
      ? `sub_${session.id}_${cleanStudentCodeKey}`
      : `sub_${exam.id}_${cleanStudentCodeKey}`
  ).current;

  // Keystroke Dynamics Tracker instance
  const keystrokeTracker = useRef(new KeystrokeDynamicsTracker()).current;

  // Font Scale state: 1 (normal), 1.15 (large), 1.3 (xlarge)
  const [fontScale, setFontScale] = useState<number>(1);

  // Current question list normalized with guaranteed unique IDs
  const questionsList = React.useMemo(() => {
    return (exam.questions || []).map((q, idx) => ({
      ...q,
      id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${idx + 1}-${exam.id || 'exam'}`,
      order: q.order || idx + 1,
    }));
  }, [exam.questions, exam.id]);

  // Navigation state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [qId: string]: boolean }>({});

  // Answers store
  const [answers, setAnswers] = useState<{ [qId: string]: StudentAnswer }>(() => {
    const saved = localStorage.getItem(`fexam_answers_${submissionId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Timer: Duration in seconds
  const totalSeconds = (exam.settings.durationMinutes || 45) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const saved = localStorage.getItem(`fexam_timer_${submissionId}`);
    return saved ? parseInt(saved, 10) : totalSeconds;
  });

  // Violations store
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const violationsRef = useRef(violations);
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  // Submit confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const startTimeRef = React.useRef<string>(new Date().toISOString());

  // Current question
  const currentQuestion = questionsList[currentQuestionIndex] || questionsList[0];

  // 1. Initial Submission Creation on Server / Local (Guard against overwriting already submitted exam)
  useEffect(() => {
    const existing = submissions.find(
      (s) => s.id === submissionId || (s.studentCode === studentCode && (s.sessionId === session?.id || s.examId === exam.id))
    );
    if (existing && existing.status === 'submitted') {
      onFinishExam(existing);
      return;
    }

    if (!existing) {
      const initialSub: ExamSubmission = {
        id: submissionId,
        sessionId: session?.id,
        sessionCode: session?.code,
        examId: exam.id,
        examCode: exam.code,
        examTitle: exam.title,
        studentName,
        studentCode,
        mshs: mshs || '',
        className: className || 'Tự do',
        email: email || '',
        startTime: new Date().toISOString(),
        lastActiveTime: new Date().toISOString(),
        durationSecondsUsed: 0,
        status: 'in_progress',
        answers: {},
        score: 0,
        maxScore: exam.totalPoints || 10,
        answeredCount: 0,
        totalQuestions: questionsList.length,
        violations: [],
        isFlagged: false,
      };
      saveSubmission(initialSub);
    }

    return () => {
      exitFullscreen().catch(() => {});
    };
  }, []);

  // 2. Listen for teacher interventions
  useEffect(() => {
    const currentSub = submissions.find((s) => s.id === submissionId);
    if (currentSub) {
      if (currentSub.status === 'submitted' && !isSubmittingRef.current) {
        handleFinalSubmit();
        return;
      }
      if (currentSub.bonusMinutes && currentSub.bonusMinutes > 0) {
        setSecondsRemaining((prev) => prev + currentSub.bonusMinutes! * 60);
        soundEngine.playNotice();
      }
      if (currentSub.teacherNote && currentSub.teacherNote !== teacherMessage) {
        setTeacherMessage(currentSub.teacherNote);
        soundEngine.playWarning();
      }
    }
  }, [submissions, submissionId, teacherMessage]);

  // 3. Countdown Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }

        if (prev === 300 || prev === 60) {
          soundEngine.playTimerTick();
        }

        localStorage.setItem(`fexam_timer_${submissionId}`, String(prev - 1));
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submissionId]);

  // 4. Violation Recorder
  const handleRecordGuardViolation = (v: ViolationRecord) => {
    setViolations((prev) => [...prev, v]);
    recordViolation(submissionId, v);
  };

  // 5. Answer selection handlers
  const handleSelectMultipleChoice = (qId: string, optionLabel: string) => {
    const newAnswers = {
      ...answers,
      [qId]: {
        questionId: qId,
        type: 'multiple_choice' as const,
        selectedOptionId: optionLabel,
      },
    };
    setAnswers(newAnswers);
    saveLocalAndSync(newAnswers);
    soundEngine.playNotice();
  };

  const handleToggleTrueFalse = (qId: string, itemId: string, value: boolean) => {
    const current = answers[qId]?.trueFalseAnswers || {};
    const updatedTF = { ...current, [itemId]: value };
    const newAnswers = {
      ...answers,
      [qId]: {
        questionId: qId,
        type: 'true_false' as const,
        trueFalseAnswers: updatedTF,
      },
    };
    setAnswers(newAnswers);
    saveLocalAndSync(newAnswers);
  };

  // Short answer with Keystroke Dynamics Analysis (Anti-AutoType Macro)
  const handleShortAnswerChange = (qId: string, text: string) => {
    const check = keystrokeTracker.checkInput(text);
    if (check.isBot) {
      soundEngine.playWarning();
      const botViolation: ViolationRecord = {
        id: `v-bot-${Date.now()}`,
        type: 'devtools',
        message: check.reason || 'Phát hiện giả lập gõ phím Auto-Type từ AI Macro',
        timestamp: new Date().toISOString(),
      };
      handleRecordGuardViolation(botViolation);
      alert(`CẢNH BÁO: ${check.reason}! Thao tác chèn nhanh đã bị chặn.`);
      return;
    }

    const newAnswers = {
      ...answers,
      [qId]: {
        questionId: qId,
        type: 'short_answer' as const,
        shortAnswerText: text,
      },
    };
    setAnswers(newAnswers);
    saveLocalAndSync(newAnswers);
  };

  const toggleFlagQuestion = (qId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // 6. Save Answers & Debounced Sync to Proctor
  const saveLocalAndSync = (currentAnswers: { [qId: string]: StudentAnswer }) => {
    localStorage.setItem(`fexam_answers_${submissionId}`, JSON.stringify(currentAnswers));

    let count = 0;
    questionsList.forEach((q) => {
      const a = currentAnswers[q.id];
      if (a) {
        if (q.type === 'multiple_choice' && a.selectedOptionId) count++;
        if (q.type === 'true_false' && a.trueFalseAnswers && Object.keys(a.trueFalseAnswers).length > 0) count++;
        if (q.type === 'short_answer' && a.shortAnswerText?.trim()) count++;
      }
    });

    updateLiveProgress(submissionId, {
      answers: currentAnswers,
      answeredCount: count,
      durationSecondsUsed: totalSeconds - secondsRemaining,
    });
  };

  // 7. Final Submit
  const handleFinalSubmit = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const currentAnswers = answersRef.current || answers;
    const { scaledScore10, answeredCount, gradedAnswers } =
      calculateExamScore(questionsList, currentAnswers);

    // Thoát fullscreen khi nộp bài
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const durationUsed = totalSeconds - secondsRemaining;
    const submitTime = new Date().toISOString();

    const correctCount = Object.values(gradedAnswers).filter((a) => a.isCorrect).length;
    const wrongCount = answeredCount - correctCount;
    const finalViolations = violationsRef.current && violationsRef.current.length > 0 ? violationsRef.current : violations;

    const finishedSub: ExamSubmission = {
      id: submissionId,
      sessionId: session?.id,
      sessionCode: session?.code,
      examId: exam.id,
      examCode: exam.code,
      examTitle: exam.title,
      studentName,
      studentCode,
      mshs: mshs || '',
      className: className || 'Tự do',
      email: email || '',
      startTime: startTimeRef.current,
      submitTime,
      lastActiveTime: submitTime,
      durationSecondsUsed: durationUsed,
      status: 'submitted',
      answers: gradedAnswers,
      score: scaledScore10,
      maxScore: 10,
      answeredCount,
      totalQuestions: questionsList.length,
      correctCount,
      wrongCount,
      violations: finalViolations,
      isFlagged: finalViolations.length > 0,
    };

    try {
      localStorage.removeItem(`fexam_timer_${submissionId}`);
      localStorage.removeItem(`fexam_answers_${submissionId}`);
    } catch {}

    saveSubmission(finishedSub);
    onFinishExam(finishedSub);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredTotalCount = questionsList.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === 'multiple_choice') return Boolean(a.selectedOptionId);
    if (q.type === 'true_false') return a.trueFalseAnswers && Object.keys(a.trueFalseAnswers).length > 0;
    if (q.type === 'short_answer') return Boolean(a.shortAnswerText?.trim());
    return false;
  }).length;

  const isPracticeMode = Boolean(
    session?.sessionType === 'practice' ||
    session?.antiCheatLevel === 'none' ||
    exam.settings.isPracticeMode ||
    exam.settings.antiCheatLevel === 'none'
  );

  return (
    <ExamGuard
      disabled={isPracticeMode}
      maxStrikes={exam.settings.maxViolationsAllowed || 3}
      requireFullscreen={isPracticeMode ? false : exam.settings.requireFullscreen}
      onViolation={handleRecordGuardViolation}
      onForceSubmit={handleFinalSubmit}
    >
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between select-none">
        {/* Top App Bar */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shadow-brand-500/30">
              {currentQuestionIndex + 1}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 line-clamp-1">{exam.title}</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Thí sinh: <span className="text-slate-800 font-bold">{studentName}</span> ({studentCode}) · {className}
              </p>
            </div>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono text-sm font-bold shadow-xs ${
              secondsRemaining < 300
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                : 'bg-blue-50 text-brand-700 border-blue-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Right: Anti-cheat badge & Submit button */}
          <div className="flex items-center gap-3">
            {isPracticeMode ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chế độ Ôn tập</span>
              </span>
            ) : violations.length > 0 ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{violations.length} lỗi vi phạm</span>
              </span>
            ) : null}

            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài</span>
            </button>
          </div>
        </header>

        {/* Teacher Broadcast Message Banner */}
        {teacherMessage && (
          <div className="bg-amber-500 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm animate-bounce">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>Giám thị nhắc nhở: {teacherMessage}</span>
            </div>
            <button
              onClick={() => setTeacherMessage(null)}
              className="text-xs bg-black/20 hover:bg-black/30 px-2.5 py-0.5 rounded-lg"
            >
              Đã hiểu
            </button>
          </div>
        )}

        {/* Main Examination Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 cols: Active Question Content & Choices with Anti-OCR Noise */}
          <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xs space-y-6">
            <div className="space-y-6">
              {/* Question Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-brand-600">
                    Câu {currentQuestionIndex + 1} / {questionsList.length}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    {currentQuestion.type === 'multiple_choice'
                      ? 'Trắc nghiệm'
                      : currentQuestion.type === 'true_false'
                      ? 'Đúng / Sai'
                      : 'Trả lời ngắn'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">({currentQuestion.points || 1} điểm)</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Font Zoom Adjuster */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-slate-600 text-xs">
                    <button
                      type="button"
                      onClick={() => setFontScale((prev) => Math.max(0.9, prev - 0.1))}
                      title="Thu nhỏ chữ"
                      className="p-1.5 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1.5 font-bold text-[11px] select-none">
                      {Math.round(fontScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontScale((prev) => Math.min(1.4, prev + 0.1))}
                      title="Phóng to chữ"
                      className="p-1.5 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleFlagQuestion(currentQuestion.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      flaggedQuestions[currentQuestion.id]
                        ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                        : 'bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 text-amber-500" />
                    <span>{flaggedQuestions[currentQuestion.id] ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</span>
                  </button>
                </div>
              </div>

              {/* Question Prompt with Anti-OCR Trap and Font Scaling */}
              <div
                className="text-slate-900 font-medium leading-relaxed"
                style={{ fontSize: `${1.05 * fontScale}rem` }}
              >
                <ObfuscatedText content={currentQuestion.prompt} />
              </div>

              {/* Question Image with OCR Obfuscation & Math Decoy */}
              {currentQuestion.imageUrl && (
                <div className="pt-2">
                  <ObfuscatedImage
                    src={currentQuestion.imageUrl}
                    alt="Hình minh họa đề thi"
                  />
                </div>
              )}

              {/* --- TYPE 1: MULTIPLE CHOICE --- */}
              {currentQuestion.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {(currentQuestion.options || []).map((opt) => {
                    const isSelected = answers[currentQuestion.id]?.selectedOptionId === opt.label;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectMultipleChoice(currentQuestion.id, opt.label)}
                        className={`p-4 rounded-2xl text-left border transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50 border-brand-500 text-brand-950 ring-2 ring-brand-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <div
                          className="flex-1 font-semibold leading-normal"
                          style={{ fontSize: `${0.95 * fontScale}rem` }}
                        >
                          <ObfuscatedText content={opt.text} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* --- TYPE 2: TRUE / FALSE SUB-ITEMS --- */}
              {currentQuestion.type === 'true_false' && (
                <div className="space-y-3 pt-2">
                  {(currentQuestion.trueFalseItems || []).map((tf) => {
                    const studentVal = answers[currentQuestion.id]?.trueFalseAnswers?.[tf.id];
                    return (
                      <div
                        key={tf.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-extrabold text-brand-600 text-sm">{tf.label})</span>
                          <div
                            className="font-semibold text-slate-800"
                            style={{ fontSize: `${0.95 * fontScale}rem` }}
                          >
                            <ObfuscatedText content={tf.statement} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTrueFalse(currentQuestion.id, tf.id, true)}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              studentVal === true
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleTrueFalse(currentQuestion.id, tf.id, false)}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              studentVal === false
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Sai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* --- TYPE 3: SHORT ANSWER WITH KEYSTROKE DYNAMICS --- */}
              {currentQuestion.type === 'short_answer' && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Nhập câu trả lời hoặc số tính toán của bạn:
                  </label>
                  <input
                    type="text"
                    value={answers[currentQuestion.id]?.shortAnswerText || ''}
                    onChange={(e) => handleShortAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Nhập kết quả..."
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Bottom Next / Prev Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <button
                disabled={currentQuestionIndex === questionsList.length - 1}
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.min(questionsList.length - 1, prev + 1))
                }
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-xs font-extrabold text-white transition-all shadow-sm shadow-brand-500/20 cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right 4 cols: Question Palette Matrix */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Bảng câu hỏi</h3>
                <span className="text-xs font-bold text-brand-600">
                  {answeredTotalCount} / {questionsList.length} đã làm
                </span>
              </div>

              {/* Grid Palette */}
              <div className="grid grid-cols-5 gap-2.5 max-h-[380px] overflow-y-auto p-1">
                {questionsList.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isFlagged = flaggedQuestions[q.id];
                  const ans = answers[q.id];
                  let isAnswered = false;

                  if (ans) {
                    if (q.type === 'multiple_choice' && ans.selectedOptionId) isAnswered = true;
                    if (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) isAnswered = true;
                    if (q.type === 'short_answer' && ans.shortAnswerText?.trim()) isAnswered = true;
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-11 rounded-2xl font-black text-xs relative transition-all duration-150 flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-brand-500 scale-105 z-10 border-brand-500'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isFlagged
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600"></span>
                  <span>Đã làm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-400"></span>
                  <span>Đánh dấu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></span>
                  <span>Chưa làm</span>
                </div>
              </div>
            </div>

            {/* Guard Active Indicator Card */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-brand-900">FEXAM Guard Đang Bật</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Hệ thống tự động giám sát toàn màn hình, chặn tab phụ và phân tích tính xác thực bài thi.
              </p>
            </div>
          </div>
        </main>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <Send className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Xác nhận nộp bài thi?</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Hãy kiểm tra lại danh sách câu hỏi trước khi hoàn tất gửi bài về Giám thị.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 text-slate-700 font-medium border border-slate-100">
                <div className="flex items-center justify-between">
                  <span>Số câu đã hoàn thành:</span>
                  <strong className="text-emerald-700 font-bold">{answeredTotalCount} / {questionsList.length} câu</strong>
                </div>
                {questionsList.length - answeredTotalCount > 0 ? (
                  <div className="flex items-center justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Số câu chưa làm:
                    </span>
                    <span>{questionsList.length - answeredTotalCount} câu</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Trạng thái:
                    </span>
                    <span>Đã làm đủ tất cả câu</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                >
                  Làm tiếp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitModal(false);
                    handleFinalSubmit();
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  Nộp bài ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExamGuard>
  );
};
