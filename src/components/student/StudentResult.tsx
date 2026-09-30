import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Minus,
  Lock,
  Sparkles,
  Award,
  Check,
  Printer,
  FileCheck,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { Exam, ExamSubmission, ExamSession } from '../../types';
import { MathRenderer } from '../../lib/katex-renderer';

interface StudentResultProps {
  exam: Exam;
  submission: ExamSubmission;
  session?: ExamSession | null;
  onRetakeOrExit: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 giây';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} giây`;
  return `${m} phút ${s.toString().padStart(2, '0')} giây`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    ' · ' +
    d.toLocaleDateString('vi-VN')
  );
}

export const StudentResult: React.FC<StudentResultProps> = ({
  exam,
  submission,
  session,
  onRetakeOrExit,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'wrong' | 'unanswered'>('all');

  const scoreDisplayMode = session?.scoreDisplayMode ?? exam.settings.scoreDisplayMode;
  const showSolutionMode = session?.showSolutionMode ?? exam.settings.showSolutionMode;
  const allowReview =
    session?.allowReviewAnswers !== undefined
      ? session.allowReviewAnswers
      : (exam.settings.allowReviewAnswers ?? true);

  const showScore = scoreDisplayMode === 'immediate';
  const showSolutions = showSolutionMode === 'always';

  const score10 = submission.score ?? 0;

  const correctCount =
    submission.correctCount ??
    Object.values(submission.answers ?? {}).filter((a) => a.isCorrect).length;
  const wrongCount =
    submission.wrongCount ?? Math.max(0, submission.answeredCount - correctCount);
  const unanswered = Math.max(0, submission.totalQuestions - submission.answeredCount);

  useEffect(() => {
    if (showScore && score10 >= 5.0) {
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 } });
    }
  }, [showScore, score10]);

  const getScoreTier = (score: number) => {
    if (score >= 9.0) return { label: 'Xuất Sắc', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
    if (score >= 8.0) return { label: 'Giỏi', color: 'text-blue-700 bg-blue-50 border-blue-300' };
    if (score >= 6.5) return { label: 'Khá', color: 'text-indigo-700 bg-indigo-50 border-indigo-300' };
    if (score >= 5.0) return { label: 'Trung Bình', color: 'text-amber-700 bg-amber-50 border-amber-300' };
    return { label: 'Cần Cố Gắng', color: 'text-rose-700 bg-rose-50 border-rose-300' };
  };

  const scoreTier = getScoreTier(score10);

  const filteredQuestions = exam.questions.filter((q) => {
    const ans = submission.answers?.[q.id];
    const isAnswered = ans && (
      (q.type === 'multiple_choice' && ans.selectedOptionId) ||
      (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) ||
      (q.type === 'short_answer' && ans.shortAnswerText?.trim())
    );

    if (filterMode === 'correct') return ans?.isCorrect === true;
    if (filterMode === 'wrong') return isAnswered && ans?.isCorrect === false;
    if (filterMode === 'unanswered') return !isAnswered;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-brand-500 selection:text-white relative overflow-x-hidden font-sans">
      {/* Decorative Ambient Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden no-print">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/60 to-indigo-100/50 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/50 to-teal-100/40 rounded-full blur-[130px]" />
        <div className="absolute -bottom-40 right-1/4 w-[550px] h-[550px] bg-gradient-to-tl from-purple-100/40 to-pink-100/30 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 min-h-screen p-4 sm:p-8 flex flex-col items-center justify-start print:hidden no-print">
        <div className="max-w-3xl w-full space-y-6 pt-4 pb-16">

          {/* ── BANNER NỘP BÀI THÀNH CÔNG ── */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center shadow-card space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 via-emerald-500 to-indigo-500" />

            {/* Trophy Icon */}
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" />
                ĐÃ NỘP BÀI THI THÀNH CÔNG
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                {exam.title}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Thí sinh: <strong className="text-slate-900 font-bold">{submission.studentName}</strong>
                {submission.studentCode ? ` · SBD: ${submission.studentCode}` : ''}
                {submission.className ? ` · Lớp: ${submission.className}` : ''}
              </p>
            </div>

            {/* Score Display Card */}
            {showScore ? (
              <div className="bg-gradient-to-br from-brand-50/90 via-blue-50/60 to-indigo-50/90 border border-brand-200/90 rounded-3xl p-6 max-w-sm mx-auto space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-brand-700 uppercase tracking-wider">
                    Điểm Số Bài Thi
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${scoreTier.color}`}>
                    {scoreTier.label}
                  </span>
                </div>
                <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                  {score10}
                  <span className="text-lg text-slate-400 font-bold"> / 10</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-brand-800 text-xs font-semibold max-w-md mx-auto">
                Điểm số bài thi sẽ được giáo viên bộ môn tổng hợp và công bố sau khi kết thúc đợt kiểm tra.
              </div>
            )}

            {/* Violations Warning Notice */}
            {submission.violations && submission.violations.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl font-medium max-w-md mx-auto">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ghi nhận {submission.violations.length} lần cảnh báo vi phạm trong quá trình làm bài.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Điểm</span>
              </button>

              <button
                onClick={onRetakeOrExit}
                className="px-7 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-md inline-flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay Lại Trang Chủ</span>
              </button>
            </div>
          </div>

          {/* ── THỐNG KÊ CHI TIẾT BÀI THI ── */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span>Thống kê kết quả làm bài</span>
              </h2>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Tổng {submission.totalQuestions} câu
              </span>
            </div>

            {/* 4 Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                <p className="text-2xl font-black text-emerald-700">{correctCount}</p>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Câu đúng</p>
              </div>

              <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-center space-y-1">
                <XCircle className="w-5 h-5 text-rose-500 mx-auto" />
                <p className="text-2xl font-black text-rose-600">{wrongCount}</p>
                <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Câu sai</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-1">
                <Minus className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-2xl font-black text-slate-600">{unanswered}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bỏ trống</p>
              </div>

              <div className="bg-brand-50/80 border border-brand-200/80 rounded-2xl p-4 text-center space-y-1">
                <Clock className="w-5 h-5 text-brand-600 mx-auto" />
                <p className="text-base font-black text-brand-700 leading-tight pt-1">
                  {formatDuration(submission.durationSecondsUsed)}
                </p>
                <p className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Thời gian làm</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Thời gian nộp bài:</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">
                {formatDateTime(submission.submitTime)}
              </span>
            </div>
          </div>

          {/* ── MỤC XEM LẠI BÀI THI & LỜI GIẢI (CÓ THỂ BẬT/TẮT THEO GIÁO VIÊN) ── */}
          {allowReview ? (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                  <h2 className="text-lg font-black text-slate-900">Xem Lại Chi Tiết Bài Làm</h2>
                </div>

                {/* Question Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 text-xs self-start sm:self-auto">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({exam.questions.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('correct')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      filterMode === 'correct'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Đúng ({correctCount})
                  </button>
                  <button
                    onClick={() => setFilterMode('wrong')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      filterMode === 'wrong'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Sai ({wrongCount})
                  </button>
                  <button
                    onClick={() => setFilterMode('unanswered')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      filterMode === 'unanswered'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chưa làm ({unanswered})
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {filteredQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <CheckCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold">Không có câu hỏi nào thuộc bộ lọc này.</p>
                  </div>
                ) : (
                  filteredQuestions.map((q) => {
                    const originalIdx = exam.questions.findIndex((orig) => orig.id === q.id);
                    const ans = submission.answers?.[q.id];
                    const isCorrect = ans?.isCorrect;

                    return (
                      <div key={q.id} className="p-5 sm:p-6 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-brand-600 uppercase tracking-wider">
                            Câu {originalIdx + 1} · {q.type === 'multiple_choice' ? 'Trắc nghiệm 4 lựa chọn' : q.type === 'true_false' ? 'Đúng / Sai 4 ý' : 'Trả lời ngắn'}
                          </span>
                          {showScore && (
                            isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Đúng ({ans?.awardedPoints ?? q.points ?? 1}đ)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-0.5 rounded-full">
                                <XCircle className="w-3.5 h-3.5" /> Sai (0đ)
                              </span>
                            )
                          )}
                        </div>

                        <div className="text-sm text-slate-900 font-medium leading-relaxed">
                          <MathRenderer content={q.prompt} />
                        </div>

                        {/* Multiple choice options review */}
                        {q.type === 'multiple_choice' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {(q.options || []).map((opt) => {
                              const isKey = (opt.label === q.correctOptionId || opt.id === q.correctOptionId) && showSolutions;
                              const isStudentPick = ans?.selectedOptionId === opt.label || ans?.selectedOptionId === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3.5 rounded-xl text-xs border font-medium transition-all ${
                                    isKey
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                                      : isStudentPick && !isCorrect
                                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                                      : isStudentPick
                                      ? 'border-brand-300 bg-brand-50 text-brand-900 font-bold'
                                      : 'border-slate-200 bg-white text-slate-700'
                                  }`}
                                >
                                  <span className="font-bold mr-1.5">{opt.label}.</span>
                                  <MathRenderer content={opt.text} />
                                  {isKey && <span className="ml-2 text-emerald-700 font-bold">(Đáp án đúng)</span>}
                                  {isStudentPick && <span className="ml-2 text-brand-700 font-bold">(Bạn chọn)</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True / False 4 statements review */}
                        {q.type === 'true_false' && q.trueFalseItems && (
                          <div className="space-y-2 pt-1">
                            {q.trueFalseItems.map((item) => {
                              const rawStudentVal = ans?.trueFalseAnswers?.[item.id] !== undefined 
                                ? ans?.trueFalseAnswers?.[item.id] 
                                : ans?.trueFalseAnswers?.[item.label];
                              
                              const studentBool = typeof rawStudentVal === 'boolean'
                                ? rawStudentVal
                                : typeof rawStudentVal === 'string'
                                ? ((rawStudentVal as string).toLowerCase() === 'true' || (rawStudentVal as string).toLowerCase() === 'đúng')
                                : undefined;

                              const itemCorrectBool = typeof item.isCorrect === 'boolean'
                                ? item.isCorrect
                                : typeof item.isCorrect === 'string'
                                ? ((item.isCorrect as string).toLowerCase() === 'true' || (item.isCorrect as string).toLowerCase() === 'đúng')
                                : false;

                              const isItemCorrect = studentBool !== undefined && studentBool === itemCorrectBool;
                              return (
                                <div
                                  key={item.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{item.label})</span>
                                    <MathRenderer content={item.statement} />
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                                    <span>
                                      Bạn chọn: <strong className={studentBool === undefined ? 'text-slate-500' : isItemCorrect ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                        {studentBool === true ? 'ĐÚNG' : studentBool === false ? 'SAI' : 'Chưa chọn'}
                                      </strong>
                                    </span>
                                    {showSolutions && (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                        Đáp án: {itemCorrectBool ? 'ĐÚNG' : 'SAI'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Short Answer review */}
                        {q.type === 'short_answer' && (
                          <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Câu trả lời của bạn:</span>
                              <strong className={isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                {ans?.shortAnswerText || 'Bỏ trống'}
                              </strong>
                            </div>
                            {showSolutions && q.shortAnswerCorrect && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-emerald-800 font-bold">
                                <span>Đáp án chấp nhận:</span>
                                <span>{q.shortAnswerCorrect.join(' hoặc ')}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Explanation if allowed */}
                        {showSolutions && q.explanation && (
                          <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-brand-900 space-y-1.5">
                            <span className="font-extrabold text-brand-700 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Lời giải chi tiết:
                            </span>
                            <div className="leading-relaxed">
                              <MathRenderer content={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-card text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Không mở xem lại chi tiết bài làm
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Giáo viên phụ trách đã tắt tính năng xem lại bài làm và đáp án chi tiết cho đợt thi này để đảm bảo tính bảo mật.
              </p>
            </div>
          )}

          {/* Footer Branding */}
          <div className="text-center text-xs text-slate-400 pt-2 space-y-1 no-print">
            <p className="font-medium">Dự án FEXAM — Thuộc khuôn khổ dự án FPREP LMS</p>
            <p className="text-[11px]">Email hỗ trợ: fprep.thptqg@gmail.com</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PHIẾU ĐIỂM CHUẨN 1 TRANG A4 (TỐI ƯU HOÀN TOÀN CHO IN ẤN / XUẤT PDF)     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block print:w-full print:m-0 print:p-4 bg-white text-slate-900 font-sans text-xs">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: #ffffff !important;
            }
            .no-print, header, nav, footer, .ambient-bg {
              display: none !important;
            }
          }
        `}} />

        <div className="border-2 border-slate-900 p-5 rounded-2xl space-y-3.5 max-h-[280mm] flex flex-col justify-between">
          {/* Header Title */}
          <div className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                HỆ THỐNG KHẢO THÍ TRỰC TUYẾN FEXAM · FPREP LMS
              </p>
              <h1 className="text-lg font-black uppercase tracking-tight text-slate-950">
                PHIẾU KẾT QUẢ BÀI THI & ĐÁNH GIÁ NĂNG LỰC
              </h1>
            </div>
            <div className="text-right text-[10px] text-slate-500 font-mono">
              <p>Mã bài: {submission.id ? submission.id.slice(0, 16) : '—'}</p>
              <p>Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          {/* Section 1: Đề Thi */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>1. THÔNG TIN ĐỀ THI</span>
              <span className="font-mono text-[10px] text-slate-600 font-bold">Mã đề: {submission.sessionCode || exam.code}</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <p>Tên đề thi: <strong className="font-bold text-slate-900">{exam.title}</strong></p>
              <p>Môn học: <strong className="font-bold text-slate-900">{exam.subject || 'Toán học'}</strong></p>
              <p>Thời lượng quy định: <strong className="font-bold text-slate-900">{exam.settings.durationMinutes || 45} phút</strong></p>
              <p>Thời gian làm bài: <strong className="font-bold text-slate-900">{formatDuration(submission.durationSecondsUsed)}</strong></p>
              <p className="col-span-2">Thời điểm nộp bài: <strong className="font-bold text-slate-900 font-mono">{formatDateTime(submission.submitTime)}</strong></p>
            </div>
          </div>

          {/* Section 2: Thông tin thí sinh */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>2. THÔNG TIN THÍ SINH</span>
              <span className="font-mono text-[10px] text-slate-600 font-bold">SBD: {submission.studentCode || '—'}</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <p>Họ và tên: <strong className="font-bold text-slate-950 text-sm">{submission.studentName}</strong></p>
              <p>Số Báo Danh (SBD): <strong className="font-bold font-mono text-slate-900">{submission.studentCode || '—'}</strong></p>
              <p>Mã số học sinh (MSHS): <strong className="font-bold font-mono text-slate-900">{submission.mshs || '—'}</strong></p>
              <p>Lớp học: <strong className="font-bold text-slate-900">{submission.className || '—'}</strong></p>
              {submission.email && (
                <p className="col-span-2">Email liên hệ: <span className="font-mono text-slate-700">{submission.email}</span></p>
              )}
            </div>
          </div>

          {/* Section 3 & 4: Điểm số & Số câu làm đúng */}
          <div className="grid grid-cols-3 gap-3">
            {/* Điểm */}
            <div className="col-span-1 bg-slate-100 p-3.5 rounded-xl border border-slate-300 text-center space-y-1 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">ĐIỂM SỐ CHÍNH THỨC</p>
              <p className="text-3xl font-black text-slate-950 tracking-tight">{score10} <span className="text-xs font-normal text-slate-600">/ 10</span></p>
              <p className="text-xs font-black text-slate-800 uppercase">Xếp loại: {scoreTier.label}</p>
            </div>

            {/* Số câu đúng */}
            <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                3. TỔNG HỢP SỐ CÂU LÀM ĐÚNG
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Số câu đúng</p>
                  <p className="text-sm font-black text-emerald-700">{correctCount}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Số câu sai</p>
                  <p className="text-sm font-black text-rose-600">{wrongCount}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Bỏ trống</p>
                  <p className="text-sm font-black text-slate-600">{unanswered}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 text-center pt-0.5">
                Tỷ lệ trả lời chính xác: <strong>{Math.round((correctCount / (submission.totalQuestions || 1)) * 100)}%</strong> ({correctCount}/{submission.totalQuestions} câu)
              </p>
            </div>
          </div>

          {/* Section 5: Giám sát vi phạm */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1 text-xs">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>4. TÌNH TRẠNG GIÁM SÁT VI PHẠM (FEXAM GUARD)</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                (submission.violations?.length || 0) === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {(submission.violations?.length || 0) === 0 ? 'Bảo đảm quy chế thi' : `Ghi nhận ${submission.violations.length} cảnh báo`}
              </span>
            </h2>
            <div className="pt-0.5 text-[11px]">
              <p>
                Tổng số lần cảnh báo ghi nhận trong phiên làm bài: <strong className="font-bold">{submission.violations?.length || 0} lần</strong>
              </p>
              {submission.violations && submission.violations.length > 0 ? (
                <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
                  {submission.violations.slice(0, 2).map((v, i) => (
                    <p key={i}>• Lúc {new Date(v.timestamp).toLocaleTimeString('vi-VN')}: {v.message || v.type}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-emerald-700 italic pt-0.5">
                  Thí sinh tuân thủ đúng quy chế thi, không phát hiện vi phạm chuyển tab hoặc gian lận.
                </p>
              )}
            </div>
          </div>

          {/* Section 6: Chữ ký xác nhận */}
          <div className="grid grid-cols-2 gap-4 pt-3 text-center text-xs">
            <div className="space-y-10">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">THÍ SINH XÁC NHẬN</p>
              <p className="text-slate-400 italic text-[9px]">(Ký và ghi rõ họ tên)</p>
            </div>

            <div className="space-y-10">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">GIÁO VIÊN BỘ MÔN / HỘI ĐỒNG THI</p>
              <p className="text-slate-400 italic text-[9px]">(Ký và xác thực)</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[8.5px] text-slate-400 pt-1.5 border-t border-slate-200">
            FEXAM Authentication Ref: {submission.id} · Phiếu điểm điện tử chuẩn 1 trang A4 của FPREP LMS
          </div>
        </div>
      </div>
    </div>
  );
};
