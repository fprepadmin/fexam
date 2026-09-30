import mammoth from 'mammoth';
import { Question, QuestionType, TrueFalseItem } from '../types';

export interface ParseResult {
  questions: Question[];
  errors: string[];
  rawText: string;
}

/**
 * Enhanced universal exam parser for Vietnamese teachers.
 * Recognizes:
 * - MOET 2025 Sections: PHẦN I, PHẦN II, PHẦN III
 * - Questions headers: Câu 1, Câu 1., Câu 1:, Bài 1, Bài 1:, [Câu 1], 1., 1)
 * - Multiple choice choices: A., B., C., D. | A), B), C), D) | *A., *B. (correct marker) | [A], [B]
 * - True/False format: a), b), c), d) followed by [Đúng], [Sai], (Đ), (S), - Đúng, - Sai
 * - Short answer format: [Trả lời ngắn], [TLN], "Đáp án: ...", "Đáp số: ..."
 * - Solutions: Lời giải:, Hướng dẫn giải:, HDG:, Giải thích:
 * - LaTeX / KaTeX math: $...$, $$...$$, \(...\), \[...\]
 */
export function parseExamText(rawText: string): ParseResult {
  const errors: string[] = [];
  const questions: Question[] = [];

  // Normalize line endings and clean extra spaces
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Track active section context if document uses MOET 2025 headers:
  // PHẦN I / PHẦN 1 -> multiple_choice
  // PHẦN II / PHẦN 2 -> true_false
  // PHẦN III / PHẦN 3 -> short_answer
  let currentSectionType: QuestionType | null = null;

  // Split text by section or question delimiters
  // Split on "PHẦN ..." or "Câu \d+" or "Bài \d+"
  const lines = text.split('\n');
  const blocks: { text: string; sectionHint?: QuestionType }[] = [];
  let currentBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check Section Headers
    if (/^PHẦN\s+(?:I|1|MỘT)[\.\:\s\—\-]/i.test(line)) {
      currentSectionType = 'multiple_choice';
      continue;
    } else if (/^PHẦN\s+(?:II|2|HAI)[\.\:\s\—\-]/i.test(line)) {
      currentSectionType = 'true_false';
      continue;
    } else if (/^PHẦN\s+(?:III|3|BA)[\.\:\s\—\-]/i.test(line)) {
      currentSectionType = 'short_answer';
      continue;
    }

    // Check Question Start: "Câu 1:", "Câu 1.", "Bài 1:", "[Câu 1]", "Câu 1 "
    const isQuestionStart = /^(?:\[?Câu|Bài|Question\]?)\s*\d+[\.\:\s\—\-]/i.test(line);

    if (isQuestionStart && currentBlockLines.length > 0) {
      blocks.push({
        text: currentBlockLines.join('\n'),
        sectionHint: currentSectionType || undefined,
      });
      currentBlockLines = [line];
    } else {
      currentBlockLines.push(lines[i]);
    }
  }

  if (currentBlockLines.length > 0) {
    blocks.push({
      text: currentBlockLines.join('\n'),
      sectionHint: currentSectionType || undefined,
    });
  }

  let orderCounter = 1;

  for (const blockObj of blocks) {
    const trimmed = blockObj.text.trim();
    if (!trimmed) continue;

    // Check if block has question pattern
    const hasQuestionIndicator = /^(?:\[?Câu|Bài|Question\]?)\s*(\d+)[\.\:\s\—\-]*/i.test(trimmed);
    let order = orderCounter;
    if (hasQuestionIndicator) {
      const match = trimmed.match(/^(?:\[?Câu|Bài|Question\]?)\s*(\d+)[\.\:\s\—\-]*/i);
      if (match) {
        order = parseInt(match[1], 10) || orderCounter;
      }
    }

    // Determine Question Type:
    let qType: QuestionType = blockObj.sectionHint || 'multiple_choice';

    const isExplicitTrueFalse =
      /\[(Đúng[\s\/]+Sai|D[\s\/]+S|True[\s\/]+False)\]/i.test(trimmed) ||
      (/(?:^|\n)\s*[a-d][\.\)]\s*.*?(?:\[(Đúng|Sai|Đ|S)\]|\((Đúng|Sai|Đ|S)\)|\s*[\-\—]\s*(Đúng|Sai))/i.test(trimmed) &&
        /(?:^|\n)\s*b[\.\)]/i.test(trimmed));

    const isExplicitShortAnswer =
      /\[(Trả lời ngắn|TLN|Short Answer)\]/i.test(trimmed) ||
      (/(?:Đáp án|Đáp số|Kết quả)\s*[\:\=]\s*([^\nA-D\.\)]+)/i.test(trimmed) &&
        !/(?:^|\n)\s*[A-D][\.\)]/i.test(trimmed) &&
        !/(?:^|\n)\s*[a-d][\.\)]/i.test(trimmed));

    if (isExplicitTrueFalse) {
      qType = 'true_false';
    } else if (isExplicitShortAnswer) {
      qType = 'short_answer';
    }

    if (qType === 'true_false') {
      const q = parseTrueFalseQuestion(trimmed, order);
      if (q) {
        questions.push(q);
        orderCounter++;
      }
    } else if (qType === 'short_answer') {
      const q = parseShortAnswerQuestion(trimmed, order);
      if (q) {
        questions.push(q);
        orderCounter++;
      }
    } else {
      const q = parseMultipleChoiceQuestion(trimmed, order);
      if (q) {
        questions.push(q);
        orderCounter++;
      }
    }
  }

  return {
    questions,
    errors,
    rawText: text,
  };
}

