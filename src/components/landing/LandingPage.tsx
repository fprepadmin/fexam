import React, { useState } from 'react';
import {
  Flame,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Lock,
  Eye,
  Layers,
  Bot,
  Mail,
  HelpCircle,
  LogIn,
  Check,
  FileText,
  Users,
  Clock,
  BookOpen,
  ChevronDown,
  Copy,
  CheckCircle2,
  AlertCircle,
  Monitor,
  ShieldAlert,
  Activity,
  Zap,
  CheckCheck,
  Award,
  BarChart3,
  Search,
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
  const [guideTab, setGuideTab] = useState<'teacher' | 'student' | 'word_format' | 'faq'>('teacher');
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
    <div className="min-h-screen bg-[#FAFCFF] text-slate-900 selection:bg-brand-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-brand-100/50 via-indigo-50/40 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-[28%] right-[-5%] w-[500px] h-[500px] bg-blue-50/60 rounded-full blur-[100px]" />
        <div className="absolute top-[65%] left-[-5%] w-[450px] h-[450px] bg-emerald-50/50 rounded-full blur-[100px]" />
      </div>

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  <span className="text-brand-600">F</span>EXAM
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/80">
                  MOET 2025
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none">
                Hệ sinh thái Giáo dục Trực tuyến FPREP
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#moet-formats" className="hover:text-brand-600 transition-colors">
              3 Dạng Thức Đề
            </a>
            <a href="#fexam-guard" className="hover:text-brand-600 transition-colors">
              Giám Sát Chống Gian Lận
            </a>
            <a href="#handbook" className="hover:text-brand-600 transition-colors">
              Cẩm Nang &amp; Hướng Dẫn
            </a>
            <a href="#support" className="hover:text-brand-600 transition-colors">
              Hỗ Trợ Kỹ Thuật
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onGoToStudentExam}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Phòng Thi Thí Sinh</span>
            </button>

            <button
              onClick={onGoToLogin}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập GV</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-18 lg:pb-24 overflow-hidden z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-brand-200/90 text-brand-700 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span>Chuẩn cấu trúc Đề thi THPT Quốc gia 2025 · Nhận diện Word &amp; KaTeX</span>
          </div>

          {/* Hero Main Heading */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] text-balance">
              Nền Tảng Khảo Thí Trực Tuyến &amp;{' '}
              <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 bg-clip-text text-transparent">
                Giám Sát Chống Gian Lận
              </span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-normal leading-relaxed text-balance">
              Tạo đề thi tự động từ file Word trong <strong className="text-slate-900 font-bold">30 giây</strong>. Tích hợp công nghệ giám sát <strong className="text-brand-600 font-bold">FEXAM Guard</strong> đa tầng: khóa toàn màn hình, màn chập chống gian lận và chấm điểm theo barem Bộ GD&amp;ĐT.
            </p>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-600/25 transition-all hover:scale-105 cursor-pointer"
            >
              <span>Trải Nghiệm Dành Cho Giáo Viên</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGoToStudentExam}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Học Sinh Vào Thi Ngay</span>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="pt-4 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xl sm:text-2xl font-black text-brand-600">30 Giây</p>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">Tạo Đề Từ Word</p>
            </div>
            <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xl sm:text-2xl font-black text-indigo-600">3 Dạng Thức</p>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">Chuẩn Bộ GD 2025</p>
            </div>
            <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xl sm:text-2xl font-black text-emerald-600">100%</p>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">Chống Rời Màn Hình</p>
            </div>
            <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xl sm:text-2xl font-black text-purple-600">KaTeX</p>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">Công Thức Toán Chuẩn</p>
            </div>
          </div>

          {/* PRODUCT SHOWCASE / PROCTORING DASHBOARD PREVIEW */}
          <div className="pt-6 max-w-4xl mx-auto">
            <div className="rounded-3xl p-3 bg-gradient-to-b from-blue-100/70 via-indigo-50/50 to-slate-200/50 border border-blue-200/70 shadow-xl">
              <div className="bg-white rounded-2xl p-5 sm:p-7 text-left border border-slate-100 shadow-xs space-y-5">
                {/* Header bar mock */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      fexam.edu.vn / phong-thi / ca-thi-toan-12
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>FEXAM Guard Active</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200">
                      MOET 2025
                    </span>
                  </div>
                </div>

                {/* Dashboard metric snippet */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thí sinh đang thi</p>
                      <Users className="w-4 h-4 text-brand-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">45 / 45</p>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Kết nối ổn định
                    </p>
                  </div>

                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cảnh báo vi phạm</p>
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-amber-600">0 Vi Phạm</p>
                    <p className="text-[10px] text-slate-500">Màn chập đen bảo vệ đề thi</p>
                  </div>

                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thời gian còn lại</p>
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-black text-brand-600">38:45</p>
                    <p className="text-[10px] text-slate-500">Tự động chấm khi hết giờ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 DẠNG THỨC ĐỀ THI MOET 2025 */}
      <section id="moet-formats" className="py-20 bg-white border-y border-slate-100 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Quy Chuẩn Bộ GD&amp;ĐT
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight text-balance">
              Hỗ Trợ Toàn Diện 3 Dạng Thức Đề Thi 2025
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed text-balance">
              Tích hợp bộ hiển thị công thức Toán, Lý, Hóa KaTeX chuẩn quốc tế và thuật toán chấm điểm theo barem chính thức của Bộ GD&amp;ĐT.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Format 1 */}
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80 hover:border-brand-400 hover:bg-white hover:shadow-lg transition-all space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-200 shadow-xs">
                P1
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">Trắc Nghiệm 4 Lựa Chọn</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Định dạng A, B, C, D truyền thống. Tự động xáo trộn ngẫu nhiên thứ tự câu hỏi và phương án trả lời để chống nhìn bài.
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {['Xáo trộn tự động', 'Chấm tức thì', '1 điểm / câu'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    <Check className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Format 2 */}
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm border border-purple-200 shadow-xs">
                P2
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">Đúng / Sai 4 Ý Phức Hợp</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Chấm điểm bậc thang MOET 2025: 1 ý đúng = 0.1đ, 2 ý = 0.25đ, 3 ý = 0.5đ, đúng cả 4 ý = 1.0 điểm chuẩn xác từng phần trăm.
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {['4 ý a/b/c/d', 'Bậc thang MOET', 'Chấm điểm tự động'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                    <Check className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Format 3 */}
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80 hover:border-emerald-400 hover:bg-white hover:shadow-lg transition-all space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-200 shadow-xs">
                P3
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">Trả Lời Ngắn Thông Minh</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Học sinh tự điền đáp số. Thuật toán thông minh phân tích cú pháp, chấp nhận nhiều dạng đáp án tương đương (phân số, số thập phân).
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {['Điền số/chữ', 'So khớp tương đương', 'Chống Auto-Type'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <Check className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEXAM GUARD PRO ANTI-CHEAT SECTION */}
      <section id="fexam-guard" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>FEXAM Guard Pro Security</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight text-balance">
              Giám Sát Chống Gian Lận Đa Tầng
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed text-balance">
              Bảo đảm tính minh bạch, công bằng tuyệt đối cho mọi kỳ thi trực tuyến với các lớp phòng vệ tự động.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 hover:border-rose-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Bắt Buộc Toàn Màn Hình</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Học sinh phải kích hoạt chế độ Fullscreen mới có thể mở đề thi. Mọi thao tác thu nhỏ cửa sổ hoặc mở đa nhiệm đều bị phát hiện.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 hover:border-amber-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Eye className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Màn Chập Đen Che Khuất Đề</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khi học sinh mất tiêu điểm hoặc chuyển tab, màn chập đen sẽ kích hoạt ngay lập tức che toàn bộ câu hỏi để ngăn chụp trộm màn hình.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Khóa Tiện Ích AI &amp; Macro</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tự động ngăn chặn các tiện ích trợ lý AI (QuestionAI, Monica, Copilot) và bộ gõ phím macro tự động giải bài.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Vô Hiệu Hóa Copy / DevTools</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chặn chuột phải, phím F12, vô hiệu hóa sao chép văn bản và kéo thả — đề thi được bảo vệ an toàn trên giao diện trình duyệt.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Đình Chỉ Thi Tự Động</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khi học sinh vi phạm quá số lần cho phép (mặc định 3 lần), hệ thống tự động khóa đề, tính điểm câu đã làm và thu bài về Giám thị.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Giám Sát Thời Gian Thực</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Giáo viên theo dõi tiến độ từng học sinh trực tiếp: thời gian làm bài, số câu đã chọn, cộng phút bù giờ hoặc thu bài cưỡng chế.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CẨM NANG & HƯỚNG DẪN SỬ DỤNG CHI TIẾT */}
      <section id="handbook" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Tài Liệu Hướng Dẫn
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight text-balance">
              Hướng Dẫn Sử Dụng Nền Tảng
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed text-balance">
              Quy trình tổ chức kỳ thi hoàn chỉnh cho Giáo viên và hướng dẫn thao tác làm bài thi cho Học sinh.
            </p>
          </div>

          {/* Guide Category Tabs */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80 gap-1 flex-wrap justify-center">
              {[
                { id: 'teacher', label: 'Dành cho Giáo viên', icon: Monitor },
                { id: 'student', label: 'Dành cho Học sinh', icon: GraduationCap },
                { id: 'word_format', label: 'Mẫu Soạn Đề Word', icon: FileText },
                { id: 'faq', label: 'Câu Hỏi Thường Gặp', icon: HelpCircle },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = guideTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setGuideTab(t.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: Dành cho Giáo viên */}
          {guideTab === 'teacher' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-150">
              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-brand-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  1
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Soạn &amp; Nạp Đề Thi</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tải lên file Word (.docx) hoặc dán JSON đề thi. Hệ thống tự động nhận diện cả 3 phần trắc nghiệm chuẩn Bộ GD&amp;ĐT 2025.
                </p>
                <div className="text-[11px] text-brand-700 font-bold bg-brand-50 p-2 rounded-xl border border-brand-100">
                  Hỗ trợ công thức Toán, Lý, Hóa KaTeX.
                </div>
              </div>

              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-brand-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  2
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Tạo Ca Thi / Ca Ôn Tập</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lựa chọn loại ca: <strong className="text-brand-700 font-bold">Ca thi chính thức</strong> (bật chống gian lận) hoặc <strong className="text-brand-700 font-bold">Ca ôn tập</strong> (tự do luyện tập).
                </p>
                <div className="text-[11px] text-brand-700 font-bold bg-brand-50 p-2 rounded-xl border border-brand-100">
                  Cấp SBD 5 số theo lớp hoặc qua link.
                </div>
              </div>

              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-brand-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  3
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Giám Sát Trực Tiếp</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Theo dõi trạng thái từng thí sinh theo thời gian thực (Số câu đã làm, Vi phạm thoát tab, Nhắc nhở trực tiếp, Cộng bù giờ).
                </p>
                <div className="text-[11px] text-brand-700 font-bold bg-brand-50 p-2 rounded-xl border border-brand-100">
                  Thu bài cưỡng chế khi học sinh vi phạm.
                </div>
              </div>

              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-brand-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  4
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Báo Cáo &amp; Xuất Điểm</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tự động chấm điểm theo thang 10. Xem biểu đồ phổ điểm, phân tích câu sai nhiều và xuất bảng điểm Excel chỉ trong 1 click.
                </p>
                <div className="text-[11px] text-brand-700 font-bold bg-brand-50 p-2 rounded-xl border border-brand-100">
                  Tùy chỉnh bật/tắt quyền xem lại bài thi.
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Dành cho Học sinh */}
          {guideTab === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-150">
              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-emerald-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  1
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Nhập Mã Phòng Thi</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhấp vào nút <strong className="text-emerald-700 font-bold">Phòng Thi Thí Sinh</strong> trên trang chủ hoặc mở link do thầy cô gửi, nhập Mã ca thi (5 chữ số).
                </p>
              </div>

              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-emerald-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  2
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Xác Thực Thông Tin</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhập Mã dự thi (SBD) nếu thi theo danh sách lớp, hoặc điền Họ tên, Lớp học và Email để nhận kết quả bài thi.
                </p>
              </div>

              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-emerald-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  3
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Làm Bài Toàn Màn Hình</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhấn "Bắt đầu thi" để kích hoạt Toàn màn hình. Giữ sự tập trung trong suốt quá trình làm bài, không chuyển tab để tránh bị phạt lỗi.
                </p>
              </div>

              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2.5 hover:border-emerald-400 hover:bg-white transition-all shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  4
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Nộp Bài &amp; Xem Kết Quả</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhấn "Nộp bài", màn hình tự động hiển thị Điểm số, Thời gian làm bài, Số câu đúng/sai và hỗ trợ In Phiếu Điểm A4.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Mẫu Soạn Đề Word */}
          {guideTab === 'word_format' && (
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl border border-slate-800 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Cú Pháp Soạn Thảo Đề Thi Chuẩn File Word (.docx)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ công thức Toán Lý Hóa bằng ký hiệu $...$, tự nhận diện đáp án đúng bằng dấu sao (*) hoặc nhãn [Đúng/Sai]
                  </p>
                </div>

                <button
                  onClick={handleCopySample}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSample ? 'Đã sao chép!' : 'Sao chép mẫu'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950/90 rounded-2xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed border border-slate-800 selection:bg-brand-600">
                {sampleWordFormat}
              </pre>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                  <span className="font-bold text-white block">Phần 1: Trắc nghiệm 4 lựa chọn</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Bắt đầu bằng <code className="text-emerald-400 font-bold">*A.</code> hoặc <code className="text-emerald-400 font-bold">[Đáp án: A]</code> để chỉ định phương án đúng.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                  <span className="font-bold text-white block">Phần 2: Đúng / Sai 4 ý</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Mỗi ý ghi <code className="text-emerald-400 font-bold">a) [Đúng]</code> hoặc <code className="text-emerald-400 font-bold">a) [Sai]</code>. Chấm bậc thang 0.1 - 0.25 - 0.5 - 1.0đ.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                  <span className="font-bold text-white block">Phần 3: Trả lời ngắn</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Ghi <code className="text-emerald-400 font-bold">[Đáp án: 4/3; 1.33]</code> ở cuối câu. Hệ thống tự động so khớp các dạng đáp án tương đương.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: FAQ */}
          {guideTab === 'faq' && (
            <div className="max-w-2xl mx-auto space-y-2.5 animate-in fade-in duration-150">
              {[
                {
                  q: 'Làm thế nào để học sinh vào phòng thi mà không cần tạo tài khoản?',
                  a: 'Học sinh không cần đăng ký tài khoản. Giáo viên chỉ cần gửi Mã ca thi (5 chữ số) hoặc link trực tiếp, học sinh truy cập vào là có thể làm bài ngay.',
                },
                {
                  q: 'Chế độ Ôn tập & Luyện tập khác gì với Ca thi chính thức?',
                  a: 'Chế độ Ôn tập sẽ tắt hoàn toàn FEXAM Guard (không bắt buộc toàn màn hình, không làm mờ đề, không tính lỗi vi phạm). Học sinh có thể làm lại nhiều lần và xem lời giải chi tiết ngay sau khi nộp.',
                },
                {
                  q: 'Nếu học sinh vô tình bị mất mạng hoặc reload trang thì có bị mất bài không?',
                  a: 'Không. Hệ thống tự động lưu từng câu trả lời xuống bộ nhớ trình duyệt theo thời gian thực. Khi kết nối lại, học sinh tiếp tục làm bài với đúng thời gian còn lại.',
                },
                {
                  q: 'Hệ thống có hỗ trợ công thức Toán, Vật lý, Hóa học phức tạp không?',
                  a: 'Có. FEXAM tích hợp bộ dựng công thức toán học KaTeX chuẩn quốc tế, hiển thị sắc nét phân số, tích phân, căn thức, ma trận, ký hiệu hình học và phương trình hóa học.',
                },
              ].map((faq, i) => {
                const isOpen = openFaqIndex === i;
                return (
                  <div
                    key={i}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs transition-all"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand-600' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer id="support" className="bg-white border-t border-slate-200/80 py-10 text-slate-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="text-base font-black text-slate-900">
                  <span className="text-brand-600">F</span>EXAM LMS
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Nền tảng Khảo thí &amp; Giám sát THPT Quốc gia 2025</p>
              </div>
            </div>

            {/* Support Info */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                <HelpCircle className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="font-bold text-slate-700">Hỗ trợ trực tuyến</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                <a
                  href="mailto:fprep.thptqg@gmail.com"
                  className="font-bold text-brand-600 hover:underline"
                >
                  fprep.thptqg@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px] text-slate-400">
            <div>© 2026 Dự án FEXAM — FPREP LMS. Chuẩn hóa Khảo thí &amp; Chống gian lận THPTQG.</div>
            <div className="font-medium text-slate-500">Admin Email: thongtnmfct31178@gmail.com</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

