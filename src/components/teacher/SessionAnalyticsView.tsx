import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Users,
  Award,
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  RotateCcw,
  Edit3,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { ExamSession, ExamSubmission } from '../../types';
import { exportExamResultsToExcel } from '../../lib/excel-helper';
import { MathRenderer } from '../../lib/katex-renderer';
import { ManualGradingModal } from './ManualGradingModal';

interface SessionAnalyticsViewProps {
  session: ExamSession;
  onBack: () => void;
}

export const SessionAnalyticsView: React.FC<SessionAnalyticsViewProps> = ({
  session,
  onBack,
}) => {
  const { exams, submissions, regradeSubmissions, saveSubmission } = useExam();
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState<ExamSubmission | null>(null);
  const [manualGradingSub, setManualGradingSub] = useState<ExamSubmission | null>(null);
  const [regradingStatus, setRegradingStatus] = useState<string | null>(null);

  const exam = exams.find((e) => e.id === session.examId) || exams[0];
  const rawSessionSubs = submissions.filter(
    (s) => s.sessionId === session.id || (s.sessionCode && s.sessionCode === session.code)
  );
  const sessSubMap = new Map<string, ExamSubmission>();
  [...rawSessionSubs]
    .sort((a, b) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (b.status === 'submitted' && a.status !== 'submitted') return 1;
      return 0;
    })
    .forEach((s) => {
      const key = (s.studentCode || s.mshs || s.id).trim().toUpperCase();
      if (!sessSubMap.has(key)) sessSubMap.set(key, s);
    });
  const sessionSubs = Array.from(sessSubMap.values());
  const submittedList = sessionSubs.filter((s) => s.status === 'submitted');

  // Stats calculation
  const totalSubmitted = submittedList.length;
  const scores = submittedList.map((s) => (s.score / (s.maxScore || 1)) * 10);
  const avgScore = totalSubmitted > 0 ? (scores.reduce((a, b) => a + b, 0) / totalSubmitted).toFixed(1) : '0.0';
  const maxScore = totalSubmitted > 0 ? Math.max(...scores).toFixed(1) : '0.0';
  const minScore = totalSubmitted > 0 ? Math.min(...scores).toFixed(1) : '0.0';

  const buckets = [
    { label: '< 5.0 (Yếu/Kém)', count: scores.filter((s) => s < 5.0).length, color: 'bg-rose-500' },
    { label: '5.0 - 6.5 (Trung bình)', count: scores.filter((s) => s >= 5.0 && s < 6.5).length, color: 'bg-amber-500' },
    { label: '6.5 - 8.0 (Khá)', count: scores.filter((s) => s >= 6.5 && s < 8.0).length, color: 'bg-sky-500' },
    { label: '8.0 - 10.0 (Giỏi/Xuất sắc)', count: scores.filter((s) => s >= 8.0).length, color: 'bg-emerald-500' },
  ];

  const handleExportExcel = () => {
    if (!exam) return;
    exportExamResultsToExcel(exam, sessionSubs);
  };

  const handleBulkRegrade = () => {
    if (!exam) return;
    if (!window.confirm(`Bạn có muốn chấm lại TẤT CẢ bài thi của ca "${session.title}" theo đáp án đề thi hiện tại không?\nĐiểm số của các bài thi sẽ được tính toán lại ngay lập tức.`)) {
      return;
    }
    const count = regradeSubmissions(exam.id, session.id);
    setRegradingStatus(`Đã tự động chấm lại và cập nhật điểm cho ${count} bài thi!`);
    setTimeout(() => setRegradingStatus(null), 3500);
  };

  const handleSaveManualGrading = (updatedSub: ExamSubmission) => {
    saveSubmission(updatedSub);
    if (selectedSub && selectedSub.id === updatedSub.id) {
      setSelectedSub(updatedSub);
    }
  };

  const filteredSubs = sessionSubs.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
      (s.mshs && s.mshs.toLowerCase().includes(search.toLowerCase())) ||
      (s.className && s.className.toLowerCase().includes(search.toLowerCase()))
  );

  if (manualGradingSub && exam) {
    return (
      <ManualGradingModal
        submission={manualGradingSub}
        exam={exam}
        session={session}
        onClose={() => setManualGradingSub(null)}
        onSave={handleSaveManualGrading}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                {session.code}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Báo cáo & Bảng điểm: {session.title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Đề thi: {session.examTitle} · Đã nộp: {totalSubmitted} / {sessionSubs.length} thí sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={handleBulkRegrade}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 shadow-xs transition-all hover:scale-[1.01]"
            title="Chấm lại tất cả bài thi theo đáp án chuẩn hiện tại"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chấm Lại Toàn Bộ Bài</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Bảng Điểm Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {regradingStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{regradingStatus}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Đã Nộp Bài</span>
          <div className="text-3xl font-extrabold text-indigo-700 mt-1">{totalSubmitted}</div>
          <p className="text-xs text-slate-400 mt-1">trên {sessionSubs.length} lượt tham gia</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Điểm Trung Bình</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">
            {avgScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Chất lượng ca thi</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Điểm Cao Nhất</span>
          <div className="text-3xl font-extrabold text-sky-600 mt-1">{maxScore}</div>
          <p className="text-xs text-slate-400 mt-1">Thủ khoa ca thi</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase">Điểm Thấp Nhất</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{minScore}</div>
          <p className="text-xs text-slate-400 mt-1">Cần hỗ trợ</p>
        </div>
      </div>

      {/* Phổ điểm */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-bold text-slate-900">Phổ điểm bài thi</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {buckets.map((b, idx) => {
            const pct = totalSubmitted > 0 ? Math.round((b.count / totalSubmitted) * 100) : 0;
            return (
              <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{b.label}</span>
                  <span className="font-extrabold text-slate-900">{b.count} bài ({pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${b.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submissions Table & Inline Test Paper Inspector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">Chi tiết kết quả từng thí sinh</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Tên, SBD, MSHS, Lớp..."
              className="w-full pl-9 pr-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-4">Mã dự thi (SBD)</th>
                <th className="py-3 px-4">MSHS</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4">Điểm số (Thang 10)</th>
                <th className="py-3 px-4">Thời gian làm</th>
                <th className="py-3 px-4">Vi phạm</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
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
                      <span className="font-extrabold text-sm text-brand-600">{scaled}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{Math.round(sub.durationSecondsUsed / 60)} phút</td>
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
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                        >
                          Xem bài làm
                        </button>
                        <button
                          onClick={() => setManualGradingSub(sub)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chấm thủ công / Sửa điểm</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                Điểm: {(selectedSub.score / (selectedSub.maxScore || 1)) * 10} / 10 · Vi phạm: {selectedSub.violations?.length || 0} lần
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setManualGradingSub(selectedSub)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chấm Điểm Thủ Công Từng Câu</span>
              </button>
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {exam?.questions.map((q, idx) => {
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
