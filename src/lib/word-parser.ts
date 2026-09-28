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
 * Full master prompt to convert any PDF / Image / Text into FEXAM JSON format using AI
 */
export const FEXAM_AI_PROMPT_TEMPLATE = `Bạn là chuyên gia chuyển đổi đề thi từ PDF / Ảnh / Word sang định dạng JSON của hệ thống khảo thí FEXAM (Chuẩn Bộ Giáo dục & Đào tạo 2025).

YÊU CẦU BẮT BUỘC:
- Chuyển đổi TOÀN BỘ câu hỏi, KHÔNG bỏ sót bất kỳ câu nào dù khó hay có hình ảnh.
- Chỉ trả về JSON thô (raw JSON), KHÔNG viết lời chào, KHÔNG giải thích, KHÔNG markdown code block.
- Kết quả phải bắt đầu bằng [ và kết thúc bằng ] — copy thẳng được vào hệ thống.

========================================
1. QUY TẮC CÔNG THỨC TOÁN, LÝ, HÓA:
========================================
- Tất cả công thức, ký hiệu toán học, vật lý, hóa học BẮT BUỘC bọc trong $...$ (inline) hoặc $$...$$ (display block).
- Cú pháp chuẩn:
  + Phân số: $\\frac{a}{b}$
  + Căn bậc hai: $\\sqrt{x}$, căn bậc n: $\\sqrt[3]{x}$
  + Tích phân: $\\int_a^b f(x)dx$
  + Giới hạn: $\\lim_{x \\to x_0} f(x)$
  + Vectơ: $\\vec{u}$, $\\overrightarrow{AB}$
  + Hình học: $\\perp$, $\\parallel$, $\\widehat{ABC}$, $\\Delta$
  + Tập hợp: $\\mathbb{R}$, $\\mathbb{N}$, $\\in$, $\\notin$, $\\subset$
  + Hóa học: $\\text{Fe} + 2\\text{HCl} \\rightarrow \\text{FeCl}_2 + \\text{H}_2\\uparrow$

========================================
2. CÁC DẠNG CÂU HỎI ĐƯỢC HỖ TRỢ:
========================================

Dạng 1: "multiple_choice" (Trắc nghiệm 4 phương án A, B, C, D)
- Mảng "options" gồm 4 phần tử id/label: "A", "B", "C", "D".
- "correctOptionId": chữ cái đáp án đúng ("A" / "B" / "C" / "D").
- "points": 0.25

Dạng 2: "true_false" (Đúng / Sai theo chuẩn 2025)
- Mảng "trueFalseItems" gồm 4 mệnh đề id/label: "a", "b", "c", "d".
- Mỗi mệnh đề có "statement" và "isCorrect" (true / false).
- "points": 1.0

Dạng 3: "short_answer" (Trả lời ngắn)
- Mảng "shortAnswerCorrect" chứa tất cả đáp án đúng chấp nhận được, ví dụ: ["27", "27.0", "27 m/s"].
- "points": 0.5

========================================
3. XỬ LÝ HÌNH ẢNH / HÌNH VẼ TRONG ĐỀ THI:
========================================
- Nếu câu có hình minh họa (đồ thị, hình học, sơ đồ, bảng biến thiên):
  + Ghi vào "prompt": "[Hình ảnh: Đồ thị hàm số y = f(x)]" hoặc "[Hình ảnh: Hình chóp S.ABCD]".
  + Thêm trường "imageUrl": "" để giáo viên tải ảnh trực tiếp trên FEXAM.

========================================
4. CẤU TRÚC JSON MẪU BẮT BUỘC TRẢ VỀ:
========================================
[
  {
    "order": 1,
    "type": "multiple_choice",
    "prompt": "Cho hàm số $y = f(x)$ có bảng biến thiên như hình vẽ. Điểm cực đại của hàm số là:",
    "points": 0.25,
    "options": [
      { "id": "A", "label": "A", "text": "$x = 1$" },
      { "id": "B", "label": "B", "text": "$x = -2$" },
      { "id": "C", "label": "C", "text": "$y = 3$" },
      { "id": "D", "label": "D", "text": "$x = 0$" }
    ],
    "correctOptionId": "A",
    "explanation": "Dựa vào bảng biến thiên, đạo hàm $f'(x)$ đổi dấu từ dương sang âm tại $x = 1$ nên $x = 1$ là điểm cực đại."
  },
  {
    "order": 2,
    "type": "true_false",
    "prompt": "Cho tứ diện $OABC$ có $OA, OB, OC$ đôi một vuông góc và $OA = OB = OC = a$.",
    "points": 1.0,
    "trueFalseItems": [
      { "id": "a", "label": "a", "statement": "Tam giác $ABC$ là tam giác đều cạnh $a\\sqrt{2}$", "isCorrect": true },
      { "id": "b", "label": "b", "statement": "Thể tích khối tứ diện $OABC$ bằng $\\frac{a^3}{3}$", "isCorrect": false },
      { "id": "c", "label": "c", "statement": "Đường thẳng $OA$ vuông góc với mặt phẳng $(OBC)$", "isCorrect": true },
      { "id": "d", "label": "d", "statement": "Khoảng cách từ $O$ đến mặt phẳng $(ABC)$ bằng $\\frac{a}{\\sqrt{3}}$", "isCorrect": true }
    ],
    "explanation": "a) $AB = BC = CA = \\sqrt{a^2+a^2} = a\\sqrt{2}$ (Đúng).\\nb) $V=\\frac{1}{6}OA\\cdot OB\\cdot OC=\\frac{a^3}{6}$ nên ý b Sai.\\nc) $OA\\perp OB$ và $OA\\perp OC\\Rightarrow OA\\perp(OBC)$ (Đúng).\\nd) $h=\\frac{a}{\\sqrt{3}}$ (Đúng)."
  },
  {
    "order": 3,
    "type": "short_answer",
    "prompt": "Cho hình phẳng $(H)$ giới hạn bởi $y = x^2$ và $y = 2x$. Tính thể tích khối tròn xoay khi quay $(H)$ quanh trục $Ox$:",
    "points": 0.5,
    "shortAnswerCorrect": ["2.68", "64/15", "4.27"],
    "explanation": "$V = \\pi\\int_0^2((2x)^2-(x^2)^2)dx = \\frac{64\\pi}{15}$."
  }
]`;

