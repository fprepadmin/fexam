import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeacherUser } from '../types';
import { storage, ADMIN_EMAILS } from '../services/storage';
import {
  firebaseAuth,
  loginWithGoogle as fbLoginGoogle,
  logoutFirebase,
  fetchTeacherFromFirestore,
  fetchTeacherByEmailOrUid,
  syncTeacherToFirestore,
  subscribeTeachersFirestore,
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: TeacherUser | null;
  allTeachers: TeacherUser[];
  role: 'admin' | 'teacher' | 'student';
  setRole: (role: 'admin' | 'teacher' | 'student') => void;
  updateProfile: (profile: Partial<TeacherUser>) => void;
  saveTeacher: (teacher: TeacherUser) => void;
  deleteTeacher: (id: string) => void;
  loginGoogle: () => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshTeachers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TeacherUser | null>(() => storage.getTeacher());
  const [allTeachers, setAllTeachers] = useState<TeacherUser[]>(() => storage.getAllTeachers());
  const [role, setRoleState] = useState<'admin' | 'teacher' | 'student'>(() => {
    const cur = storage.getTeacher();
    return cur?.role === 'admin' ? 'admin' : 'teacher';
  });

  const refreshTeachers = () => {
    setAllTeachers(storage.getAllTeachers());
  };

  // Local sync
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      const cur = storage.getTeacher();
      setUser(cur);
      setAllTeachers(storage.getAllTeachers());
    });
    return unsub;
  }, []);

  // Real-time Firestore Teachers listener
  useEffect(() => {
    const unsub = subscribeTeachersFirestore((teachers) => {
      storage.setAllTeachers(teachers);
      setAllTeachers(teachers);
      // If current user is logged in, sync with remote updates
      const current = storage.getTeacher();
      if (current) {
        const found = teachers.find(
          (t) => t.id === current.id || t.email.toLowerCase() === current.email.toLowerCase()
        );
        if (found) {
          if (found.status === 'suspended') {
            // If admin suspended this user remotely, log them out immediately
            logoutFirebase().catch(() => {});
            setUser(null);
            storage.setCurrentUser(null);
          } else {
            setUser(found);
            storage.setCurrentUser(found);
          }
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Sync role whenever user changes
  useEffect(() => {
    if (user) {
      setRoleState(user.role === 'admin' ? 'admin' : 'teacher');
    }
  }, [user]);

  // Firebase auth state listener with strict whitelist enforcement
  useEffect(() => {
    if (firebaseAuth) {
      const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser && fbUser.email) {
          const emailLower = fbUser.email.trim().toLowerCase();
          const isAdmin = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === emailLower);

          if (isAdmin) {
            const adminUser: TeacherUser = {
              id: fbUser.uid,
              name: fbUser.displayName || 'Admin Hệ Thống',
              email: emailLower,
              subject: 'Quản trị Hệ thống',
              plan: 'vip',
              role: 'admin',
              status: 'active',
              avatar: fbUser.photoURL || undefined,
              createdAt: new Date().toISOString().split('T')[0],
            };
            storage.setCurrentUser(adminUser);
            storage.saveTeacher(adminUser);
            setUser(adminUser);
            setRoleState('admin');
            return;
          }

          // Teacher: Check if whitelisted by Admin in Firestore
          let existing = storage.findTeacherByEmail(emailLower);
          if (!existing) {
            const remoteTeacher = await fetchTeacherByEmailOrUid(fbUser.uid, emailLower);
            if (remoteTeacher) existing = remoteTeacher;
          }

          if (!existing || existing.status !== 'active') {
            // Not whitelisted or suspended -> Reject and logout
            await logoutFirebase();
            setUser(null);
            setRoleState('teacher');
            storage.setCurrentUser(null);
            return;
          }

          // Whitelisted active teacher
          const oldId = existing.id !== fbUser.uid ? existing.id : undefined;
          const teacherUser: TeacherUser = {
            ...existing,
            id: fbUser.uid,
            name: fbUser.displayName || existing.name,
            avatar: fbUser.photoURL || existing.avatar,
            role: 'teacher',
            status: 'active',
          };
          storage.setCurrentUser(teacherUser);
          storage.saveTeacher(teacherUser, oldId);
          setUser(teacherUser);
          setRoleState('teacher');
        } else {
          setUser(null);
          setRoleState('teacher');
          storage.setCurrentUser(null);
        }
      });
      return unsub;
    }
  }, []);

  const setRole = (newRole: 'admin' | 'teacher' | 'student') => {
    setRoleState(newRole);
  };

  const saveTeacher = (teacher: TeacherUser) => {
    storage.saveTeacher(teacher);
    setAllTeachers(storage.getAllTeachers());
  };

  const deleteTeacher = (id: string) => {
    storage.deleteTeacher(id);
    setAllTeachers(storage.getAllTeachers());
  };

  const updateProfile = (profile: Partial<TeacherUser>) => {
    if (!user) return;
    const updated = { ...user, ...profile };
    setUser(updated);
    storage.updateTeacher(updated);
  };

  // Google Login handler with Whitelist check
  const loginGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const fbUser = await fbLoginGoogle();
      if (!fbUser || !fbUser.email) {
        return { success: false, message: 'Không thể xác thực thông tin tài khoản Google.' };
      }

      const emailLower = fbUser.email.trim().toLowerCase();
      const isAdmin = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === emailLower);

      if (isAdmin) {
        // Super Admin access
        const adminUser: TeacherUser = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Admin Hệ Thống',
          email: emailLower,
          subject: 'Quản trị Hệ thống',
          plan: 'vip',
          role: 'admin',
          status: 'active',
          avatar: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString().split('T')[0],
        };
        storage.setCurrentUser(adminUser);
        storage.saveTeacher(adminUser);
        setUser(adminUser);
        setRoleState('admin');
        return { success: true };
      }

      // Check teacher whitelist in Firestore
      let existing = storage.findTeacherByEmail(emailLower);
      if (!existing) {
        const remoteTeacher = await fetchTeacherByEmailOrUid(fbUser.uid, emailLower);
        if (remoteTeacher) existing = remoteTeacher;
      }

      if (!existing) {
        // Giáo viên chưa được Admin cấp quyền -> BỊ TỪ CHỐI!
        await logoutFirebase();
        setUser(null);
        setRoleState('teacher');
        storage.setCurrentUser(null);
        return {
          success: false,
          message: `Quyền truy cập bị từ chối: Email (${emailLower}) chưa được Ban Quản trị FEXAM cấp phép sử dụng. Vui lòng liên hệ hỗ trợ tại fprep.thptqg@gmail.com để được cấp tài khoản giáo viên.`,
        };
      }

      if (existing.status === 'suspended') {
        // Tài khoản bị tạm khóa -> BỊ TỪ CHỐI!
        await logoutFirebase();
        setUser(null);
        setRoleState('teacher');
        storage.setCurrentUser(null);
        return {
          success: false,
          message: `Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Ban Quản trị FEXAM để được mở khóa.`,
        };
      }

      // Teacher is approved and active!
      const oldId = existing.id !== fbUser.uid ? existing.id : undefined;
      const activeTeacher: TeacherUser = {
        ...existing,
        id: fbUser.uid,
        name: fbUser.displayName || existing.name,
        avatar: fbUser.photoURL || existing.avatar,
        role: 'teacher',
        status: 'active',
      };
      storage.setCurrentUser(activeTeacher);
      storage.saveTeacher(activeTeacher, oldId);
      setUser(activeTeacher);
      setRoleState('teacher');
      return { success: true };
    } catch (err: any) {
      console.warn('Google Auth notice:', err);
      return {
        success: false,
        message: err?.message || 'Đăng nhập Google thất bại. Vui lòng kiểm tra kết nối mạng.',
      };
    }
  };

  const logout = () => {
    logoutFirebase().catch(() => {});
    setUser(null);
    setRoleState('teacher');
    storage.setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allTeachers,
        role,
        setRole,
        updateProfile,
        saveTeacher,
        deleteTeacher,
        loginGoogle,
        logout,
        refreshTeachers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
