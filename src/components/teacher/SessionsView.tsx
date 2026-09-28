import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Users,
  Link as LinkIcon,
  Activity,
  BarChart3,
  Trash2,
  Share2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Check,
  Edit3,
  Search,
  Download,
  Eye,
  X,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { ExamSession, SessionStatus, ExamSubmission } from '../../types';

interface SessionsViewProps {
  onCreateSession: (type?: 'exam' | 'practice') => void;
  onEditSession?: (sessionId: string) => void;
  onOpenProctor: (sessionId: string) => void;
  onOpenAnalytics: (sessionId: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  onCreateSession,
  onEditSession,
  onOpenProctor,
  onOpenAnalytics,
}) => {
  const { user } = useAuth();
  const { sessions, deleteSession, saveSession, submissions } = useExam();
  const [filterType, setFilterType] = useState<'all' | 'exam' | 'practice' | 'active' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Candidate Roster Inspection Modal State
  const [rosterModalSession, setRosterModalSession] = useState<ExamSession | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');

  // Isolate to current teacher's sessions only
  const mySessions = user?.role === 'admin'
    ? sessions
    : sessions.filter((s) => !s.teacherId || s.teacherId === user?.id || (user?.email && s.teacherEmail === user.email));

  const filteredSessions = mySessions.filter((s) => {
    if (filterType === 'exam' && s.sessionType === 'practice') return false;
    if (filterType === 'practice' && s.sessionType !== 'practice') return false;
    if (filterType === 'active' && s.status !== 'active') return false;
    if (filterType === 'closed' && s.status !== 'closed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = s.code?.toLowerCase().includes(q);
      const matchTitle = s.title?.toLowerCase().includes(q);
      const matchExam = s.examTitle?.toLowerCase().includes(q) || s.examCode?.toLowerCase().includes(q);
      const matchClasses = s.targetClassNames?.some((c) => c.toLowerCase().includes(q));
      if (!matchCode && !matchTitle && !matchExam && !matchClasses) return false;
    }
    return true;
  });

  const handleCopyLink = (session: ExamSession) => {
    const url = `${window.location.origin}?exam=${session.examCode}&session=${session.code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(session.id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = (session: ExamSession) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ca "${session.title}" (${session.code})?\nThao tác này không thể hoàn tác.`)) {
      deleteSession(session.id);
    }
  };

  const handleQuickChangeStatus = (session: ExamSession, newStatus: SessionStatus) => {
    const updated: ExamSession = {
      ...session,
      status: newStatus,
    };
    saveSession(updated);
  };

  const handleDownloadRoster = (session: ExamSession) => {
    const candidates = session.candidates || [];
    if (candidates.length === 0) {
      alert('Ca này không có danh sách thí sinh chỉ định theo lớp.');
      return;
    }
    const content = `DANH SÁCH MÃ DỰ THI (SBD) — ${session.title}\nMã Ca: ${session.code}\nThời gian: ${new Date(session.startTime).toLocaleString('vi-VN')}\n----------------------------------------\nSTT | MSHS | Họ và tên | Lớp | Mã dự thi (SBD)\n` +
      candidates.map((c, i) => `${i + 1}. | ${c.mshs} | ${c.name} | ${c.className} | SBD: ${c.candidateCode}`).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_SBD_${session.code}.txt`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Ca Thi &amp; Ca Ôn Tập
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổ chức ca thi chính thức (bật FEXAM Guard) hoặc ca ôn tập tự do (tắt giám sát) cho học sinh
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => onCreateSession('practice')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-xs hover:shadow-sm transition-all hover:scale-[1.01]"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Tạo Ca Ôn Tập</span>
          </button>

          <button
            onClick={() => onCreateSession('exam')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md shadow-brand-500/20 hover:shadow-lg transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Ca Thi Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `Tất cả (${mySessions.length})` },
            { id: 'exam', label: `Ca thi chính thức (${mySessions.filter((s) => s.sessionType !== 'practice').length})` },
            { id: 'practice', label: `Ca ôn tập (${mySessions.filter((s) => s.sessionType === 'practice').length})` },
            { id: 'active', label: `Đang diễn ra (${mySessions.filter((s) => s.status === 'active').length})` },
            { id: 'closed', label: `Đã đóng (${mySessions.filter((s) => s.status === 'closed').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã ca, tên đề, lớp..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 space-y-3 shadow-xs">
          <CalendarCheck className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-bold text-slate-700">Chưa có ca nào phù hợp</p>
          <p className="text-xs text-slate-400">
            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Bấm "+ Tạo Ca Thi Mới" hoặc "+ Tạo Ca Ôn Tập" để bắt đầu'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSessions.map((session) => {
            const isPractice = session.sessionType === 'practice';
            const rawSessionSubs = submissions.filter((s) => s.sessionId === session.id || (s.sessionCode && s.sessionCode === session.code));
            const sessSubMap = new Map<string, ExamSubmission>();
            [...rawSessionSubs]
              .sort((a, b) => {
                if (a.status === 'submitted' && b.status !== 'submitted') return -1;
                if (b.status === 'submitted' && a.status !== 'submitted') return 1;
                return 0;
              })
              .forEach((s) => {
                const key = (s.studentCode || s.mshs || s.id).trim().toUpperCase();
                if (!sessSubMap.has(key)) sessSubMap.set(key, s);
              });
            const sessionSubs = Array.from(sessSubMap.values());
            const activeCount = sessionSubs.filter((s) => s.status === 'in_progress').length;
            const submittedCount = sessionSubs.filter((s) => s.status === 'submitted').length;
            const flaggedCount = sessionSubs.filter((s) => s.violations && s.violations.length > 0).length;

            return (
              <div
                key={session.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Code + Type + Status + Action icons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-white">
                        {session.code}
                      </span>

                      {/* Session Type Badge */}
                      {isPractice ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Ca ôn tập
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-brand-600" />
                          Thi chính thức
                        </span>
                      )}

                      {/* Status Badge */}
                      {session.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                          Đang diễn ra
                        </span>
                      ) : session.status === 'upcoming' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold">
                          Sắp tới
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                          Đã đóng
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(session)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Sao chép link làm bài"
                      >
                        {copiedCode === session.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>

                      {/* Edit Session */}
                      {onEditSession && (
                        <button
                          onClick={() => onEditSession(session.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="Sửa ca"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Session */}
                      <button
                        onClick={() => handleDelete(session)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa ca"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Exam info */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {session.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Đề thi: <span className="font-bold text-slate-700">{session.examTitle}</span> ({session.examCode})
                    </p>
                  </div>

                  {/* Mode & Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-slate-700 font-semibold">
                      {session.mode === 'class' ? (
                        <>
                          <Users className="w-3.5 h-3.5 text-brand-600" />
                          <span>Lớp: {session.targetClassNames?.join(', ') || 'Chỉ định'}</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tự do qua Link</span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-slate-700 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{session.durationMinutes} phút</span>
                    </span>

                    {session.mode === 'class' && session.candidates && session.candidates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRosterModalSession(session)}
                        className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-xl text-brand-700 font-bold hover:bg-brand-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem {session.candidates.length} SBD</span>
                      </button>
                    )}

                    {!isPractice && flaggedCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl text-rose-700 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>{flaggedCount} vi phạm</span>
                      </span>
                    )}
                  </div>

                  {/* Live Quick Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Đang làm</span>
                      <span className="text-sm font-extrabold text-sky-600">{activeCount} HS</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Đã nộp</span>
                      <span className="text-sm font-extrabold text-emerald-600">{submittedCount} bài</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tổng thí sinh</span>
                      <span className="text-sm font-extrabold text-slate-700">
                        {session.mode === 'class' ? (session.candidates?.length || sessionSubs.length) : sessionSubs.length}
                      </span>
                    </div>
                  </div>

                  {/* Quick Status Control Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">Chuyển trạng thái nhanh:</span>
                    <div className="flex items-center gap-1.5">
                      {session.status !== 'active' && (
                        <button
                          onClick={() => handleQuickChangeStatus(session, 'active')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition-colors"
                          title="Mở ca để học sinh vào làm bài ngay"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Mở ca</span>
                        </button>
                      )}
                      {session.status !== 'upcoming' && (
                        <button
                          onClick={() => handleQuickChangeStatus(session, 'upcoming')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold border border-amber-200 transition-colors"
                          title="Lên lịch ca"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Sắp tới</span>
                        </button>
                      )}
                      {session.status !== 'closed' && (
                        <button
                          onClick={() => handleQuickChangeStatus(session, 'closed')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors"
                          title="Đóng ca không nhận thêm bài nộp"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Đóng ca</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Proctoring & Analytics */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenProctor(session.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-[1.01]"
                  >
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>Vào Giám sát Trực tiếp</span>
                  </button>

                  <button
                    onClick={() => onOpenAnalytics(session.id)}
                    className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Bảng điểm</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* CANDIDATE ROSTER INSPECTION MODAL          */}
      {/* ========================================== */}
      {rosterModalSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Danh Sách Thí Sinh &amp; Mã Dự Thi (SBD)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ca: <span className="font-bold text-slate-800">{rosterModalSession.title}</span> (Mã: {rosterModalSession.code})
                </p>
              </div>
              <button
                onClick={() => setRosterModalSession(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Download */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Tìm học sinh theo tên, MSHS, SBD..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                onClick={() => handleDownloadRoster(rosterModalSession)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất TXT</span>
              </button>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
              {(rosterModalSession.candidates || [])
                .filter((c) => {
                  if (!rosterSearch.trim()) return true;
                  const q = rosterSearch.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.mshs.toLowerCase().includes(q) ||
                    c.candidateCode.toLowerCase().includes(q) ||
                    c.className?.toLowerCase().includes(q)
                  );
                })
                .map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-slate-400 font-mono text-[11px]">#{i + 1}</span>
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-400">MSHS: {c.mshs} · Lớp: {c.className}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1 rounded-xl">
                        SBD: {c.candidateCode}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setRosterModalSession(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
