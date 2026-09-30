import React, { useState } from 'react';
import {
  Award,
  Search,
  Download,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Edit3,
  TrendingUp,
  ShieldAlert,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Eye,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { ExamSubmission, Exam, ExamSession } from '../../types';
import { exportExamResultsToExcel } from '../../lib/excel-helper';
import { ManualGradingModal } from '../teacher/ManualGradingModal';
import { MathRenderer } from '../../lib/katex-renderer';

export const AdminSubmissionsView: React.FC = () => {
  const { user } = useAuth();
  const { submissions, exams, sessions, saveSubmission, regradeSubmissions } = useExam();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('submitted');

  // Detail inspection & manual grading state
  const [selectedSub, setSelectedSub] = useState<ExamSubmission | null>(null);
  const [manualGradingSub, setManualGradingSub] = useState<ExamSubmission | null>(null);
  const [regradeNotice, setRegradeNotice] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang <strong>Quản lý Bài Nộp &amp; Bảng Điểm Toàn Trường</strong> chỉ dành riêng cho Quản trị viên (Admin).
        </p>
      </div>
    );
  }

  // Filter unique classes
  const allClasses = Array.from(
    new Set(submissions.map((s) => s.className).filter(Boolean))
  ) as string[];

  // Filter submissions
  const filteredSubs = submissions.filter((sub) => {
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    if (selectedExamId !== 'all' && sub.examId !== selectedExamId) return false;
    if (selectedSessionId !== 'all' && sub.sessionId !== selectedSessionId && sub.sessionCode !== selectedSessionId) return false;
    if (selectedClass !== 'all' && sub.className !== selectedClass) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = sub.studentName?.toLowerCase().includes(q);
      const matchCode = sub.studentCode?.toLowerCase().includes(q);
      const matchMshs = sub.mshs?.toLowerCase().includes(q);
      const matchClass = sub.className?.toLowerCase().includes(q);
      const matchExam = sub.examTitle?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchMshs && !matchClass && !matchExam) return false;
    }
    return true;
  });

  const submittedList = filteredSubs.filter((s) => s.status === 'submitted');
  const totalSubmissions = submittedList.length;
  const scores = submittedList.map((s) => (s.score / (s.maxScore || 1)) * 10);
  const avgScore = totalSubmissions > 0 ? (scores.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(1) : '0.0';
  const maxScore = totalSubmissions > 0 ? Math.max(...scores).toFixed(1) : '0.0';
  const minScore = totalSubmissions > 0 ? Math.min(...scores).toFixed(1) : '0.0';

  // Export Excel
  const handleExportExcel = () => {
    const targetExam = exams.find((e) => e.id === selectedExamId) || exams[0];
    if (!targetExam) {
      alert('Không có dữ liệu đề thi để xuất báo cáo.');
      return;
    }
    exportExamResultsToExcel(targetExam, filteredSubs);
  };

  // Bulk regrade
  const handleBulkRegrade = () => {
    if (selectedExamId === 'all') {
      alert('Vui lòng chọn một Đề thi cụ thể từ bộ lọc bên trên để thực hiện chấm lại!');
      return;
    }
    const targetExam = exams.find((e) => e.id === selectedExamId);
    if (!targetExam) return;

    if (!window.confirm(`[Admin] Bạn có chắc muốn chấm lại TOÀN BỘ bài nộp của đề "${targetExam.title}" theo barem đáp án hiện tại?`)) {
      return;
    }

    const count = regradeSubmissions(selectedExamId, selectedSessionId === 'all' ? undefined : selectedSessionId);
    setRegradeNotice(`Đã tự động chấm lại và cập nhật điểm số cho ${count} bài thi thành công!`);
    setTimeout(() => setRegradeNotice(null), 3500);
  };

  const handleSaveManualGrading = (updatedSub: ExamSubmission) => {
    saveSubmission(updatedSub);
    if (selectedSub && selectedSub.id === updatedSub.id) {
      setSelectedSub(updatedSub);
    }
  };

  // Find active exam for modal
  const activeModalExam = manualGradingSub
    ? exams.find((e) => e.id === manualGradingSub.examId || e.code === manualGradingSub.examCode) || exams[0]
    : null;

  const activeModalSession = manualGradingSub?.sessionId
    ? sessions.find((s) => s.id === manualGradingSub.sessionId || s.code === manualGradingSub.sessionCode)
    : null;

  if (manualGradingSub && activeModalExam) {
    return (
      <ManualGradingModal
        submission={manualGradingSub}
        exam={activeModalExam}
        session={activeModalSession}
        onClose={() => setManualGradingSub(null)}
        onSave={handleSaveManualGrading}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase">
              Admin Master
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Quản Lý Bảng Điểm &amp; Bài Thi Toàn Trường
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Xem toàn bộ bài thi đã nộp, đối chiếu đáp án từng câu và hỗ trợ giáo viên chấm sửa điểm trực tiếp
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={handleBulkRegrade}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
            title="Chấm lại toàn bộ bài thi của đề đang chọn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chấm Lại Đề Đang Chọn</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {regradeNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{regradeNotice}</span>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Tổng Bài Đã Nộp</span>
          <div className="text-3xl font-extrabold text-indigo-700 mt-1">{totalSubmissions}</div>
          <p className="text-xs text-slate-400 mt-1">trên {filteredSubs.length} lượt bài lọc</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Điểm Trung Bình</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">
            {avgScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Chất lượng học sinh</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Điểm Cao Nhất</span>
          <div className="text-3xl font-extrabold text-sky-600 mt-1">{maxScore}</div>
          <p className="text-xs text-slate-400 mt-1">Thủ khoa đợt thi</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Điểm Thấp Nhất</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{minScore}</div>
          <p className="text-xs text-slate-400 mt-1">Cần phụ đạo</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên học sinh, SBD, MSHS, Lớp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Filter Exam */}
        <div>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="all">Tất cả Đề thi ({exams.length})</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} - {ex.title}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Session */}
        <div>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="all">Tất cả Ca thi ({sessions.length})</option>
            {sessions.map((sess) => (
              <option key={sess.id} value={sess.id}>
                {sess.code} - {sess.title}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Class */}
        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="all">Tất cả Lớp học</option>
            {allClasses.map((cls) => (
              <option key={cls} value={cls}>
                Lớp {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Submissions Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">
            Danh sách bài thi ({filteredSubs.length} kết quả)
          </h3>
          <span className="text-xs text-slate-400">
            Cập nhật theo thời gian thực từ cơ sở dữ liệu
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                <th className="py-3.5 px-4">SBD</th>
                <th className="py-3.5 px-4">MSHS</th>
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-4">Lớp</th>
                <th className="py-3.5 px-4">Đề thi / Ca thi</th>
                <th className="py-3.5 px-4">Điểm số (Thang 10)</th>
                <th className="py-3.5 px-4">Thời gian làm</th>
                <th className="py-3.5 px-4">Vi phạm</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSubs.map((sub) => {
                const scaled = Math.round((sub.score / (sub.maxScore || 1)) * 10 * 100) / 100;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{sub.studentCode}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{sub.mshs || '—'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{sub.studentName}</td>
                    <td className="py-3.5 px-4 text-slate-500">{sub.className || 'Tự do'}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 truncate max-w-xs">{sub.examTitle}</div>
                      <div className="text-[11px] text-slate-400">{sub.sessionCode || 'Ca tự do'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.status === 'submitted' ? (
                        <span className="font-extrabold text-sm text-brand-600 font-mono">
                          {scaled} <span className="text-[11px] text-slate-400 font-normal">/ 10</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                          Đang làm bài
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {sub.durationSecondsUsed ? `${Math.round(sub.durationSecondsUsed / 60)} phút` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.violations && sub.violations.length > 0 ? (
                        <span className="text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                          {sub.violations.length} lần
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Xem bài làm
                        </button>
                        <button
                          onClick={() => setManualGradingSub(sub)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chấm thủ công / Sửa điểm</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSubs.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy bài thi nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Student Test Paper Inspector Dedicated Section */}
      {selectedSub && (
        <div className="bg-white rounded-3xl p-8 border border-brand-200 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <span className="text-xs font-bold text-brand-600 uppercase">Chi tiết bài làm của thí sinh</span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedSub.studentName} ({selectedSub.studentCode}) — {selectedSub.className}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Đề thi: {selectedSub.examTitle} · Điểm: {(selectedSub.score / (selectedSub.maxScore || 1)) * 10} / 10 · Vi phạm: {selectedSub.violations?.length || 0} lần
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setManualGradingSub(selectedSub)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chấm Điểm Thủ Công Từng Câu</span>
              </button>
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {(exams.find((e) => e.id === selectedSub.examId || e.code === selectedSub.examCode)?.questions || []).map((q, idx) => {
              const ans = selectedSub.answers?.[q.id];
              return (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Câu {idx + 1}:</span>
                    {ans?.isCorrect ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đúng (+{ans.awardedPoints ?? q.points ?? 1}đ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                        <XCircle className="w-3.5 h-3.5" /> Sai ({ans?.awardedPoints ?? 0}đ)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-800 font-medium">
                    <MathRenderer content={q.prompt} />
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                    <span className="font-semibold text-slate-400 mr-2">Đáp án học sinh:</span>
                    <span className="font-bold text-brand-600">
                      {q.type === 'multiple_choice'
                        ? ans?.selectedOptionId || 'Chưa chọn'
                        : q.type === 'short_answer'
                        ? ans?.shortAnswerText || 'Trống'
                        : 'Đã hoàn thành các ý đúng/sai'}
                    </span>
                  </div>

                  {q.explanation && (
                    <div className="text-xs text-slate-500 italic">
                      <span className="font-semibold">Lời giải: </span>
                      <MathRenderer content={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