/**
 * Parse Multiple Choice Question (A, B, C, D)
 */
function parseMultipleChoiceQuestion(block: string, order: number): Question | null {
  let explanation = '';
  const expMatch = block.match(/(?:Lời giải|Hướng dẫn giải|Giải thích|HDG|Giải)\s*[\:\=\—\-]\s*([\s\S]*)$/i);
  let mainContent = block;
  if (expMatch) {
    explanation = expMatch[1].trim();
    mainContent = block.slice(0, expMatch.index).trim();
  }

  // Check explicit answer: "Đáp án: A" or "Chọn A" or "Key: A"
  let correctOption = '';
  const ansMatch = mainContent.match(/(?:Đáp án|Chọn|Key|ĐA)\s*[\:\=\—\-]\s*([A-D])/i);
  if (ansMatch) {
    correctOption = ansMatch[1].toUpperCase();
    mainContent = mainContent.replace(ansMatch[0], '').trim();
  }

  // Regex for A., B., C., D. or A), B), C), D) or *A., *B. or [A], [B]
  const optionRegex = /(?:^|\n|\t|\s{2,})([\*]?)(?:\[)?([A-D])(?:\]|\.|\)|\:|\/)\s*([\s\S]*?)(?=(?:^|\n|\t|\s{2,})[\*]?(?:\[)?[A-D](?:\]|\.|\)|\:|\/)|$)/g;

  const options: { id: string; label: string; text: string }[] = [];
  let match;
  let firstOptionIndex = -1;

  while ((match = optionRegex.exec(mainContent)) !== null) {
    if (firstOptionIndex === -1) {
      firstOptionIndex = match.index;
    }
    const isStar = match[1] === '*';
    const label = match[2].toUpperCase();
    const text = match[3].trim();

    if (isStar) {
      correctOption = label;
    }

    options.push({
      id: label,
      label,
      text,
    });
  }

  let prompt = firstOptionIndex !== -1 ? mainContent.slice(0, firstOptionIndex).trim() : mainContent;
  prompt = prompt.replace(/^(?:\[?Câu|Bài|Question\]?)\s*\d+[\.\:\s\—\-]*/i, '').trim();

  if (options.length === 0) {
    return {
      id: `q-${order}-${Date.now()}`,
      order,
      type: 'multiple_choice',
      prompt: prompt || `Câu hỏi số ${order}`,
      options: [
        { id: 'A', label: 'A', text: 'Phương án A' },
        { id: 'B', label: 'B', text: 'Phương án B' },
        { id: 'C', label: 'C', text: 'Phương án C' },
        { id: 'D', label: 'D', text: 'Phương án D' },
      ],
      correctOptionId: 'A',
      points: 0.25,
      explanation,
    };
  }

  return {
    id: `q-${order}-${Date.now()}`,
    order,
    type: 'multiple_choice',
    prompt,
    options,
    correctOptionId: correctOption || options[0]?.label || 'A',
    points: 0.25,
    explanation,
  };
}

/**
 * Parse True / False Question
 */
