import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  FileText,
  Upload,
  FileCode,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Clock,
  Shield,
  Layers,
  Eye,
  Check,
  Download,
  Copy,
  Calculator,
  Percent,
  Bot,
  AlertCircle,
  RotateCcw,
  Lock,
  Calendar,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  X,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { Exam, Question, QuestionType, ExamSettings, TrueFalseItem, AntiCheatLevel, ScoreDisplayMode, ShowSolutionMode } from '../../types';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import {
  parseDocxFile,
  parseExamText,
  downloadSampleExamTemplate,
  downloadSampleJsonTemplate,
  FEXAM_AI_PROMPT_TEMPLATE,
} from '../../lib/word-parser';
import { uploadImageToCloudinary } from '../../services/cloudinary';
import { MathRenderer } from '../../lib/katex-renderer';

interface ExamCreateWizardProps {
  initialExam?: Exam | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const ExamCreateWizard: React.FC<ExamCreateWizardProps> = ({
  initialExam,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { saveExam, exams } = useExam();

  // Wizard Step: 1 = Thông tin đề, 2 = Nhập câu hỏi & Chia điểm, 3 = Xem trước & Xuất bản
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Function to generate clean 5-digit exam code without subject prefix & avoid collision
  const generateCleanExamCode = () => {
    const existingCodes = new Set(exams.map((e) => e.code?.toUpperCase()));
    for (let i = 0; i < 100; i++) {
      const candidate = String(Math.floor(10000 + Math.random() * 90000));
      if (!existingCodes.has(candidate)) {
        return candidate;
      }
    }
    return String(Math.floor(10000 + Math.random() * 90000));
  };

  // Step 1: Thông tin đề
  const [title, setTitle] = useState(initialExam?.title || '');
  const [code, setCode] = useState(initialExam?.code || generateCleanExamCode());
  const [subject, setSubject] = useState(initialExam?.subject || 'Toán học');
  const [grade, setGrade] = useState(initialExam?.grade || '12');
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.settings.durationMinutes || 45);
  const [description, setDescription] = useState(initialExam?.description || '');

  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(initialExam?.settings.isPracticeMode || false);
  const [openTime, setOpenTime] = useState(initialExam?.settings.openTime || '');
  const [closeTime, setCloseTime] = useState(initialExam?.settings.closeTime || '');
  const [maxAttempts, setMaxAttempts] = useState(initialExam?.settings.maxAttempts || 1);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialExam?.settings.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(initialExam?.settings.shuffleOptions ?? true);
  const [antiCheatLevel, setAntiCheatLevel] = useState<AntiCheatLevel>(initialExam?.settings.antiCheatLevel || 'strict');
  const [maxViolationsAllowed, setMaxViolationsAllowed] = useState(initialExam?.settings.maxViolationsAllowed || 3);
  const [scoreDisplayMode, setScoreDisplayMode] = useState<ScoreDisplayMode>(initialExam?.settings.scoreDisplayMode || 'immediate');
  const [showSolutionMode, setShowSolutionMode] = useState<ShowSolutionMode>(initialExam?.settings.showSolutionMode || 'after_close');
  const [requireFullscreen, setRequireFullscreen] = useState(initialExam?.settings.requireFullscreen ?? true);
  const [allowReviewAnswers, setAllowReviewAnswers] = useState<boolean>(initialExam?.settings.allowReviewAnswers ?? true);

  const handleTogglePracticeMode = (practice: boolean) => {
    setIsPracticeMode(practice);
    if (practice) {
      setAntiCheatLevel('none');
      setRequireFullscreen(false);
      setMaxAttempts(999);
      setScoreDisplayMode('immediate');
      setShowSolutionMode('always');
      setAllowReviewAnswers(true);
    } else {
      setAntiCheatLevel('strict');
      setRequireFullscreen(true);
      setMaxAttempts(1);
      setShowSolutionMode('after_close');
    }
  };

  // Step 2: Input mode: 'word' | 'json' | 'visual' | 'ai_prompt'
  const [inputMode, setInputMode] = useState<'word' | 'json' | 'visual' | 'ai_prompt'>('word');
  const [questions, setQuestions] = useState<Question[]>(
    initialExam?.questions || [
      {
        id: 'q-1',
        order: 1,
        type: 'multiple_choice',
        prompt: 'Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Điểm cực đại của hàm số đã cho là:',
        points: 0.25,
        options: [
          { id: 'A', label: 'A', text: '$x = -1$' },
          { id: 'B', label: 'B', text: '$x = 2$' },
          { id: 'C', label: 'C', text: '$y = 3$' },
          { id: 'D', label: 'D', text: '$x = 1$' },
        ],
        correctOptionId: 'A',
        explanation: 'Dựa vào bảng biến thiên, đạo hàm đổi dấu từ dương sang âm tại $x = -1$.',
      },
    ]
  );

  // Word parser state
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [isParsingWord, setIsParsingWord] = useState(false);
  const [rawTextImport, setRawTextImport] = useState('');

  // JSON import state
  const [jsonInput, setJsonInput] = useState('');

  // AI Prompt Tool state
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Total Points Computed
  const totalCalculatedPoints = Math.round(questions.reduce((sum, q) => sum + (q.points || 0), 0) * 100) / 100;

  // Score Distribution Helpers
  // 1. Split equally to total 10.0 pts
  const handleSplitScoreEqually = (targetTotal = 10) => {
    if (questions.length === 0) return;
    const pointPerQ = Math.round((targetTotal / questions.length) * 100) / 100;
    const updated = questions.map((q) => ({ ...q, points: pointPerQ }));
    setQuestions(updated);
    alert(`Đã chia đều: mỗi câu được ${pointPerQ} điểm!`);
  };

  // 2. Split standard MOET 2025:
  // Part 1: Multiple choice -> 0.25 pts/q
  // Part 2: True / False -> 1.00 pts/q
  // Part 3: Short answer -> 0.50 pts/q (or 1.00 pts/q)
  const handleSplitScoreMOET2025 = () => {
    if (questions.length === 0) return;
    const updated = questions.map((q) => {
      if (q.type === 'multiple_choice') {
        return { ...q, points: 0.25 };
      } else if (q.type === 'true_false') {
        return { ...q, points: 1.0 };
      } else {
        return { ...q, points: 0.5 };
      }
    });
    setQuestions(updated);
    alert('Đã áp dụng thang điểm chuẩn Bộ GD&ĐT 2025: Trắc nghiệm 0.25đ, Đúng/Sai 1.0đ, Trả lời ngắn 0.5đ!');
  };

  // Helpers for Visual Question builder
  const handleAddQuestion = (type: QuestionType) => {
    const newOrder = questions.length + 1;
    let newQ: Question;

    if (type === 'multiple_choice') {
      newQ = {
        id: `q-${Date.now()}`,
        order: newOrder,
        type: 'multiple_choice',
        prompt: `Nội dung câu hỏi trắc nghiệm số ${newOrder}...`,
        points: 0.25,
        options: [
          { id: 'A', label: 'A', text: 'Phương án A' },
          { id: 'B', label: 'B', text: 'Phương án B' },
          { id: 'C', label: 'C', text: 'Phương án C' },
          { id: 'D', label: 'D', text: 'Phương án D' },
        ],
        correctOptionId: 'A',
      };
    } else if (type === 'true_false') {
      newQ = {
        id: `q-${Date.now()}`,
        order: newOrder,
        type: 'true_false',
        prompt: `Xét tính đúng/sai của các mệnh đề sau (Câu ${newOrder}):`,
        points: 1.0,
        trueFalseItems: [
          { id: 'a', label: 'a', statement: 'Mệnh đề ý a', isCorrect: true },
          { id: 'b', label: 'b', statement: 'Mệnh đề ý b', isCorrect: false },
          { id: 'c', label: 'c', statement: 'Mệnh đề ý c', isCorrect: true },
          { id: 'd', label: 'd', statement: 'Mệnh đề ý d', isCorrect: false },
        ],
      };
    } else {
      newQ = {
        id: `q-${Date.now()}`,
        order: newOrder,
        type: 'short_answer',
        prompt: `Câu hỏi trả lời ngắn số ${newOrder}:`,
        points: 0.5,
        shortAnswerCorrect: ['0'],
      };
    }

    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    updated.forEach((q, idx) => (q.order = idx + 1));
    setQuestions(updated);
  };

  const [uploadingImageIdx, setUploadingImageIdx] = useState<number | null>(null);

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingImageIdx(index);
    try {
      const { url, error } = await uploadImageToCloudinary(file);
      if (url) {
        handleUpdateQuestion(index, { imageUrl: url });
      } else {
        alert(error || 'Tải ảnh lên thất bại!');
      }
    } catch (err: any) {
      alert('Lỗi tải ảnh: ' + err?.message);
    } finally {
      setUploadingImageIdx(null);
    }
  };

