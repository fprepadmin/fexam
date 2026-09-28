import React, { useState } from 'react';
import {
  ArrowLeft,
  Users,
  Upload,
  Download,
  Search,
  UserPlus,
  Trash2,
  Calendar,
  Lock,
  Unlock,
  KeyRound,
  FileSpreadsheet,
  Mail,
  Hash,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, Student } from '../../types';
import { parseStudentExcel, exportStudentsToExcel } from '../../lib/excel-helper';

interface ClassDetailViewProps {
  classroom: ClassRoom;
  onBack: () => void;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
  classroom,
  onBack,
}) => {
  const { user } = useAuth();
  const { students, saveStudents, deleteStudent } = useExam();

  const [search, setSearch] = useState('');
  const [newMshs, setNewMshs] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const classStudents = students.filter(
    (s) =>
      s.classId === classroom.id &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.mshs && s.mshs.toLowerCase().includes(search.toLowerCase())) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(search.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase())))
  );

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const mshsCode = newMshs.trim().toUpperCase() || `HS${Math.floor(1000 + Math.random() * 9000)}`;
    const newStudent: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      mshs: mshsCode,
      name: newName.trim(),
      className: classroom.name,
      classId: classroom.id,
      email: newEmail.trim() || undefined,
      teacherId: user?.id || classroom.teacherId,
      teacherEmail: user?.email || classroom.teacherEmail,
      studentCode: mshsCode,
      createdAt: new Date().toISOString(),
    };

    saveStudents([newStudent]);
    setNewMshs('');
    setNewName('');
    setNewEmail('');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      const parsed = await parseStudentExcel(e.target.files[0], classroom.id, classroom.name);
      if (parsed.length > 0) {
        const withTeacher = parsed.map((s) => ({
          ...s,
          teacherId: user?.id || classroom.teacherId,
          teacherEmail: user?.email || classroom.teacherEmail,
        }));
        saveStudents(withTeacher);
        alert(`Đã nhập thành công ${parsed.length} học sinh vào lớp ${classroom.name}!`);
      } else {
        alert('Không tìm thấy dữ liệu học sinh trong file!');
      }
    } catch (err: any) {
      alert('Lỗi đọc file Excel: ' + err?.message);
    }
  };

  const handleExcelExport = () => {
    const rawStudents = students.filter((s) => s.classId === classroom.id);
    exportStudentsToExcel(rawStudents, classroom);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
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
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-brand-600 text-white">
                {classroom.code}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Danh sách học sinh — {classroom.name}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Khối {classroom.grade} · Niên khóa {classroom.schoolYear} · Sĩ số: {classStudents.length} học sinh
            </p>
          </div>
        </div>

        {/* Excel Actions */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer shadow-xs transition-colors">
            <Upload className="w-4 h-4 text-brand-600" />
            <span>Nhập Excel (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleExcelImport}
            />
          </label>

          <button
            onClick={handleExcelExport}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form (MSHS, Họ tên, Lớp, Email) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-600" />
          <span>Thêm Học Sinh Mới Vào Lớp {classroom.name}</span>
        </h3>

        <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* MSHS */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              MSHS (Mã số học sinh)
            </label>
            <input
              type="text"
              placeholder="VD: HS001 (Tự sinh nếu trống)"
              value={newMshs}
              onChange={(e) => setNewMshs(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Họ và tên */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Họ và tên học sinh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn An"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Email */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Email học sinh
            </label>
            <input
              type="email"
              placeholder="VD: an.nguyen@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Button */}
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 h-[38px]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </div>
        </form>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Danh sách Học sinh ({classStudents.length} em)
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo MSHS, tên, email..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {classStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Chưa có học sinh nào trong lớp {classroom.name}</p>
            <p className="text-xs text-slate-400">Nhập thủ công hoặc tải file Excel để thêm nhanh</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">MSHS</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {classStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-extrabold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-lg">
                        {st.mshs || st.studentCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{st.name}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">{st.className || classroom.name}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{st.email || '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => deleteStudent(st.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa học sinh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
