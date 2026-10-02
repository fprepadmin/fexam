import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Crown,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Ban,
  UserPlus,
  Settings,
  Database,
  BookOpen,
  Lock,
  Server,
  Cloud,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TeacherView } from '../common/Sidebar';

interface AdminOverviewProps {
  onNavigate: (view: TeacherView) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  onNavigate,
}) => {
  const { allTeachers, user } = useAuth();

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

  // Deduplicate teachers
  const uniqueTeachers = React.useMemo(() => {
    const map = new Map<string, typeof allTeachers[0]>();
    allTeachers.forEach((t) => {
      const email = (t.email || '').trim().toLowerCase();
      if (email && !map.has(email)) {
        map.set(email, t);
      }
    });
    return Array.from(map.values());
  }, [allTeachers]);

  // Calculate Teacher & Plan stats ONLY (Strictly zero exam / session / submission data)
  const totalTeachers = uniqueTeachers.filter((t) => t.role === 'teacher').length;
  const vipTeachers = uniqueTeachers.filter((t) => t.plan === 'vip').length;
  const proTeachers = uniqueTeachers.filter((t) => t.plan === 'pro').length;
  const standardTeachers = uniqueTeachers.filter((t) => t.plan === 'standard').length;

  const activeTeachers = uniqueTeachers.filter((t) => t.status === 'active').length;
  const pendingTeachers = uniqueTeachers.filter((t) => t.status === 'pending').length;
  const suspendedTeachers = uniqueTeachers.filter((t) => t.status === 'suspended').length;

  // Group teachers by subject
  const subjectCounts: { [key: string]: number } = {};
  uniqueTeachers.forEach((t) => {
    if (t.role === 'teacher') {
      const subj = t.subject || 'Khác';
      subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>FEXAM Super Admin Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Trung Tâm Quản Trị & Phân Quyền Hệ Thống
          </h1>
          <p className="text-slate-100 text-xs md:text-sm max-w-2xl leading-relaxed">
            Xin chào <span className="font-bold text-amber-200">{user?.name}</span>. Bạn đang quản trị danh sách giáo viên, phân bổ gói tài khoản VIP/PRO và cấu hình máy chủ đám mây Firebase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => onNavigate('admin_teachers')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-brand-700 font-extrabold text-xs shadow-md transition-all hover:scale-[1.02] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-brand-600" />
            <span>Quản Lý Giáo Viên</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Cấu Hình Firebase</span>
          </button>
        </div>
      </div>

      {/* STRICT SECURITY POLICY NOTICE */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-300 flex items-start gap-3.5 text-amber-900 shadow-xs">
        <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-black text-amber-950 uppercase tracking-wider">
            Chính Sách Bảo Mật Nghiêm Ngặt (Quyền Riêng Tư 100%)
          </p>
          <p className="text-amber-900/90 leading-relaxed">
            Tài khoản Quản trị viên (Super Admin) <strong>bị cấm hoàn toàn 100%</strong> mọi quyền hạn liên quan đến việc xem, tạo, sửa, xóa đề thi, câu hỏi, ca kiểm tra và bài làm của học sinh. Mọi dữ liệu khảo thí thuộc quyền sở hữu riêng tư và bảo mật độc lập của từng Giáo viên bộ môn.
          </p>
        </div>
      </div>

      {/* 4 Main Metric Cards (Teachers & Accounts Only) */}
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
              Toàn trường
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Số Giáo Viên</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalTeachers}</p>
          </div>
        </div>

        {/* VIP Teachers */}
        <div
          onClick={() => onNavigate('admin_teachers')}
          className="bg-white p-5 rounded-3xl border border-amber-100 shadow-card hover:border-amber-300 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Crown className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              VIP Unlimited
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài Khoản VIP</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{vipTeachers}</p>
          </div>
        </div>

        {/* PRO Teachers */}
        <div
          onClick={() => onNavigate('admin_teachers')}
          className="bg-white p-5 rounded-3xl border border-purple-100 shadow-card hover:border-purple-300 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              PRO Plan
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài Khoản PRO</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{proTeachers}</p>
          </div>
        </div>

        {/* Standard / Active Teachers */}
        <div
          onClick={() => onNavigate('admin_teachers')}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card hover:border-brand-200 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeTeachers} Đang hoạt động
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài Khoản Chuẩn / Standard</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{standardTeachers}</p>
          </div>
        </div>
      </div>

      {/* 2 Columns: Subject Distribution & System Services Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Teachers by Subject Distribution */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Phân Bổ Giáo Viên Theo Bộ Môn</h2>
            </div>
            <button
              onClick={() => onNavigate('admin_teachers')}
              className="text-xs font-bold text-brand-600 hover:underline cursor-pointer"
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

        {/* Right: System & Infrastructure Status */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Trạng Thái Dịch Vụ & Máy Chủ</h2>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                100% Sẵn sàng
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Cloud Firestore Database</p>
                    <p className="text-[11px] text-slate-400">Lưu trữ bảo mật & Realtime listeners</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Hoạt động
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Firebase Authentication</p>
                    <p className="text-[11px] text-slate-400">Đăng nhập Google OAuth2 & bảo mật tài khoản</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Hoạt động
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cloud className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Cloudinary Media CDN</p>
                    <p className="text-[11px] text-slate-400">Tối ưu nén ảnh & hình vẽ đề thi</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Hoạt động
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('settings')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Kiểm Tra & Cấu Hình Firebase Rules</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