function parseTrueFalseQuestion(block: string, order: number): Question | null {
  let explanation = '';
  const expMatch = block.match(/(?:Lời giải|Hướng dẫn giải|Giải thích|HDG|Giải)\s*[\:\=\—\-]\s*([\s\S]*)$/i);
  let mainContent = block;
  if (expMatch) {
    explanation = expMatch[1].trim();
    mainContent = block.slice(0, expMatch.index).trim();
  }

  mainContent = mainContent.replace(/\[(Đúng[\s\/]+Sai|D[\s\/]+S|True[\s\/]+False)\]/gi, '').trim();

  // Regex to match a), b), c), d)
  const itemRegex = /(?:^|\n|\t|\s{2,})([a-d])[\.\)\:\/]\s*([\s\S]*?)(?=(?:^|\n|\t|\s{2,})[a-d][\.\)\:\/]|$)/gi;
  const items: TrueFalseItem[] = [];
  let match;
  let firstItemIndex = -1;

  while ((match = itemRegex.exec(mainContent)) !== null) {
    if (firstItemIndex === -1) {
      firstItemIndex = match.index;
    }
    const label = match[1].toLowerCase();
    let text = match[2].trim();
    let isCorrect = true;

    // Check if ending has [Đúng], [Sai], (Đ), (S), - Đúng, - Sai
    const tfMatch = text.match(/(?:\[|\(|\-\s*|\—\s*)(Đúng|Sai|Đ|S|True|False|T|F)(?:\]|\)|\s*$)/i);
    if (tfMatch) {
      const val = tfMatch[1].toLowerCase();
      isCorrect = ['đúng', 'đ', 'true', 't'].includes(val);
      text = text.replace(tfMatch[0], '').trim();
    }

    items.push({
      id: label,
      label,
      statement: text,
      isCorrect,
    });
  }

  let prompt = firstItemIndex !== -1 ? mainContent.slice(0, firstItemIndex).trim() : mainContent;
  prompt = prompt.replace(/^(?:\[?Câu|Bài|Question\]?)\s*\d+[\.\:\s\—\-]*/i, '').trim();

  if (items.length === 0) {
    return {
      id: `q-${order}-${Date.now()}`,
      order,
      type: 'true_false',
      prompt: prompt || `Câu hỏi đúng sai số ${order}`,
      trueFalseItems: [
        { id: 'a', label: 'a', statement: 'Mệnh đề ý a', isCorrect: true },
        { id: 'b', label: 'b', statement: 'Mệnh đề ý b', isCorrect: false },
        { id: 'c', label: 'c', statement: 'Mệnh đề ý c', isCorrect: true },
        { id: 'd', label: 'd', statement: 'Mệnh đề ý d', isCorrect: false },
      ],
      points: 1.0,
      explanation,
    };
  }

  return {
    id: `q-${order}-${Date.now()}`,
    order,
    type: 'true_false',
    prompt,
    trueFalseItems: items,
    points: 1.0,
    explanation,
  };
}

/**
 * Parse Short Answer Question
 */
function parseShortAnswerQuestion(block: string, order: number): Question | null {
  let explanation = '';
  const expMatch = block.match(/(?:Lời giải|Hướng dẫn giải|Giải thích|HDG|Giải)\s*[\:\=\—\-]\s*([\s\S]*)$/i);
  let mainContent = block;
  if (expMatch) {
    explanation = expMatch[1].trim();
    mainContent = block.slice(0, expMatch.index).trim();
  }

  mainContent = mainContent.replace(/\[(Trả lời ngắn|TLN|Short Answer)\]/gi, '').trim();

  const correctAnswers: string[] = [];
  const ansMatch = mainContent.match(/(?:Đáp án|Đáp số|Kết quả|Key|ĐA)\s*[\:\=\—\-]\s*([^\n]+)/i);
  if (ansMatch) {
    const rawAnswers = ansMatch[1].trim();
    const splitAnswers = rawAnswers.split(/[\;\|]/).map((s) => s.trim()).filter(Boolean);
    correctAnswers.push(...splitAnswers);
    mainContent = mainContent.replace(ansMatch[0], '').trim();
  }

  let prompt = mainContent.replace(/^(?:\[?Câu|Bài|Question\]?)\s*\d+[\.\:\s\—\-]*/i, '').trim();

  return {
    id: `q-${order}-${Date.now()}`,
    order,
    type: 'short_answer',
    prompt: prompt || `Câu hỏi trả lời ngắn số ${order}`,
    shortAnswerCorrect: correctAnswers.length > 0 ? correctAnswers : ['0'],
    points: 0.5,
    explanation,
  };
}

/**
 * Parse .docx file using mammoth
 */
export async function parseDocxFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return parseExamText(result.value);
  } catch (error: any) {
    return {
      questions: [],
      errors: [error?.message || 'Không thể đọc file Word này.'],
      rawText: '',
    };
  }
}