  // Word parser execute
  const handleExecuteWordImport = async () => {
    if (!wordFile && !rawTextImport.trim()) {
      alert('Vui lòng chọn file Word (.docx) hoặc dán văn bản đề thi!');
      return;
    }

    setIsParsingWord(true);
    try {
      let result;
      if (wordFile) {
        result = await parseDocxFile(wordFile);
      } else {
        result = parseExamText(rawTextImport);
      }

      if (result.questions.length > 0) {
        setQuestions(result.questions);
        alert(`Nhập thành công ${result.questions.length} câu hỏi từ tài liệu!`);
        setInputMode('visual');
      } else {
        alert('Không nhận diện được câu hỏi nào. Vui lòng kiểm tra lại cấu trúc!');
      }
    } catch (err: any) {
      alert('Lỗi đọc tài liệu: ' + err?.message);
    } finally {
      setIsParsingWord(false);
    }
  };

  // JSON import execute
  const handleExecuteJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const normalizeQuestions = (list: any[]): Question[] => {
        return list.map((q, idx) => ({
          ...q,
          id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          order: q.order || idx + 1,
          points: q.points !== undefined ? Number(q.points) : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25),
          type: q.type || 'multiple_choice',
          prompt: q.prompt || `Câu hỏi số ${idx + 1}`,
        }));
      };

      if (Array.isArray(parsed)) {
        const normalized = normalizeQuestions(parsed);
        setQuestions(normalized);
        alert(`Nhập thành công ${normalized.length} câu hỏi từ JSON!`);
        setInputMode('visual');
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        if (parsed.title) setTitle(parsed.title);
        const normalized = normalizeQuestions(parsed.questions);
        setQuestions(normalized);
        alert(`Nhập thành công ${normalized.length} câu hỏi từ JSON!`);
        setInputMode('visual');
      } else {
        alert('Định dạng JSON không hợp lệ!');
      }
    } catch (err: any) {
      alert('Lỗi cú pháp JSON: ' + err?.message);
    }
  };

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(FEXAM_AI_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Final Publish
  const handlePublishExam = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      setCurrentStep(1);
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi phải có ít nhất 1 câu hỏi!');
      setCurrentStep(2);
      return;
    }

    const savedExam: Exam = {
      id: initialExam?.id || `exam-${Date.now()}`,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      subject,
      grade,
      description,
      authorId: user?.id || initialExam?.authorId || 'teacher-01',
      authorName: user?.name || initialExam?.authorName || 'Giáo viên',
      authorEmail: user?.email || initialExam?.authorEmail || 'gv@fexam.edu.vn',
      totalPoints: totalCalculatedPoints,
      settings: {
        durationMinutes,
        maxAttempts: Number(maxAttempts) || 1,
        openTime: openTime ? new Date(openTime).toISOString() : undefined,
        closeTime: closeTime ? new Date(closeTime).toISOString() : undefined,
        shuffleQuestions,
        shuffleOptions,
        antiCheatLevel,
        scoreDisplayMode,
        showSolutionMode,
        allowReviewAnswers,
        requireFullscreen: isPracticeMode ? false : requireFullscreen,
        maxViolationsAllowed: Number(maxViolationsAllowed) || 3,
        isPracticeMode,
        isPublished: true,
      },
      questions: questions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${idx + 1}-${Date.now()}`,
        order: idx + 1,
      })),
      createdAt: initialExam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveExam(savedExam);
    alert('Đã xuất bản đề thi thành công! Bây giờ bạn có thể tạo Ca thi để giao cho học sinh.');
    onSuccess();
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Step Navigation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {initialExam ? 'Chỉnh sửa Đề thi' : 'Quy trình Tạo Đề thi Chuẩn'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ công thức Toán KaTeX `$ ... $` · Nhập Word / JSON · Chia điểm thông minh
            </p>
          </div>
        </div>

        {/* 3 Steps Indicator */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {[
            { step: 1, label: '1. Thông tin & Cấu hình' },
            { step: 2, label: '2. Nhập câu hỏi & Điểm' },
            { step: 3, label: '3. Xuất bản' },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentStep === s.step
                  ? 'bg-brand-600 text-white shadow-sm'
                  : currentStep > s.step
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* BƯỚC 1: THÔNG TIN & CẤU HÌNH ĐỀ THI */}
      {/* ==================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section 1: Thông tin cơ bản */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">1. Thông tin cơ bản đề thi</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập tên đề thi, mã đề, môn học độc lập và khối lớp
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên đề thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Kiểm tra giữa kỳ 1 — Khảo thí chất lượng 2025"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mã đề thi (5 ký tự)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCode(generateCleanExamCode())}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      title="Tự động sinh mã 5 chữ số ngẫu nhiên không có tiền tố môn"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đổi mã</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: 74892"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-mono font-bold text-brand-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Môn học
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Toán học">Toán học</option>
                    <option value="Ngữ văn">Ngữ văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Vật lí">Vật lí</option>
                    <option value="Hóa học">Hóa học</option>
                    <option value="Sinh học">Sinh học</option>
                    <option value="Lịch sử">Lịch sử (Riêng)</option>
                    <option value="Địa lý">Địa lý (Riêng)</option>
                    <option value="Tin học">Tin học</option>
                    <option value="Công nghệ">Công nghệ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Khối lớp
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="12">Khối 12</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                    <option value="9">Khối 9</option>
                    <option value="8">Khối 8</option>
                    <option value="7">Khối 7</option>
                    <option value="6">Khối 6</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thời lượng làm bài (Phút)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 45)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả chi tiết hoặc ghi chú đề thi
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cấu trúc đề thi, phạm vi kiến thức..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Lịch mở/đóng đề & Số lượt làm bài */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">2. Lịch mở đề, đóng đề & Số lượt làm bài</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kiểm soát chính xác khung thời gian học sinh được phép truy cập và số lần nộp bài
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thời gian mở đề (Bắt đầu)
                </label>
                <input
                  type="datetime-local"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Để trống nếu muốn mở đề ngay lập tức</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thời gian đóng đề (Kết thúc)
                </label>
                <input
                  type="datetime-local"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Để trống nếu không giới hạn ngày đóng</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Số lượt làm bài tối đa
                </label>
                <select
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={1}>1 lượt (Thi chính thức)</option>
                  <option value={2}>2 lượt làm bài</option>
                  <option value={3}>3 lượt làm bài</option>
                  <option value={5}>5 lượt làm bài</option>
                  <option value={999}>Không giới hạn (Luyện tập)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Khống chế số lần nộp bài của mỗi học sinh</p>
              </div>
            </div>
          </div>

          {/* Section 3: Cấu hình Trộn đề, Giám sát FEXAM Guard & Xem điểm */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">3. Cấu hình Trộn đề, Giám sát & Báo cáo điểm</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập mức độ chống gian lận và quy chế công bố kết quả cho thí sinh
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Xáo trộn thứ tự câu hỏi</span>
                    <p className="text-[11px] text-slate-400">Mỗi thí sinh nhận một mã đề hoán vị ngẫu nhiên</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Xáo trộn thứ tự đáp án (A, B, C, D)</span>
                    <p className="text-[11px] text-slate-400">Đổi chỗ các phương án trắc nghiệm</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Bắt buộc chế độ toàn màn hình</span>
                    <p className="text-[11px] text-slate-400">Khóa cửa sổ và cảnh báo khi rời màn hình thi</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireFullscreen}
                    onChange={(e) => setRequireFullscreen(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Cho phép học sinh xem lại bài thi &amp; đáp án</span>
                    <p className="text-[11px] text-slate-400">Nếu tắt, học sinh chỉ nhận điểm số tổng quát mà không xem lại chi tiết bài làm</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowReviewAnswers}
                    onChange={(e) => setAllowReviewAnswers(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>

              {/* Dropdowns */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cấp độ chống gian lận FEXAM Guard
                  </label>
                  <select
                    value={antiCheatLevel}
                    onChange={(e) => {
                      const val = e.target.value as AntiCheatLevel;
                      setAntiCheatLevel(val);
                      if (val === 'none') {
                        setRequireFullscreen(false);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="none">Tắt hoàn toàn (Ôn tập & Luyện tập tự do)</option>
                    <option value="strict">Nghiêm ngặt (Cảnh báo & Tự nộp sau 3 lần)</option>
                    <option value="maximum">Tối đa (Chặn chuột, chống copy & phím tắt)</option>
                    <option value="standard">Tiêu chuẩn (Ghi nhận vi phạm nhẹ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chế độ hiển thị điểm số
                  </label>
                  <select
                    value={scoreDisplayMode}
                    onChange={(e) => setScoreDisplayMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="immediate">Hiển thị điểm ngay sau khi nộp</option>
                    <option value="after_close">Chỉ hiển thị sau khi đóng đề thi</option>
                    <option value="hidden">Không hiển thị điểm cho học sinh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chế độ xem đáp án & Lời giải
                  </label>
                  <select
                    value={showSolutionMode}
                    onChange={(e) => setShowSolutionMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="after_close">Xem lời giải sau khi đóng đề thi</option>
                    <option value="always">Luôn cho xem đáp án sau khi nộp</option>
                    <option value="never">Không cho xem lời giải</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                if (!title.trim()) {
                  alert('Vui lòng nhập tên đề thi!');
                  return;
                }
                setCurrentStep(2);
              }}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-md shadow-brand-500/20 hover:scale-[1.01] transition-all"
            >
              <span>Tiếp tục: Nhập câu hỏi & Điểm số</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* BƯỚC 2: NHẬP CÂU HỎI & CHIA ĐIỂM */}
      {/* ==================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Bar: Input Mode & Score Summary & Download Template */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setInputMode('word')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inputMode === 'word'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập Word (.docx)</span>
              </button>

              <button
                onClick={() => setInputMode('json')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inputMode === 'json'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Nhập JSON</span>
              </button>

              <button
                onClick={() => setInputMode('ai_prompt')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inputMode === 'ai_prompt'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Prompt AI (PDF/Ảnh)</span>
              </button>

              <button
                onClick={() => setInputMode('visual')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inputMode === 'visual'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Soạn thảo ({questions.length} câu)</span>
              </button>
            </div>

            {/* Score & Download Template Buttons */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                onClick={downloadSampleExamTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                title="Tải file mẫu định dạng chuẩn Bộ GD&ĐT"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>Tải Mẫu Word/Text</span>
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-sm"
              >
                <span>Xem trước ({questions.length} câu)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Smart Score Management Toolbar */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 p-4 sm:p-5 rounded-3xl border border-indigo-100 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Tổng điểm đề thi:</span>
                  <span
                    className={`text-lg font-extrabold px-2.5 py-0.5 rounded-lg ${
                      totalCalculatedPoints === 10
                        ? 'text-emerald-700 bg-emerald-100'
                        : 'text-amber-700 bg-amber-100'
                    }`}
                  >
                    {totalCalculatedPoints} / 10.0 điểm
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tổng {questions.length} câu hỏi · {totalCalculatedPoints === 10 ? 'Chuẩn thang điểm 10' : 'Có thể chia lại điểm tự động'}
                </p>
              </div>
            </div>

            {/* Quick Score Split Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSplitScoreMOET2025}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 text-xs font-bold shadow-xs transition-all"
                title="P1: 0.25đ/câu, P2: 1.0đ/câu, P3: 0.5đ/câu"
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Chia chuẩn Bộ GD 2025</span>
              </button>

              <button
                type="button"
                onClick={() => handleSplitScoreEqually(10)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Chia đều thang 10đ</span>
              </button>
            </div>
          </div>

          {/* 2.1: WORD IMPORT */}
          {inputMode === 'word' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Nhập đề từ file Word (.docx) hoặc dán văn bản
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hỗ trợ trọn vẹn: Công thức Toán KaTeX `$ ... $`, 4 Lựa chọn (*A., B., C., D.), Đúng/Sai (a,b,c,d) và Trả lời ngắn.
                  </p>
                </div>

                <button
                  onClick={downloadSampleExamTemplate}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File Mẫu</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-3xl p-8 text-center transition-colors bg-slate-50/50">
                <Upload className="w-12 h-12 mx-auto text-brand-500 mb-3" />
                <p className="text-sm font-bold text-slate-800">
                  Chọn hoặc kéo thả file Word (.docx) đề thi vào đây
                </p>
                <input
                  type="file"
                  accept=".docx"
                  className="mt-4 text-xs mx-auto block"
                  onChange={(e) => setWordFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Hoặc dán trực tiếp văn bản đề thi của bạn:
                </label>
                <textarea
                  rows={8}
                  value={rawTextImport}
                  onChange={(e) => setRawTextImport(e.target.value)}
                  placeholder={`PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.
Câu 1. Cho hàm số $y = f(x)$...
*A. $x = 1$
B. $x = 2$
C. $x = 3$
D. $x = 4$
Lời giải: Áp dụng công thức đạo hàm...

PHẦN II. Câu trắc nghiệm đúng sai.
Câu 2. [Đúng/Sai] Cho tam giác ABC...
a) $AB = AC$ [Đúng]
b) $\\widehat{A} = 90^\\circ$ [Sai]

