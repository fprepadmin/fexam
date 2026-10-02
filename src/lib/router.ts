import { TeacherView } from '../components/common/Sidebar';
import { AppFlowState } from '../App';

export const ROUTES = {
  // Public
  LANDING: '/',
  LOGIN: '/dang-nhap',
  REGISTER: '/dang-ky',

  // Student
  STUDENT: '/hoc-sinh',
  STUDENT_ROOM: '/hoc-sinh/lam-bai',
  STUDENT_RESULT: '/hoc-sinh/ket-qua',

  // Teacher Workspace
  OVERVIEW: '/tong-quan',
  EXAMS: '/de-thi',
  EXAM_CREATE: '/tao-de-thi',
  EXAM_EDIT: '/sua-de-thi',
  SESSIONS: '/ca-thi',
  SESSION_CREATE: '/tao-ca-thi',
  SESSION_PROCTOR: '/giam-sat',
  SESSION_ANALYTICS: '/thong-ke',
  CLASSES: '/lop-hoc',
  CLASS_DETAIL: '/lop-hoc/chi-tiet',
  GUIDE: '/huong-dan',
  SETTINGS: '/cai-dat',

  ADMIN_OVERVIEW: '/quan-tri',
  ADMIN_TEACHERS: '/quan-tri/giao-vien',
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

export interface ParsedRoute {
  appFlow: AppFlowState;
  teacherView?: TeacherView;
  studentFlowState?: 'entry' | 'exam_room' | 'result';
  queryParams: Record<string, string>;
}

export function pathToRoute(pathname: string, search: string = ''): ParsedRoute {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  // 1. Check direct query parameters for student exam link (?session=... / ?exam=... / ?code=...)
  const hasExamParam = queryParams['session'] || queryParams['exam'] || queryParams['code'];
  if (hasExamParam && (normalizedPath === '/' || normalizedPath === '' || normalizedPath.startsWith('/hoc-sinh') || normalizedPath.startsWith('/thi'))) {
    return { appFlow: 'student_portal', studentFlowState: 'entry', queryParams };
  }

  // 2. Landing & Auth
  if (normalizedPath === '/' || normalizedPath === '') {
    return { appFlow: 'landing', queryParams };
  }
  if (normalizedPath === '/dang-nhap' || normalizedPath === '/login') {
    return { appFlow: 'login', queryParams };
  }
  if (normalizedPath === '/dang-ky' || normalizedPath === '/register') {
    return { appFlow: 'register', queryParams };
  }

  // 3. Student Portal
  if (normalizedPath.startsWith('/hoc-sinh') || normalizedPath.startsWith('/student') || normalizedPath.startsWith('/thi')) {
    if (normalizedPath.includes('/lam-bai') || normalizedPath.includes('/room')) {
      return { appFlow: 'student_portal', studentFlowState: 'exam_room', queryParams };
    }
    if (normalizedPath.includes('/ket-qua') || normalizedPath.includes('/result')) {
      return { appFlow: 'student_portal', studentFlowState: 'result', queryParams };
    }
    return { appFlow: 'student_portal', studentFlowState: 'entry', queryParams };
  }

  // 3. Teacher Views
  if (normalizedPath === '/tong-quan' || normalizedPath === '/dashboard' || normalizedPath === '/overview') {
    return { appFlow: 'teacher_workspace', teacherView: 'overview', queryParams };
  }
  if (normalizedPath === '/de-thi' || normalizedPath === '/exams') {
    return { appFlow: 'teacher_workspace', teacherView: 'exams', queryParams };
  }
  if (normalizedPath === '/tao-de-thi' || normalizedPath === '/exams/create') {
    return { appFlow: 'teacher_workspace', teacherView: 'exam_create', queryParams };
  }
  if (normalizedPath === '/sua-de-thi' || normalizedPath === '/exams/edit') {
    return { appFlow: 'teacher_workspace', teacherView: 'exam_edit', queryParams };
  }
  if (normalizedPath === '/ca-thi' || normalizedPath === '/sessions') {
    return { appFlow: 'teacher_workspace', teacherView: 'sessions', queryParams };
  }
  if (normalizedPath === '/tao-ca-thi' || normalizedPath === '/sessions/create') {
    return { appFlow: 'teacher_workspace', teacherView: 'session_create', queryParams };
  }
  if (normalizedPath === '/giam-sat' || normalizedPath === '/proctor') {
    return { appFlow: 'teacher_workspace', teacherView: 'session_proctor', queryParams };
  }
  if (normalizedPath === '/thong-ke' || normalizedPath === '/analytics') {
    return { appFlow: 'teacher_workspace', teacherView: 'session_analytics', queryParams };
  }
  if (normalizedPath === '/lop-hoc' || normalizedPath === '/classes') {
    return { appFlow: 'teacher_workspace', teacherView: 'classes', queryParams };
  }
  if (normalizedPath === '/lop-hoc/chi-tiet' || normalizedPath === '/classes/detail') {
    return { appFlow: 'teacher_workspace', teacherView: 'class_detail', queryParams };
  }
  if (normalizedPath === '/huong-dan' || normalizedPath === '/guide' || normalizedPath === '/help') {
    return { appFlow: 'teacher_workspace', teacherView: 'guide', queryParams };
  }
  if (normalizedPath === '/cai-dat' || normalizedPath === '/settings') {
    return { appFlow: 'teacher_workspace', teacherView: 'settings', queryParams };
  }

  // 4. Admin Views
  if (
    normalizedPath === '/quan-tri' ||
    normalizedPath === '/admin' ||
    normalizedPath === '/quan-tri/ca-thi' ||
    normalizedPath === '/admin/sessions' ||
    normalizedPath === '/quan-tri/de-thi' ||
    normalizedPath === '/admin/exams' ||
    normalizedPath === '/quan-tri/bai-nop' ||
    normalizedPath === '/admin/submissions'
  ) {
    return { appFlow: 'teacher_workspace', teacherView: 'admin_overview', queryParams };
  }
  if (normalizedPath === '/quan-tri/giao-vien' || normalizedPath === '/admin/teachers') {
    return { appFlow: 'teacher_workspace', teacherView: 'admin_teachers', queryParams };
  }

  // Fallback default
  return { appFlow: 'landing', queryParams };
}

export function getPathForView(
  appFlow: AppFlowState,
  teacherView?: TeacherView,
  studentFlowState?: 'entry' | 'exam_room' | 'result',
  extraParams?: Record<string, string>
): string {
  let basePath: string = ROUTES.LANDING;

  if (appFlow === 'landing') {
    basePath = ROUTES.LANDING;
  } else if (appFlow === 'login') {
    basePath = ROUTES.LOGIN;
  } else if (appFlow === 'register') {
    basePath = ROUTES.REGISTER;
  } else if (appFlow === 'student_portal') {
    if (studentFlowState === 'exam_room') basePath = ROUTES.STUDENT_ROOM;
    else if (studentFlowState === 'result') basePath = ROUTES.STUDENT_RESULT;
    else basePath = ROUTES.STUDENT;
  } else if (appFlow === 'teacher_workspace') {
    switch (teacherView) {
      case 'overview':
        basePath = ROUTES.OVERVIEW;
        break;
      case 'exams':
        basePath = ROUTES.EXAMS;
        break;
      case 'exam_create':
        basePath = ROUTES.EXAM_CREATE;
        break;
      case 'exam_edit':
        basePath = ROUTES.EXAM_EDIT;
        break;
      case 'sessions':
        basePath = ROUTES.SESSIONS;
        break;
      case 'session_create':
        basePath = ROUTES.SESSION_CREATE;
        break;
      case 'session_proctor':
        basePath = ROUTES.SESSION_PROCTOR;
        break;
      case 'session_analytics':
        basePath = ROUTES.SESSION_ANALYTICS;
        break;
      case 'classes':
        basePath = ROUTES.CLASSES;
        break;
      case 'class_detail':
        basePath = ROUTES.CLASS_DETAIL;
        break;
      case 'guide':
        basePath = ROUTES.GUIDE;
        break;
      case 'settings':
        basePath = ROUTES.SETTINGS;
        break;
      case 'admin_overview':
        basePath = ROUTES.ADMIN_OVERVIEW;
        break;
      case 'admin_teachers':
        basePath = ROUTES.ADMIN_TEACHERS;
        break;
      default:
        basePath = ROUTES.OVERVIEW;
    }
  }

  if (extraParams && Object.keys(extraParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const queryString = params.toString();
    if (queryString) {
      return `${basePath}?${queryString}`;
    }
  }

  return basePath;
}
