import React, { useState } from 'react';
import {
  Flame,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Lock,
  Eye,
  Bot,
  Mail,
  HelpCircle,
  LogIn,
  Check,
  FileText,
  Clock,
  ChevronDown,
  Copy,
  Monitor,
  ShieldAlert,
  Users,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onGoToStudentExam: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToStudentExam,
}) => {
  const [guideTab, setGuideTab] = useState<'teacher' | 'student' | 'word_format'>('teacher');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedSample, setCopiedSample] = useState(false);

  const sampleWordFormat = `Câu 1: Cho hàm số $y = f(x)$ có bảng biến thiên như hình vẽ. Điểm cực đại của hàm số là:
*A. $x = 1$
B. $x = -2$
C. $y = 3$
D. $x = 0$
Lời giải: Dựa vào bảng biến thiên, hàm số đạt cực đại tại $x = 1$.

Câu 2: Cho hình chóp $S.ABCD$ có đáy là hình vuông cạnh $a$, $SA \\perp (ABCD)$.
a) [Đúng] Tam giác $SAB$ vuông tại $A$.
b) [Sai] Thể tích khối chóp $S.ABCD$ bằng $a^3$.
c) [Đúng] Đường thẳng $BD \\perp (SAC)$.
d) [Đúng] Khoảng cách từ $A$ đến $(SBD)$ bằng $\\frac{a\\sqrt{2}}{2}$.

Câu 3: Tính diện tích hình phẳng giới hạn bởi parabol $y = x^2$ và đường thẳng $y = 2x$:
[Đáp án: 4/3; 1.33]`;

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleWordFormat);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white font-sans antialiased">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  <span className="text-brand-600">F</span>EXAM
                </span>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  MOET 2025
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#moet-formats" className="hover:text-brand-600 transition-colors">
              3 Dạng Thức Đề
            </a>
            <a href="#security" className="hover:text-brand-600 transition-colors">
              Bảo Mật FEXAM Guard
            </a>
            <a href="#guide" className="hover:text-brand-600 transition-colors">
              Hướng Dẫn Sử Dụng
            </a>
            <a href="#faq" className="hover:text-brand-600 transition-colors">
              Hỏi Đáp
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onGoToStudentExam}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Phòng Thi Thí Sinh</span>
            </button>

            <button
              onClick={onGoToLogin}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm shadow-brand-600/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập GV</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Nền tảng Khảo thí &amp; Giám sát THPT Quốc gia 2025</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Tạo Đề Từ Word Trong 30 Giây &amp;{' '}
            <span className="text-brand-600">Giám Sát Chống Gian Lận</span>
          </h1>

          {/* Description */}
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
            Hỗ trợ toàn diện 3 dạng thức đề thi mới của Bộ GD&amp;ĐT, công thức Toán KaTeX sắc nét, màn chập đen chống chụp màn hình và tự động chấm điểm theo barem chính thức.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-600/25 transition-all cursor-pointer"
            >
              <span>Trải Nghiệm Dành Cho Giáo Viên</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGoToStudentExam}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 shadow-xs transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Học Sinh Vào Thi</span>
            </button>
          </div>

          {/* Metric Stats Strip */}
          <div className="pt-4 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xl font-black text-brand-600">30 Giây</p>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Tạo Đề Từ Word</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xl font-black text-indigo-600">3 Dạng Thức</p>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Chuẩn Bộ GD 2025</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xl font-black text-emerald-600">FEXAM Guard</p>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Chống Rời Tab &amp; AI</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xl font-black text-purple-600">KaTeX</p>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Công Thức Toán Học</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE PROCTOR DASHBOARD PREVIEW */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono font-bold text-slate-600">
                  Phòng Thi Trực Tuyến · Giám Sát Realtime
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  FEXAM Guard Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200">
                  MOET 2025
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Thí sinh đang thi</span>
                  <Users className="w-4 h-4 text-brand-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">45 / 45</p>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Kết nối ổn định
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Cảnh báo vi phạm</span>
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-slate-900">0 Vi Phạm</p>
                <p className="text-[10px] text-slate-500 mt-1">Màn chập đen bảo vệ đề thi</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Thời gian còn lại</span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-black text-brand-600">38:45</p>
                <p className="text-[10px] text-slate-500 mt-1">Tự động chấm khi hết giờ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 DẠNG THỨC ĐỀ THI MOET 2025 */}
      <section id="moet-formats" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              Quy Chuẩn Bộ GD&amp;ĐT
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              3 Dạng Thức Đề Thi Chuẩn 2025
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Tích hợp công thức Toán KaTeX và thuật toán chấm điểm theo đúng barem chính thức.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Format 1 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                P1
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trắc Nghiệm 4 Lựa Chọn</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Định dạng A, B, C, D truyền thống. Tự động xáo trộn câu hỏi và đáp án để chống nhìn bài.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {['Xáo trộn tự động', 'Chấm tức thì'].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Format 2 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                P2
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Đúng / Sai 4 Ý Phức Hợp</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Chấm điểm bậc thang MOET: 1 ý = 0.1đ, 2 ý = 0.25đ, 3 ý = 0.5đ, đúng cả 4 ý = 1.0đ.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {['4 ý a/b/c/d', 'Bậc thang MOET'].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Format 3 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                P3
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trả Lời Ngắn Thông Minh</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Thí sinh tự điền đáp số. Phân tích cú pháp chấp nhận nhiều dạng tương đương (phân số, số thập phân).
                </p>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {['Điền số/chữ', 'So khớp tương đương'].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY / FEXAM GUARD */}
      <section id="security" className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              An Toàn Khảo Thí
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Hệ Thống Giám Sát FEXAM Guard
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Đảm bảo tính trung thực và công bằng cho mọi kỳ thi trực tuyến.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Khóa Toàn Màn Hình</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Yêu cầu Fullscreen liên tục. Tự động ghi nhận khi thí sinh thoát hoặc chuyển tab.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Màn Chập Đen</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tức thì che mờ toàn bộ đề khi mất tiêu điểm, ngăn chặn chụp ảnh màn hình bằng ứng dụng ngoài.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Chặn Tiện Ích AI</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Vô hiệu hóa các tiện ích mở rộng AI (QuestionAI, Monica, Copilot) và phím tắt trợ năng.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Đình Chỉ Tự Động</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tự động khóa bài và nộp về giám thị khi thí sinh vi phạm quá số lần quy định.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW GUIDE & WORD TEMPLATE */}
      <section id="guide" className="py-16 bg-white border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              Quy Trình Hoạt Động
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Hướng Dẫn Sử Dụng
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Đơn giản, nhanh chóng cho cả Giáo viên và Thí sinh.
            </p>
          </div>

          {/* Guide Tabs */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1">
              {[
                { id: 'teacher', label: 'Dành cho Giáo viên', icon: Monitor },
                { id: 'student', label: 'Dành cho Học sinh', icon: GraduationCap },
                { id: 'word_format', label: 'Mẫu Soạn Đề Word', icon: FileText },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = guideTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setGuideTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher Guide */}
          {guideTab === 'teacher' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900">Nạp Đề File Word</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Tải lên file Word (.docx), hệ thống tự động nhận diện cả 3 dạng thức đề và công thức KaTeX.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900">Tạo Ca Thi</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Chọn ca thi chính thức (bật chống gian lận) hoặc ca ôn tập tự do. Cấp SBD tự động theo lớp.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900">Giám Sát Trực Tiếp</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Theo dõi tiến độ, số câu đã làm, cảnh báo vi phạm của từng thí sinh theo thời gian thực.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h4 className="text-xs font-bold text-slate-900">Xuất Điểm &amp; Báo Cáo</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Xem phổ điểm, phân tích câu sai nhiều và xuất bảng điểm Excel chỉ trong 1 click.
                </p>
              </div>
            </div>
          )}

          {/* Student Guide */}
          {guideTab === 'student' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900">Nhập Mã Ca Thi</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Bấm "Phòng Thi Thí Sinh" hoặc truy cập link do giáo viên gửi, điền Mã ca thi (5 số).
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900">Xác Thực Thông Tin</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Nhập Mã SBD dự thi hoặc họ tên và lớp học để nhận đề thi được gán.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900">Làm Bài Toàn Màn Hình</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Bật Toàn màn hình và hoàn thành bài thi. Giữ sự tập trung, không chuyển tab.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h4 className="text-xs font-bold text-slate-900">Nộp Bài &amp; Xem Điểm</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Nhấn nộp bài để xem điểm số ngay lập tức và in phiếu điểm A4 nếu được phép.
                </p>
              </div>
            </div>
          )}

          {/* Word Format Tab */}
          {guideTab === 'word_format' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Mẫu Soạn Đề Chuẩn File Word (.docx)</span>
                </div>
                <button
                  onClick={handleCopySample}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSample ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed border border-slate-800">
                {sampleWordFormat}
              </pre>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-400 pt-1">
                <div className="bg-slate-800/60 p-2.5 rounded-xl">
                  <strong className="text-white block mb-0.5">Phần 1: Trắc nghiệm</strong>
                  Đánh dấu đáp án đúng bằng <code className="text-emerald-400">*A.</code> hoặc <code className="text-emerald-400">[Đáp án: A]</code>.
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl">
                  <strong className="text-white block mb-0.5">Phần 2: Đúng / Sai</strong>
                  Ghi rõ <code className="text-emerald-400">a) [Đúng]</code> hoặc <code className="text-emerald-400">a) [Sai]</code> ở từng ý.
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl">
                  <strong className="text-white block mb-0.5">Phần 3: Trả lời ngắn</strong>
                  Ghi <code className="text-emerald-400">[Đáp án: 4/3; 1.33]</code> ở cuối câu hỏi.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              Giải Đáp Thắc Mắc
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Câu Hỏi Thường Gặp
            </h2>
          </div>

          <div className="space-y-2">
            {[
              {
                q: 'Học sinh có cần đăng ký tài khoản trước khi thi không?',
                a: 'Không. Học sinh chỉ cần nhập Mã ca thi (5 chữ số) hoặc truy cập link do giáo viên gửi là có thể tham gia thi ngay.',
              },
              {
                q: 'Chế độ Ôn tập khác gì so với Ca thi chính thức?',
                a: 'Chế độ Ôn tập tắt hoàn toàn các ràng buộc chống gian lận (không ép toàn màn hình, không làm mờ đề, không tính vi phạm). Thí sinh có thể ôn luyện tự do nhiều lần.',
              },
              {
                q: 'Nếu thí sinh bị mất kết nối mạng giữa chừng thì sao?',
                a: 'Hệ thống tự động lưu từng câu trả lời theo thời gian thực xuống bộ nhớ trình duyệt. Khi kết nối lại, bài thi tiếp tục bình thường với thời gian còn lại.',
              },
              {
                q: 'Hệ thống có hiển thị chuẩn công thức Toán, Lý, Hóa không?',
                a: 'Có. FEXAM tích hợp KaTeX chuẩn quốc tế, hiển thị chính xác mọi biểu thức phân số, tích phân, căn thức và ma trận phức tạp.',
              },
            ].map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand-600' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 text-slate-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-900">
                  <span className="text-brand-600">F</span>EXAM LMS
                </span>
                <p className="text-[10px] text-slate-400">Nền tảng Khảo thí &amp; Giám sát THPTQG 2025</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-600" />
                <a href="mailto:fprep.thptqg@gmail.com" className="font-semibold text-brand-600 hover:underline">
                  fprep.thptqg@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px] text-slate-400">
            <div>© 2026 Dự án FEXAM — FPREP LMS.</div>
            <div className="font-medium text-slate-500">Email hỗ trợ: fprep.thptqg@gmail.com</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
