import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  Filter,
  Crown,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Ban,
  Edit2,
  Trash2,
  Download,
  School,
  Mail,
  Phone,
  BookOpen,
  ArrowRight,
  LogIn,
  X,
  Save,
  Cloud,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TeacherUser } from '../../types';
import * as XLSX from 'xlsx';

const SUBJECTS_LIST = [
  'Toán học',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lí',
  'Tin học',
  'Công nghệ',
];

export const AdminTeachersView: React.FC = () => {
  const { allTeachers, saveTeacher, deleteTeacher, syncAllTeachersToFirebase, user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang <strong>Quản lý Danh sách Giáo viên & Cấp quyền</strong> chỉ dành riêng cho Quản trị viên (Admin). Tài khoản Giáo viên không có quyền truy cập.
        </p>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState<'all' | 'standard' | 'pro' | 'vip'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State for Adding / Editing Teacher
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TeacherUser>>({
    name: '',
    email: '',
    subject: 'Toán học',
    plan: 'vip',
    role: 'teacher',
    status: 'active',
    phone: '',
    school: '',
  });

  // Deduplicate all teachers by email to ensure zero duplicates
  const uniqueTeachers = React.useMemo(() => {
    const map = new Map<string, TeacherUser>();
    allTeachers.forEach((t) => {
      const email = (t.email || '').trim().toLowerCase();
      if (email) {
        if (!map.has(email)) {
          map.set(email, t);
        } else {
          // If duplicate exists, prefer the one with Firebase Auth UID
          const current = map.get(email)!;
          if (current.id.startsWith('teacher-') && !t.id.startsWith('teacher-')) {
            map.set(email, t);
          }
        }
      }
    });
    return Array.from(map.values());
  }, [allTeachers]);

  // Calculate Statistics
  const totalTeachers = uniqueTeachers.filter((t) => t.role === 'teacher').length;
  const vipTeachers = uniqueTeachers.filter((t) => t.plan === 'vip').length;
  const proTeachers = uniqueTeachers.filter((t) => t.plan === 'pro').length;
  const standardTeachers = uniqueTeachers.filter((t) => t.plan === 'standard').length;
  const pendingTeachers = uniqueTeachers.filter((t) => t.status === 'pending').length;

  // Filtered List
  const filteredTeachers = uniqueTeachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.school && t.school.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchSubject = selectedSubject === 'all' || t.subject === selectedSubject;
    const matchPlan = selectedPlan === 'all' || t.plan === selectedPlan;
    const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;

    return matchSearch && matchSubject && matchPlan && matchStatus;
  });

  const handleOpenCreateForm = () => {
    setEditingTeacherId(null);
    setFormData({
      name: '',
      email: '',
      subject: 'Toán học',
      plan: 'pro',
      role: 'teacher',
      status: 'active',
      phone: '',
      school: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (t: TeacherUser) => {
    setEditingTeacherId(t.id);
    setFormData({ ...t });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim()) {
      alert('Vui lòng nhập đầy đủ Họ tên và Email của giáo viên!');
      return;
    }

    const emailLower = formData.email.trim().toLowerCase();
    const existingTeacher = uniqueTeachers.find((t) => t.email.trim().toLowerCase() === emailLower);
    const targetId = editingTeacherId || (existingTeacher ? existingTeacher.id : 'teacher-' + Date.now());

    const teacherToSave: TeacherUser = {
      id: targetId,
      name: formData.name.trim(),
      email: emailLower,
      subject: formData.subject || 'Toán học',
      plan: formData.plan || 'standard',
      role: emailLower.includes('admin') ? 'admin' : 'teacher',
      status: formData.status || 'active',
      phone: formData.phone?.trim() || '',
      school: formData.school?.trim() || '',
      avatar:
        formData.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          formData.name || 'teacher'
        )}`,
      createdAt: formData.createdAt || new Date().toISOString().split('T')[0],
    };

    const res = await saveTeacher(teacherToSave);
    setIsFormOpen(false);
    if (res && !res.success) {
      alert(`Đã lưu dữ liệu! Cảnh báo Firebase: ${res.error}`);
    } else {
      alert(editingTeacherId ? 'Đã cập nhật và đồng bộ giáo viên lên Firebase thành công!' : 'Đã thêm giáo viên mới và đồng bộ lên Firebase thành công!');
    }
  };

  const handleSyncAllToFirebase = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAllTeachersToFirebase();
      if (res.success) {
        alert(`Đã đồng bộ thành công ${res.count} giáo viên lên Firebase Firestore & Realtime DB!`);
      } else {
        alert(`Lỗi đồng bộ Firebase: ${res.error}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickUpgrade = async (teacher: TeacherUser, plan: 'standard' | 'pro' | 'vip') => {
    await saveTeacher({ ...teacher, plan });
  };

  const handleQuickToggleStatus = async (teacher: TeacherUser) => {
    const nextStatus = teacher.status === 'active' ? 'suspended' : 'active';
    await saveTeacher({ ...teacher, status: nextStatus });
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa giáo viên "${name}" khỏi hệ thống?`)) {
      await deleteTeacher(id);
    }
  };

  const handleExportExcel = () => {
    const data = filteredTeachers.map((t, idx) => ({
      STT: idx + 1,
      'Họ và Tên': t.name,
      Email: t.email,
      'Số điện thoại': t.phone || '',
      'Môn giảng dạy': t.subject,
      'Trường / Đơn vị': t.school || '',
      'Gói tài khoản': t.plan.toUpperCase(),
      'Vai trò': t.role === 'admin' ? 'Quản trị viên' : 'Giáo viên',
      'Trạng thái': t.status === 'active' ? 'Hoạt động' : t.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa',
      'Ngày tham gia': t.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachGiaoVien');
    XLSX.writeFile(wb, `Danh_Sach_Giao_Vien_FEXAM_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner (Vibrant Brand Blue & White) */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>FEXAM Super Admin Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Quản Lý Giáo Viên & Phân Quyền Hệ Thống
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Phân quyền tài khoản độc lập, quản lý email được cấp phép, phân bổ các gói VIP / PRO / Standard và kiểm soát trạng thái truy cập của toàn bộ giáo viên trong trường.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={handleSyncAllToFirebase}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs backdrop-blur-md transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Lên Firebase'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/10 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenCreateForm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-brand-700 hover:bg-slate-100 font-extrabold text-xs shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-brand-600" />
            <span>Thêm Giáo Viên Mới</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Giáo Viên</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalTeachers}</p>
          </div>
        </div>

        {/* VIP */}
        <div className="bg-white p-5 rounded-3xl border border-amber-100/80 shadow-card flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Tài khoản VIP</p>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{vipTeachers}</p>
          </div>
        </div>

        {/* PRO */}
        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/60">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Tài khoản PRO</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{proTeachers}</p>
          </div>
        </div>

        {/* Standard / Pending */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Standard / Cơ bản</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{standardTeachers}</p>
          </div>
        </div>
      </div>

      {/* Inline Create/Edit Form */}
      {isFormOpen && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-brand-200 shadow-card space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                {editingTeacherId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTeacherId ? 'Chỉnh sửa Thông tin Giáo viên' : 'Thêm Giáo Viên Được Phép Sử Dụng'}
                </h2>
                <p className="text-xs text-slate-400">
                  Tài khoản giáo viên sẽ có kho đề thi, lớp học và ca thi riêng biệt hoàn toàn
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Họ và Tên Giáo Viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thầy Trần Ngọc Minh Thông"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Đăng Nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="giaovien@truong.edu.vn"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Môn Giảng Dạy <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subject || 'Toán học'}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-medium bg-white"
                >
                  {SUBJECTS_LIST.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Trường Học / Đơn Vị
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: THPT Chuyên Hà Nội - Amsterdam"
                  value={formData.school || ''}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Số Điện Thoại / Zalo
                </label>
                <input
                  type="text"
                  placeholder="0912 345 678"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phân Loại Gói Tài Khoản
                </label>
                <select
                  value={formData.plan || 'standard'}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-bold bg-white text-slate-800"
                >
                  <option value="vip">VIP — Không giới hạn & Ưu tiên Realtime</option>
                  <option value="pro">PRO — Đầy đủ tính năng tạo đề & Giám sát</option>
                  <option value="standard">Standard — Gói tiêu chuẩn cơ bản</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Trạng Thái Truy Cập
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-bold bg-white"
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="pending">Đang chờ duyệt (Pending)</option>
                  <option value="suspended">Tạm khóa truy cập (Suspended)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{editingTeacherId ? 'Cập Nhật Giáo Viên' : 'Thêm Vào Danh Sách'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, trường..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Subject */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Tất cả môn học</option>
            {SUBJECTS_LIST.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>

          {/* Plan */}
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as any)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Tất cả gói tài khoản</option>
            <option value="vip">Gói VIP</option>
            <option value="pro">Gói PRO</option>
            <option value="standard">Gói Standard</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động (Active)</option>
            <option value="pending">Chờ duyệt (Pending)</option>
            <option value="suspended">Tạm khóa (Suspended)</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Giáo viên</th>
                <th className="py-3.5 px-4">Môn giảng dạy</th>
                <th className="py-3.5 px-4">Trường / Đơn vị</th>
                <th className="py-3.5 px-4">Gói tài khoản</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-6 text-right">Tác vụ Quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTeachers.map((teacher) => {
                const isCurrentLogged = user?.id === teacher.id;

                return (
                  <tr
                    key={teacher.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      isCurrentLogged ? 'bg-brand-50/30' : ''
                    }`}
                  >
                    {/* Teacher Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            teacher.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              teacher.name
                            )}`
                          }
                          alt={teacher.name}
                          className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {teacher.name}
                            </span>
                            {teacher.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                                Super Admin
                              </span>
                            )}
                            {isCurrentLogged && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                                Đang Đăng Nhập
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {teacher.email}
                            </span>
                            {teacher.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {teacher.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-4 px-4 font-bold text-slate-800">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
                        {teacher.subject || 'Toán học'}
                      </span>
                    </td>

                    {/* School */}
                    <td className="py-4 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{teacher.school || 'Chưa cập nhật'}</span>
                      </div>
                    </td>

                    {/* Plan Badge */}
                    <td className="py-4 px-4">
                      {teacher.plan === 'vip' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-black text-[11px] shadow-xs">
                          <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>VIP UNLIMITED</span>
                        </div>
                      )}
                      {teacher.plan === 'pro' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 font-bold text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>PRO PLAN</span>
                        </div>
                      )}
                      {teacher.plan === 'standard' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[11px]">
                          <Zap className="w-3.5 h-3.5 text-slate-500" />
                          <span>STANDARD</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {teacher.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hoạt động
                        </span>
                      )}
                      {teacher.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          Chờ duyệt
                        </span>
                      )}
                      {teacher.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                          <Ban className="w-3.5 h-3.5" />
                          Đã khóa
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">

                        {/* Quick Upgrade Menu */}
                        <button
                          onClick={() =>
                            handleQuickUpgrade(
                              teacher,
                              teacher.plan === 'vip' ? 'pro' : teacher.plan === 'pro' ? 'standard' : 'vip'
                            )
                          }
                          title="Chuyển đổi nhanh gói VIP / PRO"
                          className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Crown className="w-4 h-4" />
                        </button>

                        {/* Toggle Status */}
                        <button
                          onClick={() => handleQuickToggleStatus(teacher)}
                          title={teacher.status === 'active' ? 'Khóa tài khoản' : 'Kích hoạt lại'}
                          className={`p-2 rounded-xl transition-colors ${
                            teacher.status === 'active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {teacher.status === 'active' ? (
                            <Ban className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditForm(teacher)}
                          title="Chỉnh sửa chi tiết"
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        {teacher.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                            title="Xóa giáo viên"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy giáo viên nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
