import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CalendarCheck,
  Users,
  HelpCircle,
  PhoneCall,
  Settings,
  Flame,
  ShieldCheck,
  Crown,
  Sparkles,
  Zap,
  ArrowRightLeft,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TeacherView =
  | 'overview'
  | 'exams'
  | 'exam_create'
  | 'exam_edit'
  | 'sessions'
  | 'session_create'
  | 'session_proctor'
  | 'session_analytics'
  | 'classes'
  | 'class_detail'
  | 'admin_overview'
  | 'admin_teachers'
  | 'admin_sessions'
  | 'admin_exams'
  | 'guide'
  | 'settings';

interface SidebarProps {
  currentView: TeacherView;
  onNavigate: (view: TeacherView) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
  onOpenLoginModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onCloseMobile,
  onOpenLoginModal,
}) => {
  const { user, role, logout } = useAuth();

  const adminNavItems = [
    {
      id: 'admin_overview' as TeacherView,
      label: 'Tổng quan Hệ thống',
      icon: LayoutDashboard,
    },
    {
      id: 'admin_teachers' as TeacherView,
      label: 'Quản lý Giáo viên',
      icon: Users,
      badge: 'Admin',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-black',
    },
    {
      id: 'admin_sessions' as TeacherView,
      label: 'Ca thi Toàn trường',
      icon: CalendarCheck,
      badge: 'Live',
      badgeColor: 'bg-rose-50 text-rose-600 border border-rose-100',
    },
    {
      id: 'admin_exams' as TeacherView,
      label: 'Kho Đề thi Hệ thống',
      icon: FileText,
    },
    {
      id: 'settings' as TeacherView,
      label: 'Cài đặt & Firebase',
      icon: Settings,
    },
  ];

  const teacherNavItems = [
    {
      id: 'overview' as TeacherView,
      label: 'Tổng quan',
      icon: LayoutDashboard,
    },
    {
      id: 'exams' as TeacherView,
      label: 'Đề thi của tôi',
      icon: FileText,
    },
    {
      id: 'sessions' as TeacherView,
      label: 'Ca thi & Giám sát',
      icon: CalendarCheck,
      badge: 'Live',
      badgeColor: 'bg-rose-50 text-rose-600 border border-rose-100',
    },
    {
      id: 'classes' as TeacherView,
      label: 'Lớp học & Học sinh',
      icon: Users,
    },
    {
      id: 'guide' as TeacherView,
      label: 'Hướng dẫn & Báo lỗi',
      icon: HelpCircle,
    },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : teacherNavItems;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div
          onClick={() => {
            onNavigate(user?.role === 'admin' ? 'admin_overview' : 'overview');
            if (onCloseMobile) onCloseMobile();
          }}
          className="h-16 flex items-center px-6 border-b border-slate-50 gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-100">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-800">
                <span className="text-brand-600">F</span>EXAM
              </span>
              {user?.plan === 'vip' && (
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> VIP
                </span>
              )}
              {user?.plan === 'pro' && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-200">
                  Pro
                </span>
              )}
              {user?.plan === 'standard' && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  Std
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.role === 'admin' ? 'Super Admin Center' : `GV Môn ${user?.subject || 'Toán'}`}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === 'exams' && (currentView === 'exam_create' || currentView === 'exam_edit')) ||
              (item.id === 'sessions' && (currentView === 'session_create' || currentView === 'session_proctor' || currentView === 'session_analytics')) ||
              (item.id === 'classes' && currentView === 'class_detail');

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User & Support Card */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* User Info & Logout Button */}
          <div className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    user?.name || 'GV'
                  )}`
                }
                alt={user?.name}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.name || 'Giáo viên'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                if (onOpenLoginModal) onOpenLoginModal();
              }}
              title="Đăng xuất"
              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Support Card */}
          <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-2xl p-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 shrink-0">
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] text-slate-500 leading-tight truncate">Dự án FEXAM · FPREP LMS</p>
                <a
                  href="mailto:fprep.thptqg@gmail.com"
                  className="text-xs font-bold text-indigo-700 hover:underline block truncate"
                >
                  fprep.thptqg@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Version Info */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>Phiên bản 2.0.0</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Firebase Live
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
