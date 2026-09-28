import React, { useState } from 'react';
import {
  Settings,
  Cloud,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  Shield,
  Key,
  Globe,
  Server,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Code,
  ShieldAlert,
} from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { initFirebase, DEFAULT_FIREBASE_CONFIG } from '../../services/firebase';

const FIRESTORE_RULES_CONTENT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Helper Functions & RBAC
    function isAuthenticated() {
      return request.auth != null;
    }
    function isSuperAdmin() {
      return isAuthenticated() &&
        request.auth.token.email != null &&
        request.auth.token.email.lower() == 'thongtnmfct31178@gmail.com' &&
        request.auth.token.email_verified == true;
    }
    function isApprovedTeacher() {
      return isSuperAdmin() || (
        isAuthenticated() &&
        exists(/databases/$(database)/documents/teachers/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/teachers/$(request.auth.uid)).data.status in ['active', 'approved']
      );
    }

    // 2. Teachers Collection
    match /teachers/{teacherId} {
      allow read: if isSuperAdmin() || (isAuthenticated() && (resource.data.status in ['active', 'approved'] || request.auth.uid == teacherId));
      allow create: if isSuperAdmin() || (isAuthenticated() && (request.auth.uid == teacherId || request.resource.data.id == request.auth.uid) && request.resource.data.role == 'teacher' && request.resource.data.status in ['pending', 'active']);
      allow update: if isSuperAdmin() || (isAuthenticated() && request.auth.uid == teacherId && request.resource.data.role == resource.data.role && request.resource.data.status == resource.data.status);
      allow delete: if isSuperAdmin();
    }

    // 3. Exams Collection
    match /exams/{examId} {
      allow read: if true;
      allow create: if isApprovedTeacher() && (isSuperAdmin() || request.resource.data.authorId == request.auth.uid || request.resource.data.authorEmail.lower() == request.auth.token.email.lower());
      allow update: if isApprovedTeacher() && (isSuperAdmin() || resource.data.authorId == request.auth.uid || resource.data.authorEmail.lower() == request.auth.token.email.lower()) && request.resource.data.id == resource.data.id;
      allow delete: if isApprovedTeacher() && (isSuperAdmin() || resource.data.authorId == request.auth.uid || resource.data.authorEmail.lower() == request.auth.token.email.lower());
    }

    // 4. Sessions (Ca thi & Ca ôn tập)
    match /sessions/{sessionId} {
      allow read: if true;
      allow create, update, delete: if isApprovedTeacher();
    }

    // 5. Classes & Students
    match /classes/{classId} {
      allow read, write: if isApprovedTeacher();
    }
    match /students/{studentId} {
      allow read, write: if isApprovedTeacher();
    }

    // 6. Submissions & Live Proctoring
    match /submissions/{subId} {
      allow read: if true;
      allow create: if request.resource.data.id == subId && request.resource.data.examId is string;
      allow update: if request.resource.data.id == resource.data.id;
      allow delete: if isApprovedTeacher() || isSuperAdmin();
    }

    // 7. Default Deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

const RTDB_RULES_CONTENT = `{
  "rules": {
    ".read": false,
    ".write": false,
    "live_proctor": {
      "$sessionId": {
        ".read": true,
        "$submissionId": {
          ".write": true
        }
      }
    },
    "sessions": {
      ".read": true,
      "$sessionId": {
        ".write": "auth != null"
      }
    },
    "exams": {
      ".read": true,
      "$examId": {
        ".write": "auth != null"
      }
    },
    "teachers": {
      ".read": "auth != null",
      "$teacherId": {
        ".write": "auth != null && (auth.uid === $teacherId || auth.token.email === 'thongtnmfct31178@gmail.com')"
      }
    },
    "classes": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "students": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}`;

