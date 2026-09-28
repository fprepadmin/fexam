import React, { useState } from 'react';
import {
  FileText,
  Users,
  Activity,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertTriangle,
  Flame,
  ChevronRight,
  TrendingUp,
  CalendarCheck,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { TeacherView } from '../common/Sidebar';
import { ExamSubmission } from '../../types';

interface OverviewProps {
  onNavigateView: (view: TeacherView) => void;
  onOpenLiveSession: (sessionId: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigateView, onOpenLiveSession }) => {
  const { user } = useAuth();
  const { exams, sessions, submissions, students } = useExam();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Isolate items belonging to this teacher
  const myExams = user?.role === 'admin'
    ? exams
    : exams.filter((e) => !e.authorId || e.authorId === user?.id || (user?.email && e.authorEmail === user.email));
  const myExamIds = new Set(myExams.map((e) => e.id));

  const mySessions = user?.role === 'admin'
    ? sessions
    : sessions.filter((s) => !s.teacherId || s.teacherId === user?.id || (user?.email && s.teacherEmail === user.email) || myExamIds.has(s.examId));
  const mySessionIds = new Set(mySessions.map((s) => s.id));

  const rawMySubmissions = user?.role === 'admin'
    ? submissions
    : submissions.filter((s) => myExamIds.has(s.examId) || (s.sessionId && mySessionIds.has(s.sessionId)));

  const mySubMap = new Map<string, ExamSubmission>();
  [...rawMySubmissions]
    .sort((a, b) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (b.status === 'submitted' && a.status !== 'submitted') return 1;
      const timeA = new Date(a.submitTime || a.lastActiveTime || a.startTime || 0).getTime();
      const timeB = new Date(b.submitTime || b.lastActiveTime || b.startTime || 0).getTime();
      return timeB - timeA;
    })
    .forEach((s) => {
      const key = `${s.sessionId || s.examId}_${s.studentCode || s.mshs || s.id}`.toUpperCase();
      if (!mySubMap.has(key)) mySubMap.set(key, s);
    });
  const mySubmissions = Array.from(mySubMap.values());

  const myStudents = user?.role === 'admin'
    ? students
    : students.filter((st) => !st.teacherId || st.teacherId === user?.id || (user?.email && st.teacherEmail === user.email));

  const totalExams = myExams.length;
  const totalStudents = myStudents.length;
  const activeSubmissions = mySubmissions.filter((s) => s.status === 'in_progress');
  const activeCount = activeSubmissions.length;
  const submittedCount = mySubmissions.filter((s) => s.status === 'submitted').length;
  const flaggedSubmissions = mySubmissions.filter((s) => s.isFlagged || (s.violations && s.violations.length > 0));

  // Dynamic statistics
  const totalParticipants = new Set(mySubmissions.map((s) => s.studentCode || s.studentName)).size;
  const avgScore =
    mySubmissions.length > 0
      ? (
          mySubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / mySubmissions.length
        ).toFixed(1)
      : '0.0';
  const under50Count = mySubmissions.filter((s) => (s.score || 0) < 5).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const activeSession = mySessions.find((s) => s.status === 'active');

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tổng quan Khảo thí & Lớp học
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Xin chào <strong className="text-brand-600">{user?.name || 'Thầy/Cô'}</strong>, đây là thống kê tình hình học sinh và ca thi của bạn.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Đề thi */}
        <div
          onClick={() => onNavigateView('exams')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Đề thi của tôi
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-indigo-700 tracking-tight">
              {totalExams}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {totalExams > 0 ? `${totalExams} đề thi đã tạo` : 'Chưa tạo đề thi nào'}
            </div>
          </div>
        </div>

        {/* Card 2: Học sinh */}
        <div
          onClick={() => onNavigateView('classes')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Học sinh & Lớp học
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-600 tracking-tight">
              {totalStudents}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {totalStudents > 0 ? `${totalStudents} học sinh trong danh sách` : 'Chưa thêm học sinh'}
            </div>
          </div>
        </div>

        {/* Card 3: Đang làm bài */}
        <div
          onClick={() => onNavigateView('sessions')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Đang làm bài
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {activeCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {activeCount > 0 ? `${activeCount} thí sinh đang trực tuyến` : 'Hiện không có thí sinh làm bài'}
            </div>
          </div>
        </div>

        {/* Card 4: Đã nộp bài */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Tổng lượt nộp bài
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {submittedCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {submittedCount > 0 ? `${submittedCount} bài thi đã hoàn thành` : 'Chưa có bài thi nào'}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: 7-day status banner & Live active session */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-day stats */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-slate-800">
              Thống Kê Khảo Thí Tổng Quan
            </h2>
          </div>
          <p className="text-xs text-slate-400 -mt-2">
            Tổng hợp từ tất cả ca thi và bài làm trong hệ thống
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Đã tham gia</span>
              <span className="text-2xl font-extrabold text-indigo-700 block mt-1">{totalParticipants}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{submissions.length} lượt thi</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Điểm trung bình</span>
              <span className="text-2xl font-extrabold text-emerald-700 block mt-1">{avgScore}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Thang điểm 10</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Có cảnh báo</span>
              <span className="text-2xl font-extrabold text-amber-700 block mt-1">
                {flaggedSubmissions.length}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Học sinh có vi phạm</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Dưới 5.0 điểm</span>
              <span className="text-2xl font-extrabold text-rose-700 block mt-1">{under50Count}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Lượt bài yếu/kém</span>
            </div>
          </div>
        </div>

        {/* Live Active Session Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-800">
                  Ca Thi Đang Diễn Ra
                </h2>
              </div>
              {activeSession && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {activeCount} Thí sinh
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi và giám sát trực tiếp FEXAM Guard
            </p>

            {activeSession ? (
              <div
                onClick={() => onOpenLiveSession(activeSession.id)}
                className="mt-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/80 hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-brand-600 line-clamp-1">
                    {activeSession.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-medium text-emerald-600">
                    Mã ca: <strong>{activeSession.code}</strong> · {activeCount} học sinh đang làm bài
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-6 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Hiện không có ca thi nào đang diễn ra.</p>
                <button
                  onClick={() => onNavigateView('session_create')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Ca Thi Mới</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Student Activities & Attention Needed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activities (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-800">
              Hoạt Động Học Sinh Gần Đây
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Lượt bắt đầu và nộp bài mới nhất
          </p>

          {submissions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {submissions.slice(0, 4).map((sub) => {
                const answered = sub.answeredCount ?? 0;
                const total = sub.totalQuestions || 10;
                const percent = Math.min(100, Math.round((answered / total) * 100));

                return (
                  <div
                    key={sub.id}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 -mx-2 px-2 rounded-2xl transition-colors cursor-pointer"
                    onClick={() => onNavigateView('sessions')}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">
                          {sub.studentName}
                        </span>
                        {sub.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 shrink-0">
                            <Activity className="w-3 h-3 animate-pulse" />
                            Đang làm
                          </span>
                        ) : sub.status === 'submitted' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã nộp · {sub.score !== undefined ? `${sub.score}đ` : 'Chờ chấm'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                            Cảnh báo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        Mã: {sub.studentCode} · {sub.examTitle || 'Bài kiểm tra'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div className="hidden sm:block">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-slate-500 font-medium">
                            {answered}/{total} câu
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {percent}%
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Chưa có lượt thi hoặc bài nộp nào trong hệ thống.</p>
            </div>
          )}
        </div>

        {/* Attention Needed (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">
              Cần Chú Ý (Vi Phạm)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Học sinh có cảnh báo gian lận
          </p>

          {flaggedSubmissions.length > 0 ? (
            <div className="space-y-3">
              {flaggedSubmissions.slice(0, 3).map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onNavigateView('sessions')}
                  className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-amber-800 truncate">
                      {sub.studentName}
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {sub.examTitle || 'Ca thi trực tuyến'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      {sub.violations?.length || 1} lần vi phạm
                    </span>
                    <span className="text-[11px] text-amber-600 truncate">
                      {sub.violations?.[0]?.message || 'Rời màn hình'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <p>Tất cả học sinh làm bài nghiêm túc, không có cảnh báo vi phạm nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
