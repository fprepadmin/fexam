import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Calendar,
  Users,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { ClassRoom } from '../../types';

interface ClassesViewProps {
  onSelectClass: (cls: ClassRoom) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ onSelectClass }) => {
  const { user } = useAuth();
  const { classes, students, saveClass, deleteClass } = useExam();

  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Form states
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classGrade, setClassGrade] = useState('12');
  const [classPassword, setClassPassword] = useState('');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Isolate to current teacher's classes only
  const myClasses = user?.role === 'admin'
    ? classes
    : classes.filter((c) => !c.teacherId || c.teacherId === user?.id || (user?.email && c.teacherEmail === user.email));

  const totalClasses = myClasses.length;
  const totalStudents = myClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classCode.trim()) return;

    const existing = myClasses.find((c) => c.id === editingClassId);

    const newClass: ClassRoom = {
      id: existing ? existing.id : `class-${Date.now()}`,
      name: className.trim(),
      code: classCode.trim().toUpperCase(),
      grade: classGrade,
      teacherId: user?.id || existing?.teacherId || '',
      teacherName: user?.name || existing?.teacherName || 'Giáo viên',
      teacherEmail: user?.email || existing?.teacherEmail || '',
      schoolYear: '2025-2026',
      studentCount: existing ? existing.studentCount : 0,
      hasPassword: Boolean(classPassword.trim()),
      password: classPassword.trim() || undefined,
      createdAt: existing ? existing.createdAt : new Date().toLocaleDateString('vi-VN'),
    };

    saveClass(newClass);
    setIsCreatingInline(false);
    setEditingClassId(null);
    setClassName('');
    setClassCode('');
    setClassPassword('');
  };

  const handleDeleteClass = (cls: ClassRoom) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá ${cls.name}?`)) {
      deleteClass(cls.id);
    }
  };

  const handleStartEdit = (cls: ClassRoom) => {
    setEditingClassId(cls.id);
    setClassName(cls.name);
    setClassCode(cls.code);
    setClassGrade(cls.grade);
    setClassPassword(cls.password || '');
    setIsCreatingInline(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section matching Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Lớp học
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalClasses} lớp · {totalStudents} lượt tham gia
          </p>
        </div>

        <button
          onClick={() => {
            setEditingClassId(null);
            setClassName('');
            setClassCode(`L${Math.floor(10 + Math.random() * 3)}A${Math.floor(1 + Math.random() * 4)}`);
            setClassGrade('12');
            setClassPassword('');
            setIsCreatingInline(!isCreatingInline);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md shadow-brand-500/20 hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreatingInline ? 'Đóng form' : 'Tạo lớp mới'}</span>
        </button>
      </div>

      {/* Inline Create / Edit Class Dedicated Section */}
      {isCreatingInline && (
        <div className="bg-white rounded-3xl p-6 border border-brand-200 shadow-card space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {editingClassId ? 'Chỉnh sửa Lớp học' : 'Tạo Lớp học Mới'}
            </h3>
            <button onClick={() => setIsCreatingInline(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveClass} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Tên lớp (ví dụ: Lớp 10C1)..."
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              required
              placeholder="Mã lớp (ví dụ: L10C1)..."
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-sm transition-all"
            >
              {editingClassId ? 'Lưu thay đổi' : 'Tạo lớp ngay'}
            </button>
          </form>
        </div>
      )}

      {/* Grid of Class Cards matching Image 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const classStudentsCount = students.filter((s) => s.classId === cls.id).length || cls.studentCount;
          return (
            <div
              key={cls.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Badge & Date Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold tracking-wider">
                      {cls.code}
                    </span>
                    <button
                      onClick={() => handleCopy(cls.code)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      title="Sao chép mã lớp"
                    >
                      {copiedCode === cls.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{cls.createdAt}</span>
                  </div>
                </div>

                {/* Class Title & Student Count */}
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {cls.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sĩ số {classStudentsCount} học sinh
                  </p>
                </div>

                {/* Badges: Student count & Password status */}
                <div className="flex items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl">
                    <Users className="w-3.5 h-3.5" />
                    <span>{classStudentsCount}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {cls.hasPassword ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Có MK</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Không MK</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons matching Image 2 */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectClass(cls)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-xl transition-colors"
                >
                  <span>Xem học sinh</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEdit(cls)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-xl transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Sửa</span>
                  </button>

                  <button
                    onClick={() => handleDeleteClass(cls)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xoá</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