import { useAuth } from '../../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const { resetAllData } = useExam();

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Truy Cập Bị Từ Chối</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang <strong>Cài đặt Hệ thống & Firebase Rules</strong> chỉ dành riêng cho Quản trị viên (Admin). Tài khoản Giáo viên không có quyền truy cập hoặc chỉnh sửa cấu hình hệ thống.
        </p>
      </div>
    );
  }

  const [copiedFirestore, setCopiedFirestore] = useState(false);
  const [copiedRtdb, setCopiedRtdb] = useState(false);

  const [cloudName, setCloudName] = useState(
    localStorage.getItem('fexam_cloudinary_name') || 'dvpj3etcm'
  );
  const [uploadPreset, setUploadPreset] = useState(
    localStorage.getItem('fexam_cloudinary_preset') || 'fexambythongtran'
  );

  const [firebaseApiKey, setFirebaseApiKey] = useState(
    localStorage.getItem('fexam_fb_apiKey') || DEFAULT_FIREBASE_CONFIG.apiKey
  );
  const [firebaseProjectId, setFirebaseProjectId] = useState(
    localStorage.getItem('fexam_fb_projectId') || DEFAULT_FIREBASE_CONFIG.projectId
  );
  const [firebaseAppId, setFirebaseAppId] = useState(
    localStorage.getItem('fexam_fb_appId') || DEFAULT_FIREBASE_CONFIG.appId
  );
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState(
    DEFAULT_FIREBASE_CONFIG.storageBucket
  );

  const handleCopyFirestore = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_CONTENT);
    setCopiedFirestore(true);
    setTimeout(() => setCopiedFirestore(false), 2000);
  };

  const handleCopyRtdb = () => {
    navigator.clipboard.writeText(RTDB_RULES_CONTENT);
    setCopiedRtdb(true);
    setTimeout(() => setCopiedRtdb(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fexam_cloudinary_name', cloudName.trim());
    localStorage.setItem('fexam_cloudinary_preset', uploadPreset.trim());

    if (firebaseApiKey.trim() && firebaseProjectId.trim()) {
      const fbConfig = {
        apiKey: firebaseApiKey.trim(),
        authDomain: `${firebaseProjectId.trim()}.firebaseapp.com`,
        projectId: firebaseProjectId.trim(),
        storageBucket: firebaseStorageBucket.trim() || `${firebaseProjectId.trim()}.firebasestorage.app`,
        messagingSenderId: DEFAULT_FIREBASE_CONFIG.messagingSenderId,
        appId: firebaseAppId.trim(),
        databaseURL: `https://${firebaseProjectId.trim()}-default-rtdb.asia-southeast1.firebasedatabase.app`,
      };
      localStorage.setItem('fexam_firebase_config', JSON.stringify(fbConfig));
      localStorage.setItem('fexam_fb_apiKey', firebaseApiKey.trim());
      localStorage.setItem('fexam_fb_projectId', firebaseProjectId.trim());
      localStorage.setItem('fexam_fb_appId', firebaseAppId.trim());

      initFirebase(fbConfig);
    }

    alert('Đã lưu và áp dụng cấu hình Firebase thành công!');
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sạch bộ nhớ đệm (Clear Cache)?')) {
      resetAllData();
      alert('Đã dọn dẹp sạch cache!');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Cài đặt Hệ thống & Firebase Rules
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cấu hình Firebase Authentication, Cloud Firestore Realtime, Security Rules và Cloudinary
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Firebase Online</span>
        </div>
      </div>

      {/* BẮT BUỘC: SECURITY RULES INSTRUCTIONS CARD */}
      <div className="bg-gradient-to-br from-amber-500/10 via-white to-blue-50/40 p-6 sm:p-8 rounded-3xl border-2 border-amber-300 shadow-md space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Cấu Hình Firebase Security Rules (BẮT BUỘC ĐỂ LƯU DATA)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase">
                Quan Trọng
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mặc định Firebase sẽ khóa quyền ghi nếu bạn chưa dán Rules. Để hệ thống có thể lưu trữ đề thi, ca thi, danh sách giáo viên và bài nộp học sinh vào Cloud Firestore, bạn vui lòng copy 2 bộ Rules dưới đây dán vào Firebase Console:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Firestore Rules Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800">1. Cloud Firestore Rules</span>
                </div>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseProjectId}/firestore/rules`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
                >
                  <span>Mở Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <pre className="mt-3 p-3 bg-slate-900 text-amber-300 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-40">
                {FIRESTORE_RULES_CONTENT}
              </pre>
            </div>

            <button
              type="button"
              onClick={handleCopyFirestore}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                copiedFirestore
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
              }`}
            >
              {copiedFirestore ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã Copy Firestore Rules!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Firestore Rules</span>
                </>
              )}
            </button>
          </div>

          {/* Realtime Database Rules Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">2. Realtime Database Rules</span>
                </div>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseProjectId}/database/rules`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:underline"
                >
                  <span>Mở Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <pre className="mt-3 p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-40">
                {RTDB_RULES_CONTENT}
              </pre>
            </div>

            <button
              type="button"
              onClick={handleCopyRtdb}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                copiedRtdb
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              }`}
            >
              {copiedRtdb ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã Copy Realtime Rules!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Realtime Rules</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-100/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Hướng dẫn nhanh:</strong> Nhấn nút "Copy", sau đó bấm link "Mở Console", dán vào ô Rules trên Firebase và bấm nút <strong>"Publish"</strong>. Dữ liệu sẽ lưu và đồng bộ tức thì!
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Firebase Config Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Firebase Project Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Dự án FEXAM · FPREP LMS
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
              Đã kết nối
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Firebase API Key
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project ID
              </label>
              <input
                type="text"
                placeholder="fexambythongtran"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                disabled
                value={`${firebaseProjectId}.firebaseapp.com`}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                App ID
              </label>
              <input
                type="text"
                placeholder="1:830538568816:web:..."
                value={firebaseAppId}
                onChange={(e) => setFirebaseAppId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Cloudinary */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Cloud className="w-5 h-5 text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Cloudinary (Lưu trữ ảnh & Sơ đồ đề thi)</h2>
              <p className="text-xs text-slate-400">Tải ảnh đề thi trực tiếp không tốn dung lượng server</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cloud Name
              </label>
              <input
                type="text"
                placeholder="dvpj3etcm"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Upload Preset (Unsigned)
              </label>
              <input
                type="text"
                placeholder="fexambythongtran"
                value={uploadPreset}
                onChange={(e) => setUploadPreset(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Dọn Dẹp Bộ Nhớ Đệm (Clear Cache)</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md transition-all hover:scale-[1.02]"
          >
            <Save className="w-4 h-4" />
            <span>Lưu & Áp Dụng Cấu Hình</span>
          </button>
        </div>
      </form>
    </div>
  );
};
