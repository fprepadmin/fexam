import React, { useState } from 'react';
import {
  Plus,
  FileText,
  Clock,
  Share2,
  Trash2,
  Edit3,
  CalendarCheck,
  Check,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { Exam } from '../../types';

interface ExamsViewProps {
  onCreateNew: () => void;
  onEditExam: (exam: Exam) => void;
  onCreateSessionForExam: (exam: Exam) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  onCreateNew,
  onEditExam,
  onCreateSessionForExam,
}) => {
  const { user } = useAuth();
  const { exams, deleteExam } = useExam();
  const [filterSubject, setFilterSubject] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Isolate to current teacher's exams only
  const myExams = user?.role === 'admin'
    ? exams
    : exams.filter((ex) => !ex.authorId || ex.authorId === user?.id || (user?.email && ex.authorEmail === user.email));

  const filteredExams = myExams.filter((ex) => {
    if (filterSubject === 'all') return true;
    return ex.subject === filterSubject;
  });

  const handleCopyCode = (exam: Exam) => {
    navigator.clipboard.writeText(exam.code);
    setCopiedId(exam.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (exam: Exam) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa đề thi "${exam.title}"?`)) {
      deleteExam(exam.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kho Đề thi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Soạn đề từ Word/JSON, xuất bản và phân phối vào các ca thi
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md shadow-brand-500/20 hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Đề Thi Mới</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'Toán học', 'Vật lí', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'Tiếng Anh', 'Tin học', 'Công nghệ'].map((sub) => (
          <button
            key={sub}
            onClick={() => setFilterSubject(sub)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              filterSubject === sub
                ? 'bg-brand-50 text-brand-700 border border-brand-200/80 shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
            }`}
          >
            {sub === 'all' ? 'Tất cả môn' : sub}
          </button>
        ))}
      </div>

      {/* Grid of Exams */}
      {filteredExams.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-bold text-slate-700">Chưa có đề thi nào trong danh mục này</p>
          <p className="text-xs text-slate-400">Bấm nút "Tạo Đề Thi Mới" để bắt đầu quy trình tạo đề 3 bước</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Top tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {exam.code}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {exam.subject || 'Tổng hợp'}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Khối {exam.grade || '12'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyCode(exam)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Sao chép mã đề"
                    >
                      {copiedId === exam.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(exam)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Xóa đề thi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {exam.description || 'Không có mô tả chi tiết'}
                  </p>
                </div>

                {/* Badges / Specs */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl font-semibold">
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span>{exam.questions.length} câu hỏi</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{exam.settings.durationMinutes} phút</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl font-semibold">
                    <span>Lượt thi: {exam.settings.maxAttempts ? (exam.settings.maxAttempts === 999 ? 'Không giới hạn' : `${exam.settings.maxAttempts} lượt`) : '1 lượt'}</span>
                  </span>
                </div>

                {/* Open / Close Schedule Info */}
                {(exam.settings.openTime || exam.settings.closeTime) && (
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {exam.settings.openTime && `Mở: ${new Date(exam.settings.openTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`}
                      {exam.settings.openTime && exam.settings.closeTime && ' • '}
                      {exam.settings.closeTime && `Đóng: ${new Date(exam.settings.closeTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onCreateSessionForExam(exam)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-brand-500/20 transition-all"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Tạo Ca Thi Ngay</span>
                </button>

                <button
                  onClick={() => onEditExam(exam)}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa đề</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
