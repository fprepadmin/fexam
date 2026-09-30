import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Search,
  Clock,
  BookOpen,
  User,
  Shield,
  Layers,
  Eye,
  X,
  CheckCircle2,
  Lock,
  Sparkles,
  HelpCircle,
  Award,
  Calendar,
  Check,
  Zap,
  Info,
  Sliders,
  Filter,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { Exam, Question } from '../../types';
import { MathRenderer } from '../../lib/katex-renderer';

export const AdminExamsView: React.FC = () => {
  const { exams } = useExam();
  const { allTeachers, user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang <strong>Kho Đề Thi Toàn Hệ Thống</strong> chỉ dành riêng cho Quản trị viên (Admin). Tài khoản Giáo viên không có quyền truy cập.
        </p>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Preview / Inspection Modal state
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [previewTab, setPreviewTab] = useState<'questions' | 'settings'>('questions');

  // Filtered exams list
  const filteredExams = exams.filter((ex) => {
    const matchSearch =
      ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.authorName && ex.authorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.authorEmail && ex.authorEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchSubject = filterSubject === 'all' || ex.subject === filterSubject;
    const matchTeacher =
      filterTeacher === 'all' ||
      ex.authorId === filterTeacher ||
      (ex.authorEmail && ex.authorEmail.toLowerCase() === filterTeacher.toLowerCase());
    const matchGrade = filterGrade === 'all' || ex.grade === filterGrade;

    return matchSearch && matchSubject && matchTeacher && matchGrade;
  });

  // Extract unique teachers who have created exams
  const teacherAuthorOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    exams.forEach((ex) => {
      const email = (ex.authorEmail || '').trim().toLowerCase();
      const name = ex.authorName || 'Giáo viên';
      if (email && !map.has(email)) {
        map.set(email, { id: ex.authorId || email, name, email });
      }
    });
    return Array.from(map.values());
  }, [exams]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Kho Đề Thi Toàn Hệ Thống
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
              Chỉ Xem (Read-Only)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Chế độ bí mật
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Xem toàn bộ đề thi, nội dung câu hỏi và đáp án do các giáo viên trong trường tạo. (Quyền chỉ đọc — Giáo viên không nhận thông báo khi bạn xem)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <FileText className="w-4 h-4 text-brand-600" />
            <span>Tổng số: {exams.length} Đề thi</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên đề, mã đề, tên hoặc email giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Teacher */}
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Tất cả giáo viên ({teacherAuthorOptions.length})</option>
            {teacherAuthorOptions.map((t) => (
              <option key={t.email} value={t.email}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>

          {/* Filter by Subject */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Tất cả môn học</option>
            <option value="Toán học">Toán học</option>
            <option value="Vật lí">Vật lí</option>
            <option value="Hóa học">Hóa học</option>
            <option value="Sinh học">Sinh học</option>
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
            <option value="Lịch sử">Lịch sử</option>
            <option value="Địa lý">Địa lý</option>
            <option value="Tin học">Tin học</option>
          </select>

          {/* Filter by Grade */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Tất cả khối</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
            <option value="Khác">Khối khác</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Lưới
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Grid View of Exams */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-md transition-all p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Code & Subject & Grade */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 font-mono font-bold text-xs border border-brand-100">
                    {exam.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                      {exam.subject || 'Chung'}
                    </span>
                    <span className="px-2 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs">
                      K{exam.grade || '12'}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight line-clamp-2">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {exam.description || 'Không có mô tả'}
                  </p>
                </div>

                {/* Teacher Author Card */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                      {(exam.authorName || 'GV').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 leading-none">{exam.authorName || 'Giáo viên'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{exam.authorEmail || '—'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>

                {/* Specs */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-semibold">
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span>{exam.questions.length} câu</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{exam.settings.durationMinutes} phút</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-semibold">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="capitalize">{exam.settings.antiCheatLevel || 'standard'}</span>
                  </span>
                </div>
              </div>

              {/* Action: View Only */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setPreviewExam(exam);
                    setPreviewTab('questions');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-colors shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem Chi Tiết Đề Thi</span>
                </button>
              </div>
            </div>
          ))}

          {filteredExams.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Không tìm thấy đề thi nào phù hợp</p>
              <p className="text-[11px] text-slate-400">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc môn học/giáo viên</p>
            </div>
          )}
        </div>
      )}

      {/* Table View of Exams */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                <th className="py-3.5 px-4">Mã Đề</th>
                <th className="py-3.5 px-4">Tên Đề Thi</th>
                <th className="py-3.5 px-4">Giáo Viên Tạo</th>
                <th className="py-3.5 px-4">Môn Học</th>
                <th className="py-3.5 px-4">Khối</th>
                <th className="py-3.5 px-4">Số Câu</th>
                <th className="py-3.5 px-4">Thời Lượng</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{exam.code}</td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900 max-w-xs truncate">{exam.title}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{exam.authorName || 'Giáo viên'}</span>
                    <span className="block text-[10px] text-slate-400">{exam.authorEmail || '—'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{exam.subject}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">{exam.grade || '12'}</td>
                  <td className="py-3.5 px-4 font-bold text-brand-600">{exam.questions.length} câu</td>
                  <td className="py-3.5 px-4 text-slate-600">{exam.settings.durationMinutes}p</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setPreviewExam(exam);
                        setPreviewTab('questions');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comprehensive Exam Inspection Modal (Admin Read-Only Preview) */}
      {previewExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                    {previewExam.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                    {previewExam.subject} · Khối {previewExam.grade || '12'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Chế độ xem Admin (Chỉ đọc)
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {previewExam.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tác giả: <strong className="text-slate-800">{previewExam.authorName}</strong> ({previewExam.authorEmail}) · Tạo ngày: {previewExam.createdAt ? new Date(previewExam.createdAt).toLocaleString('vi-VN') : '—'}
                </p>
              </div>

              <button
                onClick={() => setPreviewExam(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Specs Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng số câu</span>
                <p className="text-base font-extrabold text-brand-700 mt-0.5">{previewExam.questions.length} câu</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Thời lượng thi</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">{previewExam.settings.durationMinutes} phút</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng điểm</span>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5">{previewExam.totalPoints || 10} điểm</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Chống gian lận</span>
                <p className="text-base font-extrabold text-indigo-700 mt-0.5 capitalize">{previewExam.settings.antiCheatLevel || 'standard'}</p>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setPreviewTab('questions')}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
                  previewTab === 'questions'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Danh sách câu hỏi & Đáp án ({previewExam.questions.length})
              </button>
              <button
                onClick={() => setPreviewTab('settings')}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
                  previewTab === 'settings'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cấu hình đề thi & Bảo mật
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Tab 1: Questions & Correct Answers */}
              {previewTab === 'questions' && (
                <div className="space-y-5">
                  {previewExam.questions.map((q, idx) => {
                    const qOrder = q.order || idx + 1;
                    return (
                      <div
                        key={q.id || idx}
                        className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3"
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs">
                              Câu {qOrder}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {q.type === 'multiple_choice'
                                ? 'Trắc nghiệm đơn'
                                : q.type === 'true_false'
                                ? 'Đúng / Sai'
                                : 'Trả lời ngắn'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
                            {q.points || 0.25} điểm
                          </span>
                        </div>

                        {/* Question Prompt */}
                        <div className="text-xs text-slate-900 leading-relaxed font-medium">
                          <MathRenderer content={q.prompt} />
                        </div>

                        {/* Question Image if any */}
                        {q.imageUrl && (
                          <div className="my-2 max-w-md">
                            <img
                              src={q.imageUrl}
                              alt={`Hình ảnh câu ${qOrder}`}
                              className="rounded-2xl border border-slate-200 max-h-60 object-contain"
                            />
                          </div>
                        )}

                        {/* Multiple Choice Options */}
                        {q.type === 'multiple_choice' && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {q.options.map((opt) => {
                              const isCorrect = q.correctOptionId === opt.label || q.correctOptionId === opt.id;
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200 font-bold text-emerald-900'
                                      : 'bg-slate-50/50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {opt.label}
                                  </span>
                                  <div className="flex-1">
                                    <MathRenderer content={opt.text} />
                                    {isCorrect && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-extrabold mt-1">
                                        <CheckCircle2 className="w-3 h-3" /> Đáp án đúng
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True / False items */}
                        {q.type === 'true_false' && q.trueFalseItems && (
                          <div className="space-y-2 mt-2">
                            {q.trueFalseItems.map((tf) => (
                              <div
                                key={tf.id}
                                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-3"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-mono font-bold text-slate-700 uppercase">
                                    {tf.label})
                                  </span>
                                  <div className="text-slate-800">
                                    <MathRenderer content={tf.statement} />
                                  </div>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-xl text-xs font-extrabold shrink-0 border ${
                                    tf.isCorrect
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {tf.isCorrect ? 'ĐÚNG' : 'SAI'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Short Answer keywords */}
                        {q.type === 'short_answer' && (
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 mt-2">
                            <span className="font-bold text-slate-500 uppercase text-[10px]">Từ khóa đáp án đúng:</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {(q.shortAnswerCorrect || []).map((ans, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-300">
                                  {ans}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Explanation / Lời giải chi tiết */}
                        {q.explanation && (
                          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-950 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-blue-800 text-[11px] uppercase tracking-wider">
                              <Info className="w-3.5 h-3.5 text-blue-600" />
                              <span>Lời giải chi tiết:</span>
                            </div>
                            <div className="leading-relaxed">
                              <MathRenderer content={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Settings & Security config */}
              {previewTab === 'settings' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Cấu hình làm bài</h4>
                      <p className="text-slate-600">Thời gian làm bài: <strong>{previewExam.settings.durationMinutes} phút</strong></p>
                      <p className="text-slate-600">Số lần làm tối đa: <strong>{previewExam.settings.maxAttempts === 999 ? 'Không giới hạn' : `${previewExam.settings.maxAttempts} lần`}</strong></p>
                      <p className="text-slate-600">Xáo trộn câu hỏi: <strong>{previewExam.settings.shuffleQuestions ? 'Bật' : 'Tắt'}</strong></p>
                      <p className="text-slate-600">Xáo trộn đáp án: <strong>{previewExam.settings.shuffleOptions ? 'Bật' : 'Tắt'}</strong></p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Hiển thị kết quả & Lời giải</h4>
                      <p className="text-slate-600">Hiển thị điểm: <strong className="capitalize">{previewExam.settings.scoreDisplayMode || 'immediate'}</strong></p>
                      <p className="text-slate-600">Hiển thị lời giải: <strong className="capitalize">{previewExam.settings.showSolutionMode || 'after_close'}</strong></p>
                      <p className="text-slate-600">Mức độ chống gian lận: <strong className="capitalize">{previewExam.settings.antiCheatLevel || 'standard'}</strong></p>
                      <p className="text-slate-600">Bắt buộc toàn màn hình: <strong>{previewExam.settings.requireFullscreen ? 'Bật' : 'Tắt'}</strong></p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Chế độ giám sát hệ thống dành cho Ban Giám Hiệu / Quản trị viên
              </span>
              <button
                onClick={() => setPreviewExam(null)}
                className="px-5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
