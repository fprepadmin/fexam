import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamProvider, useExam } from './context/ExamContext';
import { storage } from './services/storage';
import { Sidebar, TeacherView } from './components/common/Sidebar';
import { Header } from './components/common/Header';

import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';

import { Overview } from './components/teacher/Overview';
import { ExamsView } from './components/teacher/ExamsView';
import { ExamCreateWizard } from './components/teacher/ExamCreateWizard';
import { SessionsView } from './components/teacher/SessionsView';
import { SessionCreateView } from './components/teacher/SessionCreateView';
import { SessionProctorView } from './components/teacher/SessionProctorView';
import { SessionAnalyticsView } from './components/teacher/SessionAnalyticsView';
import { ClassesView } from './components/teacher/ClassesView';
import { ClassDetailView } from './components/teacher/ClassDetailView';
import { HelpFeedback } from './components/teacher/HelpFeedback';
import { SettingsView } from './components/teacher/SettingsView';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminTeachersView } from './components/admin/AdminTeachersView';
import { AdminSessionsView } from './components/admin/AdminSessionsView';
import { AdminExamsView } from './components/admin/AdminExamsView';
import { AdminSubmissionsView } from './components/admin/AdminSubmissionsView';

import { StudentEntry } from './components/student/StudentEntry';
import { StudentExamRoom } from './components/student/StudentExamRoom';
import { StudentResult } from './components/student/StudentResult';
import { Exam, ExamSession, ClassRoom, ExamSubmission } from './types';
import { pathToRoute, getPathForView, ROUTES } from './lib/router';
import { ShieldAlert } from 'lucide-react';

export type AppFlowState = 'landing' | 'login' | 'register' | 'teacher_workspace' | 'student_portal';

const ADMIN_ONLY_VIEWS: TeacherView[] = [
  'admin_overview',
  'admin_teachers',
  'admin_sessions',
  'admin_exams',
  'admin_submissions',
  'settings',
];

const TEACHER_ONLY_VIEWS: TeacherView[] = [
  'overview',
  'exams',
  'exam_create',
  'exam_edit',
  'sessions',
  'session_create',
  'session_proctor',
  'session_analytics',
  'classes',
  'class_detail',
  'guide',
];

