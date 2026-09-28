import * as XLSX from 'xlsx';
import { Student, ExamSubmission, ClassRoom, Exam, ExamSession, SessionCandidate } from '../types';

/**
 * Parse Excel / CSV file containing student roster
 * Expected columns: MSHS (Mã số học sinh), Họ và tên (Name), Lớp (Class), Email
 */
export async function parseStudentExcel(file: File, classId: string, defaultClassName?: string): Promise<Student[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (rawRows.length <= 1) return [];

  const headers = (rawRows[0] as string[]).map((h) => String(h || '').toLowerCase().trim());

  // Find column indices
  let mshsIdx = headers.findIndex((h) => h.includes('mshs') || h.includes('mã hs') || h.includes('mã học sinh') || h.includes('mã số') || h.includes('id') || h.includes('code'));
  let nameIdx = headers.findIndex((h) => h.includes('tên') || h.includes('name') || h.includes('họ'));
  let classIdx = headers.findIndex((h) => h.includes('lớp') || h.includes('class') || h.includes('phòng'));
  let emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
  let phoneIdx = headers.findIndex((h) => h.includes('sđt') || h.includes('điện thoại') || h.includes('phone'));
  let noteIdx = headers.findIndex((h) => h.includes('ghi chú') || h.includes('note'));

  // Default fallback if headers are simple
  if (mshsIdx === -1) mshsIdx = 0;
  if (nameIdx === -1) nameIdx = 1;

  const students: Student[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
    if (!rawName) continue;

    const rawMshs = row[mshsIdx] ? String(row[mshsIdx]).trim().toUpperCase() : `HS${1000 + i}`;
    const rawClass = classIdx !== -1 && row[classIdx] ? String(row[classIdx]).trim() : defaultClassName || '';
    const rawEmail = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : '';
    const rawPhone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '';
    const rawNote = noteIdx !== -1 && row[noteIdx] ? String(row[noteIdx]).trim() : '';

    students.push({
      id: `std-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      mshs: rawMshs,
      name: rawName,
      className: rawClass,
      classId,
      email: rawEmail,
      phone: rawPhone,
      notes: rawNote,
      studentCode: rawMshs,
      createdAt: new Date().toISOString(),
    });
  }

  return students;
}

/**
 * Export student roster to Excel
 */
export function exportStudentsToExcel(students: Student[], classroom: ClassRoom) {
  const exportData = students.map((st, index) => ({
    'STT': index + 1,
    'MSHS': st.mshs || st.studentCode || `HS${1000 + index + 1}`,
    'Họ và tên': st.name,
    'Lớp': st.className || classroom.name,
    'Email': st.email || '',
    'Số điện thoại': st.phone || '',
    'Ghi chú': st.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');
  XLSX.writeFile(workbook, `Danh_sach_${classroom.code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export auto-generated candidates roster with "Mã dự thi (SBD)" for Exam Session
 */
export function exportCandidatesToExcel(session: ExamSession, candidates: SessionCandidate[]) {
  const exportData = candidates.map((cand, index) => ({
    'STT': index + 1,
    'Mã dự thi (SBD)': cand.candidateCode,
    'MSHS': cand.mshs,
    'Họ và tên': cand.name,
    'Lớp': cand.className,
    'Email': cand.email || '',
    'Mã Ca thi': session.code,
    'Tên Ca thi': session.title,
    'Môn thi': session.examTitle,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Thẻ dự thi');
  XLSX.writeFile(workbook, `The_du_thi_${session.code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export exam results & gradebook to Excel
 */
export function exportExamResultsToExcel(exam: Exam, submissions: ExamSubmission[]) {
  const exportData = submissions.map((sub, index) => ({
    'STT': index + 1,
    'Mã dự thi (SBD)': sub.studentCode,
    'MSHS': sub.mshs || '',
    'Họ và tên': sub.studentName,
    'Lớp': sub.className || 'Tự do',
    'Email': sub.email || '',
    'Điểm số (Thang 10)': Math.round((sub.score / (sub.maxScore || 1)) * 10 * 100) / 100,
    'Điểm gốc': `${sub.score} / ${sub.maxScore}`,
    'Số câu đã làm': `${sub.answeredCount} / ${sub.totalQuestions}`,
    'Thời gian nộp bài': sub.submitTime ? new Date(sub.submitTime).toLocaleString('vi-VN') : 'Đang làm',
    'Thời gian làm (phút)': Math.round(sub.durationSecondsUsed / 60),
    'Số lần vi phạm': sub.violations ? sub.violations.length : 0,
    'Trạng thái': sub.status === 'submitted' ? 'Đã nộp' : sub.status === 'flagged' ? 'Vi phạm' : 'Đang làm',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng điểm');
  XLSX.writeFile(workbook, `Bang_diem_${exam.code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
