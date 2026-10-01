import { Exam, ExamSession, Question, StudentAnswer, TrueFalseItem, ExamSubmission } from '../types';
import { seededShuffle } from './anti-cheat';

/**
 * Deterministically generates the personalized question and option list for a student,
 * correctly handling question shuffling and option shuffling with accurate correctOptionId tracking.
 */
export function getStudentQuestionsList(
  exam: Exam,
  session?: ExamSession | null,
  studentCode?: string,
  mshs?: string
): Question[] {
  const cleanStudentCodeKey = (studentCode || mshs || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');

  const raw = (exam.questions || []).map((q, idx) => ({
    ...q,
    id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${idx + 1}-${exam.id || 'exam'}`,
    order: q.order || idx + 1,
  }));

  const shouldShuffleQuestions = Boolean(
    session?.shuffleQuestions !== undefined
      ? session.shuffleQuestions
      : exam.settings?.shuffleQuestions
  );
  const shouldShuffleOptions = Boolean(
    session?.shuffleOptions !== undefined
      ? session.shuffleOptions
      : exam.settings?.shuffleOptions
  );

  let result = raw;

  // 1. Shuffle Questions if enabled
  if (shouldShuffleQuestions) {
    result = seededShuffle(raw, `${exam.id}_${cleanStudentCodeKey}_questions`).map((q, newIdx) => ({
      ...q,
      order: newIdx + 1, // Display order 1..N
    }));
  }

  // 2. Shuffle Multiple Choice Options if enabled
  if (shouldShuffleOptions) {
    result = result.map((q) => {
      if (q.type === 'multiple_choice' && q.options && q.options.length > 1) {
        // 1. Identify which option was originally the correct one
        const origTarget = (q.correctOptionId || 'A').trim().toUpperCase();
        const correctOptIndex = q.options.findIndex(
          (o) =>
            (o.label && o.label.trim().toUpperCase() === origTarget) ||
            (o.id && o.id.trim().toUpperCase() === origTarget) ||
            (o.id && o.id.trim() === q.correctOptionId?.trim())
        );
        const correctOriginalOpt = correctOptIndex >= 0 ? q.options[correctOptIndex] : q.options[0];

        // 2. Deterministic shuffle for this student & question
        const shuffledOpts = seededShuffle(
          q.options,
          `${exam.id}_${cleanStudentCodeKey}_opt_${q.id}`
        );

        // 3. Re-assign clean visual labels (A, B, C, D) AND id to prevent any collision
        const standardLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        let newCorrectOptionId = 'A';

        const reLabeledOpts = shuffledOpts.map((opt, oIdx) => {
          const newLabel = standardLabels[oIdx] || String.fromCharCode(65 + oIdx);
          if (
            opt === correctOriginalOpt ||
            (correctOriginalOpt && opt.id === correctOriginalOpt.id && opt.text === correctOriginalOpt.text)
          ) {
            newCorrectOptionId = newLabel;
          }
          return {
            ...opt,
            id: newLabel,
            label: newLabel,
          };
        });

        return {
          ...q,
          options: reLabeledOpts,
          correctOptionId: newCorrectOptionId,
        };
      }
      return q;
    });
  } else {
    // When options are not shuffled, normalize option ids and labels to prevent any cross-collisions
    result = result.map((q) => {
      if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
        const standardLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        const normalizedOpts = q.options.map((opt, oIdx) => {
          const label = opt.label || standardLabels[oIdx] || String.fromCharCode(65 + oIdx);
          return {
            ...opt,
            id: opt.id || label,
            label,
          };
        });
        return {
          ...q,
          options: normalizedOpts,
        };
      }
      return q;
    });
  }

  return result;
}

/**
 * Grade a single question answer according to MOET 2025 standard
 */
export function gradeQuestion(question: Question, answer?: StudentAnswer): { awardedPoints: number; isCorrect: boolean } {
  if (!answer) {
    return { awardedPoints: 0, isCorrect: false };
  }

  const maxPoints = question.points !== undefined && !isNaN(Number(question.points))
    ? Number(question.points)
    : (question.type === 'true_false' ? 1.0 : question.type === 'short_answer' ? 0.5 : 0.25);

  switch (question.type) {
    case 'multiple_choice': {
      const selected = (answer.selectedOptionId || '').trim().toUpperCase();
      const target = (question.correctOptionId || '').trim().toUpperCase();

      if (!selected || !target) {
        return { awardedPoints: 0, isCorrect: false };
      }

      // Find if target corresponds to an option label or option ID
      const matchingOpt = (question.options || []).find(
        (o) => (o.label && o.label.toUpperCase() === target) || (o.id && o.id.toUpperCase() === target)
      );

      // Check if student pick matches directly or matches label / id
      const isCorrect =
        selected === target ||
        (matchingOpt && (
          (matchingOpt.label && selected === matchingOpt.label.toUpperCase()) ||
          (matchingOpt.id && selected === matchingOpt.id.toUpperCase())
        ));

      return {
        awardedPoints: isCorrect ? maxPoints : 0,
        isCorrect: Boolean(isCorrect),
      };
    }

    case 'true_false': {
      const items = question.trueFalseItems || [];
      if (items.length === 0 || !answer.trueFalseAnswers) {
        return { awardedPoints: 0, isCorrect: false };
      }

      let correctCount = 0;
      for (const item of items) {
        // Resolve student's choice using item.id or item.label
        const choiceById = answer.trueFalseAnswers[item.id];
        const choiceByLabel = answer.trueFalseAnswers[item.label];
        const choiceByLabelLower = item.label ? answer.trueFalseAnswers[item.label.toLowerCase()] : undefined;
        const studentChoice = choiceById !== undefined ? choiceById : (choiceByLabel !== undefined ? choiceByLabel : choiceByLabelLower);

        // Normalize target isCorrect (handle boolean or string "true" / "đúng" / "dung")
        const targetIsCorrect =
          typeof item.isCorrect === 'boolean'
            ? item.isCorrect
            : ['true', 'đúng', 'dung', 'đ', 't', '1'].includes(String(item.isCorrect).trim().toLowerCase());

        if (studentChoice !== undefined && typeof studentChoice === 'boolean') {
          if (studentChoice === targetIsCorrect) {
            correctCount++;
          }
        }
      }

      // Scoring model: 'moet_2025' (default) vs 'proportional' (chia đều) vs custom
      let ratio = 0;
      if (question.scoringModel === 'proportional') {
        ratio = items.length > 0 ? correctCount / items.length : 0;
      } else if (items.length === 4) {
        // Vietnam MOET 2025 Standard for 4 True/False statements:
        // 1 item correct: 10% (0.1 / 1.0)
        // 2 items correct: 25% (0.25 / 1.0)
        // 3 items correct: 50% (0.50 / 1.0)
        // 4 items correct: 100% (1.00 / 1.0)
        if (correctCount === 1) ratio = 0.1;
        else if (correctCount === 2) ratio = 0.25;
        else if (correctCount === 3) ratio = 0.5;
        else if (correctCount === 4) ratio = 1.0;
      } else if (items.length > 0) {
        ratio = correctCount / items.length;
      }

      const awardedPoints = Math.round(maxPoints * ratio * 100) / 100;
      return {
        awardedPoints,
        isCorrect: items.length > 0 && correctCount === items.length,
      };
    }

    case 'short_answer': {
      const studentRaw = (answer.shortAnswerText || '').trim();
      if (!studentRaw || !question.shortAnswerCorrect || question.shortAnswerCorrect.length === 0) {
        return { awardedPoints: 0, isCorrect: false };
      }

      const isCorrect = question.shortAnswerCorrect.some((acceptedAnswer) => {
        return checkShortAnswerMatch(studentRaw, acceptedAnswer, question.caseSensitive);
      });

      return {
        awardedPoints: isCorrect ? maxPoints : 0,
        isCorrect: Boolean(isCorrect),
      };
    }

    default:
      return { awardedPoints: 0, isCorrect: false };
  }
}

function parseNumericValue(val: string): number | null {
  // Clean LaTeX / math wrappers and trailing units
  let clean = val
    .trim()
    .replace(/\$/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^\}]+)\}\{([^\}]+)\}/g, '$1/$2')
    .replace(/,/g, '.');

  // Remove common prefix variables e.g. "x = 5", "y = -2.5"
  clean = clean.replace(/^[a-zA-Z_]\s*[\:\=]\s*/, '').trim();

  // Remove trailing unit words e.g. "m/s", "cm", "km/h", "độ", "rad", "g", "kg"
  clean = clean.replace(/\s*(m\/s|km\/h|m|cm|mm|dm|km|rad|độ|deg|°|g|kg|l|ml|s|giây|phút|h|giờ|\%)\s*$/i, '').trim();

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0].trim());
      const den = parseFloat(parts[1].trim());
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  }

  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

/**
 * Check match for short answers supporting number format variations (e.g. 1.5 vs 1,5 vs 3/2 vs 1.50 vs 1.5 m/s)
 */
export function checkShortAnswerMatch(studentInput: string, correctTarget: string, caseSensitive = false): boolean {
  if (!studentInput || !correctTarget) return false;

  const sRaw = caseSensitive ? studentInput.trim() : studentInput.trim().toLowerCase();
  const cRaw = caseSensitive ? correctTarget.trim() : correctTarget.trim().toLowerCase();

  // Exact match
  if (sRaw === cRaw) return true;

  // Normalize spaces and strip math $ delimiters
  const cleanStudent = sRaw.replace(/\$/g, '').replace(/\s+/g, ' ').trim();
  const cleanTarget = cRaw.replace(/\$/g, '').replace(/\s+/g, ' ').trim();

  if (cleanStudent === cleanTarget) return true;

  // Strip prefix variable assignment e.g. "x = 2" vs "2"
  const stripVarPrefix = (s: string) => s.replace(/^[a-zA-Z_]\s*[\:\=]\s*/, '').trim();
  if (stripVarPrefix(cleanStudent) === stripVarPrefix(cleanTarget)) return true;

  // Normalized numbers & fractions
  const numStudent = parseNumericValue(sRaw);
  const numTarget = parseNumericValue(cRaw);

  if (numStudent !== null && numTarget !== null) {
    if (Math.abs(numStudent - numTarget) < 0.001) {
      return true;
    }
  }

  return false;
}

/**
 * Resiliently resolve student answer from answers object regardless of keying format
 */
export function resolveStudentAnswer(
  q: Question,
  qIndex: number,
  answers?: { [key: string]: any }
): StudentAnswer | undefined {
  if (!answers || typeof answers !== 'object') return undefined;

  // 1. Direct key matches
  let raw: any =
    answers[q.id] ||
    answers[q.id.toLowerCase()] ||
    answers[String(q.order)] ||
    answers[String(qIndex + 1)] ||
    answers[`q_${qIndex + 1}`] ||
    answers[`question_${qIndex + 1}`] ||
    answers[`cau_${qIndex + 1}`] ||
    answers[`cau_${q.order}`];

  // 2. Search through values if questionId or order matches
  if (!raw) {
    for (const val of Object.values(answers)) {
      if (val && typeof val === 'object') {
        if (
          val.questionId === q.id ||
          val.questionId === String(q.order) ||
          val.questionOrder === q.order ||
          val.order === q.order ||
          val.questionOrder === qIndex + 1
        ) {
          raw = val;
          break;
        }
      }
    }
  }

  if (!raw) return undefined;

  // 3. Primitive values (legacy string / number / boolean)
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    const rawStr = String(raw).trim();
    if (q.type === 'multiple_choice') {
      return {
        questionId: q.id,
        type: 'multiple_choice',
        selectedOptionId: rawStr,
      };
    } else if (q.type === 'short_answer') {
      return {
        questionId: q.id,
        type: 'short_answer',
        shortAnswerText: rawStr,
      };
    } else if (q.type === 'true_false') {
      return {
        questionId: q.id,
        type: 'true_false',
        trueFalseAnswers: { a: Boolean(raw) },
      };
    }
  }

  // 4. Object format normalization
  if (typeof raw === 'object') {
    const selectedOptionId =
      raw.selectedOptionId ||
      raw.selectedOption ||
      raw.choice ||
      raw.option ||
      raw.selected ||
      (q.type === 'multiple_choice' && typeof raw.answer === 'string' ? raw.answer : undefined) ||
      (q.type === 'multiple_choice' && typeof raw.value === 'string' ? raw.value : undefined);

    let trueFalseAnswers =
      raw.trueFalseAnswers ||
      raw.answers ||
      raw.tf ||
      raw.tfAnswers ||
      (q.type === 'true_false' && typeof raw.value === 'object' ? raw.value : undefined);

    if (!trueFalseAnswers && q.type === 'true_false') {
      const tfObj: { [k: string]: boolean } = {};
      let hasTf = false;
      ['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D', '0', '1', '2', '3'].forEach((k) => {
        if (raw[k] !== undefined) {
          tfObj[k] = typeof raw[k] === 'boolean' ? raw[k] : ['true', 'đúng', 'dung', '1'].includes(String(raw[k]).toLowerCase());
          hasTf = true;
        }
      });
      if (hasTf) trueFalseAnswers = tfObj;
    }

    const shortAnswerText =
      raw.shortAnswerText ||
      raw.text ||
      raw.content ||
      (q.type === 'short_answer' && typeof raw.answer === 'string' ? raw.answer : undefined) ||
      (q.type === 'short_answer' && typeof raw.value === 'string' ? raw.value : undefined) ||
      (q.type === 'short_answer' && typeof raw.value === 'number' ? String(raw.value) : undefined);

    return {
      ...raw,
      questionId: q.id,
      type: q.type,
      selectedOptionId: selectedOptionId ? String(selectedOptionId).trim() : undefined,
      trueFalseAnswers: trueFalseAnswers || undefined,
      shortAnswerText: shortAnswerText !== undefined ? String(shortAnswerText).trim() : undefined,
    };
  }

  return undefined;
}

/**
 * Calculate total score for all answers in an exam
 */
export function calculateExamScore(questions: Question[], answers: { [qId: string]: StudentAnswer }) {
  let totalScore = 0;
  let maxScore = 0;
  let answeredCount = 0;
  let totalCorrect = 0;

  const gradedAnswers: { [qId: string]: StudentAnswer } = {};

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    const qPoints = q.points !== undefined && !isNaN(Number(q.points))
      ? Number(q.points)
      : (q.type === 'true_false' ? 1.0 : q.type === 'short_answer' ? 0.5 : 0.25);

    maxScore += qPoints;
    const ans = resolveStudentAnswer(q, idx, answers);

    if (ans) {
      let isAnswered = false;
      if (q.type === 'multiple_choice' && ans.selectedOptionId) isAnswered = true;
      if (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) isAnswered = true;
      if (q.type === 'short_answer' && ans.shortAnswerText && ans.shortAnswerText.trim().length > 0) isAnswered = true;

      if (isAnswered) {
        answeredCount++;
      }

      const { awardedPoints, isCorrect } = gradeQuestion(q, ans);
      totalScore += awardedPoints;
      if (isCorrect) totalCorrect++;

      gradedAnswers[q.id] = {
        ...ans,
        awardedPoints,
        isCorrect,
      };
    } else {
      gradedAnswers[q.id] = {
        questionId: q.id,
        type: q.type,
        awardedPoints: 0,
        isCorrect: false,
      };
    }
  }

  const rawScore = Math.round(totalScore * 100) / 100;
  const safeMaxScore = Math.round(maxScore * 100) / 100;

  // Calculate scaled 10-point scale:
  // If safeMaxScore is around 10 (9.8 - 10.2), use rawScore directly to avoid floating rounding issues
  let scaledScore10 = 0;
  if (safeMaxScore > 0) {
    if (Math.abs(safeMaxScore - 10.0) < 0.05) {
      scaledScore10 = Math.min(10, Math.max(0, rawScore));
    } else {
      scaledScore10 = Math.min(10, Math.max(0, Math.round((totalScore / safeMaxScore) * 10 * 100) / 100));
    }
  }

  return {
    rawScore,
    maxScore: safeMaxScore,
    scaledScore10,
    answeredCount,
    totalQuestions: questions.length,
    correctCount: totalCorrect,
    gradedAnswers,
  };
}

/**
 * Re-grade a list of submissions against an updated exam definition
 */
export function regradeAllSubmissions(
  questions: Question[],
  submissions: ExamSubmission[]
): ExamSubmission[] {
  return submissions.map((sub) => {
    if (sub.status !== 'submitted') return sub;

    const { scaledScore10, answeredCount, totalQuestions, correctCount, gradedAnswers } =
      calculateExamScore(questions, sub.answers || {});

    const wrongCount = Math.max(0, answeredCount - correctCount);

    return {
      ...sub,
      score: scaledScore10,
      answeredCount,
      totalQuestions,
      correctCount,
      wrongCount,
      answers: gradedAnswers,
    };
  });
}

/**
 * Audit and auto-fix common errors in exam questions:
 * - Missing correct keys in MC
 * - Incomplete True/False items
 * - Short answers with empty key
 * - Points normalization according to MOET standard
 */
export function auditAndFixExamQuestions(questions: Question[]): {
  fixedQuestions: Question[];
  issues: string[];
  fixes: string[];
} {
  const issues: string[] = [];
  const fixes: string[] = [];

  const fixedQuestions = questions.map((q, idx) => {
    const order = q.order || idx + 1;
    const cloned: Question = JSON.parse(JSON.stringify(q));
    cloned.id = cloned.id && cloned.id.trim() ? cloned.id : `q-${order}-${Date.now()}`;
    cloned.order = order;

    // Check prompt
    if (!cloned.prompt || !cloned.prompt.trim()) {
      issues.push(`Câu ${order}: Chưa có nội dung câu hỏi.`);
      cloned.prompt = `Câu ${order} (Chưa nhập nội dung)`;
      fixes.push(`Câu ${order}: Đã bổ sung nội dung giữ chỗ.`);
    }

    // MULTIPLE CHOICE
    if (cloned.type === 'multiple_choice') {
      const options = cloned.options || [];
      if (options.length === 0) {
        issues.push(`Câu ${order}: Chưa có 4 lựa chọn A, B, C, D.`);
        cloned.options = ['A', 'B', 'C', 'D'].map((lbl, i) => ({
          id: `opt-${order}-${i + 1}`,
          label: lbl,
          text: `Lựa chọn ${lbl}`,
        }));
        fixes.push(`Câu ${order}: Đã tự động tạo 4 lựa chọn A, B, C, D mặc định.`);
      } else {
        // Fix labels
        ['A', 'B', 'C', 'D'].forEach((lbl, i) => {
          if (cloned.options[i]) {
            cloned.options[i].label = lbl;
          }
        });
      }

      // Check correctOptionId
      const validLabels = ['A', 'B', 'C', 'D'];
      const currentTarget = (cloned.correctOptionId || '').trim().toUpperCase();
      const matchOpt = cloned.options.find(
        (o) => o.label.toUpperCase() === currentTarget || o.id.toUpperCase() === currentTarget
      );

      if (!currentTarget || (!validLabels.includes(currentTarget) && !matchOpt)) {
        issues.push(`Câu ${order}: Chưa chọn đáp án đúng.`);
        cloned.correctOptionId = 'A';
        fixes.push(`Câu ${order}: Đã tạm gán đáp án đúng là 'A'.`);
      } else if (matchOpt) {
        cloned.correctOptionId = matchOpt.label;
      }

      // Points default
      if (cloned.points === undefined || isNaN(Number(cloned.points)) || Number(cloned.points) <= 0) {
        cloned.points = 0.25;
        fixes.push(`Câu ${order}: Gán điểm chuẩn 0.25đ.`);
      }
    }

    // TRUE / FALSE
    if (cloned.type === 'true_false') {
      let items = cloned.trueFalseItems || [];
      if (items.length !== 4) {
        issues.push(`Câu ${order}: Số lượng ý Đúng/Sai không đủ 4 ý (${items.length}/4 ý).`);
        const subLabels = ['a', 'b', 'c', 'd'];
        const newItems: TrueFalseItem[] = [];

        subLabels.forEach((lbl, i) => {
          if (items[i]) {
            newItems.push({
              ...items[i],
              label: lbl,
              isCorrect: typeof items[i].isCorrect === 'boolean' ? items[i].isCorrect : true,
            });
          } else {
            newItems.push({
              id: `tf-${order}-${lbl}`,
              label: lbl,
              statement: `Mệnh đề khẳng định (${lbl})`,
              isCorrect: true,
            });
          }
        });
        cloned.trueFalseItems = newItems;
        fixes.push(`Câu ${order}: Đã tự chuẩn hóa đủ 4 ý a), b), c), d).`);
      } else {
        // Standardize boolean
        cloned.trueFalseItems = items.map((it, i) => {
          const isBool = typeof it.isCorrect === 'boolean'
            ? it.isCorrect
            : ['true', 'đúng', 'dung', 'đ', '1'].includes(String(it.isCorrect).toLowerCase());
          return {
            ...it,
            label: ['a', 'b', 'c', 'd'][i] || it.label,
            isCorrect: isBool,
          };
        });
      }

      if (cloned.points === undefined || isNaN(Number(cloned.points)) || Number(cloned.points) <= 0) {
        cloned.points = 1.0;
        fixes.push(`Câu ${order}: Gán điểm chuẩn 1.0đ.`);
      }
    }

    // SHORT ANSWER
    if (cloned.type === 'short_answer') {
      if (!cloned.shortAnswerCorrect || cloned.shortAnswerCorrect.length === 0) {
        issues.push(`Câu ${order}: Chưa có đáp án chấp nhận cho câu trả lời ngắn.`);
        cloned.shortAnswerCorrect = ['0'];
        fixes.push(`Câu ${order}: Đã tạm gán đáp án mặc định là '0'.`);
      } else {
        cloned.shortAnswerCorrect = cloned.shortAnswerCorrect
          .map((a) => a.trim())
          .filter((a) => a.length > 0);
      }

      if (cloned.points === undefined || isNaN(Number(cloned.points)) || Number(cloned.points) <= 0) {
        cloned.points = 0.5;
        fixes.push(`Câu ${order}: Gán điểm chuẩn 0.5đ.`);
      }
    }

    return cloned;
  });

  return {
    fixedQuestions,
    issues,
    fixes,
  };
}


