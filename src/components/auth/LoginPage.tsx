import React, { useState } from 'react';
import {
  Flame,
  ArrowRight,
  ShieldCheck,
  Crown,
  Sparkles,
  GraduationCap,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Home,
  School,
  Mail,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_EMAILS } from '../../services/storage';

interface LoginPageProps {
  onSuccess: () => void;
  onGoToLanding: () => void;
  onOpenStudentExam: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onGoToLanding,
  onOpenStudentExam,
}) => {
  const { loginGoogle, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await loginGoogle();
    setIsLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 flex flex-col justify-between p-4 sm:p-6 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between z-10 py-2">
        <button
          onClick={onGoToLanding}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-600 transition-colors bg-white hover:bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs"
        >
          <Home className="w-4 h-4 text-brand-600" />
          <span>Trang Chủ FEXAM</span>
        </button>

        <button
          onClick={onOpenStudentExam}
          className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-2xl border border-emerald-200 shadow-xs"
        >
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <span>Vào Phòng Thi Thí Sinh</span>
        </button>
      </div>

      {/* Main Google Auth Card */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 my-auto py-8">
        {/* Left: Platform Overview */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Flame className="w-7 h-7 fill-current" />
              </div>
              <div>
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  <span className="text-brand-600">F</span>EXAM
                </span>
                <span className="ml-2 text-xs uppercase tracking-wider font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  Google Auth
                </span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Đăng Nhập Khảo Thí & Quản Trị Trực Tuyến
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Hệ thống xác thực bảo mật duy nhất qua <strong className="text-slate-800 font-bold">Google Sign-In</strong>. Dữ liệu đề thi, lớp học và ca thi của mỗi giáo viên hoàn toàn phân lập độc lập.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-700 bg-white/90 p-3 rounded-2xl border border-slate-100 shadow-xs">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center shrink-0 border border-blue-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Xác thực 1-Click an toàn qua tài khoản Google</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-700 bg-white/90 p-3 rounded-2xl border border-slate-100 shadow-xs">
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Crown className="w-4 h-4" />
              </div>
              <span>Tự động kích hoạt quyền Super Admin cho email quản trị viên</span>
            </div>
          </div>
        </div>

        {/* Right: Google Sign-In Action Box */}
        <div className="lg:col-span-6">
          <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-100">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Đăng Nhập Bằng Google
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Nhấn nút bên dưới để đăng nhập bằng tài khoản Google của bạn và bắt đầu sử dụng FEXAM.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Primary Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm border-2 border-slate-200 hover:border-brand-500 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 group"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}</span>
            </button>

            {/* Info Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span>Dự án FEXAM — FPREP LMS</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Hệ thống thi trực tuyến chuyên nghiệp dành cho giáo viên và học sinh. Liên hệ hỗ trợ qua email bên dưới để được cấp tài khoản giáo viên.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 z-10 py-3 border-t border-slate-200/80 gap-2">
        <div className="flex items-center gap-2">
          <span>Hỗ trợ kỹ thuật:</span>
          <span className="font-bold text-slate-800">Dự án FEXAM · FPREP LMS</span>
          <span>•</span>
          <a href="mailto:fprep.thptqg@gmail.com" className="text-brand-600 font-bold hover:underline">
            fprep.thptqg@gmail.com
          </a>
        </div>
        <p className="text-[11px] text-slate-400">© 2026 FEXAM Education Platform.</p>
      </div>
    </div>
  );
};
