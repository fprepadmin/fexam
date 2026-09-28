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
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { ExamSession, ExamSubmission, ViolationRecord } from '../../types';
import { exportCandidatesToExcel } from '../../lib/excel-helper';
import { subscribeLiveProctorSession } from '../../services/firebase';

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
  const { submissions, addBonusMinutes, sendTeacherMessage, forceSubmitStudent } = useExam();

  const [activeTab, setActiveTab] = useState<'live' | 'candidates'>('live');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'submitted' | 'flagged'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Teacher message warning inline
  const [targetStudentSub, setTargetStudentSub] = useState<ExamSubmission | null>(null);
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
        startTime: liveCand.lastActiveTime || new Date().toISOString(),
        lastActiveTime: liveCand.lastActiveTime || new Date().toISOString(),
        durationSecondsUsed: 0,
        status: liveCand.status || 'in_progress',
        answers: {},
        score: liveCand.score || 0,
        maxScore: 10,
        answeredCount: liveCand.answeredCount || 0,
        totalQuestions: 0,
        violations: liveCand.lastViolation ? [liveCand.lastViolation] : [],
        isFlagged: Boolean(liveCand.isFlagged),
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

  const displayedList = sessionSubs.filter((sub) => {
    if (filterStatus === 'in_progress' && sub.status !== 'in_progress') return false;
    if (filterStatus === 'submitted' && sub.status !== 'submitted') return false;
    if (filterStatus === 'flagged' && (!sub.violations || sub.violations.length === 0)) return false;

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

  // Aggregated violations stream
  const allViolations: { student: ExamSubmission; violation: ViolationRecord }[] = [];
  sessionSubs.forEach((sub) => {
    (sub.violations || []).forEach((v) => {
      allViolations.push({ student: sub, violation: v });
    });
  });
  allViolations.sort(
    (a, b) => new Date(b.violation.timestamp).getTime() - new Date(a.violation.timestamp).getTime()
  );

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
    if (!targetStudentSub || !customMsg.trim()) return;
    sendTeacherMessage(targetStudentSub.id, customMsg.trim());
    alert(`Đã gửi nhắc nhở đến thí sinh ${targetStudentSub.studentName}!`);
    setCustomMsg('');
    setTargetStudentSub(null);
  };

  const handleAddBonus = (sub: ExamSubmission, mins: number) => {
    addBonusMinutes(sub.id, mins);
    alert(`Đã cộng thêm +${mins} phút cho học sinh ${sub.studentName}!`);
  };

  const handleForceSubmit = (sub: ExamSubmission) => {
    if (window.confirm(`Xác nhận thu bài cưỡng chế học sinh "${sub.studentName}" ngay lập tức?`)) {
      forceSubmitStudent(sub.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                {session.code}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Giám sát: {session.title}
              </h1>
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors"
              title="Tải về danh sách Mã dự thi (SBD) để in hoặc gửi cho học sinh"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Thẻ Dự Thi (.xlsx)</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-brand-700 font-bold text-xs border border-indigo-100 transition-colors"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>Sao chép Link</span>
          </button>

          <button
            onClick={() => onViewAnalytics(session.id)}
            className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
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
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setFilterStatus('all')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'all' ? 'bg-brand-50 border-brand-300 shadow-xs' : 'bg-white border-slate-100 shadow-card'
              }`}
            >
              <span className="text-xs font-bold text-slate-400 uppercase">Tổng Thí Sinh Vào Thi</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{sessionSubs.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus('in_progress')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'in_progress' ? 'bg-sky-50 border-sky-300 shadow-xs' : 'bg-white border-slate-100 shadow-card'
              }`}
            >
              <span className="text-xs font-bold text-slate-400 uppercase">Đang Làm Bài</span>
              <div className="text-2xl font-extrabold text-sky-600 mt-1">{inProgressList.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus('submitted')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'submitted' ? 'bg-emerald-50 border-emerald-300 shadow-xs' : 'bg-white border-slate-100 shadow-card'
              }`}
            >
              <span className="text-xs font-bold text-slate-400 uppercase">Đã Nộp Bài</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{submittedList.length}</div>
            </div>

            <div
              onClick={() => setFilterStatus('flagged')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                filterStatus === 'flagged' ? 'bg-rose-50 border-rose-300 shadow-xs' : 'bg-white border-slate-100 shadow-card'
              }`}
            >
              <span className="text-xs font-bold text-slate-400 uppercase">Có Cảnh Báo</span>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">{flaggedList.length}</div>
            </div>
          </div>

          {/* Main Proctor Layout: 8 cols Student Grid + 4 cols Violation Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Students Grid */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex items-center justify-between gap-3">
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

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Lưới
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      viewMode === 'table' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Bảng
                  </button>
                </div>
              </div>

              {/* Grid Cards */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedList.map((sub) => {
                    const totalQ = sub.totalQuestions || 6;
                    const answered = sub.answeredCount || 0;
                    const percent = Math.round((answered / totalQ) * 100);
                    const hasV = sub.violations && sub.violations.length > 0;

                    return (
                      <div
                        key={sub.id}
                        className={`bg-white rounded-3xl p-5 border shadow-card transition-all flex flex-col justify-between ${
                          hasV ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50/20' : 'border-slate-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                                {sub.studentCode}
                              </span>
                              {sub.mshs && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
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
                                <CheckCircle2 className="w-3 h-3" />
                                Đã nộp ({sub.score}đ)
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <h4 className="text-sm font-bold text-slate-900">{sub.studentName}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {sub.className || 'Tự do'} {sub.email && `· ${sub.email}`}
                            </p>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500 font-medium">Tiến độ: {answered}/{totalQ} câu</span>
                              <span className="font-bold text-brand-600">{percent}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-brand-600 rounded-full"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Violations */}
                          {hasV && (
                            <div className="mt-3 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{sub.violations.length} lần vi phạm ({sub.violations[0].message})</span>
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-1.5">
                          <button
                            onClick={() => setTargetStudentSub(sub)}
                            className="flex-1 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200"
                          >
                            Nhắc nhở
                          </button>

                          {sub.status === 'in_progress' && (
                            <>
                              <button
                                onClick={() => handleAddBonus(sub, 5)}
                                className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200"
                                title="Cộng 5 phút"
                              >
                                +5p
                              </button>
                              <button
                                onClick={() => handleForceSubmit(sub)}
                                className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                                title="Thu bài"
                              >
                                Thu bài
                              </button>
                            </>
                          )}
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
                        <th className="py-3 px-4">Mã Dự Thi (SBD)</th>
                        <th className="py-3 px-4">MSHS</th>
                        <th className="py-3 px-4">Họ và tên</th>
                        <th className="py-3 px-4">Lớp</th>
                        <th className="py-3 px-4">Tiến độ</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4">Vi phạm</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {displayedList.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{sub.studentCode}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{sub.mshs || '—'}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{sub.studentName}</td>
                          <td className="py-3.5 px-4 text-slate-500">{sub.className || 'Tự do'}</td>
                          <td className="py-3.5 px-4 font-bold text-brand-600">{sub.answeredCount}/{sub.totalQuestions || 6}</td>
                          <td className="py-3.5 px-4">{sub.status === 'in_progress' ? 'Đang làm' : 'Đã nộp'}</td>
                          <td className="py-3.5 px-4">{sub.violations?.length || 0} lần</td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => setTargetStudentSub(sub)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold"
                            >
                              Nhắc
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right 4 cols: Realtime Violation Stream */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h3 className="text-sm font-bold text-slate-900">Nhật ký Vi phạm Ca thi</h3>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                  {allViolations.length} sự kiện
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {allViolations.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Ca thi hoàn toàn bảo mật</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Chưa phát hiện hành vi khả nghi nào</p>
                  </div>
                ) : (
                  allViolations.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-rose-100 bg-rose-50/50 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{item.student.studentName} ({item.student.studentCode})</span>
                        <span className="text-[10px] text-slate-400">{new Date(item.violation.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <p className="text-xs text-rose-700 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{item.violation.message}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Inline Warning Modal */}
      {targetStudentSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Gửi nhắc nhở — {targetStudentSub.studentName}
              </h3>
              <button onClick={() => setTargetStudentSub(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea
                rows={3}
                required
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Nhập nội dung nhắc nhở..."
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetStudentSub(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
                >
                  Gửi nhắc nhở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