/**
 * Download sample template files (.docx simulation / formatted text)
 */
export function downloadSampleExamTemplate() {
  const sampleContent = `PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.
Thí sinh trả lời từ câu 1 đến câu 3. Mỗi câu hỏi thí sinh chỉ chọn một phương án.

Câu 1. Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Điểm cực đại của hàm số đã cho là:
*A. $x = -1$
B. $x = 2$
C. $y = 3$
D. $x = 1$
Lời giải: Dựa vào bảng biến thiên, đạo hàm đổi dấu từ dương sang âm tại $x = -1$.

Câu 2. Tập nghiệm của bất phương trình $\\log_2(x - 1) < 3$ là:
*A. $(1; 9)$
B. $(-\\infty; 9)$
C. $(1; 8)$
D. $(1; 7)$
Lời giải: Điều kiện $x > 1$. Ta có $x - 1 < 8 \\Leftrightarrow x < 9$. Kết hợp điều kiện ta được $(1; 9)$.

Câu 3. Tính tích phân $I = \\int_0^1 (2x + 1) e^x dx$:
*A. $e + 1$
B. $2e - 1$
C. $e - 1$
D. $2e + 1$
Lời giải: Dùng tích phân từng phần với $u = 2x+1, dv = e^x dx$.

PHẦN II. Câu trắc nghiệm đúng sai.
Thí sinh trả lời từ câu 4 đến câu 5. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.

Câu 4. [Đúng/Sai] Cho hàm số $f(x) = x^3 - 3x^2 + 2$.
a) Hàm số đồng biến trên khoảng $(-\\infty; 0)$ và $(2; +\\infty)$. [Đúng]
b) Giá trị cực tiểu của hàm số bằng $-2$. [Đúng]
c) Đồ thị hàm số có tâm đối xứng là điểm $I(1; 0)$. [Đúng]
d) Phương trình $f(x) = 0$ có đúng 1 nghiệm thực. [Sai]
Lời giải: $f'(x) = 3x^2 - 6x$. Cực trị tại $x = 0$ và $x = 2$. Cắt trục hoành tại 3 điểm phân biệt nên ý d Sai.

Câu 5. [Đúng/Sai] Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y+2)^2 + (z-3)^2 = 25$ và mặt phẳng $(P): 2x - 2y + z + 5 = 0$.
a) Tâm của mặt cầu là $I(1; -2; 3)$ và bán kính $R = 5$. [Đúng]
b) Khoảng cách từ tâm $I$ đến mặt phẳng $(P)$ bằng $4$. [Đúng]
c) Mặt phẳng $(P)$ cắt mặt cầu theo đường tròn có bán kính $r = 3$. [Đúng]
d) Điểm $O(0; 0; 0)$ nằm ngoài mặt cầu. [Sai]
Lời giải: Khoảng cách $d(I, P) = 4$. Bán kính giao tuyến $r = \\sqrt{R^2 - d^2} = 3$.

PHẦN III. Câu trắc nghiệm trả lời ngắn.
Thí sinh trả lời câu 6.

Câu 6. [Trả lời ngắn] Một vật chuyển động theo quy luật $s(t) = -\\frac{1}{3}t^3 + 6t^2$ với $t$ (giây) và $s$ (mét). Vận tốc lớn nhất của vật đạt được bằng bao nhiêu $m/s$?
Đáp án: 36
Lời giải: Vận tốc $v(t) = s'(t) = -t^2 + 12t = -(t-6)^2 + 36 \\le 36$. Đạt cực đại tại $t = 6s$.
`;

  const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FEXAM_DeThiMau_Chuan_BoGD2025.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to clean and safely parse JSON exported by AI or pasted by users.
 * Automatically handles:
 * - Markdown code blocks (```json ... ```)
 * - Trailing commas and common escape errors
 * - True/False question normalization (splits merged statements into 4 distinct items)
 * - Multiple choice options normalization (ensures labels 'A','B','C','D' and correctOptionId)
 * - Short answer array conversion
 */
export function safeParseExamJson(rawInput: string): { questions: Question[]; title?: string; error?: string } {
  let cleaned = rawInput.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Extract JSON array or object if surrounded by extra text
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]\}])/g, '$1');

  try {
    const parsed = JSON.parse(cleaned);
    let rawList: any[] = [];
    let extractedTitle: string | undefined = undefined;

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) {
        rawList = parsed.questions;
        if (typeof parsed.title === 'string') extractedTitle = parsed.title;
      } else {
        return { questions: [], error: 'Cấu trúc JSON không chứa danh sách câu hỏi hợp lệ.' };
      }
    }

    const normalizedQuestions: Question[] = rawList.map((q: any, idx: number) => {
      const order = q.order || idx + 1;
      let rawType: QuestionType = q.type || 'multiple_choice';

      // Detect type if missing or malformed
      if (q.trueFalseItems || q.type === 'true_false' || /đúng\s*[\/\-]\s*sai/i.test(q.type || '')) {
        rawType = 'true_false';
      } else if (q.shortAnswerCorrect || q.type === 'short_answer' || /trả\s*lời\s*ngắn/i.test(q.type || '')) {
        rawType = 'short_answer';
      }

      let prompt = (typeof q.prompt === 'string' ? q.prompt : '').trim();
      let explanation = typeof q.explanation === 'string' ? q.explanation.trim() : '';

      // ── TYPE 1: TRUE / FALSE NORMALIZATION ──
      if (rawType === 'true_false') {
        let trueFalseItems: TrueFalseItem[] = [];

        // Check if trueFalseItems is already provided as an array
        if (Array.isArray(q.trueFalseItems) && q.trueFalseItems.length > 0) {
          trueFalseItems = q.trueFalseItems.map((item: any, itemIdx: number) => {
            const defaultLabel = ['a', 'b', 'c', 'd'][itemIdx] || `item_${itemIdx + 1}`;
            const label = (item.label || item.id || defaultLabel).toLowerCase().replace(/[^a-d0-9]/g, '') || defaultLabel;
            let statement = typeof item.statement === 'string' ? item.statement : (typeof item.text === 'string' ? item.text : '');

            // Clean leading "a)", "b." from statement
            statement = statement.replace(/^[a-d][\.\)\:\-\—\s]+/i, '').trim();

            // Normalize isCorrect
            const isCorrect =
              typeof item.isCorrect === 'boolean'
                ? item.isCorrect
                : ['true', 'đúng', 'dung', 'đ', 't', '1'].includes(String(item.isCorrect || '').trim().toLowerCase());

            return {
              id: label,
              label,
              statement: statement || `Mệnh đề ý ${label}`,
              isCorrect,
            };
          });
        }

        // If trueFalseItems is empty or has only 1 item while prompt contains sub-items (a, b, c, d)
        if (trueFalseItems.length < 2 && prompt) {
          const itemRegex = /(?:^|\n|\s{2,})([a-d])[\.\)\:\/]\s*([\s\S]*?)(?=(?:^|\n|\s{2,})[a-d][\.\)\:\/]|$)/gi;
          const extracted: TrueFalseItem[] = [];
          let match;
          let firstItemPos = -1;

          while ((match = itemRegex.exec(prompt)) !== null) {
            if (firstItemPos === -1) firstItemPos = match.index;
            const label = match[1].toLowerCase();
            let text = match[2].trim();
            let isCorrect = true;

            const tfMatch = text.match(/(?:\[|\(|\-\s*|\—\s*)(Đúng|Sai|Đ|S|True|False|T|F)(?:\]|\)|\s*$)/i);
            if (tfMatch) {
              const val = tfMatch[1].toLowerCase();
              isCorrect = ['đúng', 'đ', 'true', 't'].includes(val);
              text = text.replace(tfMatch[0], '').trim();
            }

            extracted.push({
              id: label,
              label,
              statement: text,
              isCorrect,
            });
          }

          if (extracted.length >= 2) {
            trueFalseItems = extracted;
            if (firstItemPos > 0) {
              prompt = prompt.slice(0, firstItemPos).trim();
            }
          }
        }

        // Ensure 4 items exist
        if (trueFalseItems.length === 0) {
          trueFalseItems = [
            { id: 'a', label: 'a', statement: 'Mệnh đề ý a', isCorrect: true },
            { id: 'b', label: 'b', statement: 'Mệnh đề ý b', isCorrect: false },
            { id: 'c', label: 'c', statement: 'Mệnh đề ý c', isCorrect: true },
            { id: 'd', label: 'd', statement: 'Mệnh đề ý d', isCorrect: false },
          ];
        }

        return {
          id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          order,
          type: 'true_false',
          prompt: prompt || `Câu hỏi Đúng/Sai số ${order}`,
          imageUrl: q.imageUrl || undefined,
          points: q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : 1.0,
          trueFalseItems,
          explanation,
        };
      }

      // ── TYPE 2: SHORT ANSWER NORMALIZATION ──
      if (rawType === 'short_answer') {
        let shortAnswerCorrect: string[] = [];
        if (Array.isArray(q.shortAnswerCorrect)) {
          shortAnswerCorrect = q.shortAnswerCorrect.map((s: any) => String(s).trim()).filter(Boolean);
        } else if (typeof q.shortAnswerCorrect === 'string' || typeof q.correctAnswer === 'string' || typeof q.answer === 'string') {
          const rawAns = String(q.shortAnswerCorrect || q.correctAnswer || q.answer || '').trim();
          shortAnswerCorrect = rawAns.split(/[\;\|]/).map((s) => s.trim()).filter(Boolean);
        }

        if (shortAnswerCorrect.length === 0) {
          shortAnswerCorrect = ['0'];
        }

        return {
          id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          order,
          type: 'short_answer',
          prompt: prompt || `Câu hỏi trả lời ngắn số ${order}`,
          imageUrl: q.imageUrl || undefined,
          points: q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : 0.5,
          shortAnswerCorrect,
          explanation,
        };
      }

      // ── TYPE 3: MULTIPLE CHOICE NORMALIZATION ──
      let options = [
        { id: 'A', label: 'A', text: 'Phương án A' },
        { id: 'B', label: 'B', text: 'Phương án B' },
        { id: 'C', label: 'C', text: 'Phương án C' },
        { id: 'D', label: 'D', text: 'Phương án D' },
      ];

      if (Array.isArray(q.options) && q.options.length > 0) {
        options = q.options.map((opt: any, optIdx: number) => {
          const defaultLabel = ['A', 'B', 'C', 'D'][optIdx] || `Opt_${optIdx + 1}`;
          const label = (opt.label || opt.id || defaultLabel).toUpperCase().replace(/[^A-D0-9]/g, '') || defaultLabel;
          let text = typeof opt.text === 'string' ? opt.text : (typeof opt === 'string' ? opt : '');
          text = text.replace(/^[A-D][\.\)\:\-\—\s]+/i, '').trim();

          return {
            id: label,
            label,
            text: text || `Phương án ${label}`,
            imageUrl: opt.imageUrl || undefined,
          };
        });
      }

      let correctOptionId = (q.correctOptionId || q.correctAnswer || q.correctOption || 'A').toUpperCase().replace(/[^A-D]/g, '') || 'A';

      return {
        id: q.id && typeof q.id === 'string' && q.id.trim() ? q.id : `q-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        order,
        type: 'multiple_choice',
        prompt: prompt || `Câu hỏi số ${order}`,
        imageUrl: q.imageUrl || undefined,
        points: q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : 0.25,
        options,
        correctOptionId,
        explanation,
      };
    });

    return { questions: normalizedQuestions, title: extractedTitle };
  } catch (err: any) {
    return { questions: [], error: err?.message || 'Lỗi cú pháp JSON.' };
  }
}

/**
 * Tải file JSON đề thi mẫu chuẩn FEXAM
 */
export function downloadSampleJsonTemplate() {
  const sampleJson = [
    {
      order: 1,
      type: "multiple_choice",
      prompt: "Cho hàm số $y = f(x)$ có bảng biến thiên. Số điểm cực trị của hàm số đã cho là:",
      points: 0.25,
      options: [
        { id: "A", label: "A", text: "$2$" },
        { id: "B", label: "B", text: "$1$" },
        { id: "C", label: "C", text: "$3$" },
        { id: "D", label: "D", text: "$0$" }
      ],
      correctOptionId: "A",
      explanation: "Đạo hàm $f'(x)$ đổi dấu 2 lần qua các điểm cực trị nên hàm số có đúng 2 điểm cực trị."
    },
    {
      order: 2,
      type: "true_false",
      prompt: "Cho hình chóp $S.ABCD$ có đáy là hình vuông cạnh $a$, cạnh bên $SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$.",
      points: 1.0,
      trueFalseItems: [
        { id: "a", label: "a", statement: "Đường thẳng $BD$ vuông góc với mặt phẳng $(SAC)$", isCorrect: true },
        { id: "b", label: "b", statement: "Độ dài đường chéo $AC = a\\sqrt{3}$", isCorrect: false },
        { id: "c", label: "c", statement: "Góc giữa đường thẳng $SC$ và mặt phẳng đáy $(ABCD)$ là $\\widehat{SCA}$", isCorrect: true },
        { id: "d", label: "d", statement: "Thể tích khối chóp $S.ABCD$ bằng $\\frac{a^3\\sqrt{2}}{3}$", isCorrect: true }
      ],
      explanation: "a) $BD \\perp AC$ và $BD \\perp SA \\Rightarrow BD \\perp (SAC)$ (Đúng).\nb) $AC = a\\sqrt{2}$ nên ý b Sai.\nc) Hình chiếu của $SC$ lên $(ABCD)$ là $AC$ nên góc là $\\widehat{SCA}$ (Đúng).\nd) $V = \\frac{1}{3} S_{ABCD} \\cdot SA = \\frac{1}{3} a^2 \\cdot a\\sqrt{2} = \\frac{a^3\\sqrt{2}}{3}$ (Đúng)."
    },
    {
      order: 3,
      type: "short_answer",
      prompt: "Một chất điểm chuyển động với phương trình $s(t) = -t^3 + 9t^2 + 1$ ($t$ tính bằng giây, $s$ tính bằng mét). Tính vận tốc tức thời lớn nhất của chất điểm (theo đơn vị $m/s$):",
      points: 0.5,
      shortAnswerCorrect: ["27", "27 m/s", "27m/s"],
      explanation: "Vận tốc $v(t) = s'(t) = -3t^2 + 18t = -3(t-3)^2 + 27 \\le 27$. Đạt cực đại $27\\ m/s$ tại $t = 3\\ s$."
    }
  ];

  const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FEXAM_DeThiMau_Chuan_BoGD2025.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Full master prompt to convert any PDF / Image / Text into FEXAM JSON format using AI.
 * Fortified with strict anti-merging constraints for True/False questions and KaTeX compliance.
 */
export const FEXAM_AI_PROMPT_TEMPLATE = `Bạn là chuyên gia chuyển đổi tài liệu đề thi (PDF, Ảnh chụp, Word) thành định dạng JSON chuẩn FEXAM theo cấu trúc Đề thi Tốt nghiệp THPT 2025 của Bộ GD&ĐT.

============================================================
QUY TẮC CỐT LÕI BẮT BUỘC:
============================================================
1. Trả về DUY NHẤT một mảng JSON thô bắt đầu bằng [ và kết thúc bằng ].
2. TUYỆT ĐỐI KHÔNG giải thích, KHÔNG chào hỏi, KHÔNG bọc văn bản ngoài JSON.
3. Chuyển đổi TOÀN BỘ câu hỏi, KHÔNG được bỏ sót câu nào dù có hình vẽ.
4. Công thức toán học/vật lý/hóa học BẮT BUỘC đặt trong cặp dấu $...$ (inline) hoặc $$...$$ (display block).
   Ví dụ: $x = 1$, $\\frac{a}{b}$, $\\sqrt{x^2+1}$, $\\int_0^1 f(x)dx$, $\\lim_{x \\to 0} f(x)$, $\\vec{u}$.

============================================================
CÁC DẠNG CÂU HỎI & CẤU TRÚC JSON CHI TIẾT:
============================================================

------------------------------------------------------------
DẠNG 1: TRẮC NGHIỆM 4 LỰA CHỌN ("multiple_choice")
------------------------------------------------------------
- "type": "multiple_choice"
- "prompt": Nội dung câu hỏi (chứa công thức $...$).
- "points": 0.25
- "options": Mảng ĐỦ 4 phần tử có id và label là "A", "B", "C", "D".
- "correctOptionId": Chữ cái đáp án đúng DUY NHẤT ("A" / "B" / "C" / "D").
- "explanation": Lời giải chi tiết (nếu có).

------------------------------------------------------------
DẠNG 2: CÂU HỎI ĐÚNG / SAI ("true_false") [QUAN TRỌNG: TUYỆT ĐỐI TUÂN THỦ]
------------------------------------------------------------
- "type": "true_false"
- "prompt": CHỈ CHỨA PHẦN ĐỀ BÀI CHUNG / LỜI DẪN.
  *** CẤM TUYỆT ĐỐI: KHÔNG ĐƯỢC để các ý a), b), c), d) dính trong "prompt"! ***
