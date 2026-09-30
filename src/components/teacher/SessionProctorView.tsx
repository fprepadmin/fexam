import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Search,
  MessageSquare,
  PlusCircle,
  StopCircle,
  ShieldAlert,
  Send,
  X,
  Share2,
  Check,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  Hash,
  Mail,
  UserCheck,
  Zap,
  Eye,
  TrendingUp,
  Timer,
  Edit3,
  Calculator,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { ExamSession, ExamSubmission, ViolationRecord, QuestionTimelineEntry } from '../../types';
import { exportCandidatesToExcel } from '../../lib/excel-helper';
import { subscribeLiveProctorSession } from '../../services/firebase';
import { ManualGradingModal } from './ManualGradingModal';

interface SessionProctorViewProps {
  session: ExamSession;
  onBack: () => void;
  onViewAnalytics: (sessionId: string) => void;
}

export const SessionProctorView: React.FC<SessionProctorViewProps> = ({
  session,
  onBack,
  onViewAnalytics,
}) => {
  const { exams, submissions, addBonusMinutes, sendTeacherMessage, forceSubmitStudent, saveSubmission } = useExam();

  const targetExam = exams.find((e) => e.id === session.examId || e.code === session.examCode);
  const questionsList = targetExam?.questions || [];
  const totalExamQuestions = questionsList.length || 1;

  const [manualGradingSub, setManualGradingSub] = useState<ExamSubmission | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'candidates'>('live');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'submitted' | 'flagged' | 'fast_warning'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'table'>('grid');
  const [activityTab, setActivityTab] = useState<'all' | 'answers' | 'violations'>('all');

  // Inspection & Warning Modal
  const [inspectStudent, setInspectStudent] = useState<ExamSubmission | null>(null);
  const [inspectTab, setInspectTab] = useState<'matrix' | 'timeline' | 'actions'>('matrix');
  const [customMsg, setCustomMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveProctorMap, setLiveProctorMap] = useState<Record<string, any>>({});

  // Realtime Database instant live_proctor listener (<50ms latency)
  useEffect(() => {
    const unsub = subscribeLiveProctorSession(session.id, (data) => {
      setLiveProctorMap(data || {});
    });
    return () => {
      if (unsub) unsub();
    };
  }, [session.id]);

  // Submissions of this session (matched by ID or Code)
  const rawSessionSubs = submissions.filter(
    (s) => s.sessionId === session.id || (s.sessionCode && s.sessionCode === session.code)
  );

  // Merge Realtime DB live proctor data for instantaneous updates
  const mergedSubs = rawSessionSubs.map((sub) => {
    const liveUpdate = liveProctorMap[sub.id] || Object.values(liveProctorMap).find(
      (v: any) => v && (v.studentCode === sub.studentCode || (v.id && v.id === sub.id))
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

  // Also include candidates from RTDB that might not be in Firestore yet
  Object.values(liveProctorMap).forEach((liveCand: any) => {
    if (liveCand && liveCand.id && !mergedSubs.some((s) => s.id === liveCand.id || s.studentCode === liveCand.studentCode)) {
      mergedSubs.push({
        id: liveCand.id,
        sessionId: session.id,
        sessionCode: session.code,
        examId: session.examId,
        examCode: session.examCode,
        examTitle: session.examTitle,
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
        maxScore: targetExam?.totalPoints || 10,
        answeredCount: liveCand.answeredCount || 0,
        totalQuestions: totalExamQuestions,
        violations: liveCand.lastViolation ? [liveCand.lastViolation] : [],
        isFlagged: Boolean(liveCand.isFlagged),
        questionTimeline: liveCand.questionTimeline || {},
        averageSpeedSecondsPerQuestion: liveCand.averageSpeedSecondsPerQuestion || 0,
        lastAnsweredQuestion: liveCand.lastAnsweredQuestion || null,
      });
    }
  });

  // Deduplicate per student, prioritizing 'submitted' status and latest active time
  const subStudentMap = new Map<string, ExamSubmission>();
  const sortedRawSubs = [...mergedSubs].sort((a, b) => {
    if (a.status === 'submitted' && b.status !== 'submitted') return -1;
    if (b.status === 'submitted' && a.status !== 'submitted') return 1;
    const timeA = new Date(a.submitTime || a.lastActiveTime || a.startTime || 0).getTime();
    const timeB = new Date(b.submitTime || b.lastActiveTime || b.startTime || 0).getTime();
    return timeB - timeA;
  });

  sortedRawSubs.forEach((sub) => {
    const key = (sub.studentCode || sub.mshs || sub.id).trim().toUpperCase();
    if (!subStudentMap.has(key)) {
      subStudentMap.set(key, sub);
    }
  });

  const sessionSubs = Array.from(subStudentMap.values());

  const inProgressList = sessionSubs.filter((s) => s.status === 'in_progress');
  const submittedList = sessionSubs.filter((s) => s.status === 'submitted');
  const flaggedList = sessionSubs.filter(
    (s) => s.isFlagged || (s.violations && s.violations.length > 0)
  );
  const fastWarningList = sessionSubs.filter(
    (s) => s.answeredCount >= 3 && s.averageSpeedSecondsPerQuestion !== undefined && s.averageSpeedSecondsPerQuestion > 0 && s.averageSpeedSecondsPerQuestion < 4
  );

  // Room average answering speed
  const activeSpeeds = sessionSubs
    .filter((s) => s.answeredCount > 0 && s.averageSpeedSecondsPerQuestion && s.averageSpeedSecondsPerQuestion > 0)
    .map((s) => s.averageSpeedSecondsPerQuestion || 0);
  const avgRoomSpeed = activeSpeeds.length > 0
    ? Math.round(activeSpeeds.reduce((a, b) => a + b, 0) / activeSpeeds.length)
    : 0;

  const displayedList = sessionSubs.filter((sub) => {
    if (filterStatus === 'in_progress' && sub.status !== 'in_progress') return false;
    if (filterStatus === 'submitted' && sub.status !== 'submitted') return false;
    if (filterStatus === 'flagged' && (!sub.violations || sub.violations.length === 0)) return false;
    if (filterStatus === 'fast_warning') {
      const isFast = sub.answeredCount >= 3 && sub.averageSpeedSecondsPerQuestion !== undefined && sub.averageSpeedSecondsPerQuestion > 0 && sub.averageSpeedSecondsPerQuestion < 4;
      if (!isFast) return false;
    }

    if (
      search &&
      !sub.studentName.toLowerCase().includes(search.toLowerCase()) &&
      !sub.studentCode.toLowerCase().includes(search.toLowerCase()) &&
      !(sub.mshs && sub.mshs.toLowerCase().includes(search.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  // Aggregated Activity Stream (Answers & Violations)
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

  sessionSubs.forEach((sub) => {
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

  const handleCopy = () => {
    const url = `${window.location.origin}?exam=${session.examCode}&session=${session.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportCandidates = () => {
    if (!session.candidates || session.candidates.length === 0) {
      alert('Ca thi này chưa có danh sách thí sinh tự gen theo lớp.');
      return;
    }
    exportCandidatesToExcel(session, session.candidates);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectStudent || !customMsg.trim()) return;
    sendTeacherMessage(inspectStudent.id, customMsg.trim());
    alert(`Đã gửi nhắc nhở đến thí sinh ${inspectStudent.studentName}!`);
    setCustomMsg('');
  };

  const handleAddBonus = (sub: ExamSubmission, mins: number) => {
    addBonusMinutes(sub.id, mins);
    alert(`Đã cộng thêm +${mins} phút cho học sinh ${sub.studentName}!`);
  };

  const handleForceSubmit = (sub: ExamSubmission) => {
    if (window.confirm(`Xác nhận thu bài cưỡng chế học sinh "${sub.studentName}" ngay lập tức?`)) {
      forceSubmitStudent(sub.id);
      if (inspectStudent?.id === sub.id) {
        setInspectStudent(null);
      }
    }
  };

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

  if (manualGradingSub && targetExam) {
    return (
      <ManualGradingModal
        submission={manualGradingSub}
        exam={targetExam}
        session={session}
        onClose={() => setManualGradingSub(null)}
        onSave={(updatedSub) => {
          saveSubmission(updatedSub);
          if (inspectStudent && inspectStudent.id === updatedSub.id) {
            setInspectStudent(updatedSub);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white shadow-xs">
                {session.code}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Giám sát: {session.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Realtime &lt;50ms
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Đề thi: <span className="font-bold text-slate-700">{session.examTitle}</span> · Thời lượng: {session.durationMinutes} phút · Chế độ:{' '}
              {session.mode === 'class' ? 'Theo lớp học (Mã dự thi tự gen)' : 'Tự do qua Link'}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {session.candidates && session.candidates.length > 0 && (
            <button
              onClick={handleExportCandidates}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors shadow-xs"
              title="Tải về danh sách Mã dự thi (SBD) để in hoặc gửi cho học sinh"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Thẻ Dự Thi (.xlsx)</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-brand-700 font-bold text-xs border border-indigo-100 transition-colors shadow-xs"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>Sao chép Link</span>
          </button>

          <button
            onClick={() => onViewAnalytics(session.id)}
            className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-xs"
          >
            Bảng điểm & Thống kê
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
            activeTab === 'live'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Giám Sát Trực Tiếp ({sessionSubs.length})</span>
        </button>

        {session.candidates && session.candidates.length > 0 && (
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
              activeTab === 'candidates'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Danh Sách Thẻ Dự Thi ({session.candidates.length})</span>
          </button>
        )}
      </div>

      {activeTab === 'candidates' && session.candidates && (
        /* Candidates Roster View */
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Danh sách Thẻ Dự Thi Tự Gen của Ca</h3>
              <p className="text-xs text-slate-400">
                Thí sinh sử dụng Mã dự thi (SBD) hoặc MSHS này để đăng nhập vào phòng thi
              </p>
            </div>
            <button
              onClick={handleExportCandidates}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Tải Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Mã Dự Thi (SBD)</th>
                  <th className="py-3 px-4">MSHS</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Trạng thái tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {session.candidates.map((cand, idx) => {
                  const joinedSub = sessionSubs.find(
                    (s) => s.studentCode === cand.candidateCode || s.mshs === cand.mshs
                  );
                  return (
                    <tr key={cand.id || idx} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-700 bg-brand-50/50 rounded-lg">
                        {cand.candidateCode}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{cand.mshs}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{cand.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{cand.className}</td>
                      <td className="py-3.5 px-4 text-slate-400">{cand.email || '—'}</td>
                      <td className="py-3.5 px-4">
                        {joinedSub ? (
                          joinedSub.status === 'in_progress' ? (
                            <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                              Đang làm bài
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Đã nộp ({joinedSub.score}đ)
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Chưa vào phòng
                          </span>
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

      {activeTab === 'live' && (
        <>
          {/* 5 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div
              onClick={() => setFilterStatus('all')}
              className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'all'
                  ? 'bg-brand-50 border-brand-300 shadow-xs ring-2 ring-brand-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Thí Sinh</span>
                <Users className="w-4 h-4 text-brand-600" />
              </div>
              <div className="text-2xl font-extrabold text-brand-700 mt-1.5">{sessionSubs.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus('in_progress')}
              className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'in_progress'
                  ? 'bg-sky-50 border-sky-300 shadow-xs ring-2 ring-sky-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang Làm Bài</span>
                <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
              </div>
              <div className="text-2xl font-extrabold text-sky-600 mt-1.5">{inProgressList.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus('submitted')}
              className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'submitted'
                  ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đã Nộp Bài</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1.5">{submittedList.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus('flagged')}
              className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'flagged'
                  ? 'bg-rose-50 border-rose-300 shadow-xs ring-2 ring-rose-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Có Cảnh Báo</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1.5">{flaggedList.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus(filterStatus === 'fast_warning' ? 'all' : 'fast_warning')}
              className={`p-4 rounded-3xl border cursor-pointer transition-all col-span-2 sm:col-span-1 ${
                filterStatus === 'fast_warning'
                  ? 'bg-amber-50 border-amber-300 shadow-xs ring-2 ring-amber-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tốc độ TB ca</span>
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

          {/* Main Proctor Layout: 8 cols Student Grid + 4 cols Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Students Grid */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo Tên, SBD, hoặc MSHS..."
                    className="w-full pl-10 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'grid' ? 'bg-brand-50 text-brand-700 shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Lưới Đầy Đủ
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'compact' ? 'bg-brand-50 text-brand-700 shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Thu Gọn
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'table' ? 'bg-brand-50 text-brand-700 shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Bảng
                  </button>
                </div>
              </div>

              {/* Grid Cards with Realtime Matrix */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedList.map((sub) => {
                    const totalQ = totalExamQuestions;
                    const answered = sub.answeredCount || 0;
                    const percent = Math.min(100, Math.round((answered / totalQ) * 100));
                    const hasV = sub.violations && sub.violations.length > 0;
                    const speedInfo = getSpeedInfo(sub);
                    const timeline = sub.questionTimeline || {};

                    return (
                      <div
                        key={sub.id}
                        className={`bg-white rounded-3xl p-5 border shadow-card transition-all flex flex-col justify-between hover:shadow-md ${
                          hasV
                            ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                            : speedInfo.isWarning
                            ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                            : 'border-slate-100'
                        }`}
                      >
                        <div>
                          {/* SBD + Status */}
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
                              <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                                Đang làm bài
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã nộp ({sub.score}đ)
                              </span>
                            )}
                          </div>

                          {/* Name & Class & Speed */}
                          <div className="mt-3 flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{sub.studentName}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {sub.className || 'Tự do'} {sub.email && `· ${sub.email}`}
                              </p>
                            </div>
                            <span className={`text-[11px] px-2.5 py-1 rounded-xl border shrink-0 ${speedInfo.color}`}>
                              {speedInfo.text}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3.5">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500 font-medium">Tiến độ: <strong className="text-slate-800">{answered}/{totalQ}</strong> câu</span>
                              <span className="font-extrabold text-brand-600">{percent}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-brand-500 to-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Instant Real-time Question Matrix Pills */}
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
                                const qEntry = timeline[q.id];
                                const isAnswered = Boolean(qEntry || (sub.answers && sub.answers[q.id]));
                                const isJustAnswered = sub.lastAnsweredQuestion?.questionId === q.id;

                                return (
                                  <div
                                    key={q.id || qIdx}
                                    title={`Câu ${qOrder}: ${isAnswered ? `Đã làm (${qEntry?.timeSpentSeconds || 0}s)` : 'Chưa làm'}`}
                                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                      isJustAnswered
                                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse shadow-xs scale-105'
                                        : isAnswered
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
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

                          {/* Violations */}
                          {hasV && (
                            <div className="mt-3.5 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{sub.violations.length} lần vi phạm ({sub.violations[0].message})</span>
                            </div>
                          )}
                        </div>

                        {/* Controls */}
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
                            className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200"
                            title="Gửi tin nhắn cảnh báo"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Nhắc</span>
                          </button>

                          {sub.status === 'in_progress' && (
                            <>
                              <button
                                onClick={() => handleAddBonus(sub, 5)}
                                className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200"
                                title="Cộng 5 phút"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+5p</span>
                              </button>
                              <button
                                onClick={() => handleForceSubmit(sub)}
                                className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                                title="Thu bài"
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
                  {displayedList.map((sub) => {
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

              {/* Table view */}
              {viewMode === 'table' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-4">SBD</th>
                        <th className="py-3 px-4">MSHS</th>
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
                      {displayedList.map((sub) => {
                        const speedInfo = getSpeedInfo(sub);
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{sub.studentCode}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">{sub.mshs || '—'}</td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">{sub.studentName}</td>
                            <td className="py-3.5 px-4 text-slate-500">{sub.className || 'Tự do'}</td>
                            <td className="py-3.5 px-4 font-bold text-brand-600">{sub.answeredCount}/{totalExamQuestions}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${speedInfo.color}`}>
                                {speedInfo.text}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">{sub.status === 'in_progress' ? 'Đang làm' : 'Đã nộp'}</td>
                            <td className="py-3.5 px-4">{sub.violations?.length || 0} lần</td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setInspectStudent(sub);
                                  setInspectTab('matrix');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold"
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

            {/* Right 4 cols: Realtime Activity & Violation Stream */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-600 animate-pulse" />
                  <h3 className="text-sm font-extrabold text-slate-900">Luồng Sự Kiện Ca Thi</h3>
                </div>
                <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
                  {filteredEvents.length} sự kiện
                </span>
              </div>

              {/* Stream Filters */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setActivityTab('all')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activityTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setActivityTab('answers')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activityTab === 'answers' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ⚡ Trả lời
                </button>
                <button
                  onClick={() => setActivityTab('violations')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activityTab === 'violations' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🚨 Vi phạm
                </button>
              </div>

              {/* Realtime Stream List */}
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredEvents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                    <p className="text-xs font-bold text-slate-600">Ca thi đang diễn ra an toàn</p>
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
        </>
      )}

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Đã nộp bài ({inspectStudent.score}đ)
                      </span>
                      <button
                        onClick={() => setManualGradingSub(inspectStudent)}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200"
                        title="Mở giao diện chấm điểm thủ công từng câu"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Chấm thủ công</span>
                      </button>
                    </div>
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
                          const tEntry = inspectStudent.questionTimeline ? inspectStudent.questionTimeline[q.id] : undefined;
                          const ansObj = inspectStudent.answers ? inspectStudent.answers[q.id] : undefined;
                          const isDone = Boolean(tEntry || ansObj);

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
                                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Đã trả lời {tEntry?.summary ? `(${tEntry.summary})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    Chưa làm
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {tEntry?.timeSpentSeconds ? (
                                  <span className={tEntry.timeSpentSeconds < 3 ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                                    {tEntry.timeSpentSeconds}s {tEntry.timeSpentSeconds < 3 ? '⚠️' : ''}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                {tEntry?.answeredAt ? new Date(tEntry.answeredAt).toLocaleTimeString('vi-VN') : '—'}
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
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      placeholder="Nhập nội dung nhắc nhở..."
                      className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <button
                        type="button"
                        onClick={() => setCustomMsg('Thầy nhắc em tập trung, không chuyển tab làm bài!')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-medium"
                      >
                        Không chuyển tab
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomMsg('Em còn 10 phút, rà soát lại toàn bộ đáp án!')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-medium"
                      >
                        Nhắc thời gian
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomMsg('Em làm bài quá nhanh, hãy đọc kỹ lại đề bài!')}
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
