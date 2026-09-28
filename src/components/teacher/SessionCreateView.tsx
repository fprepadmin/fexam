import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Users,
  Link as LinkIcon,
  Clock,
  Sparkles,
  Download,
  Check,
  Save,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { ExamSession, AntiCheatLevel, SessionCandidate, SessionStatus, ScoreDisplayMode, ShowSolutionMode } from '../../types';

interface SessionCreateViewProps {
  initialExamId?: string;
  initialSessionType?: 'exam' | 'practice';
  editingSessionId?: string;
  onBack: () => void;
  onCreated: (sessionId: string) => void;
}

export const SessionCreateView: React.FC<SessionCreateViewProps> = ({
  initialExamId,
  initialSessionType = 'exam',
  editingSessionId,
  onBack,
  onCreated,
}) => {
  const { user } = useAuth();
  const { exams, sessions, classes, students, saveSession } = useExam();

  const editingSession = editingSessionId ? sessions.find((s) => s.id === editingSessionId) : undefined;
  const isEditing = Boolean(editingSession);

  // Filter exams and classes belonging to this teacher
  const myExams = user?.role === 'admin'
    ? exams
    : exams.filter((e) => !e.authorId || e.authorId === user?.id || (user?.email && e.authorEmail === user.email));

  const myClasses = user?.role === 'admin'
    ? classes
    : classes.filter((c) => !c.teacherId || c.teacherId === user?.id || (user?.email && c.teacherEmail === user.email));

  const toLocalISOString = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Generate clean 5-digit session code & avoid collision with existing sessions
  const generateClean5DigitCode = () => {
    const existingCodes = new Set(sessions.map((s) => s.code?.toUpperCase()));
    for (let i = 0; i < 100; i++) {
      const candidate = String(Math.floor(10000 + Math.random() * 90000));
      if (!existingCodes.has(candidate)) {
        return candidate;
      }
    }
    return String(Math.floor(10000 + Math.random() * 90000));
  };

  // State: Session Type (Ca Thi Chính Thức vs Ca Ôn Tập)
  const [sessionType, setSessionType] = useState<'exam' | 'practice'>(
    editingSession?.sessionType || initialSessionType || 'exam'
  );

  // State
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    if (editingSession) return editingSession.examId;
    if (initialExamId && myExams.some((e) => e.id === initialExamId)) {
      return initialExamId;
    }
    return myExams[0]?.id || '';
  });
  const [sessionTitle, setSessionTitle] = useState(editingSession?.title || '');
  const [sessionCode, setSessionCode] = useState(editingSession?.code || generateClean5DigitCode());
  const [mode, setMode] = useState<'class' | 'free'>(editingSession?.mode || 'class');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(editingSession?.targetClassIds || []);
  const [durationMinutes, setDurationMinutes] = useState(editingSession?.durationMinutes || 45);
  const [startTime, setStartTime] = useState(
    editingSession?.startTime ? toLocalISOString(new Date(editingSession.startTime)) : toLocalISOString(new Date())
  );
  const [endTime, setEndTime] = useState(
    editingSession?.endTime
      ? toLocalISOString(new Date(editingSession.endTime))
      : toLocalISOString(new Date(Date.now() + 2 * 3600 * 1000))
  );
  const [password, setPassword] = useState(editingSession?.password || '');
  const [antiCheatLevel, setAntiCheatLevel] = useState<AntiCheatLevel>(
    editingSession?.antiCheatLevel || (sessionType === 'practice' ? 'none' : 'strict')
  );
  const [maxViolations, setMaxViolations] = useState(
    editingSession?.maxViolationsAllowed || (sessionType === 'practice' ? 999 : 3)
  );
  const [status, setStatus] = useState<SessionStatus>(editingSession?.status || 'active');

  const selectedExam = myExams.find((e) => e.id === selectedExamId) || myExams[0];

  // Post-exam Review & Display Settings
  const [allowReviewAnswers, setAllowReviewAnswers] = useState<boolean>(
    editingSession?.allowReviewAnswers ?? selectedExam?.settings.allowReviewAnswers ?? true
  );
  const [scoreDisplayMode, setScoreDisplayMode] = useState<ScoreDisplayMode>(
    editingSession?.scoreDisplayMode || selectedExam?.settings.scoreDisplayMode || 'immediate'
  );
  const [showSolutionMode, setShowSolutionMode] = useState<ShowSolutionMode>(
    editingSession?.showSolutionMode || (sessionType === 'practice' ? 'always' : selectedExam?.settings.showSolutionMode || 'after_close')
  );

  const handleToggleSessionType = (type: 'exam' | 'practice') => {
    setSessionType(type);
    if (type === 'practice') {
      setAntiCheatLevel('none');
      setMaxViolations(999);
      setShowSolutionMode('always');
      setAllowReviewAnswers(true);
      setScoreDisplayMode('immediate');
    } else {
      setAntiCheatLevel('strict');
      setMaxViolations(3);
      setShowSolutionMode('after_close');
    }
  };

  // Auto-generate Candidate Exam Codes (Mã dự thi 5 chữ số sạch) based on selected classes' students
  const targetStudents = students.filter((s) => selectedClassIds.includes(s.classId));
  const autoCandidates: SessionCandidate[] = targetStudents.map((st, idx) => {
    const clsObj = myClasses.find((c) => c.id === st.classId);
    const clsName = st.className || clsObj?.name || '12';
    const baseSeed = parseInt(sessionCode.replace(/\D/g, ''), 10) || 50000;
    const candidateCode = String(((baseSeed + (idx + 1) * 3) % 90000) + 10000);
    return {
      id: `cand-${sessionCode}-${st.id}-${candidateCode}`,
      studentId: st.id,
      mshs: st.mshs || st.studentCode || `HS${1000 + idx + 1}`,
      name: st.name,
      className: clsName,
      email: st.email || '',
      candidateCode,
      status: 'not_started',
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExam) {
      alert('Vui lòng chọn đề thi cho ca thi!');
      return;
    }

    if (mode === 'class' && selectedClassIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp học cho ca thi!');
      return;
    }

    const targetClassNames = myClasses
      .filter((c) => selectedClassIds.includes(c.id))
      .map((c) => c.name);

    let finalCandidates: SessionCandidate[] = [];
    if (mode === 'class') {
      if (isEditing && editingSession?.candidates && editingSession.candidates.length > 0) {
        const existingClassIds = new Set(editingSession.targetClassIds || []);
        const sameClasses = selectedClassIds.length === existingClassIds.size && selectedClassIds.every((id) => existingClassIds.has(id));
        finalCandidates = sameClasses ? editingSession.candidates : autoCandidates;
      } else {
        finalCandidates = autoCandidates;
      }
    }

    const defaultTitle = sessionType === 'practice'
      ? `Ca ôn tập: ${selectedExam.title}`
      : `Ca thi: ${selectedExam.title}`;

    const sessionPayload: ExamSession = {
      id: editingSession?.id || `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: sessionTitle.trim() || defaultTitle,
      code: sessionCode.trim().toUpperCase(),
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      examCode: selectedExam.code,
      teacherId: user?.id || editingSession?.teacherId,
      teacherEmail: user?.email || editingSession?.teacherEmail,
      teacherName: user?.name || editingSession?.teacherName,
      mode,
      targetClassIds: mode === 'class' ? selectedClassIds : [],
      targetClassNames: mode === 'class' ? targetClassNames : [],
      candidates: finalCandidates,
      durationMinutes: durationMinutes || selectedExam.settings?.durationMinutes || 45,
      startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
      endTime: endTime ? new Date(endTime).toISOString() : new Date(Date.now() + (durationMinutes || 45) * 60 * 1000 + 3600 * 1000).toISOString(),
      password: password.trim() || undefined,
      antiCheatLevel: sessionType === 'practice' ? 'none' : (antiCheatLevel || 'strict'),
      maxViolationsAllowed: sessionType === 'practice' ? 999 : (maxViolations || 3),
      sessionType,
      allowReviewAnswers,
      scoreDisplayMode,
      showSolutionMode,
      status,
      createdAt: editingSession?.createdAt || new Date().toLocaleDateString('vi-VN'),
    };

    saveSession(sessionPayload);
    alert(isEditing ? `Đã cập nhật ca thi "${sessionPayload.title}" thành công!` : `Đã tạo "${sessionPayload.title}" thành công!`);
    onCreated(sessionPayload.id);
  };

  const handleDownloadRosterTxt = () => {
    if (autoCandidates.length === 0) return;
    const content = `DANH SÁCH MÃ DỰ THI (SBD) — ${sessionTitle || selectedExam.title}\nMã Ca: ${sessionCode}\nThời gian: ${new Date(startTime).toLocaleString('vi-VN')}\n----------------------------------------\nSTT | MSHS | Họ và tên | Lớp | Mã dự thi (SBD)\n` +
      autoCandidates.map((c, i) => `${i + 1}. | ${c.mshs} | ${c.name} | ${c.className} | SBD: ${c.candidateCode}`).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_SBD_Ca_${sessionCode}.txt`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {isEditing
                ? `Chỉnh Sửa Ca (${sessionCode})`
                : sessionType === 'practice'
                ? 'Tạo Ca Ôn Tập & Luyện Tập'
                : 'Tạo Ca Thi Chính Thức'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditing
                ? 'Cập nhật đề thi, thời gian, lớp học hoặc trạng thái của ca'
                : 'Chọn loại ca → Chọn đề → Giao theo Lớp (Tự sinh SBD) hoặc Tự do (Link) → Bắt đầu'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 0: Chọn Loại Ca (Ca Thi Chính Thức vs Ca Ôn Tập) */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">1. Chọn Loại Ca Tổ Chức</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {sessionType === 'practice' ? 'Ca ôn tập tự do' : 'Ca thi chính thức'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => handleToggleSessionType('exam')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                sessionType === 'exam'
                  ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${sessionType === 'exam' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Ca Thi Chính Thức</h3>
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                      Khảo sát / Đánh giá
                    </span>
                  </div>
                </div>
                {sessionType === 'exam' && <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                Bật FEXAM Guard: Bắt buộc Toàn màn hình (Fullscreen), chống chuyển tab, làm mờ màn hình và tính lỗi vi phạm.
              </p>
            </div>

            <div
              onClick={() => handleToggleSessionType('practice')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                sessionType === 'practice'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${sessionType === 'practice' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Ca Ôn Tập &amp; Luyện Tập</h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Tự do / Tắt chống gian lận
                    </span>
                  </div>
                </div>
                {sessionType === 'practice' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              </div>
              <p className="text-xs text-emerald-700 font-medium mt-2.5 leading-relaxed">
                Tắt hoàn toàn chống gian lận: Học sinh không bị ép Fullscreen, không mờ màn hình, thoải mái làm lại và tra cứu tài liệu.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Chọn Đề Thi */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">2. Chọn Đề thi cho Ca này</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {myExams.map((ex) => {
              const isSelected = selectedExamId === ex.id;
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    setSelectedExamId(ex.id);
                    setDurationMinutes(ex.settings.durationMinutes || 45);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                        {ex.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{ex.subject}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{ex.title}</h3>
                    <p className="text-xs text-slate-400">
                      {ex.questions.length} câu hỏi · {ex.settings.durationMinutes} phút làm bài
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Chọn Phương Thức Tổ Chức (Theo Lớp vs Tự Do) */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-card space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">3. Phương thức Phân phối Ca thi</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
              {mode === 'free' ? (
                <>
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tự do qua link</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  <span>Theo danh sách lớp</span>
                </>
              )}
            </span>
          </div>

          {/* Mode switch - Mutually Exclusive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => {
                setMode('free');
                setSelectedClassIds([]);
              }}
              className={`p-5 rounded-2xl border cursor-pointer transition-all relative ${
                mode === 'free'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${mode === 'free' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Mở Tự Do Qua Link / Mã Ca</h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Công khai / Mở
                    </span>
                  </div>
                </div>
                {mode === 'free' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Học sinh tự điền Họ tên, MSHS và Lớp khi mở link hoặc nhập mã ca thi để vào phòng thi. Không cần tạo danh sách lớp trước.
              </p>
            </div>

            <div
              onClick={() => setMode('class')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all relative ${
                mode === 'class'
                  ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${mode === 'class' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Theo Danh Sách Lớp Học</h3>
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                      Bảo mật cao / SBD riêng
                    </span>
                  </div>
                </div>
                {mode === 'class' && <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Chỉ định cụ thể các Lớp học được tham gia. Hệ thống tự động sinh Số báo danh (SBD) riêng cho từng em.
              </p>
            </div>
          </div>

          {/* If mode is class: select target classes */}
          {mode === 'class' && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chọn Lớp học được phép tham gia:
                </label>
                <span className="text-xs text-slate-400">
                  Đã chọn {selectedClassIds.length} lớp · {autoCandidates.length} thí sinh
                </span>
              </div>

              {myClasses.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                  Bạn chưa có lớp học nào. Vui lòng vào mục "Quản lý Lớp học" để tạo lớp và thêm danh sách học sinh.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {myClasses.map((cls) => {
                    const isChecked = selectedClassIds.includes(cls.id);
                    const count = students.filter((s) => s.classId === cls.id).length;
                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedClassIds(selectedClassIds.filter((id) => id !== cls.id));
                          } else {
                            setSelectedClassIds([...selectedClassIds, cls.id]);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/70 text-brand-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{cls.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{count} học sinh</p>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Candidate Roster Preview */}
              {autoCandidates.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Mẫu Mã Dự Thi (SBD) tự động sinh cho {autoCandidates.length} học sinh:
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadRosterTxt}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-600" />
                      <span>Xuất Danh Sách (.txt)</span>
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2 font-mono text-[11px]">
                    {autoCandidates.slice(0, 10).map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">#{i + 1}</span>
                          <span className="font-bold text-slate-800 font-sans">{c.name}</span>
                          <span className="text-slate-400">({c.mshs})</span>
                        </div>
                        <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                          SBD: {c.candidateCode}
                        </span>
                      </div>
                    ))}
                    {autoCandidates.length > 10 && (
                      <p className="text-center text-[10px] text-slate-400 pt-1">
                        ...và {autoCandidates.length - 10} học sinh khác
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Cấu hình Thời gian, Trạng thái & Bảo mật */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-card space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">4. Thời gian, Trạng thái &amp; Cấu hình</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên Ca
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={sessionType === 'practice' ? `Ca ôn tập: ${selectedExam?.title || 'Luyện tập'}` : `Ca thi: ${selectedExam?.title || 'Khảo sát'}`}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã Ca (Dùng để vào thi / ôn tập)
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono font-black focus:ring-2 focus:ring-brand-500 uppercase"
              />
            </div>

            {/* Status Switcher */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Trạng thái ca
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'active', label: 'Đang diễn ra', desc: 'Học sinh vào làm bài ngay', color: 'border-rose-300 bg-rose-50/70 text-rose-700' },
                  { id: 'upcoming', label: 'Sắp tới', desc: 'Chưa mở làm bài', color: 'border-amber-300 bg-amber-50/70 text-amber-700' },
                  { id: 'closed', label: 'Đã đóng', desc: 'Khóa không nhận bài', color: 'border-slate-300 bg-slate-100 text-slate-700' },
                ].map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setStatus(st.id as SessionStatus)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      status === st.id
                        ? `${st.color} ring-2 ring-brand-500/20 font-bold shadow-xs`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <p className="text-xs font-bold">{st.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{st.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Thời gian bắt đầu mở ca
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Thời gian kết thúc ca (Hạn chót)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Thời lượng làm bài (Phút)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 45)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mật khẩu ca thi (Để trống nếu không đặt)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ví dụ: 123456"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Anti-cheat configuration (Only for Official Exam Sessions) */}
            {sessionType === 'exam' ? (
              <div className="sm:col-span-2 space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cấp độ chống gian lận FEXAM Guard
                    </label>
                    <select
                      value={antiCheatLevel}
                      onChange={(e) => setAntiCheatLevel(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="strict">Nghiêm ngặt (Cảnh báo &amp; Thu bài sau 3 lần)</option>
                      <option value="maximum">Tối đa (Chặn chuột, chống copy &amp; phím tắt)</option>
                      <option value="standard">Tiêu chuẩn (Ghi nhận vi phạm nhẹ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Số lần vi phạm tối đa (Strikes) trước khi thu bài
                    </label>
                    <select
                      value={maxViolations}
                      onChange={(e) => setMaxViolations(parseInt(e.target.value, 10) || 3)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-brand-500"
                    >
                      <option value={1}>1 lần (Khóa ngay khi rời màn hình)</option>
                      <option value={3}>3 lần (Tiêu chuẩn khuyến nghị)</option>
                      <option value={5}>5 lần (Linh hoạt)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Post-submission Review & Display Settings */}
            <div className="sm:col-span-2 space-y-4 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tùy chọn sau khi thí sinh nộp bài
              </h3>

              {/* Toggle allowReviewAnswers */}
              <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      Cho phép học sinh xem lại bài làm &amp; đáp án chi tiết
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allowReviewAnswers ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {allowReviewAnswers ? 'Đang BẬT' : 'Đang TẮT'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {allowReviewAnswers
                      ? 'Học sinh được xem lại từng câu hỏi, câu đúng / sai và đối chiếu đáp án sau khi nộp.'
                      : 'Học sinh chỉ nhận điểm số / phiếu điểm tổng quát, khóa hoàn toàn khu vực xem lại từng câu hỏi để bảo mật ngân hàng đề.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowReviewAnswers}
                  onChange={(e) => setAllowReviewAnswers(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chế độ hiển thị điểm số
                  </label>
                  <select
                    value={scoreDisplayMode}
                    onChange={(e) => setScoreDisplayMode(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="immediate">Hiển thị điểm ngay sau khi nộp</option>
                    <option value="after_close">Chỉ hiển thị sau khi đóng ca thi</option>
                    <option value="hidden">Ẩn điểm (Không hiển thị cho thí sinh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chế độ xem lời giải chi tiết
                  </label>
                  <select
                    value={showSolutionMode}
                    onChange={(e) => setShowSolutionMode(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="always">Luôn cho xem lời giải sau khi nộp</option>
                    <option value="after_close">Chỉ xem lời giải sau khi đóng ca thi</option>
                    <option value="never">Không cho xem lời giải</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-md shadow-brand-500/25 transition-all hover:scale-[1.01]"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Cập Nhật</span>
              </>
            ) : sessionType === 'practice' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Khởi Chạy Ca Ôn Tập</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Khởi Chạy Ca Thi &amp; Cấp SBD</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