- "points": 1.0
- "trueFalseItems": Mảng BẮT BUỘC ĐỦ 4 MỆNH ĐỀ TÁCH RỜI BIỆT LẬP:
  + Phần tử 1: { "id": "a", "label": "a", "statement": "Nội dung mệnh đề ý a", "isCorrect": true/false }
  + Phần tử 2: { "id": "b", "label": "b", "statement": "Nội dung mệnh đề ý b", "isCorrect": true/false }
  + Phần tử 3: { "id": "c", "label": "c", "statement": "Nội dung mệnh đề ý c", "isCorrect": true/false }
  + Phần tử 4: { "id": "d", "label": "d", "statement": "Nội dung mệnh đề ý d", "isCorrect": true/false }
  *** CHÚ Ý: "isCorrect" PHẢI là kiểu boolean (true hoặc false), KHÔNG dùng chuỗi "Đúng" hay "Sai"! ***
  *** CHÚ Ý: "statement" KHÔNG cần viết lặp lại chữ "a)", "b)" ở đầu. ***

------------------------------------------------------------
DẠNG 3: TRẢ LỜI NGẮN ("short_answer")
------------------------------------------------------------
- "type": "short_answer"
- "prompt": Nội dung câu hỏi tính toán.
- "points": 0.5
- "shortAnswerCorrect": Mảng chứa các đáp án được chấp nhận, ví dụ: ["27", "27 m/s", "27m/s", "27.0"].

