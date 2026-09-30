import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Search,
  MessageSquare,
  PlusCircle,
  StopCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
  Send,
  X,
  Zap,
  Flame,
  Layers,
  ChevronRight,
  Filter,
  Check,
  Timer,
  AlertCircle,
  HelpCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { Exam, ExamSubmission, ViolationRecord, QuestionTimelineEntry } from '../../types';
import { subscribeLiveProctorExam } from '../../services/firebase';
import { resolveStudentAnswer } from '../../lib/grading';

interface LiveProctoringProps {
  selectedExamId?: string;
  onSelectExam?: (examId: string) => void;
}

export const LiveProctoring: React.FC<LiveProctoringProps> = ({
  selectedExamId,
  onSelectExam,
}) => {
  const {
    exams,
    submissions,
    addBonusMinutes,
    sendTeacherMessage,
    forceSubmitStudent,
  } = useExam();

  // Active exam selection
  const currentExamId = selectedExamId || exams[0]?.id || '';
  const currentExam = exams.find((e) => e.id === currentExamId) || exams[0];

  // Filters & State
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'submitted' | 'flagged' | 'fast_warning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'table'>('grid');
  const [activityTab, setActivityTab] = useState<'all' | 'answers' | 'violations'>('all');

  // Realtime Database instant live_proctor listener (<50ms latency)
  const [liveProctorMap, setLiveProctorMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentExamId) return;
    const unsub = subscribeLiveProctorExam(currentExamId, (data) => {
      setLiveProctorMap(data || {});
    });
    return () => {
      if (unsub) unsub();
    };
  }, [currentExamId]);

  // Modal inspection & messaging
  const [inspectStudent, setInspectStudent] = useState<ExamSubmission | null>(null);
  const [inspectTab, setInspectTab] = useState<'matrix' | 'timeline' | 'actions'>('matrix');
  const [customMessage, setCustomMessage] = useState('');

  // Submissions for this exam
  const rawExamSubs = submissions.filter((s) => s.examId === currentExamId);

  // Merge Realtime Database live data with local/Firestore submissions
  const mergedSubs = rawExamSubs.map((sub) => {
    const liveUpdate = liveProctorMap[sub.id] || Object.values(liveProctorMap).find(
      (v: any) => v && (v.studentCode === sub.studentCode || v.id === sub.id)
    );
    if (!liveUpdate) return sub;
    return {
      ...sub,
      status: liveUpdate.status || sub.status,
      score: liveUpdate.score !== undefined ? liveUpdate.score : sub.score,
      answeredCount: liveUpdate.answeredCount !== undefined ? liveUpdate.answeredCount : sub.answeredCount,
      durationSecondsUsed: liveUpdate.durationSecondsUsed !== undefined ? liveUpdate.durationSecondsUsed : sub.durationSecondsUsed,
      averageSpeedSecondsPerQuestion: liveUpdate.averageSpeedSecondsPerQuestion !== undefined ? liveUpdate.averageSpeedSecondsPerQuestion : sub.averageSpeedSecondsPerQuestion,
      questionTimeline: liveUpdate.questionTimeline || sub.questionTimeline,
      lastAnsweredQuestion: liveUpdate.lastAnsweredQuestion || sub.lastAnsweredQuestion,
      answers: liveUpdate.answers || sub.answers,
      violations: liveUpdate.lastViolation
        ? [liveUpdate.lastViolation, ...(sub.violations || []).filter((v) => v.id !== liveUpdate.lastViolation?.id)]
        : sub.violations,
      lastActiveTime: liveUpdate.lastActiveTime || sub.lastActiveTime,
      isFlagged: liveUpdate.isFlagged !== undefined ? liveUpdate.isFlagged : sub.isFlagged,
    };
  });

  // Also catch candidate entries in RTDB that haven't propagated to Firestore yet
  Object.values(liveProctorMap).forEach((liveCand: any) => {
    if (liveCand && liveCand.id && !mergedSubs.some((s) => s.id === liveCand.id || s.studentCode === liveCand.studentCode)) {
      mergedSubs.push({
        id: liveCand.id,
        sessionId: liveCand.sessionId || '',
        sessionCode: '',
        examId: currentExamId,
        examCode: currentExam?.code || '',
        examTitle: currentExam?.title || '',
        studentName: liveCand.studentName || 'Thí sinh',
        studentCode: liveCand.studentCode || 'SBD',
        mshs: liveCand.mshs || '',
        className: liveCand.className || 'Tự do',
        startTime: liveCand.lastActiveTime || new Date().toISOString(),
        lastActiveTime: liveCand.lastActiveTime || new Date().toISOString(),
        durationSecondsUsed: liveCand.durationSecondsUsed || 0,
        status: liveCand.status || 'in_progress',
        answers: liveCand.answers || {},
        score: liveCand.score || 0,
        maxScore: currentExam?.totalPoints || 10,
        answeredCount: liveCand.answeredCount || 0,
        totalQuestions: currentExam?.questions?.length || 0,
        violations: liveCand.lastViolation ? [liveCand.lastViolation] : [],
        isFlagged: Boolean(liveCand.isFlagged),
        questionTimeline: liveCand.questionTimeline || {},
        averageSpeedSecondsPerQuestion: liveCand.averageSpeedSecondsPerQuestion || 0,
        lastAnsweredQuestion: liveCand.lastAnsweredQuestion || null,
      });
    }
  });

  // Deduplicate per student, prioritizing 'submitted' status
  const examSubStudentMap = new Map<string, ExamSubmission>();
  const sortedRawExamSubs = [...mergedSubs].sort((a, b) => {
    if (a.status === 'submitted' && b.status !== 'submitted') return -1;
    if (b.status === 'submitted' && a.status !== 'submitted') return 1;
    const timeA = new Date(a.submitTime || a.lastActiveTime || a.startTime || 0).getTime();
    const timeB = new Date(b.submitTime || b.lastActiveTime || b.startTime || 0).getTime();
    return timeB - timeA;
  });

  sortedRawExamSubs.forEach((sub) => {
    const key = (sub.studentCode || sub.mshs || sub.id).trim().toUpperCase();
    if (!examSubStudentMap.has(key)) {
      examSubStudentMap.set(key, sub);
    }
  });

  const examSubmissions = Array.from(examSubStudentMap.values());

  const inProgressList = examSubmissions.filter((s) => s.status === 'in_progress');
  const submittedList = examSubmissions.filter((s) => s.status === 'submitted');
  const flaggedList = examSubmissions.filter(
    (s) => s.isFlagged || (s.violations && s.violations.length > 0)
  );
  const fastWarningList = examSubmissions.filter(
    (s) => s.answeredCount >= 3 && s.averageSpeedSecondsPerQuestion !== undefined && s.averageSpeedSecondsPerQuestion > 0 && s.averageSpeedSecondsPerQuestion < 4
  );

  // Calculate overall average room speed
  const activeSpeeds = examSubmissions
    .filter((s) => s.answeredCount > 0 && s.averageSpeedSecondsPerQuestion && s.averageSpeedSecondsPerQuestion > 0)
    .map((s) => s.averageSpeedSecondsPerQuestion || 0);
  const avgRoomSpeed = activeSpeeds.length > 0
    ? Math.round(activeSpeeds.reduce((a, b) => a + b, 0) / activeSpeeds.length)
    : 0;

  // Filtered Display List
  const displayList = examSubmissions.filter((sub) => {
    if (filterStatus === 'in_progress' && sub.status !== 'in_progress') return false;
    if (filterStatus === 'submitted' && sub.status !== 'submitted') return false;
    if (filterStatus === 'flagged' && (!sub.violations || sub.violations.length === 0)) return false;
    if (filterStatus === 'fast_warning') {
      const isFast = sub.answeredCount >= 3 && sub.averageSpeedSecondsPerQuestion !== undefined && sub.averageSpeedSecondsPerQuestion > 0 && sub.averageSpeedSecondsPerQuestion < 4;
      if (!isFast) return false;
    }

    if (
      searchQuery &&
      !sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !sub.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(sub.mshs && sub.mshs.toLowerCase().includes(searchQuery.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  // Aggregated Activity Stream (Answers + Violations)
  interface ActivityEvent {
    id: string;
    type: 'answer' | 'violation';
    student: ExamSubmission;
    timestamp: string;
    title: string;
    detail: string;
    badge?: string;
    isAlert?: boolean;
  }

  const allActivityEvents: ActivityEvent[] = [];

  examSubmissions.forEach((sub) => {
    // 1. Violations
    (sub.violations || []).forEach((v) => {
      allActivityEvents.push({
        id: `v-${v.id || v.timestamp}-${sub.id}`,
        type: 'violation',
        student: sub,
        timestamp: v.timestamp,
        title: `${sub.studentName} vi phạm giám sát`,
        detail: v.message,
        badge: 'Cảnh báo',
        isAlert: true,
      });
    });

    // 2. Question Timeline Entries
    if (sub.questionTimeline) {
      Object.entries(sub.questionTimeline).forEach(([qId, entry]: [string, any]) => {
        if (entry && entry.answeredAt) {
          allActivityEvents.push({
            id: `ans-${qId}-${sub.id}-${entry.answeredAt}`,
            type: 'answer',
            student: sub,
            timestamp: entry.answeredAt,
            title: `${sub.studentName} đã làm Câu ${entry.questionOrder || '?'}${entry.timeSpentSeconds ? ` (${entry.timeSpentSeconds}s)` : ''}`,
            detail: entry.summary || 'Đã ghi nhận câu trả lời',
            badge: `${entry.timeSpentSeconds || 0}s`,
            isAlert: (entry.timeSpentSeconds || 0) < 3,
          });
        }
      });
    }
  });

  allActivityEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredEvents = allActivityEvents.filter((ev) => {
    if (activityTab === 'answers') return ev.type === 'answer';
    if (activityTab === 'violations') return ev.type === 'violation';
    return true;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectStudent || !customMessage.trim()) return;
    sendTeacherMessage(inspectStudent.id, customMessage.trim());
    alert(`Đã gửi thông báo nhắc nhở đến thí sinh ${inspectStudent.studentName}!`);
    setCustomMessage('');
  };

  const handleAddBonus = (sub: ExamSubmission, minutes: number) => {
    addBonusMinutes(sub.id, minutes);
    alert(`Đã cộng thêm +${minutes} phút làm bài cho học sinh ${sub.studentName}!`);
  };

  const handleForceSubmit = (sub: ExamSubmission) => {
    if (
      window.confirm(
        `Xác nhận thu bài cưỡng chế học sinh "${sub.studentName}" ngay lập tức?`
      )
    ) {
      forceSubmitStudent(sub.id);
      if (inspectStudent?.id === sub.id) {
        setInspectStudent(null);
      }
    }
  };

  // Helper to get speed label and styling
  const getSpeedInfo = (sub: ExamSubmission) => {
    const answered = sub.answeredCount || 0;
    const duration = sub.durationSecondsUsed || 0;
    const speed = sub.averageSpeedSecondsPerQuestion || (answered > 0 ? Math.round(duration / answered) : 0);

    if (answered === 0 || speed === 0) {
      return { text: 'Chưa tính', speed: 0, color: 'text-slate-400 bg-slate-100 border-slate-200', isWarning: false };
    }
    if (speed < 4 && answered >= 2) {
      return { text: `⚡ ${speed}s/câu (Siêu tốc)`, speed, color: 'text-rose-700 bg-rose-50 border-rose-200 ring-1 ring-rose-300 font-extrabold animate-pulse', isWarning: true };
    }
    if (speed < 15) {
      return { text: `⚡ ${speed}s/câu (Nhanh)`, speed, color: 'text-amber-700 bg-amber-50 border-amber-200 font-bold', isWarning: false };
    }
    if (speed <= 60) {
      return { text: `⏱️ ${speed}s/câu (Ổn định)`, speed, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-medium', isWarning: false };
    }
    return { text: `⏳ ${speed}s/câu (Thong thả)`, speed, color: 'text-indigo-700 bg-indigo-50 border-indigo-200 font-medium', isWarning: false };
  };

  const questionsList = currentExam?.questions || [];
  const totalExamQuestions = questionsList.length || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Exam Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Giám Sát Trực Tiếp Từng Câu Hỏi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Realtime &lt;50ms
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tức thì câu hỏi thí sinh đang làm, tốc độ trả lời từng câu, phát hiện gian lận và can thiệp nhanh
          </p>
        </div>

        {/* Select Exam Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Đề thi:
          </label>
          <select
            value={currentExamId}
            onChange={(e) => onSelectExam && onSelectExam(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs max-w-xs"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} — {ex.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5 Stats Cards for this Exam */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-brand-50 border-brand-300 shadow-xs ring-2 ring-brand-200'
              : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng thí sinh</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-extrabold text-brand-700 mt-1.5">
            {examSubmissions.length}
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setFilterStatus('in_progress')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterStatus === 'in_progress'
              ? 'bg-sky-50 border-sky-300 shadow-xs ring-2 ring-sky-200'
              : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang làm bài</span>
            <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-sky-600 mt-1.5">
            {inProgressList.length}
          </div>
        </div>

        {/* Submitted */}
        <div
          onClick={() => setFilterStatus('submitted')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterStatus === 'submitted'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-200'
              : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đã nộp bài</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1.5">
            {submittedList.length}
          </div>
        </div>

        {/* Flagged / Violations */}
        <div
          onClick={() => setFilterStatus('flagged')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterStatus === 'flagged'
              ? 'bg-rose-50 border-rose-300 shadow-xs ring-2 ring-rose-200'
              : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Có vi phạm</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1.5">
            {flaggedList.length}
          </div>
        </div>

        {/* Average Room Speed & Fast Warning */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'fast_warning' ? 'all' : 'fast_warning')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            filterStatus === 'fast_warning'
              ? 'bg-amber-50 border-amber-300 shadow-xs ring-2 ring-amber-200'
              : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tốc độ TB phòng</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-extrabold text-slate-900">
              {avgRoomSpeed > 0 ? `${avgRoomSpeed}s` : '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">/câu</span>
          </div>
          {fastWarningList.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-600">
              <AlertTriangle className="w-3 h-3" />
              <span>{fastWarningList.length} thí sinh làm quá nhanh</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: 8 cols Students Matrix + 4 cols Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Student Live Cards */}
        <div className="lg:col-span-8 space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-card">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thí sinh theo Tên, SBD, hoặc MSHS..."
                className="w-full pl-10 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-brand-50 text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Lưới Đầy Đủ
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'compact'
                    ? 'bg-brand-50 text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Thu Gọn
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-brand-50 text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Bảng
              </button>
            </div>
          </div>

          {/* Grid View with Realtime Question Matrix */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayList.map((sub) => {
                const totalQ = totalExamQuestions;
                const answered = sub.answeredCount || 0;
                const progressPercent = Math.min(100, Math.round((answered / totalQ) * 100));
                const hasViolations = sub.violations && sub.violations.length > 0;
                const speedInfo = getSpeedInfo(sub);
                const timeline = sub.questionTimeline || {};

                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-3xl p-5 border transition-all duration-200 shadow-card flex flex-col justify-between hover:shadow-md ${
                      hasViolations
                        ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                        : speedInfo.isWarning
                        ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                        : 'border-slate-100'
                    }`}
                  >
                    <div>
                      {/* Top Bar: SBD + Status + Speed Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white shadow-xs">
                            {sub.studentCode}
                          </span>
                          {sub.mshs && (
                            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {sub.mshs}
                            </span>
                          )}
                        </div>

                        {sub.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span>
                            Đang làm bài
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã nộp ({sub.score}đ)
                          </span>
                        )}
                      </div>

                      {/* Name, Class & Speed Info */}
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                            {sub.studentName}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {sub.className || 'Tự do'} · Bắt đầu lúc{' '}
                            {new Date(sub.startTime).toLocaleTimeString('vi-VN')}
                          </p>
                        </div>
                        <span className={`text-[11px] px-2.5 py-1 rounded-xl border shrink-0 ${speedInfo.color}`}>
                          {speedInfo.text}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3.5">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">
                            Tiến độ: <strong className="text-slate-800">{answered}/{totalQ}</strong> câu
                          </span>
                          <span className="font-extrabold text-brand-600">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-brand-500 to-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Instant Real-Time Question Matrix Pills */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          <span>Ma trận câu hỏi (Đã làm {answered}/{totalQ}):</span>
                          {sub.lastAnsweredQuestion && (
                            <span className="text-[10px] text-brand-600 font-medium lowercase">
                              vừa làm câu {sub.lastAnsweredQuestion.questionOrder}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {questionsList.map((q, qIdx) => {
                            const qOrder = q.order || qIdx + 1;
                            const qEntry = timeline ? (timeline[q.id] || timeline[String(q.order)] || timeline[String(qIdx + 1)]) : undefined;
                            const ansObj = resolveStudentAnswer(q, qIdx, sub.answers);
                            let isAnswered = Boolean(qEntry);
                            if (ansObj) {
                              if (q.type === 'multiple_choice' && ansObj.selectedOptionId) isAnswered = true;
                              else if (q.type === 'true_false' && ansObj.trueFalseAnswers && Object.keys(ansObj.trueFalseAnswers).length > 0) isAnswered = true;
                              else if (q.type === 'short_answer' && ansObj.shortAnswerText && ansObj.shortAnswerText.trim().length > 0) isAnswered = true;
                            }
                            const isJustAnswered = sub.lastAnsweredQuestion?.questionId === q.id || sub.lastAnsweredQuestion?.questionOrder === qOrder;

                            return (
                              <div
                                key={q.id || qIdx}
                                title={`Câu ${qOrder}: ${isAnswered ? `Đã làm (${qEntry?.timeSpentSeconds || 0}s)` : 'Chưa làm'}`}
                                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  isJustAnswered
                                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse shadow-xs scale-105'
                                    : isAnswered
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-extrabold'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                                onClick={() => {
                                  setInspectStudent(sub);
                                  setInspectTab('matrix');
                                }}
                              >
                                {qOrder}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Violations Badge */}
                      {hasViolations && (
                        <div className="mt-3.5 p-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="text-xs font-bold text-rose-700">
                            Vi phạm: {sub.violations.length} lần ({sub.violations[0].message})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Teacher Action Controls */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setInspectStudent(sub);
                          setInspectTab('matrix');
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-brand-600 text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>

                      <button
                        onClick={() => {
                          setInspectStudent(sub);
                          setInspectTab('actions');
                        }}
                        className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1"
                        title="Gửi tin nhắn cảnh báo"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Nhắc</span>
                      </button>

                      {sub.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleAddBonus(sub, 5)}
                            className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1"
                            title="Cộng 5 phút làm bài"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+5p</span>
                          </button>

                          <button
                            onClick={() => handleForceSubmit(sub)}
                            className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1"
                            title="Thu bài cưỡng chế ngay lập tức"
                          >
                            <StopCircle className="w-3.5 h-3.5" />
                            <span>Thu</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact View */}
          {viewMode === 'compact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {displayList.map((sub) => {
                const totalQ = totalExamQuestions;
                const answered = sub.answeredCount || 0;
                const speedInfo = getSpeedInfo(sub);
                const hasV = sub.violations && sub.violations.length > 0;

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setInspectStudent(sub);
                      setInspectTab('matrix');
                    }}
                    className={`bg-white rounded-2xl p-3.5 border shadow-xs cursor-pointer hover:shadow-md transition-all ${
                      hasV ? 'border-rose-300 bg-rose-50/20' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {sub.studentCode}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${speedInfo.color}`}>
                        {speedInfo.text}
                      </span>
                    </div>

                    <div className="mt-2">
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">{sub.studentName}</h4>
                      <p className="text-[11px] text-slate-400">{sub.className || 'Tự do'}</p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Tiến độ:</span>
                      <span className="text-brand-600">{answered}/{totalQ} câu</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">SBD</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Lớp</th>
                    <th className="py-3 px-4">Tiến độ</th>
                    <th className="py-3 px-4">Tốc độ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Vi phạm</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayList.map((sub) => {
                    const speedInfo = getSpeedInfo(sub);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {sub.studentCode}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">{sub.studentName}</td>
                        <td className="py-3.5 px-4 text-slate-500">{sub.className || 'Tự do'}</td>
                        <td className="py-3.5 px-4 font-bold text-brand-600">
                          {sub.answeredCount}/{totalExamQuestions}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${speedInfo.color}`}>
                            {speedInfo.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {sub.status === 'in_progress' ? (
                            <span className="text-sky-600 font-bold">Đang làm</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Đã nộp</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {sub.violations && sub.violations.length > 0 ? (
                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              {sub.violations.length} lần
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setInspectStudent(sub);
                              setInspectTab('matrix');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            Xem
                          </button>
                          {sub.status === 'in_progress' && (
                            <button
                              onClick={() => handleForceSubmit(sub)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold"
                            >
                              Thu
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4 cols: Instant Live Activity Stream (Answers & Violations) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Luồng Sự Kiện Trực Tiếp
              </h3>
            </div>
            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
              {filteredEvents.length} sự kiện
            </span>
          </div>

          {/* Activity Stream Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActivityTab('all')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activityTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActivityTab('answers')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activityTab === 'answers'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ⚡ Trả lời
            </button>
            <button
              onClick={() => setActivityTab('violations')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activityTab === 'violations'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🚨 Vi phạm
            </button>
          </div>

          {/* Real-time Ticker Feed */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p className="text-xs font-bold text-slate-600">Phòng thi đang diễn ra ổn định</p>
                <p className="text-[11px] text-slate-400">Các hoạt động làm bài sẽ xuất hiện tức thì tại đây</p>
              </div>
            ) : (
              filteredEvents.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setInspectStudent(item.student);
                    setInspectTab('matrix');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-xs space-y-1 ${
                    item.type === 'violation'
                      ? 'bg-rose-50/70 border-rose-200'
                      : item.isAlert
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-slate-50/70 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 truncate">
                      {item.student.studentName} ({item.student.studentCode})
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <p className={`font-medium truncate ${item.type === 'violation' ? 'text-rose-700' : 'text-slate-700'}`}>
                      {item.title}
                    </p>
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.type === 'violation'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Student Inspection Modal */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                    {inspectStudent.studentCode}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {inspectStudent.studentName}
                  </h3>
                  {inspectStudent.status === 'in_progress' ? (
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full">
                      Đang làm bài
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Đã nộp bài ({inspectStudent.score}đ)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Lớp: {inspectStudent.className || 'Tự do'} · Bắt đầu lúc {new Date(inspectStudent.startTime).toLocaleTimeString('vi-VN')} · Thời gian đã dùng: {Math.round((inspectStudent.durationSecondsUsed || 0) / 60)} phút
                </p>
              </div>
              <button
                onClick={() => setInspectStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs in Modal */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setInspectTab('matrix')}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
                  inspectTab === 'matrix'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ma trận & Tốc độ từng câu
              </button>
              <button
                onClick={() => setInspectTab('timeline')}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
                  inspectTab === 'timeline'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Dòng thời gian làm bài
              </button>
              <button
                onClick={() => setInspectTab('actions')}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
                  inspectTab === 'actions'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Can thiệp & Nhắc nhở
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Tab 1: Detailed Question Matrix & Speed */}
              {inspectTab === 'matrix' && (
                <div className="space-y-4">
                  {/* Speed overview box */}
                  <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Tiến độ hoàn thành</span>
                      <div className="text-base font-extrabold text-brand-700 mt-0.5">
                        {inspectStudent.answeredCount || 0} / {totalExamQuestions} câu
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Tốc độ trung bình</span>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {inspectStudent.averageSpeedSecondsPerQuestion ? `${inspectStudent.averageSpeedSecondsPerQuestion}s/câu` : 'Chưa có'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Số lần vi phạm</span>
                      <div className="text-base font-extrabold text-rose-600 mt-0.5">
                        {inspectStudent.violations?.length || 0} lần
                      </div>
                    </div>
                  </div>

                  {/* Question-by-question table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 font-bold uppercase">
                          <th className="py-2.5 px-3">Câu</th>
                          <th className="py-2.5 px-3">Loại câu</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                          <th className="py-2.5 px-3">Thời gian làm</th>
                          <th className="py-2.5 px-3">Thời điểm trả lời</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {questionsList.map((q, idx) => {
                          const order = q.order || idx + 1;
                          const tEntry = inspectStudent.questionTimeline
                            ? (inspectStudent.questionTimeline[q.id] || inspectStudent.questionTimeline[String(q.order)] || inspectStudent.questionTimeline[String(idx + 1)])
                            : undefined;
                          const ansObj = resolveStudentAnswer(q, idx, inspectStudent.answers);

                          let isDone = Boolean(tEntry);
                          let answerSummary = tEntry?.summary || '';

                          if (ansObj) {
                            if (q.type === 'multiple_choice' && ansObj.selectedOptionId) {
                              isDone = true;
                              if (!answerSummary) answerSummary = `Chọn [${ansObj.selectedOptionId}]`;
                            } else if (q.type === 'true_false' && ansObj.trueFalseAnswers && Object.keys(ansObj.trueFalseAnswers).length > 0) {
                              isDone = true;
                              if (!answerSummary) answerSummary = `Đã chọn ${Object.keys(ansObj.trueFalseAnswers).length}/4 ý`;
                            } else if (q.type === 'short_answer' && ansObj.shortAnswerText && ansObj.shortAnswerText.trim().length > 0) {
                              isDone = true;
                              if (!answerSummary) answerSummary = `"${ansObj.shortAnswerText.slice(0, 15)}"`;
                            }
                          }

                          return (
                            <tr key={q.id || idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                Câu {order}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {q.type === 'multiple_choice' ? 'Trắc nghiệm' : q.type === 'true_false' ? 'Đúng / Sai' : 'Trả lời ngắn'}
                              </td>
                              <td className="py-2.5 px-3">
                                {isDone ? (
                                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                                    <span>✓ Đã làm</span>
                                    {answerSummary && <span className="text-emerald-900 font-medium text-[11px]">({answerSummary})</span>}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                    Chưa làm
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {tEntry?.timeSpentSeconds ? (
                                  <span className={tEntry.timeSpentSeconds < 3 ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                                    {tEntry.timeSpentSeconds}s {tEntry.timeSpentSeconds < 3 ? '⚠️' : ''}
                                  </span>
                                ) : isDone ? (
                                  <span className="text-slate-500 font-mono text-xs">
                                    ~{inspectStudent.durationSecondsUsed && inspectStudent.answeredCount ? Math.max(1, Math.round(inspectStudent.durationSecondsUsed / inspectStudent.answeredCount)) : 5}s
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                {tEntry?.answeredAt ? (
                                  new Date(tEntry.answeredAt).toLocaleTimeString('vi-VN')
                                ) : ansObj?.answeredAt ? (
                                  new Date(ansObj.answeredAt).toLocaleTimeString('vi-VN')
                                ) : isDone && (inspectStudent.submitTime || inspectStudent.lastActiveTime) ? (
                                  new Date(inspectStudent.submitTime || inspectStudent.lastActiveTime).toLocaleTimeString('vi-VN')
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Timeline */}
              {inspectTab === 'timeline' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nhật ký các mốc làm bài & Vi phạm:
                  </h4>
                  {(!inspectStudent.questionTimeline || Object.keys(inspectStudent.questionTimeline).length === 0) && (!inspectStudent.violations || inspectStudent.violations.length === 0) ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Chưa có sự kiện nào được ghi nhận.</p>
                  ) : (
                    <div className="space-y-2">
                      {(inspectStudent.violations || []).map((v, i) => (
                        <div key={`v-${i}`} className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-rose-700 font-bold">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>{v.message}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(v.timestamp).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      ))}

                      {Object.entries(inspectStudent.questionTimeline || {}).map(([qId, entry]: [string, any], i) => (
                        <div key={`ans-${i}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-slate-800">
                              Đã trả lời Câu {entry.questionOrder} ({entry.summary || 'Đã ghi nhận'})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-brand-600 font-bold">{entry.timeSpentSeconds || 0}s</span>
                            <span className="text-slate-400">{new Date(entry.answeredAt).toLocaleTimeString('vi-VN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Actions */}
              {inspectTab === 'actions' && (
                <div className="space-y-5">
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Gửi tin nhắn cảnh báo / nhắc nhở trực tiếp:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Nhập nội dung nhắc nhở..."
                      className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <button
                        type="button"
                        onClick={() => setCustomMessage('Thầy nhắc em tập trung, không chuyển tab làm bài!')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-medium"
                      >
                        Không chuyển tab
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomMessage('Em còn 10 phút, rà soát lại toàn bộ đáp án!')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-medium"
                      >
                        Nhắc thời gian
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomMessage('Em làm bài quá nhanh, hãy đọc kỹ lại đề bài!')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-medium"
                      >
                        Cảnh báo tốc độ
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi cảnh báo</span>
                      </button>
                    </div>
                  </form>

                  {inspectStudent.status === 'in_progress' && (
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Can thiệp khẩn cấp</h4>
                        <p className="text-[11px] text-slate-400">Cộng thêm giờ hoặc thu bài cưỡng chế thí sinh</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddBonus(inspectStudent, 5)}
                          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200"
                        >
                          +5 phút
                        </button>
                        <button
                          onClick={() => handleForceSubmit(inspectStudent)}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                        >
                          Thu bài ngay
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
