import React, { useState } from 'react';
import {
  Menu,
  GraduationCap,
  ArrowRightLeft,
  Crown,
  Sparkles,
  Zap,
  ShieldCheck,
  LogOut,
  UserCheck,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenStudentView?: () => void;
  onOpenSettings: () => void;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSettings,
  onOpenLoginModal,
}) => {
  const { user, logout } = useAuth();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Sidebar toggle button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Thu gọn / Mở rộng Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Teacher Subject & School badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-800">{user?.name}</span>
          <span className="text-slate-300">•</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
            {user?.role === 'admin' ? 'Quản trị hệ thống' : `Môn ${user?.subject || 'Toán học'}`}
          </span>
          {user?.school && (
            <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
              ({user.school})
            </span>
          )}
        </div>
      </div>

      {/* Right: Role indicator, Plan badge, User profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">

        {/* Plan Badge */}
        {user?.plan === 'vip' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black">
            <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>VIP</span>
          </div>
        )}
        {user?.plan === 'pro' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>PRO</span>
          </div>
        )}
        {user?.plan === 'standard' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-slate-500" />
            <span>Standard</span>
          </div>
        )}

        {/* Role Pill Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/80 text-xs font-semibold">
          {user?.role === 'admin' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
              <span className="font-bold text-slate-800">Admin</span>
            </>
          ) : (
            <>
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Giáo viên</span>
            </>
          )}
        </div>

        {/* User Profile / Account Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <img
              src={
                user?.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                  user?.name || 'GV'
                )}`
              }
              alt={user?.name}
              className="w-8 h-8 rounded-xl object-cover ring-2 ring-brand-100 shrink-0"
            />
            <span className="text-xs font-bold text-slate-700 hidden md:inline max-w-[120px] truncate">
              {user?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showAccountDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-xl border border-slate-100 p-3 space-y-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-xs font-extrabold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px]">
                    {user?.role === 'admin' ? 'Super Admin' : `Môn ${user?.subject}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                    Gói {user?.plan.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setShowAccountDropdown(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cài đặt hệ thống & Firebase</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowAccountDropdown(false);
                    logout();
                    onOpenLoginModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
