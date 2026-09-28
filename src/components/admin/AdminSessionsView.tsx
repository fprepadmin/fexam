import React, { useState } from 'react';
import {
  CalendarCheck,
  ShieldAlert,
  Search,
  Filter,
  Radio,
  Clock,
  Users,
  ShieldCheck,
  Eye,
  BarChart3,
  ExternalLink,
  Lock,
  Globe,
  Trash2,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { ExamSession } from '../../types';

interface AdminSessionsViewProps {
  onOpenProctor: (sessionId: string) => void;
  onOpenAnalytics: (sessionId: string) => void;
}

export const AdminSessionsView: React.FC<AdminSessionsViewProps> = ({
  onOpenProctor,
  onOpenAnalytics,
}) => {
  const { sessions, deleteSession } = useExam();
  const { allTeachers, user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang <strong>Quản lý Toàn bộ Ca thi Toàn trường</strong> chỉ dành riêng cho Quản trị viên (Admin). Tài khoản Giáo viên không có quyền truy cập.
        </p>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredSessions = sessions.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.examTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDeleteSession = (id: string, title: string) => {
    if (window.confirm(`[Admin] Bạn có chắc muốn xóa ca thi "${title}" khỏi hệ thống?`)) {
      deleteSession(id);
    }
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Chưa gán';
    const t = allTeachers.find((item) => item.id === teacherId);
    return t ? `${t.name} (${t.subject})` : 'Giáo viên';
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Giám Sát Ca Thi Toàn Trường
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase">
              Admin View
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi trực tiếp tất cả các ca thi đang diễn ra và kiểm soát mức độ chống gian lận
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>{sessions.filter((s) => s.status === 'active').length} Ca đang diễn ra</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên ca thi, mã ca, tên đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang diễn ra (Active)</option>
            <option value="upcoming">Sắp diễn ra (Upcoming)</option>
            <option value="closed">Đã kết thúc (Closed)</option>
          </select>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-lg transition-all p-6 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Status & Mode */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 font-mono font-bold text-xs">
                  {session.code}
                </span>

                {session.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    Đang thi
                  </span>
                )}
                {session.status === 'upcoming' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                    <Clock className="w-3 h-3" />
                    Sắp diễn ra
                  </span>
                )}
                {session.status === 'closed' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    Đã đóng
                  </span>
                )}
              </div>

              {/* Title & Teacher */}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight line-clamp-2">
                  {session.title}
                </h3>
                <p className="text-xs text-brand-600 font-semibold mt-1">
                  Đề: {session.examTitle}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Phụ trách: <strong>{getTeacherName(session.teacherId)}</strong>
                </p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{session.durationMinutes} phút</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>Guard {session.antiCheatLevel.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => onOpenProctor(session.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-xs transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Giám Sát Trực Tiếp</span>
              </button>

              <button
                onClick={() => onOpenAnalytics(session.id)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Xem bảng điểm"
              >
                <BarChart3 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDeleteSession(session.id, session.title)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Xóa ca thi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 space-y-2">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs">Không tìm thấy ca thi nào trong hệ thống.</p>
          </div>
        )}
      </div>
    </div>
  );
};
