import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  FileCode,
  Sparkles,
  HelpCircle,
  FileText,
  Clock,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Sigma,
  Copy,
  ChevronDown,
  Layers,
  Sliders,
  Check,
} from 'lucide-react';
import { Exam, Question, QuestionType, ExamSettings, TrueFalseItem } from '../../types';
import { useExam } from '../../context/ExamContext';
import { parseDocxFile, parseExamText, safeParseExamJson } from '../../lib/word-parser';
import { uploadImageToCloudinary } from '../../services/cloudinary';
import { MathRenderer } from '../../lib/katex-renderer';
import { auditAndFixExamQuestions } from '../../lib/grading';
import { Wrench } from 'lucide-react';

interface ExamEditorProps {
  initialExam?: Exam | null;
  onBack: () => void;
  onSaveComplete: () => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({
  initialExam,
  onBack,
  onSaveComplete,
}) => {
  const { saveExam, regradeSubmissions, submissions } = useExam();

  const [activeTab, setActiveTab] = useState<'visual' | 'word' | 'json' | 'settings'>('visual');

  const [title, setTitle] = useState(initialExam?.title || 'Đề kiểm tra trực tuyến mới');
  const [code, setCode] = useState(initialExam?.code || `EXAM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [subject, setSubject] = useState(initialExam?.subject || 'Toán học');
  const [grade, setGrade] = useState(initialExam?.grade || '12');
  const [description, setDescription] = useState(initialExam?.description || '');

  const [settings, setSettings] = useState<ExamSettings>(
    initialExam?.settings || {
      durationMinutes: 45,
      password: '',
      maxAttempts: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      antiCheatLevel: 'strict',
      scoreDisplayMode: 'immediate',
      showSolutionMode: 'after_close',
      allowReviewAnswers: true,
      requireFullscreen: true,
      maxViolationsAllowed: 3,
      isPracticeMode: false,
      isPublished: true,
    }
  );

  const [questions, setQuestions] = useState<Question[]>(
    initialExam?.questions || [
      {
        id: `q-1`,
        order: 1,
        type: 'multiple_choice',
        prompt: 'Nghiệm của phương trình $2^{x-1} = 8$ là:',
        points: 0.5,
        options: [
          { id: 'A', label: 'A', text: '$x = 4$' },
          { id: 'B', label: 'B', text: '$x = 3$' },
          { id: 'C', label: 'C', text: '$x = 2$' },
          { id: 'D', label: 'D', text: '$x = 5$' },
        ],
        correctOptionId: 'A',
        explanation: 'Ta có $2^{x-1} = 2^3 \\Leftrightarrow x - 1 = 3 \\Leftrightarrow x = 4$.',
      },
    ]
  );

  const [wordFile, setWordFile] = useState<File | null>(null);
  const [isParsingWord, setIsParsingWord] = useState(false);
  const [rawTextImport, setRawTextImport] = useState('');
  const [jsonContent, setJsonContent] = useState('');

  const handleAddQuestion = (type: QuestionType) => {
    const newOrder = questions.length + 1;
    let newQ: Question;

    if (type === 'multiple_choice') {
      newQ = {
        id: `q-${Date.now()}`,
        order: newOrder,
        type: 'multiple_choice',
        prompt: `Nội dung câu hỏi số ${newOrder}...`,
        points: 0.5,
        options: [
          { id: 'A', label: 'A', text: 'Phương án A' },
          { id: 'B', label: 'B', text: 'Phương án B' },
          { id: 'C', label: 'C', text: 'Phương án C' },
          { id: 'D', label: 'D', text: 'Phương án D' },
        ],
        correctOptionId: 'A',
        explanation: '',
      };
    } else if (type === 'true_false') {
      newQ = {
        id: `q-${Date.now()}`,
        order: newOrder,
        type: 'true_false',
        prompt: `Cho hàm số hoặc mệnh đề số ${newOrder}. Xét tính đúng/sai của các ý sau:`,
        points: 1.0,
        trueFalseItems: [
          { id: 'a', label: 'a', statement: 'Mệnh đề ý a', isCorrect: true },
          { id: 'b', label: 'b', statement: 'Mệnh đề ý b', isCorrect: false },
          { id: 'c', label: 'c', statement: 'Mệnh đề ý c', isCorrect: true },
          { id: 'd', label: 'd', statement: 'Mệnh đề ý d', isCorrect: false },
        ],
        explanation: '',
      };
    } else {
      newQ = {
        id: `q-${Date.now()}`,
        order: newOrder,
        type: 'short_answer',
        prompt: `Câu hỏi tính toán yêu cầu trả lời ngắn số ${newOrder}:`,
        points: 1.0,
        shortAnswerCorrect: ['0'],
        explanation: '',
      };
    }

    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    updated.forEach((q, idx) => (q.order = idx + 1));
    setQuestions(updated);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    const { url } = await uploadImageToCloudinary(file);
    if (url) {
      handleUpdateQuestion(index, { imageUrl: url });
    }
  };

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
        setActiveTab('visual');
      } else {
        alert('Không nhận diện được câu hỏi nào. Vui lòng kiểm tra định dạng!');
      }
    } catch (err: any) {
      alert('Lỗi phân tích đề: ' + err?.message);
    } finally {
      setIsParsingWord(false);
    }
  };

  const handleExecuteJsonImport = () => {
    if (!jsonContent.trim()) {
      alert('Vui lòng dán nội dung JSON vào ô nhập!');
      return;
    }
    const { questions: parsedQuestions, title: extractedTitle, error } = safeParseExamJson(jsonContent);
    if (error || parsedQuestions.length === 0) {
      alert(`Lỗi định dạng JSON: ${error || 'Không tìm thấy danh sách câu hỏi hợp lệ!'}`);
      return;
    }
    if (extractedTitle && !title) setTitle(extractedTitle);
    setQuestions(parsedQuestions);
    alert(`Nhập thành công ${parsedQuestions.length} câu hỏi từ JSON!`);
    setActiveTab('visual');
  };

  const handleAutoAuditAndFix = () => {
    if (questions.length === 0) {
      alert('Vui lòng thêm câu hỏi vào đề thi trước khi kiểm tra!');
      return;
    }
    const { fixedQuestions, issues, fixes } = auditAndFixExamQuestions(questions);
    if (issues.length === 0) {
      alert('Tuyệt vời! Toàn bộ các câu hỏi trong đề thi đã chuẩn định dạng và không phát hiện lỗi nào.');
      return;
    }
    const confirmMsg = `Phát hiện ${issues.length} vấn đề trong đề thi:\n\n` +
      issues.slice(0, 8).map((iss) => `• ${iss}`).join('\n') +
      (issues.length > 8 ? `\n... và ${issues.length - 8} vấn đề khác.\n\n` : '\n\n') +
      `Hệ thống đã chuẩn bị các bản sửa lỗi tự động:\n` +
      fixes.slice(0, 8).map((fix) => `✓ ${fix}`).join('\n') +
      `\n\nBạn có muốn áp dụng ngay các bản sửa lỗi tự động này không?`;

    if (window.confirm(confirmMsg)) {
      setQuestions(fixedQuestions);
      alert('Đã tự động sửa lỗi và chuẩn hóa đề thi thành công!');
    }
  };

  const handleSaveExam = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi!');
      return;
    }

    const totalPts = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    const savedExam: Exam = {
      id: initialExam?.id || `exam-${Date.now()}`,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      subject,
      grade,
      description,
      authorId: initialExam?.authorId || 'teacher-01',
      authorName: initialExam?.authorName || 'Giáo viên',
      authorEmail: initialExam?.authorEmail || 'gv@fexam.edu.vn',
      totalPoints: Math.round(totalPts * 100) / 100,
      settings,
      questions,
      createdAt: initialExam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveExam(savedExam);

    const relatedSubs = submissions.filter((s) => s.examId === savedExam.id || (savedExam.code && s.examCode === savedExam.code));
    if (relatedSubs.length > 0) {
      if (window.confirm(`Đã lưu đề thi thành công!\n\nCó ${relatedSubs.length} bài nộp của học sinh liên quan đến đề thi này. Bạn có muốn tự động CHẤM LẠI tất cả các bài thi đó theo đáp án mới sửa không?`)) {
        const count = regradeSubmissions(savedExam.id);
        alert(`Đã tự động chấm lại và cập nhật điểm cho ${count} bài thi thành công!`);
      }
    } else {
      alert('Đã lưu đề thi thành công!');
    }
    onSaveComplete();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {initialExam ? 'Chỉnh sửa Đề thi' : 'Tạo Đề thi Mới'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ 3 định dạng: 4 lựa chọn, Đúng/Sai, Trả lời ngắn & Công thức Toán KaTeX
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleAutoAuditAndFix}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
            title="Tự động kiểm tra phát hiện lỗi thiếu đáp án, sai barem điểm và tự sửa"
          >
            <Wrench className="w-4 h-4 text-amber-600" />
            <span>Tự Động Kiểm Tra & Sửa Lỗi</span>
          </button>

          <button
            onClick={handleSaveExam}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu đề thi</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('visual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'visual'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Soạn thảo ({questions.length} câu)</span>
        </button>

        <button
          onClick={() => setActiveTab('word')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'word'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Nhập từ Word (.docx)</span>
        </button>

        <button
          onClick={() => {
            setJsonContent(JSON.stringify(questions, null, 2));
            setActiveTab('json');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'json'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Nhập JSON</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Cấu hình &amp; Xem lại bài</span>
        </button>
      </div>

      {/* Visual Editor Tab */}
      {activeTab === 'visual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên đề thi
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã Đề
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 font-mono text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Môn học
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Toán học">Toán học</option>
                <option value="Vật Lí">Vật Lí</option>
                <option value="Hóa Học">Hóa Học</option>
                <option value="Sinh Học">Sinh Học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 p-4 rounded-3xl">
            <span className="text-sm font-bold text-slate-800">Thêm câu hỏi mới:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddQuestion('multiple_choice')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-brand-700 text-xs font-bold shadow-xs cursor-pointer hover:bg-brand-50"
              >
                + 4 Lựa chọn (A,B,C,D)
              </button>
              <button
                onClick={() => handleAddQuestion('true_false')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-emerald-700 text-xs font-bold shadow-xs cursor-pointer hover:bg-emerald-50"
              >
                + Đúng / Sai (a,b,c,d)
              </button>
              <button
                onClick={() => handleAddQuestion('short_answer')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-amber-700 text-xs font-bold shadow-xs cursor-pointer hover:bg-amber-50"
              >
                + Trả lời ngắn
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIndex) => {
              const qPoints = q.points !== undefined && !isNaN(Number(q.points))
                ? Number(q.points)
                : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);

              return (
                <div key={q.id || qIndex} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
                  {/* Card Header with Question Points & Barem Selector */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {qIndex + 1}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {q.type === 'multiple_choice' ? '4 Lựa chọn' : q.type === 'true_false' ? 'Đúng / Sai 4 ý' : 'Trả lời ngắn'}
                      </span>

                      {/* True/False Barem Selector */}
                      {q.type === 'true_false' && (
                        <select
                          value={q.scoringModel || 'moet_2025'}
                          onChange={(e) => handleUpdateQuestion(qIndex, { scoringModel: e.target.value as any })}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        >
                          <option value="moet_2025">Barem Bộ 2025 (10%-25%-50%-100%)</option>
                          <option value="proportional">Chia đều 4 ý (mỗi ý 25%)</option>
                        </select>
                      )}
                    </div>

                    {/* Point Configuration Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 font-bold">Điểm câu này:</span>
                      
                      {/* Quick Point Preset Chips */}
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        {[0.25, 0.5, 1.0, 1.5, 2.0].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => handleUpdateQuestion(qIndex, { points: pt })}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                              Math.abs(qPoints - pt) < 0.001
                                ? 'bg-brand-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            {pt}đ
                          </button>
                        ))}
                      </div>

                      {/* Direct Custom Point Input */}
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={qPoints}
                        onChange={(e) => handleUpdateQuestion(qIndex, { points: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-16 px-2 py-1 rounded-xl border border-slate-300 font-mono text-xs font-black text-brand-700 text-center focus:ring-2 focus:ring-brand-500 focus:outline-none bg-brand-50/40"
                        title="Tự do nhập điểm số cho câu này"
                      />

                      <button
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <textarea
                      rows={3}
                      value={q.prompt}
                      onChange={(e) => handleUpdateQuestion(qIndex, { prompt: e.target.value })}
                      placeholder="Nhập nội dung câu hỏi (hỗ trợ công thức Toán KaTeX $...$)..."
                      className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                    <div className="mt-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                      <span className="font-semibold text-slate-400 mr-2">Xem trước:</span>
                      <MathRenderer content={q.prompt} />
                    </div>
                  </div>

                  {/* MULTIPLE CHOICE OPTIONS */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>Lựa chọn A, B, C, D (Bấm vào chữ cái để chọn đáp án đúng):</span>
                        <span className="text-emerald-700 font-bold">
                          Đáp án đúng: {q.correctOptionId || 'Chưa chọn'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(q.options || ['A', 'B', 'C', 'D'].map((lbl, i) => ({ id: `opt-${i}`, label: lbl, text: '' }))).map((opt, optIdx) => {
                          const isCorrect = q.correctOptionId === opt.label || q.correctOptionId === opt.id;
                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-300'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(qIndex, { correctOptionId: opt.label })}
                                className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={`Chọn ${opt.label} làm đáp án đúng`}
                              >
                                {opt.label}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                placeholder={`Nội dung lựa chọn ${opt.label}...`}
                                onChange={(e) => {
                                  const baseOpts = q.options && q.options.length === 4
                                    ? q.options
                                    : ['A', 'B', 'C', 'D'].map((lbl, i) => ({ id: `opt-${i}`, label: lbl, text: '' }));
                                  const newOptions = [...baseOpts];
                                  newOptions[optIdx] = { ...opt, text: e.target.value };
                                  handleUpdateQuestion(qIndex, { options: newOptions });
                                }}
                                className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TRUE / FALSE 4 STATEMENTS */}
                  {q.type === 'true_false' && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs text-slate-500 font-bold">
                        4 Mệnh đề khẳng định a), b), c), d) và Đáp án tương ứng:
                      </span>
                      <div className="space-y-2">
                        {(q.trueFalseItems || ['a', 'b', 'c', 'd'].map((lbl, i) => ({ id: `tf-${i}`, label: lbl, statement: '', isCorrect: true }))).map((item, itemIdx) => {
                          const isItemTrue = typeof item.isCorrect === 'boolean'
                            ? item.isCorrect
                            : ['true', 'đúng', 'dung', '1'].includes(String(item.isCorrect).toLowerCase());

                          return (
                            <div key={item.id || itemIdx} className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-bold text-slate-800 text-xs w-6">{item.label})</span>
                                <input
                                  type="text"
                                  value={item.statement}
                                  placeholder={`Mệnh đề khẳng định ý ${item.label})...`}
                                  onChange={(e) => {
                                    const baseItems = q.trueFalseItems && q.trueFalseItems.length === 4
                                      ? q.trueFalseItems
                                      : ['a', 'b', 'c', 'd'].map((lbl, i) => ({ id: `tf-${i}`, label: lbl, statement: '', isCorrect: true }));
                                    const newItems = [...baseItems];
                                    newItems[itemIdx] = { ...item, statement: e.target.value };
                                    handleUpdateQuestion(qIndex, { trueFalseItems: newItems });
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const baseItems = q.trueFalseItems && q.trueFalseItems.length === 4
                                      ? q.trueFalseItems
                                      : ['a', 'b', 'c', 'd'].map((lbl, i) => ({ id: `tf-${i}`, label: lbl, statement: '', isCorrect: true }));
                                    const newItems = [...baseItems];
                                    newItems[itemIdx] = { ...item, isCorrect: true };
                                    handleUpdateQuestion(qIndex, { trueFalseItems: newItems });
                                  }}
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                    isItemTrue
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  ĐÚNG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const baseItems = q.trueFalseItems && q.trueFalseItems.length === 4
                                      ? q.trueFalseItems
                                      : ['a', 'b', 'c', 'd'].map((lbl, i) => ({ id: `tf-${i}`, label: lbl, statement: '', isCorrect: true }));
                                    const newItems = [...baseItems];
                                    newItems[itemIdx] = { ...item, isCorrect: false };
                                    handleUpdateQuestion(qIndex, { trueFalseItems: newItems });
                                  }}
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                    !isItemTrue
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  SAI
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SHORT ANSWER ACCEPTED KEYS */}
                  {q.type === 'short_answer' && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs text-slate-500 font-bold">
                        Đáp án chấp nhận (các giá trị cách nhau bằng dấu phẩy, hỗ trợ số thập phân / phân số):
                      </span>
                      <input
                        type="text"
                        value={(q.shortAnswerCorrect || []).join(', ')}
                        placeholder="VD: 5, 5.0, 5,0 hoặc 3/4, 0.75..."
                        onChange={(e) => {
                          const keys = e.target.value.split(',').map((k) => k.trim()).filter(Boolean);
                          handleUpdateQuestion(qIndex, { shortAnswerCorrect: keys });
                        }}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Question Explanation */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Lời giải chi tiết (Tùy chọn):</span>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      placeholder="Nhập lời giải hoặc hướng dẫn giải cho học sinh..."
                      onChange={(e) => handleUpdateQuestion(qIndex, { explanation: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Word Tab */}
      {activeTab === 'word' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">Nhập đề từ Microsoft Word (.docx) hoặc Văn bản</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống tự động nhận diện 3 phần: Trắc nghiệm 4 lựa chọn, Đúng/Sai, Trả lời ngắn & Công thức LaTeX.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tải lên file Word (.docx)
              </label>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setWordFile(e.target.files?.[0] || null)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>

            <div className="text-center text-xs font-bold text-slate-400">— HOẶC DÁN NỘI DUNG VĂN BẢN —</div>

            <div>
              <textarea
                rows={8}
                value={rawTextImport}
                onChange={(e) => setRawTextImport(e.target.value)}
                placeholder="Dán nội dung đề thi vào đây... Ví dụ: Câu 1: Cho hàm số... A. ... B. ... C. ... D. ... Lời giải: ..."
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExecuteWordImport}
                disabled={isParsingWord}
                className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isParsingWord ? 'Đang phân tích...' : 'Phân tích & Nạp câu hỏi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Tab */}
      {activeTab === 'json' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">Nhập đề qua cấu trúc JSON</h2>
            <p className="text-xs text-slate-400 mt-0.5">Dành cho việc sao lưu hoặc chuyển đổi dữ liệu dạng JSON chuẩn FEXAM.</p>
          </div>

          <div className="space-y-4">
            <textarea
              rows={12}
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                onClick={handleExecuteJsonImport}
                className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                Áp dụng JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">Cấu hình Đề thi &amp; Xem lại bài làm</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thiết lập quy chế làm bài, bảo mật chống gian lận và quyền xem lại đáp án của học sinh.
            </p>
          </div>

          <div className="space-y-5">
            {/* Toggle allowReviewAnswers */}
            <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    Cho phép học sinh xem lại bài làm &amp; đáp án chi tiết
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      settings.allowReviewAnswers ?? true
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {(settings.allowReviewAnswers ?? true) ? 'Đang BẬT' : 'Đang TẮT'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {(settings.allowReviewAnswers ?? true)
                    ? 'Học sinh được xem lại từng câu hỏi, câu đúng / sai và đối chiếu đáp án sau khi nộp.'
                    : 'Học sinh chỉ nhận điểm số / phiếu điểm tổng quát, khóa hoàn toàn khu vực xem lại từng câu hỏi để bảo mật ngân hàng đề.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowReviewAnswers ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, allowReviewAnswers: e.target.checked })
                }
                className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chế độ hiển thị điểm số
                </label>
                <select
                  value={settings.scoreDisplayMode || 'immediate'}
                  onChange={(e) =>
                    setSettings({ ...settings, scoreDisplayMode: e.target.value as any })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="immediate">Hiển thị điểm ngay sau khi nộp</option>
                  <option value="after_close">Chỉ hiển thị sau khi đóng đề thi</option>
                  <option value="hidden">Không hiển thị điểm cho học sinh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chế độ xem đáp án &amp; Lời giải
                </label>
                <select
                  value={settings.showSolutionMode || 'after_close'}
                  onChange={(e) =>
                    setSettings({ ...settings, showSolutionMode: e.target.value as any })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="after_close">Xem lời giải sau khi đóng ca thi</option>
                  <option value="always">Luôn cho xem đáp án &amp; lời giải sau khi nộp</option>
                  <option value="never">Không cho xem lời giải</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Thời lượng làm bài (Phút)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.durationMinutes || 45}
                  onChange={(e) =>
                    setSettings({ ...settings, durationMinutes: parseInt(e.target.value, 10) || 45 })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cấp độ chống gian lận FEXAM Guard
                </label>
                <select
                  value={settings.antiCheatLevel || 'strict'}
                  onChange={(e) =>
                    setSettings({ ...settings, antiCheatLevel: e.target.value as any })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="none">Tắt hoàn toàn (Luyện tập tự do)</option>
                  <option value="strict">Nghiêm ngặt (Cảnh báo &amp; Tự nộp sau 3 lần)</option>
                  <option value="maximum">Tối đa (Chặn chuột, chống copy &amp; phím tắt)</option>
                  <option value="standard">Tiêu chuẩn (Ghi nhận vi phạm nhẹ)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
