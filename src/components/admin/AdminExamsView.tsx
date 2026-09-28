import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Search,
  Clock,
  Trash2,
  BookOpen,
  CalendarCheck,
  User,
  Shield,
  Layers,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { Exam } from '../../types';

interface AdminExamsViewProps {
  onCreateSessionForExam?: (exam: Exam) => void;
}

export const AdminExamsView: React.FC<AdminExamsViewProps> = ({
  onCreateSessionForExam,
}) => {
  const { exams, deleteExam } = useExam();
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

  const filteredExams = exams.filter((ex) => {
    const matchSearch =
      ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.authorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = filterSubject === 'all' || ex.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const handleDelete = (exam: Exam) => {
    if (window.confirm(`[Admin] Bạn có chắc muốn xóa đề thi "${exam.title}"?`)) {
      deleteExam(exam.id);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Kho Đề Thi Toàn Hệ Thống
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase">
              Admin View
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Xem và quản lý tất cả các đề thi được tạo bởi các giáo viên trong trường
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
          <FileText className="w-4 h-4 text-brand-600" />
          <span>Tổng số: {exams.length} Đề thi</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên đề, mã đề, tên giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Tất cả môn học</option>
            <option value="Toán học">Toán học</option>
            <option value="Vật lí">Vật lí</option>
            <option value="Hóa học">Hóa học</option>
            <option value="Sinh học">Sinh học</option>
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-lg transition-all p-6 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Code & Subject */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 font-mono font-bold text-xs">
                  {exam.code}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                  {exam.subject}
                </span>
              </div>

              {/* Title & Author */}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight line-clamp-2">
                  {exam.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {exam.description || 'Không có mô tả'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-2 pt-2 border-t border-slate-100">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tác giả: <strong>{exam.authorName || 'Giáo viên'}</strong></span>
                </div>
              </div>

              {/* Specs */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-semibold">
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  <span>{exam.questions.length} câu</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{exam.settings.durationMinutes} phút</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {onCreateSessionForExam && (
                <button
                  onClick={() => onCreateSessionForExam(exam)}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Tạo Ca Thi</span>
                </button>
              )}

              <button
                onClick={() => handleDelete(exam)}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors ml-auto"
                title="Xóa đề thi này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs">Chưa có đề thi nào trong hệ thống.</p>
          </div>
        )}
      </div>
    </div>
  );
};
