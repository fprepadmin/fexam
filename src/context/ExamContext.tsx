import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Exam, ClassRoom, Student, ExamSubmission, ViolationRecord, ExamSession } from '../types';
import { storage } from '../services/storage';
import { calculateExamScore } from '../lib/grading';
import {
  subscribeExamsFirestore,
  subscribeSessionsFirestore,
  subscribeClassesFirestore,
  subscribeStudentsFirestore,
  subscribeSubmissionsFirestore,
} from '../services/firebase';

interface ExamContextType {
  classes: ClassRoom[];
  students: Student[];
  exams: Exam[];
  sessions: ExamSession[];
  submissions: ExamSubmission[];
  saveExam: (exam: Exam) => void;
  deleteExam: (id: string) => void;
  saveSession: (session: ExamSession) => void;
  deleteSession: (id: string) => void;
  saveClass: (cls: ClassRoom) => void;
  deleteClass: (id: string) => void;
  saveStudents: (newStudents: Student[]) => void;
  deleteStudent: (id: string) => void;
  saveSubmission: (sub: ExamSubmission) => void;
  updateLiveProgress: (subId: string, updates: Partial<ExamSubmission>) => void;
  recordViolation: (subId: string, violation: ViolationRecord) => void;
  addBonusMinutes: (subId: string, minutes: number) => void;
  sendTeacherMessage: (subId: string, message: string) => void;
  forceSubmitStudent: (subId: string) => void;
  regradeSubmissions: (examId: string, sessionId?: string) => number;
  resetAllData: () => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassRoom[]>(() => storage.getClasses());
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents());
  const [exams, setExams] = useState<Exam[]>(() => storage.getExams());
  const [sessions, setSessions] = useState<ExamSession[]>(() => storage.getSessions());
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() => storage.getSubmissions());

  const refreshData = useCallback(() => {
    setClasses(storage.getClasses());
    setStudents(storage.getStudents());
    setExams(storage.getExams());
    setSessions(storage.getSessions());
    setSubmissions(storage.getSubmissions());
  }, []);

  // 1. Local storage event listener
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshData();
    });
    return unsub;
  }, [refreshData]);

  // 2. Real-time Firebase Firestore Listeners (Zero Mock Data)
  useEffect(() => {
    // Subscribe Exams
    const unsubExams = subscribeExamsFirestore((remoteExams) => {
      storage.setExams(remoteExams);
      setExams(remoteExams);
    });

    // Subscribe Sessions
    const unsubSessions = subscribeSessionsFirestore((remoteSessions) => {
      storage.setSessions(remoteSessions);
      setSessions(remoteSessions);
    });

    // Subscribe Classes
    const unsubClasses = subscribeClassesFirestore((remoteClasses) => {
      storage.setClasses(remoteClasses);
      setClasses(remoteClasses);
    });

    // Subscribe Students
    const unsubStudents = subscribeStudentsFirestore((remoteStudents) => {
      storage.setStudents(remoteStudents);
      setStudents(remoteStudents);
    });

    // Subscribe Submissions
    const unsubSubmissions = subscribeSubmissionsFirestore((remoteSubs) => {
      storage.setSubmissions(remoteSubs);
      setSubmissions(remoteSubs);
    });

    return () => {
      if (unsubExams) unsubExams();
      if (unsubSessions) unsubSessions();
      if (unsubClasses) unsubClasses();
      if (unsubStudents) unsubStudents();
      if (unsubSubmissions) unsubSubmissions();
    };
  }, []);

  const saveExam = (exam: Exam) => {
    storage.saveExam(exam);
  };

  const deleteExam = (id: string) => {
    storage.deleteExam(id);
  };

  const saveSession = (session: ExamSession) => {
    storage.saveSession(session);
  };

  const deleteSession = (id: string) => {
    storage.deleteSession(id);
  };

  const saveClass = (cls: ClassRoom) => {
    storage.saveClass(cls);
  };

  const deleteClass = (id: string) => {
    storage.deleteClass(id);
  };

  const saveStudents = (newStudents: Student[]) => {
    storage.saveStudents(newStudents);
  };

  const deleteStudent = (id: string) => {
    storage.deleteStudent(id);
  };

  const saveSubmission = (sub: ExamSubmission) => {
    storage.saveSubmission(sub);
  };

  const updateLiveProgress = (subId: string, updates: Partial<ExamSubmission>) => {
    storage.updateLiveProgress(subId, updates);
  };

  const recordViolation = (subId: string, violation: ViolationRecord) => {
    storage.addViolation(subId, violation);
  };

  const addBonusMinutes = (subId: string, minutes: number) => {
    const target = submissions.find((s) => s.id === subId);
    if (target) {
      const currentBonus = target.bonusMinutes || 0;
      storage.updateLiveProgress(subId, { bonusMinutes: currentBonus + minutes });
    }
  };

  const sendTeacherMessage = (subId: string, message: string) => {
    storage.updateLiveProgress(subId, { teacherNote: message });
  };

  const forceSubmitStudent = (subId: string) => {
    const target = submissions.find((s) => s.id === subId);
    if (target) {
      const targetExam = exams.find((e) => e.id === target.examId || e.code === target.examCode);
      const questions = targetExam?.questions || [];
      const { scaledScore10, answeredCount, gradedAnswers } = calculateExamScore(questions, target.answers || {});
      const correctCount = Object.values(gradedAnswers).filter((a) => a.isCorrect).length;
      const wrongCount = answeredCount - correctCount;

      storage.updateLiveProgress(subId, {
        status: 'submitted',
        submitTime: new Date().toISOString(),
        score: scaledScore10,
        answeredCount,
        correctCount,
        wrongCount,
        answers: gradedAnswers,
      });
    }
  };

  const regradeSubmissions = (examId: string, sessionId?: string): number => {
    const targetExam = exams.find((e) => e.id === examId || e.code === examId);
    if (!targetExam) return 0;

    const targetSubs = submissions.filter((s) => {
      const matchExam = s.examId === examId || (targetExam.code && s.examCode === targetExam.code);
      if (!matchExam) return false;
      if (sessionId && s.sessionId !== sessionId && s.sessionCode !== sessionId) return false;
      return true;
    });

    let updatedCount = 0;
    targetSubs.forEach((sub) => {
      if (sub.status === 'submitted') {
        const { scaledScore10, answeredCount, correctCount, gradedAnswers } = calculateExamScore(
          targetExam.questions,
          sub.answers || {}
        );
        const wrongCount = Math.max(0, answeredCount - correctCount);

        const updated: ExamSubmission = {
          ...sub,
          score: scaledScore10,
          answeredCount,
          correctCount,
          wrongCount,
          answers: gradedAnswers,
        };
        storage.saveSubmission(updated);
        updatedCount++;
      }
    });
    return updatedCount;
  };

  const resetAllData = () => {
    storage.clearAllData();
  };

  return (
    <ExamContext.Provider
      value={{
        classes,
        students,
        exams,
        sessions,
        submissions,
        saveExam,
        deleteExam,
        saveSession,
        deleteSession,
        saveClass,
        deleteClass,
        saveStudents,
        deleteStudent,
        saveSubmission,
        updateLiveProgress,
        recordViolation,
        addBonusMinutes,
        sendTeacherMessage,
        forceSubmitStudent,
        regradeSubmissions,
        resetAllData,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};
