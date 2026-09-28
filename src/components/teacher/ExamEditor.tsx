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
import { parseDocxFile, parseExamText } from '../../lib/word-parser';
import { uploadImageToCloudinary } from '../../services/cloudinary';
import { MathRenderer } from '../../lib/katex-renderer';

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
  const { saveExam } = useExam();

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
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed)) {
        setQuestions(parsed);
        alert(`Nhập thành công ${parsed.length} câu hỏi từ JSON!`);
        setActiveTab('visual');
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        if (parsed.title) setTitle(parsed.title);
        if (parsed.settings) setSettings(parsed.settings);
        setQuestions(parsed.questions);
        alert(`Nhập thành công ${parsed.questions.length} câu hỏi từ đề JSON!`);
        setActiveTab('visual');
      } else {
        alert('Định dạng JSON không hợp lệ!');
      }
    } catch (err: any) {
      alert('Lỗi định dạng JSON: ' + err?.message);
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
    alert('Đã lưu đề thi thành công!');
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveExam}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
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
            {questions.map((q, qIndex) => (
              <div key={q.id || qIndex} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                      {qIndex + 1}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                      {q.type === 'multiple_choice' ? '4 Lựa chọn' : q.type === 'true_false' ? 'Đúng / Sai' : 'Trả lời ngắn'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Điểm: {q.points || 0.5}đ
                    </span>
                  </div>
                  <button onClick={() => handleDeleteQuestion(qIndex)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={q.prompt}
                    onChange={(e) => handleUpdateQuestion(qIndex, { prompt: e.target.value })}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <div className="mt-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <span className="font-semibold text-slate-400 mr-2">Xem trước:</span>
                    <MathRenderer content={q.prompt} />
                  </div>
                </div>

                {/* Multiple choice options */}
                {q.type === 'multiple_choice' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                          q.correctOptionId === opt.id
                            ? 'border-emerald-500 bg-emerald-50/60'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestion(qIndex, { correctOptionId: opt.id })}
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer ${
                            q.correctOptionId === opt.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const newOptions = [...q.options!];
                            newOptions[optIdx] = { ...opt, text: e.target.value };
                            handleUpdateQuestion(qIndex, { options: newOptions });
                          }}
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
