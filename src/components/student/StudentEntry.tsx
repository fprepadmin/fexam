import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  ArrowLeft,
  ArrowRight,
  Shield,
  Clock,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
  User,
  School,
  IdCard,
  KeyRound,
  Search,
  BookOpen,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { Exam, ExamSession, SessionCandidate, ExamSubmission } from '../../types';
import { storage } from '../../services/storage';
import { fetchExamByIdOrCode, fetchSessionByCodeOrId } from '../../services/firebase';

interface StudentEntryProps {
  initialExamCode?: string;
  onEnterExam: (data: {
    exam: Exam;
    session?: ExamSession;
    studentName: string;
    studentCode: string;
    mshs: string;
    className: string;
    email: string;
  }) => void;
  onViewResult?: (submission: ExamSubmission, exam: Exam, session?: ExamSession) => void;
  onBackToTeacher: () => void;
}

export const StudentEntry: React.FC<StudentEntryProps> = ({
  initialExamCode = '',
  onEnterExam,
  onViewResult,
  onBackToTeacher,
}) => {
  const { exams, sessions } = useExam();

  // 5-digit PIN input state
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '']);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Matched target exam and session
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);

  // Student details form state
  const [mshs, setMshs] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [email, setEmail] = useState('');
  const [candidateCode, setCandidateCode] = useState('');
  const [examPassword, setExamPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(Boolean(initialExamCode));
  const [matchedCandidate, setMatchedCandidate] = useState<SessionCandidate | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<ExamSubmission | null>(null);

  // Helper to check if student already submitted this exam
  const checkExistingSubmission = (
    examId?: string,
    sessionId?: string,
    mshsVal?: string,
    candidateCodeVal?: string
  ): ExamSubmission | null => {
    if (!examId) return null;
    const allSubs = storage.getSubmissions();
    const cleanMshs = mshsVal?.trim().toUpperCase();
    const cleanCode = candidateCodeVal?.trim().toUpperCase();
    if (!cleanMshs && !cleanCode) return null;

    return (
      allSubs.find((s) => {
        const matchesSessionOrExam = sessionId ? s.sessionId === sessionId : s.examId === examId;
        if (!matchesSessionOrExam) return false;
        if (s.status !== 'submitted') return false;
        const matchCode = cleanCode && s.studentCode?.trim().toUpperCase() === cleanCode;
        const matchMshs = cleanMshs && s.mshs?.trim().toUpperCase() === cleanMshs;
        return Boolean(matchCode || matchMshs);
      }) || null
    );
  };

  // Re-check existing submission whenever candidate identifiers change
  useEffect(() => {
    if (!selectedExam) {
      setExistingSubmission(null);
      return;
    }
    const found = checkExistingSubmission(
      selectedExam.id,
      selectedSession?.id,
      mshs || matchedCandidate?.mshs,
      candidateCode || matchedCandidate?.candidateCode
    );
    setExistingSubmission(found);
  }, [selectedExam, selectedSession, mshs, candidateCode, matchedCandidate]);

  // Auto-lookup if coming from direct link
  useEffect(() => {
    if (initialExamCode) {
      lookupCode(initialExamCode);
    }
  }, [initialExamCode]);

  // Code lookup helper
  const lookupCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập mã phòng thi hoặc mã đề thi!');
      return;
    }

    setIsLookingUp(true);
    setErrorMsg('');

    try {
      // 1. Gather all local sessions & exams
      const rawSessions = storage.getAllSessionsRaw();
      const sessionMap = new Map<string, ExamSession>();
      rawSessions.forEach((s) => sessionMap.set(s.id, s));
      sessions.forEach((s) => sessionMap.set(s.id, s));
      const allSessions = Array.from(sessionMap.values());

      const rawExams = storage.getAllExamsRaw();
      const examMap = new Map<string, Exam>();
      rawExams.forEach((e) => examMap.set(e.id, e));
      exams.forEach((e) => examMap.set(e.id, e));
      const allExams = Array.from(examMap.values());

      // Helper function to resolve exam for session
      const resolveExamForSession = async (sess: ExamSession): Promise<Exam | null> => {
        // 1. Try match in local memory exams
        let matchingExam = allExams.find(
          (e) =>
            (sess.examId && (e.id === sess.examId || e.id?.toUpperCase() === sess.examId.toUpperCase())) ||
            (sess.examCode && (e.code?.toUpperCase() === sess.examCode.toUpperCase() || e.id?.toUpperCase() === sess.examCode.toUpperCase()))
        );

        // 2. Query Firestore by examId
        if (!matchingExam || !matchingExam.questions || matchingExam.questions.length === 0) {
          if (sess.examId) {
            const remoteExam = await fetchExamByIdOrCode(sess.examId);
            if (remoteExam && remoteExam.questions && remoteExam.questions.length > 0) {
              matchingExam = remoteExam;
              storage.saveExam(remoteExam);
            }
          }
        }

        // 3. Query Firestore by examCode if still not found
        if (!matchingExam || !matchingExam.questions || matchingExam.questions.length === 0) {
          if (sess.examCode) {
            const remoteExam = await fetchExamByIdOrCode(sess.examCode);
            if (remoteExam && remoteExam.questions && remoteExam.questions.length > 0) {
              matchingExam = remoteExam;
              storage.saveExam(remoteExam);
            }
          }
        }

        return matchingExam || null;
      };

      // -----------------------------------------------------------------
      // PRIORITY 1: Check if cleanCode matches ANY candidate's SBD (candidateCode) or MSHS
      // -----------------------------------------------------------------
      let candidateSession: ExamSession | null = null;
      let matchedCand: SessionCandidate | null = null;

      // Check local sessions first
      for (const sess of allSessions) {
        if (sess.candidates && sess.candidates.length > 0) {
          const found = sess.candidates.find(
            (c) => c.candidateCode?.toUpperCase() === cleanCode || c.mshs?.toUpperCase() === cleanCode
          );
          if (found) {
            candidateSession = sess;
            matchedCand = found;
            break;
          }
        }
      }

      // If not in local sessions, query Firestore
      if (!matchedCand) {
        const remoteSession = await fetchSessionByCodeOrId(cleanCode);
        if (remoteSession) {
          storage.saveSession(remoteSession);
          if (remoteSession.candidates && remoteSession.candidates.length > 0) {
            const found = remoteSession.candidates.find(
              (c) => c.candidateCode?.toUpperCase() === cleanCode || c.mshs?.toUpperCase() === cleanCode
            );
            if (found) {
              candidateSession = remoteSession;
              matchedCand = found;
            }
          }
        }
      }

      // If matched a candidate SBD / MSHS
      if (candidateSession && matchedCand) {
        const matchingExam = await resolveExamForSession(candidateSession);
        if (matchingExam && matchingExam.questions && matchingExam.questions.length > 0) {
          setSelectedSession(candidateSession);
          setSelectedExam(matchingExam);

          // Auto-fill and lock candidate details
          setMatchedCandidate(matchedCand);
          setFullName(matchedCand.name);
          setClassName(matchedCand.className);
          setMshs(matchedCand.mshs);
          setEmail(matchedCand.email || '');
          setCandidateCode(matchedCand.candidateCode);

          setErrorMsg('');
          setIsLookingUp(false);
          return;
        } else {
          setErrorMsg(`Ca thi "${candidateSession.title}" chưa có nội dung đề thi.`);
          setIsLookingUp(false);
          return;
        }
      }

      // -----------------------------------------------------------------
      // PRIORITY 2: Check if cleanCode matches a Session Code or Session ID
      // -----------------------------------------------------------------
      let foundSession = allSessions.find(
        (s) => s.code?.toUpperCase() === cleanCode || s.id?.toUpperCase() === cleanCode
      );

      if (!foundSession) {
        const remoteSession = await fetchSessionByCodeOrId(cleanCode);
        if (remoteSession && (remoteSession.code?.toUpperCase() === cleanCode || remoteSession.id === cleanCode)) {
          foundSession = remoteSession;
          storage.saveSession(remoteSession);
        }
      }

      if (foundSession) {
        const matchingExam = await resolveExamForSession(foundSession);
        if (matchingExam && matchingExam.questions && matchingExam.questions.length > 0) {
          setSelectedSession(foundSession);
          setSelectedExam(matchingExam);

          // Check if cleanCode happens to be a candidate inside this session
          const candInSession = foundSession.candidates?.find(
            (c) => c.candidateCode?.toUpperCase() === cleanCode || c.mshs?.toUpperCase() === cleanCode
          );

          if (candInSession) {
            setMatchedCandidate(candInSession);
            setFullName(candInSession.name);
            setClassName(candInSession.className);
            setMshs(candInSession.mshs);
            setEmail(candInSession.email || '');
            setCandidateCode(candInSession.candidateCode);
          } else {
            // Joined via general session code or link -> Clear candidate so student can fill in their info
            setMatchedCandidate(null);
            setFullName('');
            setClassName('');
            setMshs('');
            setEmail('');
            setCandidateCode('');
          }

          setErrorMsg('');
          setIsLookingUp(false);
          return;
        } else {
          setErrorMsg(`Đã tìm thấy ca thi "${foundSession.title}" nhưng đề thi chưa sẵn sàng hoặc đang được cập nhật.`);
          setIsLookingUp(false);
          return;
        }
      }

      // -----------------------------------------------------------------
      // PRIORITY 3: Check in exams directly (local or remote Firestore)
      // -----------------------------------------------------------------
      let foundExam = allExams.find(
        (e) => e.code?.toUpperCase() === cleanCode || e.id?.toUpperCase() === cleanCode
      );

      if (!foundExam || !foundExam.questions || foundExam.questions.length === 0) {
        const remoteExam = await fetchExamByIdOrCode(cleanCode);
        if (remoteExam) {
          foundExam = remoteExam;
          storage.saveExam(remoteExam);
        }
      }

      if (foundExam && foundExam.questions && foundExam.questions.length > 0) {
        setSelectedExam(foundExam);
        setSelectedSession(null);
        setMatchedCandidate(null);
        setFullName('');
        setClassName('');
        setMshs('');
        setEmail('');
        setCandidateCode('');
        setErrorMsg('');
        setIsLookingUp(false);
        return;
      }

      setErrorMsg(`Mã "${cleanCode}" không tồn tại hoặc đề thi/ca thi đã bị xóa khỏi hệ thống!`);
    } catch (err) {
      console.error('lookupCode error:', err);
      setErrorMsg(`Lỗi kết nối khi tìm kiếm mã "${cleanCode}". Vui lòng thử lại!`);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Handle PIN Digit Change
  const handlePinChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);
    setErrorMsg('');

    // Auto-focus next box
    if (char && index < 4) {
      pinInputRefs[index + 1].current?.focus();
    }

    // Auto lookup when all 5 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 5) {
      lookupCode(fullCode);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter') {
      const fullCode = pinDigits.join('');
      if (fullCode.length > 0) {
        lookupCode(fullCode);
      }
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (pasted.length >= 5) {
      const chars = pasted.slice(0, 5).split('');
      setPinDigits(chars);
      pinInputRefs[4].current?.focus();
      lookupCode(pasted.slice(0, 5));
    } else if (pasted.length > 0) {
      const chars = [...pinDigits];
      for (let i = 0; i < pasted.length && i < 5; i++) {
        chars[i] = pasted[i];
      }
      setPinDigits(chars);
      lookupCode(pasted);
    }
  };

  // Reset exam selection to enter code again
  const handleResetExam = () => {
    setSelectedExam(null);
    setSelectedSession(null);
    setMatchedCandidate(null);
    setFullName('');
    setClassName('');
    setMshs('');
    setEmail('');
    setCandidateCode('');
    setExamPassword('');
    setErrorMsg('');
    setPinDigits(['', '', '', '', '']);
    setTimeout(() => {
      pinInputRefs[0].current?.focus();
    }, 100);
  };

  // Check Schedule & Open/Close Window Status
  const checkScheduleStatus = () => {
    const now = Date.now();

    if (selectedSession) {
      if (selectedSession.startTime) {
        const start = new Date(selectedSession.startTime).getTime();
        if (now < start) {
          const diffMinutes = Math.ceil((start - now) / 60000);
          return {
            isOpen: false,
            statusLabel: 'Chưa mở ca thi',
            statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
            reason: `Ca thi chưa mở. Bắt đầu lúc ${new Date(selectedSession.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${new Date(selectedSession.startTime).toLocaleDateString('vi-VN')} (còn khoảng ${diffMinutes} phút).`,
          };
        }
      }

      if (selectedSession.endTime) {
        const end = new Date(selectedSession.endTime).getTime();
        if (now > end || selectedSession.status === 'closed') {
          return {
            isOpen: false,
            statusLabel: 'Đã kết thúc',
            statusColor: 'bg-slate-100 text-slate-600 border-slate-200',
            reason: `Ca thi này đã đóng lúc ${new Date(selectedSession.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${new Date(selectedSession.endTime).toLocaleDateString('vi-VN')}. Bạn không thể bắt đầu làm bài mới.`,
          };
        }
      }

      return { isOpen: true, statusLabel: 'Đang mở nhận bài', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }

    if (selectedExam) {
      if (selectedExam.settings.openTime) {
        const start = new Date(selectedExam.settings.openTime).getTime();
        if (now < start) {
          const diffMinutes = Math.ceil((start - now) / 60000);
          return {
            isOpen: false,
            statusLabel: 'Chưa mở đề',
            statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
            reason: `Đề thi chưa mở. Bắt đầu lúc ${new Date(selectedExam.settings.openTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${new Date(selectedExam.settings.openTime).toLocaleDateString('vi-VN')} (còn khoảng ${diffMinutes} phút).`,
          };
        }
      }

      if (selectedExam.settings.closeTime) {
        const end = new Date(selectedExam.settings.closeTime).getTime();
        if (now > end) {
          return {
            isOpen: false,
            statusLabel: 'Đã đóng đề',
            statusColor: 'bg-slate-100 text-slate-600 border-slate-200',
            reason: `Đề thi này đã đóng lúc ${new Date(selectedExam.settings.closeTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${new Date(selectedExam.settings.closeTime).toLocaleDateString('vi-VN')}.`,
          };
        }
      }
    }

    return { isOpen: true, statusLabel: 'Đang mở nhận bài', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const scheduleStatus = checkScheduleStatus();

  // Submit Handler: Validate & Start Exam
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedExam) {
      setErrorMsg('Vui lòng nhập mã đề thi hợp lệ trước khi bắt đầu!');
      return;
    }

    // Check time schedule
    if (!scheduleStatus.isOpen) {
      setErrorMsg(scheduleStatus.reason || 'Ca thi hiện chưa mở hoặc đã kết thúc!');
      return;
    }

    // Check password if session requires it
    const requiredPassword = selectedSession?.password;
    if (requiredPassword && requiredPassword.trim() !== examPassword.trim()) {
      setErrorMsg('Mật khẩu ca thi không chính xác! Vui lòng hỏi giáo viên.');
      return;
    }

    // Validate Student Info: Họ tên
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ và tên học sinh!');
      return;
    }

    const isClassMode = selectedSession?.mode === 'class' && Boolean(selectedSession?.candidates && selectedSession.candidates.length > 0);

    // Validate MSHS (Required for class roster mode, optional for free mode)
    let finalMshs = mshs.trim().toUpperCase();
    if (!finalMshs) {
      if (isClassMode && !matchedCandidate) {
        setErrorMsg('Vui lòng nhập Mã số học sinh (MSHS) theo danh sách lớp!');
        return;
      }
      finalMshs = `TD-${Date.now().toString().slice(-6)}`;
    }

    const finalClassName = className.trim() || (isClassMode ? '' : 'Tự do');
    if (!finalClassName) {
      setErrorMsg('Vui lòng nhập Lớp học của bạn!');
      return;
    }

    // If session is strictly class mode with roster and joined via link/general code
    let resolvedCandidate = matchedCandidate;
    if (!resolvedCandidate && isClassMode && selectedSession?.candidates) {
      const foundInRoster = selectedSession.candidates.find(
        (c) =>
          c.mshs?.toUpperCase() === finalMshs ||
          c.name?.toLowerCase().trim() === fullName.toLowerCase().trim()
      );
      if (foundInRoster) {
        resolvedCandidate = foundInRoster;
      }
    }

    const finalCandidateCode =
      candidateCode.trim().toUpperCase() ||
      resolvedCandidate?.candidateCode ||
      String(Math.floor(10000 + Math.random() * 90000));

    const isPracticeMode = Boolean(
      selectedSession?.sessionType === 'practice' ||
      selectedSession?.antiCheatLevel === 'none' ||
      selectedExam.settings.isPracticeMode ||
      selectedExam.settings.antiCheatLevel === 'none'
    );

    // CRITICAL: Check if student already submitted this exam
    const foundSub = checkExistingSubmission(
      selectedExam.id,
      selectedSession?.id,
      finalMshs,
      finalCandidateCode
    );

    if (foundSub && !isPracticeMode) {
      if (onViewResult) {
        onViewResult(foundSub, selectedExam, selectedSession || undefined);
        return;
      }
      setErrorMsg('Bạn đã hoàn thành bài thi này và không thể làm lại!');
      return;
    }

    onEnterExam({
      exam: selectedExam,
      session: selectedSession || undefined,
      studentName: fullName.trim(),
      studentCode: finalCandidateCode,
      mshs: finalMshs,
      className: finalClassName,
      email: email.trim(),
    });
  };

  const isInfoLocked = Boolean(matchedCandidate);
  const isPracticeMode = Boolean(
    selectedSession?.sessionType === 'practice' ||
    selectedSession?.antiCheatLevel === 'none' ||
    selectedExam?.settings.isPracticeMode ||
    selectedExam?.settings.antiCheatLevel === 'none'
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">
                <span className="text-brand-600">F</span>EXAM
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                Cổng Khảo Thí
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Hệ thống thi trực tuyến có giám sát thông minh</p>
          </div>
        </div>

        <button
          onClick={onBackToTeacher}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Về trang chủ</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl w-full mx-auto my-auto py-6 space-y-5">
        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-3 text-xs font-bold">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
              !selectedExam
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
              1
            </span>
            <span>Mã Phòng Thi</span>
            {selectedExam && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
              selectedExam
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
              2
            </span>
            <span>Thông Tin Thí Sinh</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* BƯỚC 1: NHẬP MÃ PHÒNG THI / PIN CODE HOẶC LOADING QUA LINK        */}
        {/* =================================================================== */}
        {isLookingUp && initialExamCode && !selectedExam ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Đang Kết Nối Phòng Thi...
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Hệ thống đang tải dữ liệu đề thi & phòng thi theo đường link. Vui lòng đợi trong giây lát!
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-brand-600 animate-pulse" />
              <span>Mã liên kết: {initialExamCode.toUpperCase()}</span>
            </div>
          </div>
        ) : !selectedExam ? (
          <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-100 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-100 shadow-xs">
                <Hash className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Nhập Mã Phòng Thi
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Nhập mã 5 ký tự hoặc mã đề thi được Giáo viên cung cấp để bắt đầu kiểm tra
              </p>
            </div>

            {/* 5 PIN Input Boxes */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePinPaste}>
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinInputRefs[index]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border-2 transition-all outline-none ${
                      digit
                        ? 'border-brand-500 bg-brand-50/50 text-brand-700 shadow-xs ring-2 ring-brand-500/10'
                        : 'border-slate-200 hover:border-slate-300 text-slate-800'
                    } focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10`}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => lookupCode(pinDigits.join(''))}
                disabled={pinDigits.join('').length === 0 || isLookingUp}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang Tra Cứu Máy Chủ...</span>
                  </>
                ) : (
                  <>
                    <span>Xác Nhận & Tiếp Tục</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Direct code string search */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="text-[11px] text-slate-400">
                Hoặc nhập mã ca thi / mã đề thi trực tiếp:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="VD: TOAN12-01 hoặc Mã ca thi..."
                  disabled={isLookingUp}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLookingUp) {
                      lookupCode((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isLookingUp}
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input && !isLookingUp) lookupCode(input.value);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
                >
                  {isLookingUp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLookingUp ? 'Đang tìm...' : 'Tìm Kiếm'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* BƯỚC 2: THÔNG TIN THÍ SINH & BẮT ĐẦU BÀI THI                       */
          /* =================================================================== */
          <form
            onSubmit={handleStartExam}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Exam Card Summary */}
            <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 p-5 rounded-2xl border border-blue-100 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-brand-600 text-white font-mono font-black text-xs shadow-xs">
                    Mã: {selectedSession ? selectedSession.code : selectedExam.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Môn {selectedExam.subject || 'Toán học'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${scheduleStatus.statusColor}`}>
                    {scheduleStatus.statusLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetExam}
                    title="Đổi mã ca thi khác"
                    className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                  {selectedSession ? selectedSession.title : selectedExam.title}
                </h2>
                {selectedSession?.teacherName && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Giáo viên phụ trách: <span className="font-bold text-slate-700">{selectedSession.teacherName}</span>
                  </p>
                )}
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-white/80 border border-blue-100/80">
                  <p className="text-[10px] text-slate-400 font-medium">Thời gian</p>
                  <p className="text-xs font-black text-slate-800">
                    {selectedSession?.durationMinutes || selectedExam.settings.durationMinutes || 45} phút
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 border border-blue-100/80">
                  <p className="text-[10px] text-slate-400 font-medium">Số lượng</p>
                  <p className="text-xs font-black text-slate-800">
                    {selectedExam.questions?.length || 0} câu hỏi
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 border border-blue-100/80">
                  <p className="text-[10px] text-slate-400 font-medium">Giám sát</p>
                  <p className="text-xs font-black text-brand-600 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Guard Pro</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Candidate Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Thông Tin Thí Sinh Dự Thi
                  </h3>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                  {isInfoLocked ? (
                    <>
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Khóa theo mã SBD</span>
                    </>
                  ) : (
                    <>
                      <IdCard className="w-3 h-3 text-brand-600" />
                      <span>{selectedSession?.mode === 'class' ? 'Theo Danh Sách Lớp' : 'Ca Thi Tự Do'}</span>
                    </>
                  )}
                </span>
              </div>

              {/* Status Banner: Locked via Candidate Code vs Entry via Link */}
              {isInfoLocked && matchedCandidate ? (
                <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                        Số Báo Danh: {matchedCandidate.candidateCode}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800">
                        <Lock className="w-3 h-3" />
                        Đã khóa thông tin
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Thông tin thí sinh được gắn liền cố định với Số Báo Danh của bạn. Không thể chỉnh sửa nhằm đảm bảo tính minh bạch phòng thi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-center gap-2.5 text-xs shadow-xs">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-relaxed">
                    Bạn đang tham gia qua đường link phòng thi. Vui lòng điền chính xác Họ và tên, MSHS và Lớp học để bắt đầu bài làm.
                  </span>
                </div>
              )}

              {/* Form Input: Họ và Tên */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Họ và tên học sinh <span className="text-rose-500">*</span>
                  </label>
                  {isInfoLocked && (
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Không thể thay đổi
                    </span>
                  )}
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    readOnly={isInfoLocked}
                    placeholder="VD: Nguyễn Văn An"
                    value={fullName}
                    onChange={(e) => !isInfoLocked && setFullName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-bold outline-none transition-all ${
                      isInfoLocked
                        ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                    }`}
                  />
                </div>
              </div>

              {/* Form Row: MSHS & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Mã số học sinh (MSHS){' '}
                      {selectedSession?.mode === 'class' && Boolean(selectedSession?.candidates?.length) ? (
                        <span className="text-rose-500">*</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px]">(Tự do)</span>
                      )}
                    </label>
                    {isInfoLocked && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Khóa
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required={Boolean(selectedSession?.mode === 'class' && selectedSession?.candidates?.length)}
                      readOnly={isInfoLocked}
                      placeholder={
                        selectedSession?.mode === 'class' && Boolean(selectedSession?.candidates?.length)
                          ? 'VD: HS1205 hoặc SBD...'
                          : 'VD: HS1205 (Tự động cấp nếu trống)'
                      }
                      value={mshs}
                      onChange={(e) => !isInfoLocked && setMshs(e.target.value.toUpperCase())}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-mono font-bold uppercase outline-none transition-all ${
                        isInfoLocked
                          ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Lớp học{' '}
                      {selectedSession?.mode === 'class' && Boolean(selectedSession?.candidates?.length) ? (
                        <span className="text-rose-500">*</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px]">(Mặc định: Tự do)</span>
                      )}
                    </label>
                    {isInfoLocked && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Khóa
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required={Boolean(selectedSession?.mode === 'class' && selectedSession?.candidates?.length)}
                      readOnly={isInfoLocked}
                      placeholder="VD: 12A1"
                      value={className}
                      onChange={(e) => !isInfoLocked && setClassName(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-bold outline-none transition-all ${
                        isInfoLocked
                          ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Email */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Email học sinh
                </label>
                <input
                  type="email"
                  readOnly={isInfoLocked && Boolean(email)}
                  placeholder="VD: hocsinh@gmail.com (Không bắt buộc)"
                  value={email}
                  onChange={(e) => !isInfoLocked && setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium outline-none transition-all ${
                    isInfoLocked && Boolean(email)
                      ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                  }`}
                />
              </div>

              {/* Password if required */}
              {selectedSession?.password && (
                <div className="space-y-1 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                  <label className="block text-xs font-bold text-amber-900">
                    Mật khẩu ca thi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu do giáo viên cấp..."
                      value={examPassword}
                      onChange={(e) => setExamPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ALREADY SUBMITTED NOTICE & DIRECT RESULT ACCESS */}
            {existingSubmission && existingSubmission.status === 'submitted' && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 text-slate-900 space-y-3.5 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      BẠN ĐÃ HOÀN THÀNH VÀ NỘP BÀI THI NÀY
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Thời gian nộp:{' '}
                      <strong className="text-slate-800 font-bold">
                        {new Date(
                          existingSubmission.submitTime || existingSubmission.lastActiveTime || ''
                        ).toLocaleTimeString('vi-VN')}{' '}
                        ·{' '}
                        {new Date(
                          existingSubmission.submitTime || existingSubmission.lastActiveTime || ''
                        ).toLocaleDateString('vi-VN')}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-white/90 rounded-xl border border-amber-200 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Điểm số</p>
                    <p className="text-lg font-black text-brand-600">{existingSubmission.score ?? 0} / 10</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Số câu đúng</p>
                    <p className="text-lg font-black text-emerald-600">
                      {existingSubmission.correctCount ?? 0} / {existingSubmission.totalQuestions}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Thời gian làm</p>
                    <p className="text-lg font-black text-slate-800">
                      {Math.floor((existingSubmission.durationSecondsUsed || 0) / 60)}p
                    </p>
                  </div>
                </div>

                {!isPracticeMode && (
                  <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-xs text-amber-900 font-medium leading-relaxed">
                    Hệ thống đã bảo lưu kết quả bài thi. Bạn không thể làm lại để tránh ghi đè dữ liệu.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (onViewResult) {
                      onViewResult(existingSubmission, selectedExam, selectedSession || undefined);
                    }
                  }}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>XEM LẠI KẾT QUẢ & PHIẾU ĐIỂM</span>
                </button>
              </div>
            )}

            {/* Exam Rules Card */}
            {(!existingSubmission || isPracticeMode) && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Shield className="w-3.5 h-3.5 text-brand-600" />
                  <span>Quy định phòng thi trực tuyến:</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Bài thi sẽ chạy ở chế độ <strong>Toàn màn hình</strong>. Không chuyển tab, không mở AI Extension hoặc thoát màn hình trong lúc thi.
                </p>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="space-y-2.5 pt-2">
              {(!existingSubmission || isPracticeMode) && (
                <button
                  type="submit"
                  disabled={!scheduleStatus.isOpen}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-brand-500/25 hover:shadow-brand-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer tracking-wide"
                >
                  <span>{existingSubmission && isPracticeMode ? 'LUYỆN TẬP LẠI LẦN NỮA' : 'BẮT ĐẦU LÀM BÀI THI'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleResetExam}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors cursor-pointer"
              >
                ← Nhập lại mã phòng thi khác
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 space-y-1">
        <p>© 2026 FEXAM · Nền Tảng Khảo Thí & Đánh Giá Năng Lực Học Sinh</p>
        <p className="text-[10px] text-slate-400">Bảo mật chuẩn AES-256 · Chống gian lận thời gian thực FEXAM Guard</p>
      </footer>
    </div>
  );
};
