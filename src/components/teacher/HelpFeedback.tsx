import React, { useState } from 'react';
import {
  HelpCircle,
  MessageSquareWarning,
  Send,
  CheckCircle2,
  Mail,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  Users,
  Monitor,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const HelpFeedback: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'word_format' | 'anti_cheat' | 'feedback'>('workflow');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('bug');
  const [isSent, setIsSent] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  const sampleWordFormat = `Câu 1: Cho hàm số $y = f(x)$ có bảng biến thiên như hình vẽ. Điểm cực đại của hàm số là:
*A. $x = 1$
B. $x = -2$
C. $y = 3$
D. $x = 0$
Lời giải: Dựa vào bảng biến thiên, đạo hàm đổi dấu từ dương sang âm tại $x = 1$.

Câu 2: Cho tứ diện $OABC$ có $OA, OB, OC$ đôi một vuông góc và $OA = OB = OC = a$.
a) [Đúng] Tam giác $ABC$ là tam giác đều cạnh $a\\sqrt{2}$.
b) [Sai] Thể tích khối tứ diện $OABC$ bằng $\\frac{a^3}{3}$.
c) [Đúng] Đường thẳng $OA$ vuông góc với mặt phẳng $(OBC)$.
d) [Đúng] Khoảng cách từ $O$ đến mặt phẳng $(ABC)$ bằng $\\frac{a}{\\sqrt{3}}$.

Câu 3: Cho hình phẳng giới hạn bởi $y = x^2$ và $y = 2x$. Tính thể tích khối tròn xoay quanh trục $Ox$:
[Đáp án: 4.27; 64/15; 2.68]`;

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleWordFormat);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setFeedback('');
      alert('Cảm ơn thầy/cô đã gửi đóng góp ý kiến cho Dự án FEXAM!');
    }, 600);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Hướng Dẫn Sử Dụng &amp; Hỗ Trợ Kỹ Thuật
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cẩm nang hướng dẫn chi tiết các tính năng, mẫu định dạng đề thi và kênh tiếp nhận phản hồi
          </p>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold self-start sm:self-auto">
          <Mail className="w-4 h-4 text-brand-600 shrink-0" />
          <a href="mailto:fprep.thptqg@gmail.com" className="hover:underline">
            fprep.thptqg@gmail.com
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'workflow', label: 'Quy trình tạo & quản lý thi', icon: Monitor },
          { id: 'word_format', label: 'Cú pháp soạn đề Word (.docx)', icon: FileText },
          { id: 'anti_cheat', label: 'Chống gian lận FEXAM Guard', icon: ShieldCheck },
          { id: 'feedback', label: 'Gửi phản hồi / Báo lỗi', icon: MessageSquareWarning },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Workflow */}
      {activeTab === 'workflow' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Soạn thảo &amp; Tạo đề thi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vào mục <strong>"Quản lý Đề thi"</strong> &rarr; Bấm <strong>"+ Tạo Đề Thi Mới"</strong>. Thầy cô có thể chọn chế độ <em>Thi chính thức</em> (bật FEXAM Guard) hoặc <em>Ôn tập tự do</em> (tắt giám sát). Nạp đề tự động bằng file Word (.docx) hoặc dán mã JSON từ file PDF/Ảnh qua Prompt AI.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Tổ chức Ca thi &amp; Cấp mã SBD</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vào mục <strong>"Ca thi &amp; Giám sát"</strong> &rarr; Bấm <strong>"+ Tạo Ca Thi Mới"</strong>. Chọn đề thi, chọn lớp học để hệ thống tự động sinh Số báo danh (SBD) 5 số riêng cho từng học sinh, hoặc chọn <em>Tự do qua Link</em> để học sinh tự điền họ tên.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Giám sát Phòng thi Trực tiếp</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bấm <strong>"Vào Giám sát Trực tiếp"</strong> trên ca thi đang diễn ra. Thầy cô theo dõi số học sinh đang làm bài, phát hiện ngay các trường hợp vi phạm thoát tab/mờ màn hình, có thể gửi tin nhắn nhắc nhở hoặc cộng thêm thời gian thi.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">Tổng kết Bảng điểm &amp; Báo cáo</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sau khi ca thi kết thúc hoặc học sinh nộp bài, bấm <strong>"Bảng điểm"</strong> để xem phổ điểm, danh sách điểm số của từng học sinh, thống kê câu sai nhiều nhất và xuất file Excel/CSV lưu trữ vào sổ điểm.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Word Format */}
      {activeTab === 'word_format' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mẫu Soạn Đề Chuẩn File Word (.docx)</h3>
              <p className="text-xs text-slate-500">Soạn trực tiếp trên Microsoft Word, lưu file định dạng .docx và tải lên FEXAM</p>
            </div>
            <button
              onClick={handleCopySample}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold border border-brand-200 transition-colors self-start sm:self-auto"
            >
              {copiedSample ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSample ? 'Đã sao chép!' : 'Sao chép văn bản mẫu'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
            {sampleWordFormat}
          </pre>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="font-bold text-slate-900">Phần 1: 4 Lựa chọn</p>
              <p className="text-slate-500 text-[11px]">
                Đặt dấu sao <code className="text-brand-600 font-bold">*A.</code> trước đáp án đúng hoặc ghi <code className="text-brand-600 font-bold">[Đáp án: A]</code>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="font-bold text-slate-900">Phần 2: Đúng / Sai 4 ý</p>
              <p className="text-slate-500 text-[11px]">
                Ghi rõ nhãn <code className="text-brand-600 font-bold">a) [Đúng]</code> hoặc <code className="text-brand-600 font-bold">a) [Sai]</code> cho từng mệnh đề a, b, c, d.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="font-bold text-slate-900">Phần 3: Trả lời ngắn</p>
              <p className="text-slate-500 text-[11px]">
                Ghi <code className="text-brand-600 font-bold">[Đáp án: 4.25; 17/4]</code> ở cuối câu để hệ thống so khớp mọi cách viết tương đương.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Anti-Cheat */}
      {activeTab === 'anti_cheat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-900">Bắt buộc Toàn màn hình</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Học sinh phải ở chế độ Fullscreen mới đọc được câu hỏi. Khi bấm Escape hoặc thu nhỏ cửa sổ, hệ thống lập tức hiển thị cảnh báo vi phạm.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-900">Làm mờ đề thi khi mất tập trung</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khi học sinh chuyển sang tab khác hoặc mở ứng dụng thứ ba, toàn bộ đề thi bị làm mờ ngay lập tức để ngăn ngừa hành vi chụp ảnh hay nhìn trộm tài liệu.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-900">Chặn tiện ích AI &amp; Copy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Vô hiệu hóa chuột phải, bôi đen sao chép, và ngăn chặn các tiện ích mở rộng AI (như Monica, QuestionAI, Sider) chèn vào giao diện thi.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Feedback Form */}
      {activeTab === 'feedback' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquareWarning className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Gửi Phản Hồi / Báo Lỗi Kỹ Thuật</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="bug"
                  checked={feedbackType === 'bug'}
                  onChange={() => setFeedbackType('bug')}
                  className="text-brand-600"
                />
                <span>Báo lỗi chức năng</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="feature"
                  checked={feedbackType === 'feature'}
                  onChange={() => setFeedbackType('feature')}
                  className="text-brand-600"
                />
                <span>Góp ý nâng cấp tính năng</span>
              </label>
            </div>

            <textarea
              rows={5}
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Mô tả chi tiết vấn đề hoặc ý tưởng của thầy cô..."
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.01]"
            >
              <Send className="w-4 h-4" />
              <span>Gửi phản hồi</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