PHẦN III. Câu trắc nghiệm trả lời ngắn.
Câu 3. [Trả lời ngắn] Tính tích phân $I = \\int_0^1 x dx$:
Đáp án: 0.5`}
                  className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={isParsingWord}
                  onClick={handleExecuteWordImport}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isParsingWord ? 'Đang phân tích...' : 'Phân tích & Nạp câu hỏi'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2.2: AI PROMPT CONVERTER TOOL (FOR PDF / IMAGES) */}
          {inputMode === 'ai_prompt' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-2xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Prompt AI Chuyển Đề PDF / Ảnh sang JSON Chuẩn FEXAM
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tối ưu hóa riêng cho ChatGPT-4o, Gemini 1.5/2.0 Pro, Claude 3.5 & DeepSeek
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadSampleJsonTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-600" />
                    <span>Tải Mẫu JSON (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAiPrompt}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-500/20 transition-all"
                  >
                    {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPrompt ? 'Đã sao chép Prompt!' : 'Sao chép Prompt AI'}</span>
                  </button>
                </div>
              </div>

              {/* 3-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/80 text-xs space-y-1">
                  <div className="font-extrabold text-blue-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Sao chép Prompt AI</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Bấm nút <strong>"Sao chép Prompt AI"</strong> ở trên để lấy lệnh mẫu đã tối ưu cấu trúc KaTeX & Bộ GD 2025.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 text-xs space-y-1">
                  <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Gửi AI kèm file PDF/Ảnh</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Mở ChatGPT / Gemini / Claude, dán Prompt và tải đính kèm file <strong>PDF hoặc Ảnh đề thi</strong> của bạn.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 text-xs space-y-1">
                  <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Dán JSON & Nạp đề</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Sao chép toàn bộ mảng JSON AI trả về, dán vào ô bên dưới và bấm <strong>"Nạp JSON vào Đề thi"</strong>.
                  </p>
                </div>
              </div>

              {/* Readonly Prompt Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Prompt chuẩn FEXAM — Copy và dán vào AI kèm file đề thi:
                  </label>
                  <span className="text-[11px] text-slate-400">Tự động nhận diện 3 dạng thức + công thức</span>
                </div>
                <textarea
                  readOnly
                  rows={5}
                  value={FEXAM_AI_PROMPT_TEMPLATE}
                  className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs bg-slate-900 text-emerald-400 focus:outline-none select-all cursor-text"
                />
              </div>

              {/* JSON Paste Area */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dán kết quả JSON trả về từ AI vào đây để nạp vào đề thi:
                </label>
                <textarea
                  rows={6}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Dán mảng JSON [...] nhận được từ ChatGPT / Gemini / Claude vào đây..."
                  className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleExecuteJsonImport}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Nạp JSON vào Đề thi</span>
                </button>
              </div>
            </div>
          )}

          {/* 2.3: JSON IMPORT */}
          {inputMode === 'json' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-card space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Dán dữ liệu JSON đề thi</h3>
                <p className="text-xs text-slate-500">Nạp nhanh mảng cấu trúc câu hỏi</p>
              </div>

              <textarea
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="[ { order: 1, type: 'multiple_choice', prompt: '...', options: [...] } ]"
                className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-brand-500 bg-slate-900 text-emerald-400"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleExecuteJsonImport}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Áp dụng dữ liệu JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* 2.4: VISUAL QUESTION BUILDER */}
          {inputMode === 'visual' && (
            <div className="space-y-5">
              {/* Add buttons */}
              <div className="flex items-center justify-between p-4 bg-indigo-50/70 border border-indigo-100 rounded-3xl">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Thêm câu hỏi mới:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddQuestion('multiple_choice')}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-brand-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
                  >
                    + 4 Lựa chọn (A,B,C,D)
                  </button>
                  <button
                    onClick={() => handleAddQuestion('true_false')}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-emerald-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
                  >
                    + Đúng / Sai (a,b,c,d)
                  </button>
                  <button
                    onClick={() => handleAddQuestion('short_answer')}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-amber-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
                  >
                    + Trả lời ngắn
                  </button>
                </div>
              </div>

              {/* Question list */}
              {questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {qIdx + 1}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {q.type === 'multiple_choice' ? '4 Lựa chọn' : q.type === 'true_false' ? 'Đúng / Sai' : 'Trả lời ngắn'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Manual Point Input for each question */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">Điểm:</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={q.points !== undefined ? q.points : 0.25}
                          onChange={(e) => handleUpdateQuestion(qIdx, { points: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 rounded-xl border border-slate-300 text-xs font-extrabold text-center text-brand-700 focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Nội dung câu hỏi (KaTeX $...$):</label>
                      <label className="flex items-center gap-1 text-xs text-brand-600 font-semibold cursor-pointer hover:underline">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Chèn ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(qIdx, e.target.files[0])}
                        />
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={q.prompt}
                      onChange={(e) => handleUpdateQuestion(qIdx, { prompt: e.target.value })}
                      className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />

                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                      <span className="font-semibold text-slate-400 mr-2">Xem trước KaTeX:</span>
                      <MathRenderer content={q.prompt} />
                    </div>

                    {q.imageUrl && (
                      <div className="mt-2 relative inline-block">
                        <img src={q.imageUrl} alt="Hình minh họa" className="max-h-48 rounded-xl object-contain border" />
                        <button
                          onClick={() => handleUpdateQuestion(qIdx, { imageUrl: undefined })}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full text-xs shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4 Choices */}
                  {q.type === 'multiple_choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {(q.options || []).map((opt, optIdx) => {
                        const isCorrect = q.correctOptionId === opt.label;
                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`flex items-center gap-2 p-2.5 rounded-2xl border ${
                              isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`corr-${q.id}`}
                              checked={isCorrect}
                              onChange={() => handleUpdateQuestion(qIdx, { correctOptionId: opt.label })}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <span className="font-bold text-xs text-slate-700 w-4">{opt.label}.</span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOpts = [...(q.options || [])];
                                newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value };
                                handleUpdateQuestion(qIdx, { options: newOpts });
                              }}
                              className="flex-1 px-2 py-1 text-xs rounded border border-transparent focus:border-brand-500 focus:bg-white focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False */}
                  {q.type === 'true_false' && (
                    <div className="space-y-2 pt-2">
                      {(q.trueFalseItems || []).map((tf, tfIdx) => (
                        <div key={tf.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
                          <span className="font-bold text-xs text-slate-800 uppercase">{tf.label})</span>
                          <input
                            type="text"
                            value={tf.statement}
                            onChange={(e) => {
                              const newItems = [...(q.trueFalseItems || [])];
                              newItems[tfIdx] = { ...newItems[tfIdx], statement: e.target.value };
                              handleUpdateQuestion(qIdx, { trueFalseItems: newItems });
                            }}
                            className="flex-1 px-3 py-1 text-xs rounded-xl border border-slate-200 bg-white"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...(q.trueFalseItems || [])];
                                newItems[tfIdx] = { ...newItems[tfIdx], isCorrect: true };
                                handleUpdateQuestion(qIdx, { trueFalseItems: newItems });
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                tf.isCorrect ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                              }`}
                            >
                              Đúng
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...(q.trueFalseItems || [])];
                                newItems[tfIdx] = { ...newItems[tfIdx], isCorrect: false };
                                handleUpdateQuestion(qIdx, { trueFalseItems: newItems });
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                !tf.isCorrect ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                              }`}
                            >
                              Sai
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Short answer */}
                  {q.type === 'short_answer' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        value={(q.shortAnswerCorrect || []).join(' ; ')}
                        onChange={(e) => handleUpdateQuestion(qIdx, { shortAnswerCorrect: e.target.value.split(';').map(s => s.trim()) })}
                        placeholder="Đáp án đúng: 36 ; 36 m/s"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Lời giải chi tiết (Học sinh xem sau khi thi):
                    </label>
                    <textarea
                      rows={2}
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                      placeholder="Hướng dẫn giải..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* BƯỚC 3: XEM TRƯỚC & XUẤT BẢN */}
      {/* ==================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                    Xem trước bản hoàn chỉnh & Đính kèm hình ảnh
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                    MÃ: {code}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">{title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span>Môn: <strong className="text-slate-800">{subject}</strong></span>
                  <span>• Khối: <strong className="text-slate-800">{grade}</strong></span>
                  <span>• Thời lượng: <strong className="text-slate-800">{durationMinutes} phút</strong></span>
                  <span>• Tổng số: <strong className="text-slate-800">{questions.length} câu hỏi</strong></span>
                  <span>• Tổng điểm: <strong className="text-brand-600 font-extrabold">{totalCalculatedPoints}đ</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Quay lại sửa câu hỏi
                </button>

                <button
                  type="button"
                  onClick={handlePublishExam}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                >
                  <Check className="w-5 h-5" />
                  <span>Xác nhận & Xuất bản Đề thi</span>
                </button>
              </div>
            </div>

            {/* Questions preview with inline image upload */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Danh sách {questions.length} câu hỏi đề thi:
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span>Bạn có thể bấm nút "Tải ảnh" ở từng câu để đính kèm hình vẽ/đồ thị hoàn thiện đề</span>
                </span>
              </div>

              {questions.map((q, idx) => {
                const needsImage = !q.imageUrl && (
                  q.prompt.includes('[Hình ảnh') ||
                  q.prompt.includes('[HÌNH_ẢNH') ||
                  q.prompt.includes('[Đồ thị') ||
                  q.prompt.includes('[Hình vẽ') ||
                  q.prompt.includes('[Bảng')
                );

                const isUploadingThis = uploadingImageIdx === idx;

                return (
                  <div key={q.id || idx} className="p-5 sm:p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 space-y-3.5 hover:border-slate-300 transition-all">
                    {/* Question Header & Image Upload Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                          {q.points} điểm
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600">
                          {q.type === 'multiple_choice' ? '4 Lựa chọn' : q.type === 'true_false' ? 'Đúng / Sai' : 'Trả lời ngắn'}
                        </span>

                        {needsImage && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Cần thêm hình minh họa</span>
                          </span>
                        )}
                      </div>

                      {/* Image Upload Actions */}
                      <div className="flex items-center gap-2">
                        {isUploadingThis ? (
                          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                            <span>Đang tải ảnh lên Cloudinary...</span>
                          </span>
                        ) : q.imageUrl ? (
                          <div className="flex items-center gap-1.5">
                            <label className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-2xs">
                              <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                              <span>Đổi ảnh</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestion(idx, { imageUrl: undefined })}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 text-xs font-bold cursor-pointer shadow-2xs transition-colors">
                            <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                            <span>Tải ảnh câu hỏi (Đồ thị / Sơ đồ)</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="text-sm font-medium text-slate-900 leading-relaxed">
                      <MathRenderer content={q.prompt} />
                    </div>

                    {/* Question Attached Image Preview */}
                    {q.imageUrl && (
                      <div className="p-2 bg-white rounded-2xl border border-slate-200 inline-block shadow-2xs">
                        <img
                          src={q.imageUrl}
                          alt={`Hình minh họa câu ${idx + 1}`}
                          className="max-h-60 rounded-xl object-contain"
                        />
                      </div>
                    )}

                    {/* Type 1: Multiple Choice Options */}
                    {q.type === 'multiple_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        {(q.options || []).map((opt) => {
                          const isCorrect = opt.label === q.correctOptionId;
                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500/30'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {opt.label}
                              </span>
                              <div className="flex-1 mt-0.5">
                                <MathRenderer content={opt.text} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Type 2: True / False Sub-Items */}
                    {q.type === 'true_false' && (
                      <div className="space-y-1.5 pt-1 text-xs">
                        {(q.trueFalseItems || []).map((tf) => (
                          <div
                            key={tf.id}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 uppercase w-4">{tf.label})</span>
                              <div className="text-slate-800">
                                <MathRenderer content={tf.statement} />
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-lg font-bold text-xs shrink-0 ${
                                tf.isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {tf.isCorrect ? 'ĐÚNG' : 'SAI'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Type 3: Short Answer Correct Values */}
                    {q.type === 'short_answer' && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2">
                        <span className="font-bold text-slate-700">Đáp án đúng chấp nhận:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(q.shortAnswerCorrect || []).map((ans, aIdx) => (
                            <span key={aIdx} className="font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {ans}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 mt-2 space-y-1">
                        <span className="font-bold text-indigo-700 block">Lời giải chi tiết:</span>
                        <div className="text-slate-700 leading-relaxed">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