function MainApp() {
  const { user, role, setRole } = useAuth();
  const { exams, sessions, classes } = useExam();

  // Parse initial route from browser URL
  const initialRoute = pathToRoute(window.location.pathname, window.location.search);

  // Top level application page flow
  const [appFlow, setAppFlow] = useState<AppFlowState>(() => {
    if (initialRoute.appFlow === 'student_portal') return 'student_portal';
    if (initialRoute.appFlow === 'login') return 'login';
    if (initialRoute.appFlow === 'register') return 'register';
    if (initialRoute.appFlow === 'teacher_workspace') {
      const saved = storage.getTeacher();
      return saved ? 'teacher_workspace' : 'login';
    }
    return 'landing';
  });

  // Teacher Workspace navigation
  const [currentView, setCurrentView] = useState<TeacherView>(() => {
    const saved = storage.getTeacher();
    const isSavedAdmin = saved?.role === 'admin';
    if (initialRoute.teacherView) {
      if (isSavedAdmin && TEACHER_ONLY_VIEWS.includes(initialRoute.teacherView)) {
        return 'admin_overview';
      }
      if (!isSavedAdmin && ADMIN_ONLY_VIEWS.includes(initialRoute.teacherView)) {
        return 'overview';
      }
      return initialRoute.teacherView;
    }
    return isSavedAdmin ? 'admin_overview' : 'overview';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Selected Entities for Detail/Edit/Proctor views
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return initialRoute.queryParams['id'] || '';
  });
  const [sessionCreateExamId, setSessionCreateExamId] = useState<string>(() => {
    return initialRoute.queryParams['examId'] || '';
  });
  const [sessionCreateType, setSessionCreateType] = useState<'exam' | 'practice'>('exam');
  const [editingSessionId, setEditingSessionId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);

  // Student Flow state
  const [studentFlowState, setStudentFlowState] = useState<'entry' | 'exam_room' | 'result'>(() => {
    return initialRoute.studentFlowState || 'entry';
  });
  const [activeStudentExam, setActiveStudentExam] = useState<Exam | null>(null);
  const [activeStudentSession, setActiveStudentSession] = useState<ExamSession | undefined>(undefined);
  const [studentInfo, setStudentInfo] = useState<{
    studentName: string;
    studentCode: string;
    mshs: string;
    className: string;
    email: string;
  }>({ studentName: '', studentCode: '', mshs: '', className: '', email: '' });
  const [lastSubmission, setLastSubmission] = useState<ExamSubmission | null>(null);

  // Direct URL linking (?session=CA-TOAN-12 or ?exam=TOAN12-01 or ?code=...)
  const [urlExamCode, setUrlExamCode] = useState<string>(() => {
    return initialRoute.queryParams['session'] || initialRoute.queryParams['exam'] || initialRoute.queryParams['code'] || '';
  });

  // Central Router Navigator that synchronizes URL pathname with strict RBAC
  const navigate = (
    flow: AppFlowState,
    options?: {
      teacherView?: TeacherView;
      studentFlowState?: 'entry' | 'exam_room' | 'result';
      queryParams?: Record<string, string>;
      replace?: boolean;
      editingExam?: Exam | null;
      selectedSessionId?: string;
      selectedClass?: ClassRoom | null;
    }
  ) => {
    // Auth check for teacher workspace
    if (flow === 'teacher_workspace' && !user && !storage.getTeacher()) {
      flow = 'login';
    }

    setAppFlow(flow);
    let targetTeacherView = options?.teacherView || (flow === 'teacher_workspace' ? currentView : undefined);
    const targetStudentFlow = options?.studentFlowState || (flow === 'student_portal' ? studentFlowState : undefined);

    // Strict RBAC Enforcement
    if (user?.role === 'teacher' && targetTeacherView && ADMIN_ONLY_VIEWS.includes(targetTeacherView)) {
      alert('Truy cập bị từ chối: Chức năng này chỉ dành riêng cho Quản trị viên (Admin). Bạn đã được chuyển về trang Tổng quan.');
      targetTeacherView = 'overview';
    } else if (user?.role === 'admin' && targetTeacherView && TEACHER_ONLY_VIEWS.includes(targetTeacherView)) {
      targetTeacherView = 'admin_overview';
    }

    if (targetTeacherView) setCurrentView(targetTeacherView);
    if (options?.studentFlowState) setStudentFlowState(options.studentFlowState);
    if (options?.editingExam !== undefined) setEditingExam(options.editingExam);
    if (options?.selectedSessionId !== undefined) setSelectedSessionId(options.selectedSessionId);
    if (options?.selectedClass !== undefined) setSelectedClass(options.selectedClass);

    const targetUrl = getPathForView(flow, targetTeacherView, targetStudentFlow, options?.queryParams);
    if (window.location.pathname + window.location.search !== targetUrl) {
      if (options?.replace) {
        window.history.replaceState({ flow, teacherView: targetTeacherView, studentFlowState: targetStudentFlow }, '', targetUrl);
      } else {
        window.history.pushState({ flow, teacherView: targetTeacherView, studentFlowState: targetStudentFlow }, '', targetUrl);
      }
    }
  };

  // Sync initial URL on mount if needed
  useEffect(() => {
    const currentUrl = window.location.pathname + window.location.search;
    const targetUrl = getPathForView(appFlow, currentView, studentFlowState, initialRoute.queryParams);
    if (currentUrl !== targetUrl && currentUrl === '/') {
      window.history.replaceState(null, '', targetUrl);
    }
  }, []);

  // Listen to Browser Back & Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = pathToRoute(window.location.pathname, window.location.search);
      if (route.appFlow === 'teacher_workspace' && !user && !storage.getTeacher()) {
        setAppFlow('login');
      } else {
        setAppFlow(route.appFlow);
      }
      if (route.teacherView) {
        if (user?.role === 'teacher' && ADMIN_ONLY_VIEWS.includes(route.teacherView)) {
          setCurrentView('overview');
        } else if (user?.role === 'admin' && TEACHER_ONLY_VIEWS.includes(route.teacherView)) {
          setCurrentView('admin_overview');
        } else {
          setCurrentView(route.teacherView);
        }
      }
      if (route.studentFlowState) setStudentFlowState(route.studentFlowState);

      const code = route.queryParams['session'] || route.queryParams['exam'] || route.queryParams['code'];
      if (code) {
        setUrlExamCode(code);
        setRole('student');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setRole, user?.role]);

  // Direct URL linking check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('session') || params.get('exam') || params.get('code');
    if (code) {
      setUrlExamCode(code);
      setRole('student');
      navigate('student_portal', {
        studentFlowState: 'entry',
        queryParams: { code },
        replace: true,
      });
    }
  }, [setRole]);

  // Sync default view when user role changes (Admin vs Teacher)
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin' && TEACHER_ONLY_VIEWS.includes(currentView)) {
      navigate('teacher_workspace', { teacherView: 'admin_overview', replace: true });
    } else if (user.role === 'teacher' && ADMIN_ONLY_VIEWS.includes(currentView)) {
      navigate('teacher_workspace', { teacherView: 'overview', replace: true });
    }
  }, [user?.role, currentView]);

  // Handler: Start Create Exam
  const handleStartCreateExam = () => {
    navigate('teacher_workspace', { teacherView: 'exam_create', editingExam: null });
  };

  const handleStartEditExam = (exam: Exam) => {
    navigate('teacher_workspace', {
      teacherView: 'exam_edit',
      editingExam: exam,
      queryParams: { id: exam.id },
    });
  };

  // Handler: Create Session for Exam
  const handleCreateSessionForExam = (exam: Exam) => {
    setSessionCreateExamId(exam.id);
    navigate('teacher_workspace', {
      teacherView: 'session_create',
      queryParams: { examId: exam.id },
    });
  };

  // Handler: Open Session Live Proctoring
  const handleOpenSessionProctor = (sessionId: string) => {
    navigate('teacher_workspace', {
      teacherView: 'session_proctor',
      selectedSessionId: sessionId,
      queryParams: { id: sessionId },
    });
  };

  // Handler: Open Session Analytics
  const handleOpenSessionAnalytics = (sessionId: string) => {
    navigate('teacher_workspace', {
      teacherView: 'session_analytics',
      selectedSessionId: sessionId,
      queryParams: { id: sessionId },
    });
  };

  // Handler: Open Class Detail
  const handleOpenClassDetail = (cls: ClassRoom) => {
    navigate('teacher_workspace', {
      teacherView: 'class_detail',
      selectedClass: cls,
      queryParams: { id: cls.id },
    });
  };

  // Student Flow Handlers
  const handleStudentEnterExam = (data: {
    exam: Exam;
    session?: ExamSession;
    studentName: string;
    studentCode: string;
    mshs: string;
    className: string;
    email: string;
  }) => {
    setActiveStudentExam(data.exam);
    setActiveStudentSession(data.session);
    setStudentInfo({
      studentName: data.studentName,
      studentCode: data.studentCode,
      mshs: data.mshs,
      className: data.className,
      email: data.email,
    });
    navigate('student_portal', { studentFlowState: 'exam_room' });
  };

  const handleStudentFinishExam = (submission: ExamSubmission) => {
    setLastSubmission(submission);
    navigate('student_portal', { studentFlowState: 'result' });
  };

  const handleStudentViewResult = (
    submission: ExamSubmission,
    exam: Exam,
    session?: ExamSession
  ) => {
    setActiveStudentExam(exam);
    setActiveStudentSession(session);
    setLastSubmission(submission);
    navigate('student_portal', { studentFlowState: 'result' });
  };

  // ----------------------------------------------------
  // 1. LANDING PAGE
  // ----------------------------------------------------
  if (appFlow === 'landing') {
    return (
      <LandingPage
        onGoToLogin={() => navigate('login')}
        onGoToRegister={() => navigate('register')}
        onGoToStudentExam={() => {
          setRole('student');
          navigate('student_portal', { studentFlowState: 'entry' });
        }}
      />
    );
  }

  // ----------------------------------------------------
  // 2. GOOGLE LOGIN PAGE
  // ----------------------------------------------------
  if (appFlow === 'login' || appFlow === 'register') {
    return (
      <LoginPage
        onGoToLanding={() => navigate('landing')}
        onSuccess={() => {
          const teacher = storage.getTeacher();
          if (teacher?.role === 'admin') {
            setRole('admin');
            navigate('teacher_workspace', { teacherView: 'admin_overview' });
          } else {
            setRole('teacher');
            navigate('teacher_workspace', { teacherView: 'overview' });
          }
        }}
        onOpenStudentExam={() => {
          setRole('student');
          navigate('student_portal', { studentFlowState: 'entry' });
        }}
      />
    );
  }

  // ----------------------------------------------------
  // 3. STUDENT PORTAL FLOW
  // ----------------------------------------------------
  if (appFlow === 'student_portal' || role === 'student') {
    if (studentFlowState === 'entry') {
      return (
        <StudentEntry
          initialExamCode={urlExamCode}
          onEnterExam={handleStudentEnterExam}
          onViewResult={handleStudentViewResult}
          onBackToTeacher={() => {
            setRole('teacher');
            navigate('landing');
          }}
        />
      );
    }

    if (studentFlowState === 'exam_room') {
      if (activeStudentExam) {
        return (
          <StudentExamRoom
            exam={activeStudentExam}
            session={activeStudentSession}
            studentName={studentInfo.studentName}
            studentCode={studentInfo.studentCode}
            mshs={studentInfo.mshs}
            className={studentInfo.className}
            email={studentInfo.email}
            onFinishExam={handleStudentFinishExam}
          />
        );
      }
      return (
        <StudentEntry
          initialExamCode={urlExamCode}
          onEnterExam={handleStudentEnterExam}
          onViewResult={handleStudentViewResult}
          onBackToTeacher={() => {
            setRole('teacher');
            navigate('landing');
          }}
        />
      );
    }

    if (studentFlowState === 'result') {
      if (activeStudentExam && lastSubmission) {
        return (
          <StudentResult
            exam={activeStudentExam}
            session={activeStudentSession}
            submission={lastSubmission}
            onRetakeOrExit={() => {
              navigate('landing');
            }}
          />
        );
      }
      return (
        <StudentEntry
          initialExamCode={urlExamCode}
          onEnterExam={handleStudentEnterExam}
          onViewResult={handleStudentViewResult}
          onBackToTeacher={() => {
            setRole('teacher');
            navigate('landing');
          }}
        />
      );
    }
  }

  // Find active session for proctoring or analytics
  const currentProctorSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // ----------------------------------------------------
  // 4. TEACHER / ADMIN WORKSPACE (DEDICATED FULL VIEWS)
  // ----------------------------------------------------
  if (!user && !storage.getTeacher()) {
    return (
      <LoginPage
        onGoToLanding={() => navigate('landing')}
        onSuccess={() => {
          const teacher = storage.getTeacher();
          if (teacher?.role === 'admin') {
            setRole('admin');
            navigate('teacher_workspace', { teacherView: 'admin_overview' });
          } else {
            setRole('teacher');
            navigate('teacher_workspace', { teacherView: 'overview' });
          }
        }}
        onOpenStudentExam={() => {
          setRole('student');
          navigate('student_portal', { studentFlowState: 'entry' });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => navigate('teacher_workspace', { teacherView: view })}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onOpenLoginModal={() => navigate('login')}
      />

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenStudentView={() => {
            setRole('student');
            navigate('student_portal', { studentFlowState: 'entry' });
          }}
          onOpenSettings={() => {
            if (user?.role === 'admin') {
              navigate('teacher_workspace', { teacherView: 'settings' });
            }
          }}
          onOpenLoginModal={() => navigate('login')}
        />

        {/* Dynamic Full-Page Teacher / Admin Views */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {/* ========================================== */}
          {/* TEACHER VIEWS (Chỉ dành cho Giáo viên)     */}
          {/* ========================================== */}

          {/* 1. TỔNG QUAN GIÁO VIÊN */}
          {currentView === 'overview' && user?.role !== 'admin' && (
            <Overview
              onNavigateView={(v) => navigate('teacher_workspace', { teacherView: v })}
              onOpenLiveSession={handleOpenSessionProctor}
            />
          )}

          {/* 2. ĐỀ THI GIÁO VIÊN */}
          {currentView === 'exams' && user?.role !== 'admin' && (
            <ExamsView
              onCreateNew={handleStartCreateExam}
              onEditExam={handleStartEditExam}
              onCreateSessionForExam={handleCreateSessionForExam}
            />
          )}

          {/* 2.1. TẠO / SỬA ĐỀ THI (3-STEP WIZARD) */}
          {(currentView === 'exam_create' || currentView === 'exam_edit') && user?.role !== 'admin' && (
            <ExamCreateWizard
              key={currentView === 'exam_create' ? 'create_new' : `edit_${editingExam?.id}`}
              initialExam={currentView === 'exam_create' ? null : editingExam}
              onBack={() => navigate('teacher_workspace', { teacherView: 'exams' })}
              onSuccess={() => navigate('teacher_workspace', { teacherView: 'exams' })}
            />
          )}

          {/* 3. CA THI & GIÁM SÁT */}
          {currentView === 'sessions' && user?.role !== 'admin' && (
            <SessionsView
              onCreateSession={(type) => {
                setSessionCreateType(type || 'exam');
                setEditingSessionId('');
                setSessionCreateExamId('');
                navigate('teacher_workspace', { teacherView: 'session_create' });
              }}
              onEditSession={(sessId) => {
                setEditingSessionId(sessId);
                setSessionCreateExamId('');
                navigate('teacher_workspace', { teacherView: 'session_create' });
              }}
              onOpenProctor={handleOpenSessionProctor}
              onOpenAnalytics={handleOpenSessionAnalytics}
            />
          )}

          {/* 3.1. TẠO / SỬA CA THI */}
          {currentView === 'session_create' && user?.role !== 'admin' && (
            <SessionCreateView
              key={`session_form_${editingSessionId || sessionCreateExamId || sessionCreateType || 'new'}`}
              initialExamId={sessionCreateExamId}
              initialSessionType={sessionCreateType}
              editingSessionId={editingSessionId}
              onBack={() => {
                setEditingSessionId('');
                setSessionCreateExamId('');
                navigate('teacher_workspace', { teacherView: 'sessions' });
              }}
              onCreated={(sessId) => {
                setEditingSessionId('');
                setSessionCreateExamId('');
                handleOpenSessionProctor(sessId);
              }}
            />
          )}

          {/* 3.2. GIÁM SÁT CA THI TRỰC TIẾP */}
          {currentView === 'session_proctor' && currentProctorSession && user?.role !== 'admin' && (
            <SessionProctorView
              session={currentProctorSession}
              onBack={() => navigate('teacher_workspace', { teacherView: 'sessions' })}
              onViewAnalytics={handleOpenSessionAnalytics}
            />
          )}

          {/* 3.3. BẢNG ĐIỂM & THỐNG KÊ CA THI */}
          {currentView === 'session_analytics' && currentProctorSession && user?.role !== 'admin' && (
            <SessionAnalyticsView
              session={currentProctorSession}
              onBack={() => navigate('teacher_workspace', { teacherView: 'sessions' })}
            />
          )}

          {/* 4. LỚP HỌC */}
          {currentView === 'classes' && user?.role !== 'admin' && (
            <ClassesView onSelectClass={handleOpenClassDetail} />
          )}

          {/* 4.1. QUẢN LÝ HỌC SINH CỦA LỚP */}
          {currentView === 'class_detail' && selectedClass && user?.role !== 'admin' && (
            <ClassDetailView
              classroom={selectedClass}
              onBack={() => navigate('teacher_workspace', { teacherView: 'classes' })}
            />
          )}

          {/* 5. HƯỚNG DẪN & BÁO LỖI */}
          {currentView === 'guide' && <HelpFeedback />}

          {/* ========================================== */}
          {/* ADMIN VIEWS (Chỉ dành cho Super Admin)     */}
          {/* ========================================== */}

          {/* 6. ADMIN DASHBOARD */}
          {currentView === 'admin_overview' && user?.role === 'admin' && (
            <AdminOverview
              onNavigate={(v) => navigate('teacher_workspace', { teacherView: v })}
              onOpenSessionProctor={handleOpenSessionProctor}
            />
          )}

          {/* 7. QUẢN LÝ GIÁO VIÊN */}
          {currentView === 'admin_teachers' && user?.role === 'admin' && <AdminTeachersView />}

          {/* 8. QUẢN LÝ CA THI TOÀN TRƯỜNG */}
          {currentView === 'admin_sessions' && user?.role === 'admin' && (
            <AdminSessionsView
              onOpenProctor={handleOpenSessionProctor}
              onOpenAnalytics={handleOpenSessionAnalytics}
            />
          )}

          {/* 9. QUẢN LÝ KHO ĐỀ TOÀN TRƯỜNG (CHỈ XEM - KHÔNG TẠO CA THI) */}
          {currentView === 'admin_exams' && user?.role === 'admin' && (
            <AdminExamsView />
          )}

          {/* 10. QUẢN LÝ BÀI NỘP & BẢNG ĐIỂM TOÀN TRƯỜNG */}
          {currentView === 'admin_submissions' && user?.role === 'admin' && (
            <AdminSubmissionsView />
          )}

          {/* 11. CÀI ĐẶT HỆ THỐNG & FIREBASE (CHỈ ADMIN) */}
          {currentView === 'settings' && user?.role === 'admin' && <SettingsView />}

          {/* ========================================== */}
          {/* ACCESS DENIED FALLBACK GUARD               */}
          {/* ========================================== */}
          {((ADMIN_ONLY_VIEWS.includes(currentView) && user?.role !== 'admin') ||
            (TEACHER_ONLY_VIEWS.includes(currentView) && user?.role === 'admin')) && (
            <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {user?.role === 'admin'
                  ? 'Tài khoản Quản trị viên (Admin) chỉ quản lý danh sách giáo viên, kho ca thi toàn trường và cấu hình hệ thống. Vui lòng chuyển sang trang Quản trị.'
                  : 'Trang này chỉ dành riêng cho Quản trị viên hệ thống (Admin). Tài khoản giáo viên không có quyền truy cập.'}
              </p>
              <button
                onClick={() => navigate('teacher_workspace', { teacherView: user?.role === 'admin' ? 'admin_overview' : 'overview', replace: true })}
                className="px-5 py-2.5 rounded-2xl bg-brand-600 text-white text-xs font-bold shadow-md hover:bg-brand-700 transition-colors"
              >
                Về trang chính của bạn
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExamProvider>
        <MainApp />
      </ExamProvider>
    </AuthProvider>
  );
}