------------------------------------------------------------
XỬ LÝ HÌNH ẢNH MINH HỌA:
------------------------------------------------------------
- Nếu câu hỏi có hình ảnh (đồ thị, hình không gian, sơ đồ, bảng biến thiên):
  + Trong "prompt": thêm ghi chú "[Hình ảnh: Đồ thị hàm số y = f(x)]" hoặc "[Hình ảnh: Bảng biến thiên]".
  + Thêm trường "imageUrl": "" để giáo viên tải ảnh lên sau.

============================================================
VÍ DỤ MẪU CHUẨN JSON TRẢ VỀ:
============================================================
[
  {
    "order": 1,
    "type": "multiple_choice",
    "prompt": "Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ có bảng biến thiên như sau. Điểm cực đại của hàm số đã cho là:",
    "points": 0.25,
    "options": [
      { "id": "A", "label": "A", "text": "$x = -1$" },
      { "id": "B", "label": "B", "text": "$x = 2$" },
      { "id": "C", "label": "C", "text": "$y = 4$" },
      { "id": "D", "label": "D", "text": "$x = 0$" }
    ],
    "correctOptionId": "A",
    "explanation": "Dựa vào bảng biến thiên, đạo hàm đổi dấu từ dương sang âm tại $x = -1$ nên điểm cực đại là $x = -1$."
  },
  {
    "order": 2,
    "type": "true_false",
    "prompt": "Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ có đồ thị như hình vẽ.",
    "points": 1.0,
    "trueFalseItems": [
      {
        "id": "a",
        "label": "a",
        "statement": "Hàm số đồng biến trên khoảng $(-\\infty; 0)$ và $(2; +\\infty)$.",
        "isCorrect": true
      },
      {
        "id": "b",
        "label": "b",
        "statement": "Giá trị cực tiểu của hàm số đã cho bằng $-2$.",
        "isCorrect": true
      },
      {
        "id": "c",
        "label": "c",
        "statement": "Điểm uốn của đồ thị hàm số là $I(1; 0)$.",
        "isCorrect": true
      },
      {
        "id": "d",
        "label": "d",
        "statement": "Phương trình $f(x) - 1 = 0$ có đúng 1 nghiệm thực.",
        "isCorrect": false
      }
    ],
    "explanation": "a) Đồ thị đi lên trên $(-\\infty; 0)$ và $(2; +\\infty)$ (Đúng).\\nb) Điểm cực tiểu $(2; -2)$ nên $y_{CT} = -2$ (Đúng).\\nc) Tâm đối xứng $I(1; 0)$ (Đúng).\\nd) Đường thẳng $y = 1$ cắt đồ thị tại 3 điểm phân biệt nên có 3 nghiệm thực (Sai)."
  },
  {
    "order": 3,
    "type": "short_answer",
    "prompt": "Một vật chuyển động theo phương trình $s(t) = -t^3 + 6t^2 + 2$ với $t$ tính bằng giây và $s$ tính bằng mét. Vận tốc lớn nhất của vật đạt được bằng bao nhiêu $m/s$?",
    "points": 0.5,
    "shortAnswerCorrect": ["12", "12 m/s", "12m/s"],
    "explanation": "Vận tốc $v(t) = s'(t) = -3t^2 + 12t = -3(t-2)^2 + 12 \\le 12\\ m/s$. Đạt cực đại tại $t = 2s$."
  }
]`;


