import React, { useState } from 'react';
import { Database, Search, Plus, Filter, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { Question } from '../../types';
import { MathRenderer } from '../../lib/katex-renderer';

export const QuestionBank: React.FC = () => {
  const { exams } = useExam();
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Extract all questions from all exams
  const allQuestions: { question: Question; examTitle: string; subject: string }[] = [];
  exams.forEach((ex) => {
    ex.questions.forEach((q) => {
      allQuestions.push({
        question: q,
        examTitle: ex.title,
        subject: ex.subject || 'Toán học',
      });
    });
  });

  const filtered = allQuestions.filter((item) => {
    if (selectedSubject !== 'all' && item.subject !== selectedSubject) return false;
    if (search && !item.question.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Ngân hàng câu hỏi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kho lưu trữ và tái sử dụng câu hỏi trắc nghiệm, đúng sai và trả lời ngắn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100">
            {allQuestions.length} câu hỏi có sẵn
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi theo nội dung, công thức..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'Toán học', 'Vật Lí', 'Hóa Học'].map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                selectedSubject === sub
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sub === 'all' ? 'Tất cả môn' : sub}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {item.subject}
                </span>
                <span className="text-xs text-slate-400">Từ đề: {item.examTitle}</span>
              </div>
              <span className="text-xs font-bold text-slate-600">
                {item.question.type === 'multiple_choice'
                  ? '4 lựa chọn'
                  : item.question.type === 'true_false'
                  ? 'Đúng / Sai'
                  : 'Trả lời ngắn'}{' '}
                · {item.question.points}đ
              </span>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed font-medium">
              <MathRenderer content={item.question.prompt} />
            </div>

            {item.question.options && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {item.question.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-2 rounded-lg text-xs border ${
                      opt.label === item.question.correctOptionId
                        ? 'border-emerald-500 bg-emerald-50/40 font-bold text-emerald-800'
                        : 'border-slate-100 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="mr-1">{opt.label}.</span>
                    <MathRenderer content={opt.text} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
