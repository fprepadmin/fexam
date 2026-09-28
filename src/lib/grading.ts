import { Question, StudentAnswer } from '../types';

/**
 * Grade a single question answer according to MOET 2025 standard
 */
export function gradeQuestion(question: Question, answer?: StudentAnswer): { awardedPoints: number; isCorrect: boolean } {
  if (!answer) {
    return { awardedPoints: 0, isCorrect: false };
  }

  const maxPoints = question.points || 1.0;

  switch (question.type) {
    case 'multiple_choice': {
      if (!answer.selectedOptionId || !question.correctOptionId) {
        return { awardedPoints: 0, isCorrect: false };
      }
      const isCorrect = answer.selectedOptionId.toUpperCase() === question.correctOptionId.toUpperCase();
      return {
        awardedPoints: isCorrect ? maxPoints : 0,
        isCorrect,
      };
    }

    case 'true_false': {
      const items = question.trueFalseItems || [];
      if (items.length === 0 || !answer.trueFalseAnswers) {
        return { awardedPoints: 0, isCorrect: false };
      }

      let correctCount = 0;
      for (const item of items) {
        const studentChoice = answer.trueFalseAnswers[item.id];
        if (studentChoice !== undefined && studentChoice === item.isCorrect) {
          correctCount++;
        }
      }

      // Vietnam MOET 2025 Standard for 4 True/False statements:
      // 1 item: 10% (0.1 / 1.0)
      // 2 items: 25% (0.25 / 1.0)
      // 3 items: 50% (0.50 / 1.0)
      // 4 items: 100% (1.00 / 1.0)
      let ratio = 0;
      if (items.length === 4) {
        if (correctCount === 1) ratio = 0.1;
        else if (correctCount === 2) ratio = 0.25;
        else if (correctCount === 3) ratio = 0.5;
        else if (correctCount === 4) ratio = 1.0;
      } else {
        // Proportional for different item count
        ratio = correctCount / items.length;
      }

      const awardedPoints = Math.round(maxPoints * ratio * 100) / 100;
      return {
        awardedPoints,
        isCorrect: correctCount === items.length,
      };
    }

    case 'short_answer': {
      if (!answer.shortAnswerText || !question.shortAnswerCorrect || question.shortAnswerCorrect.length === 0) {
        return { awardedPoints: 0, isCorrect: false };
      }

      const studentText = answer.shortAnswerText.trim();
      const isCorrect = question.shortAnswerCorrect.some((acceptedAnswer) => {
        return checkShortAnswerMatch(studentText, acceptedAnswer, question.caseSensitive);
      });

      return {
        awardedPoints: isCorrect ? maxPoints : 0,
        isCorrect,
      };
    }

    default:
      return { awardedPoints: 0, isCorrect: false };
  }
}

/**
 * Check match for short answers supporting number format variations (e.g. 1.5 vs 1,5 vs 1.50)
 */
function checkShortAnswerMatch(studentInput: string, correctTarget: string, caseSensitive = false): boolean {
  const sInput = caseSensitive ? studentInput.trim() : studentInput.trim().toLowerCase();
  const cTarget = caseSensitive ? correctTarget.trim() : correctTarget.trim().toLowerCase();

  // Exact match
  if (sInput === cTarget) return true;

  // Normalized numbers (replace comma with dot)
  const numStudent = parseFloat(sInput.replace(',', '.'));
  const numTarget = parseFloat(cTarget.replace(',', '.'));

  if (!isNaN(numStudent) && !isNaN(numTarget)) {
    // Check if both are valid numbers and equal within small precision
    if (Math.abs(numStudent - numTarget) < 0.0001) {
      return true;
    }
  }

  // Normalize spaces
  const cleanStudent = sInput.replace(/\s+/g, ' ');
  const cleanTarget = cTarget.replace(/\s+/g, ' ');
  return cleanStudent === cleanTarget;
}

/**
 * Calculate total score for all answers in an exam
 */
export function calculateExamScore(questions: Question[], answers: { [qId: string]: StudentAnswer }) {
  let totalScore = 0;
  let maxScore = 0;
  let answeredCount = 0;

  const gradedAnswers: { [qId: string]: StudentAnswer } = {};

  for (const q of questions) {
    maxScore += q.points || 1.0;
    const ans = answers[q.id];

    if (ans) {
      // Check if answered
      let isAnswered = false;
      if (q.type === 'multiple_choice' && ans.selectedOptionId) isAnswered = true;
      if (q.type === 'true_false' && ans.trueFalseAnswers && Object.keys(ans.trueFalseAnswers).length > 0) isAnswered = true;
      if (q.type === 'short_answer' && ans.shortAnswerText && ans.shortAnswerText.trim().length > 0) isAnswered = true;

      if (isAnswered) {
        answeredCount++;
      }

      const { awardedPoints, isCorrect } = gradeQuestion(q, ans);
      totalScore += awardedPoints;

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

  // Scale total score to standard 10-point scale if needed or keep raw
  return {
    rawScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    scaledScore10: maxScore > 0 ? Math.round((totalScore / maxScore) * 10 * 100) / 100 : 0,
    answeredCount,
    totalQuestions: questions.length,
    gradedAnswers,
  };
}
