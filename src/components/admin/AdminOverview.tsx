import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  FileText,
  CalendarCheck,
  GraduationCap,
  Crown,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  UserPlus,
  Settings,
  Database,
  CheckCircle2,
  AlertTriangle,
  Radio,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { TeacherView } from '../common/Sidebar';

interface AdminOverviewProps {
  onNavigate: (view: TeacherView) => void;
  onOpenSessionProctor: (sessionId: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  onNavigate,
  onOpenSessionProctor,
}) => {
  const { allTeachers, user } = useAuth();
  const { exams, sessions, submissions } = useExam();

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang <strong>Quản Trị Hệ Thống FEXAM</strong> chỉ dành riêng cho Quản trị viên (Admin). Tài khoản Giáo viên không có quyền truy cập.
        </p>
      </div>
    );
  }

  // Calculate System-wide stats
  const totalTeachers = allTeachers.filter((t) => t.role === 'teacher').length;
  const vipTeachers = allTeachers.filter((t) => t.plan === 'vip').length;
  const proTeachers = allTeachers.filter((t) => t.plan === 'pro').length;
  const standardTeachers = allTeachers.filter((t) => t.plan === 'standard').length;

  const totalExams = exams.length;
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => s.status === 'active');
  const totalSubmissions = submissions.length;
  const totalViolations = submissions.reduce((acc, sub) => acc + (sub.violations?.length || 0), 0);

  // Group teachers by subject
  const subjectCounts: { [key: string]: number } = {};
  allTeachers.forEach((t) => {
    if (t.role === 'teacher') {
      const subj = t.subject || 'Khác';
      subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner (Vibrant Light Blue) */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Trung Tâm Quản Trị Hệ Thống FEXAM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Bảng Điều Khiển Quản Lý Toàn Trường
          </h1>
          <p className="text-slate-100 text-xs md:text-sm max-w-2xl leading-relaxed">
            Xin chào <span className="font-bold text-amber-200">{user?.name}</span>. Bạn đang quản lý toàn bộ danh sách giáo viên, kho đề thi, ca thi trực tiếp và phân bổ gói dịch vụ cho toàn trường.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => onNavigate('admin_teachers')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-brand-700 font-extrabold text-xs shadow-md transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4 text-brand-600" />
            <span>Quản Lý Giáo Viên</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Cấu Hình Firebase</span>
          </button>
        </div>
      </div>

      {/* 4 Main Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teachers */}
        <div
          onClick={() => onNavigate('admin_teachers')}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card hover:border-brand-200 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              {vipTeachers} VIP · {proTeachers} PRO
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Số Giáo Viên</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalTeachers}</p>
          </div>
        </div>

        {/* Total Exams */}
        <div
          onClick={() => onNavigate('admin_exams')}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card hover:border-brand-200 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Toàn trường
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kho Đề Thi Toàn Hệ Thống</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalExams}</p>
          </div>
        </div>

        {/* Active Sessions */}
        <div
          onClick={() => onNavigate('admin_sessions')}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card hover:border-brand-200 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Live
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ca Thi Đang Diễn Ra</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{activeSessions.length} / {totalSessions}</p>
          </div>
        </div>

        {/* Total Submissions */}
        <div
          onClick={() => onNavigate('admin_submissions')}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card hover:border-brand-200 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            {totalViolations > 0 ? (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {totalViolations} vi phạm
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Minh bạch
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lượt Thí Sinh Đã Nộp</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalSubmissions}</p>
          </div>
        </div>
      </div>

      {/* 2 Columns: Subject Distribution & Active Live Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Teachers by Subject Distribution */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Phân Bổ Giáo Viên Theo Bộ Môn</h2>
            </div>
            <button
              onClick={() => onNavigate('admin_teachers')}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              Chi tiết
            </button>
          </div>

          {Object.keys(subjectCounts).length > 0 ? (
            <div className="space-y-3 pt-1">
              {Object.entries(subjectCounts).map(([subj, count]) => {
                const percentage = Math.round((count / (totalTeachers || 1)) * 100);
                return (
                  <div key={subj} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{subj}</span>
                      <span>{count} giáo viên ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có giáo viên nào đăng ký bộ môn. Nhấn "Quản lý Giáo viên" để thêm.
            </div>
          )}
        </div>

        {/* Right: Realtime Sessions Overview */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900">Giám Sát Trực Tiếp Ca Thi Toàn Trường</h2>
              </div>
              <button
                onClick={() => onNavigate('admin_sessions')}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                Xem tất cả ({sessions.length})
              </button>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-3 pt-3">
                {sessions.slice(0, 3).map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs truncate">
                          {sess.title}
                        </span>
                        {sess.status === 'active' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200 shrink-0">
                            Đang thi
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold text-[10px] shrink-0">
                            {sess.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Mã ca: <strong className="text-brand-600">{sess.code}</strong> · {sess.examTitle}
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenSessionProctor(sess.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shrink-0 shadow-xs"
                    >
                      <span>Giám sát</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Hiện chưa có ca thi nào được tạo trong hệ thống.</p>
              </div>
            )}
          </div>

          {/* System Status Footer Box */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Máy chủ Firebase Realtime đang hoạt động ổn định</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold">100% Sẵn Sàng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
