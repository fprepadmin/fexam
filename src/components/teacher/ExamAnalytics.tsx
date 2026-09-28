import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Users,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Search,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  X,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { Exam, ExamSubmission } from '../../types';
import { exportExamResultsToExcel } from '../../lib/excel-helper';
import { MathRenderer } from '../../lib/katex-renderer';

interface ExamAnalyticsProps {
  selectedExamId?: string;
  onBack?: () => void;
}

export const ExamAnalytics: React.FC<ExamAnalyticsProps> = ({
  selectedExamId,
  onBack,
}) => {
  const { exams, submissions } = useExam();
  const [currentExamId, setCurrentExamId] = useState(selectedExamId || exams[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubDetail, setSelectedSubDetail] = useState<ExamSubmission | null>(null);

  const currentExam = exams.find((e) => e.id === currentExamId) || exams[0];
  const examSubs = submissions.filter((s) => s.examId === currentExamId);
  const submittedList = examSubs.filter((s) => s.status === 'submitted');

  // Metrics computation
  const totalSubmissions = submittedList.length;
  const scores = submittedList.map((s) => (s.score / (s.maxScore || 1)) * 10);
  const avgScore = totalSubmissions > 0 ? (scores.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(1) : '0.0';
  const maxScore = totalSubmissions > 0 ? Math.max(...scores).toFixed(1) : '0.0';
  const minScore = totalSubmissions > 0 ? Math.min(...scores).toFixed(1) : '0.0';

  // Score distribution buckets [0-2, 2-4, 4-6, 6-8, 8-10]
  const buckets = [
    { label: '< 5.0 (Yếu/Kém)', count: scores.filter((s) => s < 5.0).length, color: 'bg-rose-500' },
    { label: '5.0 - 6.5 (Trung bình)', count: scores.filter((s) => s >= 5.0 && s < 6.5).length, color: 'bg-amber-500' },
    { label: '6.5 - 8.0 (Khá)', count: scores.filter((s) => s >= 6.5 && s < 8.0).length, color: 'bg-sky-500' },
    { label: '8.0 - 10.0 (Giỏi/Xuất sắc)', count: scores.filter((s) => s >= 8.0).length, color: 'bg-emerald-500' },
  ];

  const handleExportExcel = () => {
    if (!currentExam) return;
    exportExamResultsToExcel(currentExam, examSubs);
  };

  const filteredSubs = examSubs.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Thống kê & Bảng điểm Đề thi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân tích phổ điểm, độ khó từng câu hỏi và chi tiết bài nộp của thí sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currentExamId}
            onChange={(e) => setCurrentExamId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} — {ex.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Bảng điểm Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-500 uppercase">Đã nộp bài</span>
          <div className="text-3xl font-extrabold text-indigo-700 mt-2">
            {totalSubmissions}
          </div>
          <p className="text-xs text-slate-400 mt-1">trên tổng {examSubs.length} lượt vào thi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-500 uppercase">Điểm trung bình</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            {avgScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Đánh giá chung lớp học</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-500 uppercase">Điểm cao nhất</span>
          <div className="text-3xl font-extrabold text-sky-600 mt-2">
            {maxScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Thủ khoa bài thi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-500 uppercase">Điểm thấp nhất</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-2">
            {minScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Cần phụ đạo thêm</p>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Phổ điểm bài thi</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {buckets.map((b, idx) => {
            const percent = totalSubmissions > 0 ? Math.round((b.count / totalSubmissions) * 100) : 0;
            return (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{b.label}</span>
                  <span className="font-extrabold text-slate-900">{b.count} bài ({percent}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submissions Table & Individual Paper Inspector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">Danh sách bài nộp của Thí sinh</h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc mã..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-4">Mã dự thi</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4">Điểm số (Thang 10)</th>
                <th className="py-3 px-4">Thời gian làm</th>
                <th className="py-3 px-4">Vi phạm</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSubs.map((sub) => {
                const scaledScore = Math.round((sub.score / (sub.maxScore || 1)) * 10 * 100) / 100;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{sub.studentCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{sub.studentName}</td>
                    <td className="py-3 px-4 text-slate-500">{sub.className || 'Tự do'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-extrabold text-sm ${
                          scaledScore >= 8.0
                            ? 'text-emerald-600'
                            : scaledScore >= 5.0
                            ? 'text-sky-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {scaledScore}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {Math.round(sub.durationSecondsUsed / 60)} phút
                    </td>
                    <td className="py-3 px-4">
                      {sub.violations && sub.violations.length > 0 ? (
                        <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          {sub.violations.length} lần
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSubDetail(sub)}
                        className="px-3 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs"
                      >
                        Xem bài làm
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Student Test Paper Details */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bài làm của {selectedSubDetail.studentName} ({selectedSubDetail.studentCode})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Điểm: {(selectedSubDetail.score / (selectedSubDetail.maxScore || 1)) * 10} / 10 · Vi phạm: {selectedSubDetail.violations?.length || 0} lần
                </p>
              </div>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentExam?.questions.map((q, idx) => {
                const ans = selectedSubDetail.answers?.[q.id];
                return (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">Câu {idx + 1}:</span>
                      {ans?.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng (+{q.points}đ)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                          <XCircle className="w-3.5 h-3.5" /> Sai (0đ)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-800">
                      <MathRenderer content={q.prompt} />
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                      <span className="font-semibold text-slate-500 mr-2">Đáp án học sinh:</span>
                      {q.type === 'multiple_choice' && (
                        <span className="font-bold text-brand-600">{ans?.selectedOptionId || 'Chưa chọn'}</span>
                      )}
                      {q.type === 'short_answer' && (
                        <span className="font-bold text-brand-600">{ans?.shortAnswerText || 'Trống'}</span>
                      )}
                      {q.type === 'true_false' && (
                        <span className="font-bold text-brand-600">Đã chọn các ý đúng/sai</span>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-slate-500 italic mt-1">
                        <span className="font-semibold">Lời giải: </span>
                        <MathRenderer content={q.explanation} />
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
