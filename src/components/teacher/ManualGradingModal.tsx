import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Award,
  Save,
  RotateCcw,
  Sparkles,
  Calculator,
  User,
  BookOpen,
  HelpCircle,
  FileCheck,
  Check,
  AlertCircle,
  MessageSquare,
  Sliders,
  Plus,
  AlertTriangle,
  Clock,
  ShieldAlert,
  GraduationCap,
  Filter,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { Exam, ExamSubmission, ExamSession, Question, StudentAnswer, TrueFalseBarem } from '../../types';
import { MathRenderer } from '../../lib/katex-renderer';
import { calculateExamScore, gradeQuestion, resolveStudentAnswer } from '../../lib/grading';

export interface ManualGradingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  submission: ExamSubmission;
  exam: Exam;
  session?: ExamSession | null;
  onSave: (updatedSubmission: ExamSubmission) => void;
}

export const ManualGradingModal: React.FC<ManualGradingModalProps> = ({
  isOpen = true,
  onClose,
  submission,
  exam,
  session,
  onSave,
}) => {
  // Clone answers for local editing
  const [editedAnswers, setEditedAnswers] = useState<{ [qId: string]: StudentAnswer }>({});
  const [teacherGeneralNote, setTeacherGeneralNote] = useState<string>('');
  const [activeQuestionId, setActiveQuestionId] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct' | 'unanswered'>('all');

  // Per-question Barem model overrides for True/False
  const [tfBaremMap, setTfBaremMap] = useState<Record<string, TrueFalseBarem>>({});
  const [globalTfBarem, setGlobalTfBarem] = useState<TrueFalseBarem>(
    exam.settings.scoringModel || 'moet_2025'
  );

  // Initialize on mount or change
  useEffect(() => {
    if (submission && exam) {
      const initial: { [qId: string]: StudentAnswer } = {};
      const initialBarem: Record<string, TrueFalseBarem> = {};
      const questions = exam.questions || [];

      questions.forEach((q, idx) => {
        initialBarem[q.id] = (q.scoringModel as TrueFalseBarem) || exam.settings.scoringModel || 'moet_2025';
        const existingAns = resolveStudentAnswer(q, idx, submission.answers);
        if (existingAns) {
          const { awardedPoints, isCorrect } = gradeQuestion(q, existingAns);
          initial[q.id] = {
            ...existingAns,
            awardedPoints: existingAns.awardedPoints !== undefined && !isNaN(Number(existingAns.awardedPoints))
              ? Number(existingAns.awardedPoints)
              : awardedPoints,
            isCorrect: existingAns.isCorrect !== undefined ? Boolean(existingAns.isCorrect) : isCorrect,
          };
        } else {
          initial[q.id] = {
            questionId: q.id,
            type: q.type,
            awardedPoints: 0,
            isCorrect: false,
          };
        }
      });

      setEditedAnswers(initial);
      setTfBaremMap(initialBarem);
      setGlobalTfBarem(exam.settings.scoringModel || 'moet_2025');
      setTeacherGeneralNote(submission.teacherNote || '');
      if (questions.length > 0) {
        setActiveQuestionId(questions[0].id);
      }
      setIsSaved(false);
    }
  }, [submission, exam]);

  if (!submission || !exam) return null;

  const questionsList = exam.questions || [];

  // Calculate live score from editedAnswers
  const calculateLiveScore = () => {
    let totalScore = 0;
    let maxScore = 0;
    let answeredCount = 0;
    let totalCorrect = 0;
    let unansweredCount = 0;

    questionsList.forEach((q) => {
      const qPoints = q.points !== undefined && !isNaN(Number(q.points))
        ? Number(q.points)
        : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);
      maxScore += qPoints;

      const ans = editedAnswers[q.id];
      let isAnswered = false;
      if (ans) {
        if (q.type === 'multiple_choice' && ans.selectedOptionId) isAnswered = true;
        if (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) isAnswered = true;
        if (q.type === 'short_answer' && ans.shortAnswerText && ans.shortAnswerText.trim().length > 0) isAnswered = true;

        if (isAnswered) answeredCount++;

        const pts = ans.awardedPoints !== undefined ? Number(ans.awardedPoints) : 0;
        totalScore += pts;
        if (ans.isCorrect || (pts >= qPoints && qPoints > 0)) totalCorrect++;
      }
      if (!isAnswered) unansweredCount++;
    });

    const rawScore = Math.round(totalScore * 100) / 100;
    const safeMaxScore = Math.round(maxScore * 100) / 100;
    let scaledScore10 = 0;
    if (safeMaxScore > 0) {
      if (Math.abs(safeMaxScore - 10.0) < 0.1) {
        scaledScore10 = Math.min(10, Math.max(0, rawScore));
      } else {
        scaledScore10 = Math.min(10, Math.max(0, Math.round((totalScore / safeMaxScore) * 10 * 100) / 100));
      }
    }

    return {
      rawScore,
      maxScore: safeMaxScore,
      scaledScore10,
      answeredCount,
      unansweredCount,
      totalCorrect,
      wrongCount: Math.max(0, answeredCount - totalCorrect),
    };
  };

  const liveStats = calculateLiveScore();

  // Handlers for manual grading modifications
  const handleSetCustomPoints = (q: Question, points: number) => {
    const qPoints = q.points !== undefined && !isNaN(Number(q.points))
      ? Number(q.points)
      : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);

    const safePts = isNaN(points) ? 0 : Math.max(0, points);
    const isCorrect = safePts >= qPoints;

    setEditedAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...(prev[q.id] || { questionId: q.id, type: q.type }),
        awardedPoints: safePts,
        isCorrect,
      },
    }));
  };

  // Change student's selected multiple choice option
  const handleSelectStudentOption = (q: Question, optionLabel: string) => {
    const currAns = editedAnswers[q.id] || { questionId: q.id, type: 'multiple_choice' };
    const updatedAns: StudentAnswer = {
      ...currAns,
      selectedOptionId: optionLabel,
    };
    const { awardedPoints, isCorrect } = gradeQuestion(q, updatedAns);
    setEditedAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...updatedAns,
        awardedPoints,
        isCorrect,
      },
    }));
  };

  // Change barem for a specific True/False question
  const handleChangeTfBarem = (q: Question, newBarem: TrueFalseBarem) => {
    setTfBaremMap((prev) => ({ ...prev, [q.id]: newBarem }));
    const currAns = editedAnswers[q.id] || { questionId: q.id, type: 'true_false', trueFalseAnswers: {} };
    const { awardedPoints, isCorrect } = gradeQuestion({ ...q, scoringModel: newBarem }, currAns);

    setEditedAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...currAns,
        awardedPoints,
        isCorrect,
      },
    }));
  };

  // Apply global Barem to all True/False questions
  const handleApplyGlobalTfBarem = (newBarem: TrueFalseBarem) => {
    setGlobalTfBarem(newBarem);
    const updatedBaremMap: Record<string, TrueFalseBarem> = {};
    const updatedAnsMap: { [qId: string]: StudentAnswer } = { ...editedAnswers };

    questionsList.forEach((q) => {
      if (q.type === 'true_false') {
        updatedBaremMap[q.id] = newBarem;
        const currAns = updatedAnsMap[q.id] || { questionId: q.id, type: 'true_false', trueFalseAnswers: {} };
        const { awardedPoints, isCorrect } = gradeQuestion({ ...q, scoringModel: newBarem }, currAns);
        updatedAnsMap[q.id] = {
          ...currAns,
          awardedPoints,
          isCorrect,
        };
      }
    });

    setTfBaremMap(updatedBaremMap);
    setEditedAnswers(updatedAnsMap);
  };

  // Toggle true false sub-item
  const handleToggleSubItem = (q: Question, itemId: string, currentVal?: boolean) => {
    const currAns = editedAnswers[q.id] || { questionId: q.id, type: 'true_false', trueFalseAnswers: {} };
    const currentSubAnswers = { ...(currAns.trueFalseAnswers || {}) };

    let nextVal: boolean | undefined;
    if (currentVal === true) nextVal = false;
    else if (currentVal === false) nextVal = undefined;
    else nextVal = true;

    if (nextVal !== undefined) {
      currentSubAnswers[itemId] = nextVal;
    } else {
      delete currentSubAnswers[itemId];
    }

    const updatedAns: StudentAnswer = {
      ...currAns,
      trueFalseAnswers: currentSubAnswers,
    };

    const qBarem = tfBaremMap[q.id] || globalTfBarem;
    const { awardedPoints, isCorrect } = gradeQuestion({ ...q, scoringModel: qBarem }, updatedAns);

    setEditedAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...updatedAns,
        awardedPoints,
        isCorrect,
      },
    }));
  };

  // Reset question to automatic grading
  const handleResetQuestionToAuto = (q: Question) => {
    const originalAnswer = submission.answers?.[q.id];
    if (originalAnswer) {
      const qBarem = tfBaremMap[q.id] || globalTfBarem;
      const { awardedPoints, isCorrect } = gradeQuestion({ ...q, scoringModel: qBarem }, originalAnswer);
      setEditedAnswers((prev) => ({
        ...prev,
        [q.id]: {
          ...originalAnswer,
          awardedPoints,
          isCorrect,
        },
      }));
    }
  };

  // Reset ALL questions to automatic grading
  const handleResetAllToAuto = () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục chấm tự động cho toàn bộ các câu của bài thi này theo đáp án chuẩn?')) {
      return;
    }
    const { gradedAnswers } = calculateExamScore(questionsList, submission.answers || {});
    setEditedAnswers(gradedAnswers);
  };

  // Save manual modifications
  const handleSaveAll = () => {
    const { scaledScore10, answeredCount, totalCorrect, wrongCount } = liveStats;

    const updatedSubmission: ExamSubmission = {
      ...submission,
      score: scaledScore10,
      answeredCount,
      correctCount: totalCorrect,
      wrongCount,
      answers: editedAnswers,
      teacherNote: teacherGeneralNote.trim() || undefined,
    };

    onSave(updatedSubmission);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  // Filter questions based on selected tab
  const filteredQuestions = questionsList.filter((q) => {
    const ans = editedAnswers[q.id];
    const qPoints = q.points !== undefined && !isNaN(Number(q.points))
      ? Number(q.points)
      : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);
    const awardedPts = ans?.awardedPoints ?? 0;
    const isCorrect = ans?.isCorrect || (awardedPts >= qPoints && qPoints > 0);

    let isAnswered = false;
    if (ans) {
      if (q.type === 'multiple_choice' && ans.selectedOptionId) isAnswered = true;
      if (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) isAnswered = true;
      if (q.type === 'short_answer' && ans.shortAnswerText && ans.shortAnswerText.trim().length > 0) isAnswered = true;
    }

    if (filterMode === 'correct') return isCorrect;
    if (filterMode === 'wrong') return isAnswered && !isCorrect;
    if (filterMode === 'unanswered') return !isAnswered;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. TOP HERO BANNER (Standard FEXAM Gradient Banner) */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-700 p-6 sm:p-8 rounded-3xl text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Left info & Back button */}
        <div className="space-y-3 relative z-10 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md border border-white/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Danh Sách</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md">
              <Calculator className="w-3.5 h-3.5 text-amber-300" />
              <span>Chấm Điểm &amp; Sửa Điểm Chi Tiết</span>
            </span>

            <span className="font-mono text-xs text-amber-200 font-bold bg-black/20 px-2.5 py-0.5 rounded-lg border border-white/20">
              SBD: {submission.studentCode || 'N/A'}
            </span>

            {submission.className && (
              <span className="text-xs text-white font-bold bg-white/20 px-2.5 py-0.5 rounded-lg border border-white/20">
                Lớp {submission.className}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
            {submission.studentName}
          </h1>

          <p className="text-slate-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Đang chấm bài thi: <strong className="text-amber-200">{exam.title}</strong>
            {session?.title ? ` (Ca thi: ${session.title})` : ''}.
          </p>
        </div>

        {/* Right: Live Dynamic Scoreboard & Save Button */}
        <div className="flex flex-wrap items-center gap-4 shrink-0 relative z-10">
          {/* Glass Score Box */}
          <div className="bg-white/15 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-white/25 flex items-center gap-4 shadow-sm">
            <div className="text-center sm:text-right">
              <div className="text-[10px] uppercase font-black text-amber-200 tracking-wider">Điểm Thang 10</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono leading-none mt-0.5">
                {liveStats.scaledScore10} <span className="text-xs text-white/70 font-normal">/ 10</span>
              </div>
            </div>

            <div className="h-8 w-px bg-white/25" />

            <div className="text-left text-xs leading-snug space-y-0.5">
              <div className="text-white font-bold">
                Điểm gốc: <span className="font-mono font-black text-amber-300">{liveStats.rawScore}</span> / {liveStats.maxScore}đ
              </div>
              <div className="text-emerald-200 font-medium text-[11px] flex items-center gap-2">
                <span>✓ {liveStats.totalCorrect} đúng</span>
                <span className="text-rose-200">✗ {liveStats.wrongCount} sai</span>
                {liveStats.unansweredCount > 0 && (
                  <span className="text-amber-200">⚠ {liveStats.unansweredCount} trống</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleResetAllToAuto}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all cursor-pointer"
              title="Khôi phục chấm tự động cho toàn bộ bài thi theo đáp án chuẩn"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Chấm Lại Gốc</span>
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaved}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-brand-700 font-black text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-brand-600" />}
              <span>{isSaved ? 'ĐÃ LƯU THÀNH CÔNG!' : 'LƯU & CẬP NHẬT'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN BODY LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Question Stream & Filters (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sub-Header / Filter Bar */}
          <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-card flex flex-wrap items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl text-xs flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({questionsList.length})
              </button>
              <button
                onClick={() => setFilterMode('wrong')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'wrong'
                    ? 'bg-rose-50 text-rose-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                Câu sai ({liveStats.wrongCount})
              </button>
              <button
                onClick={() => setFilterMode('correct')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'correct'
                    ? 'bg-emerald-50 text-emerald-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-emerald-600'
                }`}
              >
                Câu đúng ({liveStats.totalCorrect})
              </button>
              {liveStats.unansweredCount > 0 && (
                <button
                  onClick={() => setFilterMode('unanswered')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filterMode === 'unanswered'
                      ? 'bg-amber-50 text-amber-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-amber-600'
                  }`}
                >
                  Chưa làm ({liveStats.unansweredCount})
                </button>
              )}
            </div>

            {/* Quick Barem Status */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pr-2">
              <Sliders className="w-3.5 h-3.5 text-brand-600" />
              <span>Barem Đ/S: </span>
              <strong className="text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                {globalTfBarem === 'moet_2025' ? 'Chuẩn Bộ 2025' : 'Chia đều 4 ý'}
              </strong>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-6">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-card text-center space-y-3 max-w-md mx-auto my-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Không có câu hỏi phù hợp với bộ lọc</h3>
                <p className="text-xs text-slate-500">
                  Hãy chọn tab "Tất cả" để xem toàn bộ danh sách câu hỏi của bài thi.
                </p>
                <button
                  onClick={() => setFilterMode('all')}
                  className="px-4 py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs hover:bg-brand-100 transition-colors"
                >
                  Xem tất cả câu hỏi
                </button>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const order = q.order || idx + 1;
                const ans = editedAnswers[q.id];
                const qPoints = q.points !== undefined && !isNaN(Number(q.points))
                  ? Number(q.points)
                  : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);

                const isCorrect = ans?.isCorrect ?? false;
                const awardedPts = ans?.awardedPoints ?? 0;
                const isHighlight = activeQuestionId === q.id;
                const currentTfBarem = tfBaremMap[q.id] || globalTfBarem;

                const quickPicks = [0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, qPoints].filter(
                  (val, i, self) => self.indexOf(val) === i
                ).sort((a, b) => a - b);

                return (
                  <div
                    key={q.id}
                    id={`question-card-${q.id}`}
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`p-6 rounded-3xl border transition-all ${
                      isHighlight
                        ? 'border-brand-500 bg-white ring-2 ring-brand-200 shadow-md'
                        : 'border-slate-100 bg-white hover:border-slate-300 shadow-card'
                    }`}
                  >
                    {/* Card Header: Badge, Type, Scores & Quick Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                      {/* Left Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-8 h-8 rounded-2xl bg-brand-600 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                          {order}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {q.type === 'multiple_choice'
                            ? 'Trắc nghiệm 4 lựa chọn'
                            : q.type === 'true_false'
                            ? `Đúng / Sai 4 ý (${currentTfBarem === 'moet_2025' ? 'Barem Bộ 2025' : 'Chia đều 4 ý'})`
                            : 'Trả lời ngắn'}
                        </span>
                        <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
                          Điểm đề: {qPoints}đ
                        </span>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                          awardedPts >= qPoints && qPoints > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : awardedPts > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}>
                          Đạt: {awardedPts}đ
                        </span>
                      </div>

                      {/* Right Grading Controls */}
                      <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                        {/* Preset buttons */}
                        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
                          {quickPicks.map((pt) => {
                            const isSelected = Math.abs(awardedPts - pt) < 0.001;
                            return (
                              <button
                                key={pt}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCustomPoints(q, pt);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-600 text-white shadow-xs'
                                    : pt === 0
                                    ? 'text-rose-600 hover:bg-white'
                                    : pt === qPoints
                                    ? 'text-emerald-700 hover:bg-white'
                                    : 'text-slate-700 hover:bg-white'
                                }`}
                                title={pt === 0 ? 'Chấm 0 điểm (Sai)' : pt === qPoints ? `Cộng tối đa (${qPoints}đ)` : `Cộng ${pt} điểm`}
                              >
                                {pt === 0 ? '0đ' : `+${pt}đ`}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom input */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-2xl border border-slate-300 shadow-2xs">
                          <span className="text-[11px] text-slate-500 font-bold">Điểm:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={awardedPts}
                            onChange={(e) => handleSetCustomPoints(q, parseFloat(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-14 px-1.5 py-0.5 rounded-lg font-mono text-xs font-black text-brand-700 text-center focus:ring-2 focus:ring-brand-500 focus:outline-none bg-brand-50/50"
                            title="Tự do nhập bất kỳ số điểm nào cho câu hỏi này"
                          />
                        </div>

                        {/* True/False Barem Switcher */}
                        {q.type === 'true_false' && (
                          <select
                            value={currentTfBarem}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleChangeTfBarem(q, e.target.value as TrueFalseBarem);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
                          >
                            <option value="moet_2025">Barem Bộ 2025</option>
                            <option value="proportional">Chia đều 4 ý</option>
                          </select>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetQuestionToAuto(q);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="Chấm lại tự động câu này theo đáp án gốc"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="text-sm font-semibold text-slate-900 leading-relaxed mb-4">
                      <MathRenderer content={q.prompt} />
                    </div>

                    {/* Visual Comparison Area */}
                    <div className="space-y-4 pt-1">
                      {/* MULTIPLE CHOICE TYPE */}
                      {q.type === 'multiple_choice' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Student Pick */}
                          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200">
                              <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                                Lựa chọn của học sinh:
                              </span>
                              {ans?.selectedOptionId ? (
                                <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-black px-2.5 py-1 rounded-lg border shadow-2xs ${
                                  isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}>
                                  {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                                  Đã chọn: [{ans.selectedOptionId}]
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Chưa làm / Bỏ trống
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {(q.options || []).map((opt) => {
                                const studentSelected = (ans?.selectedOptionId || '').trim();
                                const isPicked = Boolean(
                                  studentSelected && (
                                    studentSelected.toUpperCase() === (opt.label || '').trim().toUpperCase() ||
                                    studentSelected === (opt.id || '').trim() ||
                                    studentSelected.toLowerCase() === (opt.text || '').trim().toLowerCase() ||
                                    studentSelected.replace(/\$/g, '').trim().toLowerCase() === (opt.text || '').replace(/\$/g, '').trim().toLowerCase()
                                  )
                                );

                                return (
                                  <div
                                    key={opt.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectStudentOption(q, opt.label);
                                    }}
                                    className={`p-3 rounded-2xl text-xs flex items-center gap-3 border cursor-pointer transition-all ${
                                      isPicked
                                        ? isCorrect
                                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300 shadow-sm'
                                          : 'bg-rose-50 border-rose-500 text-rose-950 font-bold ring-2 ring-rose-300 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/90'
                                    }`}
                                    title={`Bấm để chuyển lựa chọn của học sinh sang phương án ${opt.label}`}
                                  >
                                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                      isPicked
                                        ? isCorrect
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {opt.label}
                                    </span>
                                    <span className="flex-1 font-medium"><MathRenderer content={opt.text} /></span>
                                    {isPicked && (
                                      <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg shadow-2xs border shrink-0 ${
                                        isCorrect ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
                                      }`}>
                                        Học sinh chọn
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Correct Key */}
                          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-emerald-200">
                              <span className="font-black text-emerald-900 uppercase tracking-wider text-[11px]">
                                Đáp án đúng của đề thi:
                              </span>
                              <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                                Khóa chuẩn: {q.correctOptionId || 'Chưa thiết lập'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {(q.options || []).map((opt) => {
                                const isKey =
                                  opt.label.toUpperCase() === (q.correctOptionId || '').trim().toUpperCase() ||
                                  opt.id === (q.correctOptionId || '').trim();
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-3 rounded-2xl text-xs flex items-center gap-3 border ${
                                      isKey
                                        ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-black shadow-xs ring-1 ring-emerald-300'
                                        : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isKey ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {opt.label}
                                    </span>
                                    <span className="flex-1 font-medium"><MathRenderer content={opt.text} /></span>
                                    {isKey && (
                                      <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-2xs shrink-0">
                                        Đáp án chuẩn
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TRUE / FALSE TYPE */}
                      {q.type === 'true_false' && q.trueFalseItems && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pb-1.5 border-b border-slate-200">
                            <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                              Đối chiếu 4 ý khẳng định:
                            </span>
                            <div className="text-slate-600 text-[11px] font-medium">
                              {currentTfBarem === 'moet_2025'
                                ? 'Barem Bộ GD&ĐT 2025: 1 ý = 10% · 2 ý = 25% · 3 ý = 50% · 4 ý = 100%'
                                : 'Barem chia đều: Mỗi ý đúng = 25% điểm câu'}
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {q.trueFalseItems.map((item, itemIdx) => {
                              const rawStudentVal =
                                ans?.trueFalseAnswers?.[item.id] !== undefined
                                  ? ans?.trueFalseAnswers?.[item.id]
                                  : ans?.trueFalseAnswers?.[item.label] !== undefined
                                  ? ans?.trueFalseAnswers?.[item.label]
                                  : ans?.trueFalseAnswers?.[item.label?.toLowerCase()] !== undefined
                                  ? ans?.trueFalseAnswers?.[item.label?.toLowerCase()]
                                  : ans?.trueFalseAnswers?.[String(itemIdx + 1)] !== undefined
                                  ? ans?.trueFalseAnswers?.[String(itemIdx + 1)]
                                  : ans?.trueFalseAnswers?.[`item_${itemIdx + 1}`] !== undefined
                                  ? ans?.trueFalseAnswers?.[`item_${itemIdx + 1}`]
                                  : undefined;

                              const studentBool = typeof rawStudentVal === 'boolean'
                                ? rawStudentVal
                                : typeof rawStudentVal === 'string'
                                ? ((rawStudentVal as string).toLowerCase() === 'true' || (rawStudentVal as string).toLowerCase() === 'đúng' || (rawStudentVal as string).toLowerCase() === 'dung')
                                : undefined;

                              const itemCorrectBool = typeof item.isCorrect === 'boolean'
                                ? item.isCorrect
                                : typeof item.isCorrect === 'string'
                                ? ((item.isCorrect as string).toLowerCase() === 'true' || (item.isCorrect as string).toLowerCase() === 'đúng' || (item.isCorrect as string).toLowerCase() === 'dung')
                                : false;

                              const isItemMatch = studentBool !== undefined && studentBool === itemCorrectBool;

                              return (
                                <div
                                  key={item.id}
                                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                                    isItemMatch
                                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                                      : studentBool !== undefined
                                      ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 max-w-xl">
                                    <span className="font-black text-slate-900 bg-slate-100 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                                      {item.label || String.fromCharCode(97 + itemIdx)}
                                    </span>
                                    <div className="text-slate-800 font-medium">
                                      <MathRenderer content={item.statement} />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto flex-wrap">
                                    <div className="text-right text-[11px] bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                                      <span className="text-slate-500">Học sinh: </span>
                                      <strong className={
                                        studentBool === undefined
                                          ? 'text-slate-400 italic'
                                          : isItemMatch
                                          ? 'text-emerald-700 font-black'
                                          : 'text-rose-600 font-black'
                                      }>
                                        {studentBool === true ? '✓ ĐÚNG' : studentBool === false ? '✗ SAI' : 'Chưa chọn'}
                                      </strong>
                                    </div>

                                    <div className="text-right text-[11px] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                      <span className="text-emerald-800">Khóa đề: </span>
                                      <strong className="text-emerald-800 font-black">{itemCorrectBool ? 'ĐÚNG' : 'SAI'}</strong>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSubItem(q, item.id, studentBool);
                                      }}
                                      className="px-3 py-1 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[11px] border border-brand-200 transition-colors cursor-pointer"
                                      title="Đổi trạng thái lựa chọn của học sinh để tự tính lại điểm theo barem"
                                    >
                                      Đổi lựa chọn
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* SHORT ANSWER TYPE */}
                      {q.type === 'short_answer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                              <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                                Câu trả lời học sinh nhập:
                              </span>
                              {ans?.shortAnswerText ? (
                                <span className={`inline-flex items-center gap-1 font-mono text-xs font-black px-2.5 py-0.5 rounded-md border ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}>
                                  {isCorrect ? '✓ Khớp đáp án' : '✗ Chưa khớp'}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                                  ⚠️ Chưa làm / Bỏ trống
                                </span>
                              )}
                            </div>
                            <div className={`p-3.5 rounded-2xl border font-mono text-sm font-black ${
                              ans?.shortAnswerText
                                ? isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                                  : 'bg-rose-50/70 border-rose-300 text-rose-900'
                                : 'bg-white border-slate-300 text-slate-400 italic'
                            }`}>
                              {ans?.shortAnswerText ? ans.shortAnswerText : 'Chưa nhập câu trả lời'}
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between text-xs pb-1 border-b border-emerald-200">
                              <span className="font-black text-emerald-900 uppercase tracking-wider text-[11px]">
                                Đáp án chấp nhận của đề thi:
                              </span>
                              <span className="text-xs font-bold text-emerald-700">Khóa chuẩn</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 font-mono text-sm font-black text-emerald-950">
                              {q.shortAnswerCorrect && q.shortAnswerCorrect.length > 0
                                ? q.shortAnswerCorrect.join('  hoặc  ')
                                : <span className="text-rose-500 italic">Chưa nhập đáp án</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Question Explanation */}
                      {q.explanation && (
                        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-brand-950 space-y-1">
                          <div className="font-black text-brand-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                            <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                            <span>Lời giải chi tiết:</span>
                          </div>
                          <div className="pl-5 leading-relaxed font-medium text-slate-800">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Matrix Jumper, Barem & Student Info (4 Columns) */}
        <div className="lg:col-span-4 space-y-5 sticky top-6">
          {/* Question Quick Jump Matrix */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-brand-600" />
                <span>Ma Trận Câu Hỏi</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {questionsList.length} câu
              </span>
            </div>

            {/* Status color legend */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
              <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đúng
              </div>
              <div className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sai
              </div>
              <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Trống/Lẻ
              </div>
            </div>

            {/* Quick Jump Buttons Grid */}
            <div className="grid grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
              {questionsList.map((q, idx) => {
                const order = q.order || idx + 1;
                const ans = editedAnswers[q.id];
                const qPoints = q.points !== undefined && !isNaN(Number(q.points))
                  ? Number(q.points)
                  : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);
                const awardedPts = ans?.awardedPoints ?? 0;
                const isCorrect = ans?.isCorrect || (awardedPts >= qPoints && qPoints > 0);
                const isCurrent = activeQuestionId === q.id;

                let isAnswered = false;
                if (ans) {
                  if (q.type === 'multiple_choice' && ans.selectedOptionId) isAnswered = true;
                  if (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) isAnswered = true;
                  if (q.type === 'short_answer' && ans.shortAnswerText && ans.shortAnswerText.trim().length > 0) isAnswered = true;
                }

                let bgClass = 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100';
                if (isAnswered) {
                  if (isCorrect) {
                    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-black';
                  } else if (awardedPts > 0) {
                    bgClass = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-bold';
                  } else {
                    bgClass = 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-bold';
                  }
                } else {
                  bgClass = 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveQuestionId(q.id);
                      const el = document.getElementById(`question-card-${q.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`h-10 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center justify-center border cursor-pointer ${bgClass} ${
                      isCurrent ? 'ring-2 ring-brand-500 scale-105 shadow-sm' : ''
                    }`}
                    title={`Câu ${order}: ${isCorrect ? 'Đúng' : awardedPts > 0 ? `Đạt ${awardedPts}đ` : isAnswered ? 'Sai (0đ)' : 'Chưa làm'}`}
                  >
                    <span>{order}</span>
                    <span className="text-[9px] font-mono leading-none opacity-80">{awardedPts}đ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Barem Selector */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-brand-600" />
                <span>Cấu Hình Barem Đúng/Sai:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleApplyGlobalTfBarem('moet_2025')}
                className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  globalTfBarem === 'moet_2025'
                    ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Chuẩn Bộ 2025
                <div className="text-[10px] font-normal opacity-80">10-25-50-100%</div>
              </button>

              <button
                onClick={() => handleApplyGlobalTfBarem('proportional')}
                className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  globalTfBarem === 'proportional'
                    ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Chia đều 4 ý
                <div className="text-[10px] font-normal opacity-80">25% mỗi ý</div>
              </button>
            </div>
          </div>

          {/* Student & Session Information Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3 text-xs">
            <div className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
              <User className="w-4 h-4 text-brand-600" />
              <span>Thông Tin Thí Sinh</span>
            </div>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Họ tên:</span>
                <strong className="text-slate-900">{submission.studentName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Số báo danh:</span>
                <strong className="font-mono text-brand-700 font-bold">{submission.studentCode || 'N/A'}</strong>
              </div>
              {submission.studentId && (
                <div className="flex justify-between">
                  <span>MSHS:</span>
                  <strong className="font-mono text-slate-800">{submission.studentId}</strong>
                </div>
              )}
              {submission.className && (
                <div className="flex justify-between">
                  <span>Lớp:</span>
                  <strong className="text-slate-900">{submission.className}</strong>
                </div>
              )}
              {session?.code && (
                <div className="flex justify-between">
                  <span>Mã ca thi:</span>
                  <strong className="font-mono text-brand-600">{session.code}</strong>
                </div>
              )}
              {submission.submitTime && (
                <div className="flex justify-between">
                  <span>Nộp lúc:</span>
                  <span>{new Date(submission.submitTime).toLocaleTimeString('vi-VN')}</span>
                </div>
              )}
            </div>

            {/* Violations pill */}
            {submission.violations && submission.violations.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium space-y-1.5">
                <div className="font-bold flex items-center gap-1 text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Có {submission.violations.length} cảnh báo vi phạm trong ca thi:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-700">
                  {submission.violations.slice(0, 3).map((v, i) => (
                    <li key={i}>{v.message || v.type}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Teacher General Feedback Note */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
              <MessageSquare className="w-4 h-4 text-brand-600" />
              <span>Nhận Xét Của Giáo Viên:</span>
            </div>
            <textarea
              rows={3}
              value={teacherGeneralNote}
              onChange={(e) => setTeacherGeneralNote(e.target.value)}
              placeholder="Nhập nhận xét hoặc giải thích lý do điều chỉnh điểm để lưu lại vào bài nộp..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50"
            />
          </div>

          {/* Big Action Save Button */}
          <div className="space-y-2">
            <button
              onClick={handleSaveAll}
              disabled={isSaved}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-brand-600/30 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'ĐÃ LƯU THÀNH CÔNG!' : 'LƯU ĐIỂM & CẬP NHẬT'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer text-center"
            >
              Đóng &amp; Quay Lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
