import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Search,
  MessageSquare,
  PlusCircle,
  StopCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
  Send,
  X,
  Volume2,
  Filter,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { Exam, ExamSubmission, ViolationRecord } from '../../types';

interface LiveProctoringProps {
  selectedExamId?: string;
  onSelectExam?: (examId: string) => void;
}

export const LiveProctoring: React.FC<LiveProctoringProps> = ({
  selectedExamId,
  onSelectExam,
}) => {
  const {
    exams,
    submissions,
    addBonusMinutes,
    sendTeacherMessage,
    forceSubmitStudent,
  } = useExam();

  // Active exam selection
  const currentExamId = selectedExamId || exams[0]?.id || '';
  const currentExam = exams.find((e) => e.id === currentExamId) || exams[0];

  // Filters & State
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'submitted' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal for sending message / managing student
  const [selectedStudentSub, setSelectedStudentSub] = useState<ExamSubmission | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  // Submissions for this exam (deduplicated per student, prioritizing 'submitted' status)
  const rawExamSubs = submissions.filter((s) => s.examId === currentExamId);
  const examSubStudentMap = new Map<string, ExamSubmission>();
  const sortedRawExamSubs = [...rawExamSubs].sort((a, b) => {
    if (a.status === 'submitted' && b.status !== 'submitted') return -1;
    if (b.status === 'submitted' && a.status !== 'submitted') return 1;
    const timeA = new Date(a.submitTime || a.lastActiveTime || a.startTime || 0).getTime();
    const timeB = new Date(b.submitTime || b.lastActiveTime || b.startTime || 0).getTime();
    return timeB - timeA;
  });

  sortedRawExamSubs.forEach((sub) => {
    const key = (sub.studentCode || sub.mshs || sub.id).trim().toUpperCase();
    if (!examSubStudentMap.has(key)) {
      examSubStudentMap.set(key, sub);
    }
  });

  const examSubmissions = Array.from(examSubStudentMap.values());

  const inProgressList = examSubmissions.filter((s) => s.status === 'in_progress');
  const submittedList = examSubmissions.filter((s) => s.status === 'submitted');
  const flaggedList = examSubmissions.filter(
    (s) => s.isFlagged || (s.violations && s.violations.length > 0)
  );

  // Filtered
  const displayList = examSubmissions.filter((sub) => {
    if (filterStatus === 'in_progress' && sub.status !== 'in_progress') return false;
    if (filterStatus === 'submitted' && sub.status !== 'submitted') return false;
    if (filterStatus === 'flagged' && (!sub.violations || sub.violations.length === 0)) return false;

    if (
      searchQuery &&
      !sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !sub.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Aggregated violations log stream
  const allViolations: { student: ExamSubmission; violation: ViolationRecord }[] = [];
  examSubmissions.forEach((sub) => {
    (sub.violations || []).forEach((v) => {
      allViolations.push({ student: sub, violation: v });
    });
  });
  allViolations.sort(
    (a, b) => new Date(b.violation.timestamp).getTime() - new Date(a.violation.timestamp).getTime()
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentSub || !customMessage.trim()) return;
    sendTeacherMessage(selectedStudentSub.id, customMessage.trim());
    alert(`Đã gửi thông báo nhắc nhở đến ${selectedStudentSub.studentName}!`);
    setCustomMessage('');
    setSelectedStudentSub(null);
  };

  const handleAddBonus = (sub: ExamSubmission, minutes: number) => {
    addBonusMinutes(sub.id, minutes);
    alert(`Đã cộng thêm +${minutes} phút làm bài cho học sinh ${sub.studentName}!`);
  };

  const handleForceSubmit = (sub: ExamSubmission) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn thu bài cưỡng chế học sinh "${sub.studentName}" ngay lập tức?`
      )
    ) {
      forceSubmitStudent(sub.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Exam Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Giám sát phòng thi Trực tiếp (Live Proctoring)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tiến độ, phát hiện gian lận và can thiệp thời gian thực tối ưu băng thông
          </p>
        </div>

        {/* Select Exam Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Đề thi:
          </label>
          <select
            value={currentExamId}
            onChange={(e) => onSelectExam && onSelectExam(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} — {ex.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Stats Cards for this Exam */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-brand-50 border-brand-300 shadow-xs'
              : 'bg-white border-slate-100 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Tổng thí sinh</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-extrabold text-brand-700 mt-2">
            {examSubmissions.length}
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setFilterStatus('in_progress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'in_progress'
              ? 'bg-sky-50 border-sky-300 shadow-xs'
              : 'bg-white border-slate-100 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Đang làm bài</span>
            <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-sky-600 mt-2">
            {inProgressList.length}
          </div>
        </div>

        {/* Submitted */}
        <div
          onClick={() => setFilterStatus('submitted')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'submitted'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
              : 'bg-white border-slate-100 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Đã nộp bài</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {submittedList.length}
          </div>
        </div>

        {/* Flagged / Violations */}
        <div
          onClick={() => setFilterStatus('flagged')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'flagged'
              ? 'bg-rose-50 border-rose-300 shadow-xs'
              : 'bg-white border-slate-100 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Có cảnh báo</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            {flaggedList.length}
          </div>
        </div>
      </div>

      {/* Main Content: 8 cols Student Grid + 4 cols Violations Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Student Live Status Cards */}
        <div className="lg:col-span-8 space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thí sinh theo tên hoặc mã..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  viewMode === 'grid'
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dạng Thẻ
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  viewMode === 'table'
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dạng Bảng
              </button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayList.map((sub) => {
                const totalQ = currentExam?.questions.length || sub.totalQuestions || 5;
                const answered = sub.answeredCount || 0;
                const progressPercent = Math.round((answered / totalQ) * 100);
                const hasViolations = sub.violations && sub.violations.length > 0;

                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-card flex flex-col justify-between ${
                      hasViolations
                        ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                        : 'border-slate-100 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {sub.studentCode}
                        </span>

                        {sub.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span>
                            Đang làm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã nộp ({sub.score}đ)
                          </span>
                        )}
                      </div>

                      {/* Name & Class */}
                      <div className="mt-3">
                        <h4 className="text-sm font-bold text-slate-900">{sub.studentName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {sub.className || 'Tự do'} · Bắt đầu lúc{' '}
                          {new Date(sub.startTime).toLocaleTimeString('vi-VN')}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">
                            Tiến độ: {answered}/{totalQ} câu
                          </span>
                          <span className="font-bold text-brand-600">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-brand-600 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Violations Badge */}
                      {hasViolations && (
                        <div className="mt-3 p-2 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="text-xs font-bold text-rose-700">
                            Vi phạm: {sub.violations.length} lần ({sub.violations[0].message})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Teacher Action Controls */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => setSelectedStudentSub(sub)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-brand-600 text-[11px] font-bold border border-slate-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Nhắc nhở</span>
                      </button>

                      {sub.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleAddBonus(sub, 5)}
                            className="py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold border border-amber-200 transition-colors flex items-center gap-1"
                            title="Cộng 5 phút làm bài"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>+5p</span>
                          </button>

                          <button
                            onClick={() => handleForceSubmit(sub)}
                            className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition-colors flex items-center gap-1"
                            title="Thu bài cưỡng chế ngay lập tức"
                          >
                            <StopCircle className="w-3 h-3" />
                            <span>Thu bài</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Mã</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Lớp</th>
                    <th className="py-3 px-4">Tiến độ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Vi phạm</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {sub.studentCode}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{sub.studentName}</td>
                      <td className="py-3 px-4 text-slate-500">{sub.className || 'Tự do'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-brand-600">
                          {sub.answeredCount}/{sub.totalQuestions || 5}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {sub.status === 'in_progress' ? (
                          <span className="text-sky-600 font-bold">Đang làm</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Đã nộp</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {sub.violations && sub.violations.length > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {sub.violations.length} lần
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedStudentSub(sub)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                        >
                          Nhắc
                        </button>
                        {sub.status === 'in_progress' && (
                          <button
                            onClick={() => handleForceSubmit(sub)}
                            className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold"
                          >
                            Thu bài
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4 cols: Realtime Violation Log Stream */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Nhật ký Vi phạm Trực tiếp
              </h3>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              {allViolations.length} sự kiện
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {allViolations.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Phòng thi an toàn tuyệt đối</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Chưa phát hiện hành vi khả nghi</p>
              </div>
            ) : (
              allViolations.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {item.student.studentName} ({item.student.studentCode})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.violation.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{item.violation.message}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Send Warning Alert to Student */}
      {selectedStudentSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Gửi nhắc nhở — {selectedStudentSub.studentName}
              </h3>
              <button
                onClick={() => setSelectedStudentSub(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung nhắc nhở hiển thị trên màn hình học sinh:
                </label>
                <textarea
                  rows={3}
                  required
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Ví dụ: Thầy nhắc em tập trung làm bài, không được rời màn hình thi..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() =>
                    setCustomMessage('Thầy nhắc em không chuyển tab làm bài!')
                  }
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200"
                >
                  Không chuyển tab
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomMessage('Em còn 10 phút, kiểm tra lại toàn bộ đáp án nhé!')
                  }
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200"
                >
                  Nhắc thời gian
                </button>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStudentSub(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi cảnh báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
