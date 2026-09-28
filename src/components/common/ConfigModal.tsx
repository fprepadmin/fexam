import React, { useState } from 'react';
import { Settings, Cloud, Database, X, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { initFirebase } from '../../services/firebase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { resetAllData } = useExam();

  // Cloudinary keys
  const [cloudName, setCloudName] = useState(
    localStorage.getItem('fexam_cloudinary_name') || 'dvpj3etcm'
  );
  const [uploadPreset, setUploadPreset] = useState(
    localStorage.getItem('fexam_cloudinary_preset') || 'fexambythongtran'
  );

  // Firebase Config
  const [firebaseApiKey, setFirebaseApiKey] = useState(
    localStorage.getItem('fexam_fb_apiKey') || ''
  );
  const [firebaseProjectId, setFirebaseProjectId] = useState(
    localStorage.getItem('fexam_fb_projectId') || ''
  );
  const [firebaseAppId, setFirebaseAppId] = useState(
    localStorage.getItem('fexam_fb_appId') || ''
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fexam_cloudinary_name', cloudName.trim());
    localStorage.setItem('fexam_cloudinary_preset', uploadPreset.trim());

    if (firebaseApiKey.trim() && firebaseProjectId.trim()) {
      const fbConfig = {
        apiKey: firebaseApiKey.trim(),
        projectId: firebaseProjectId.trim(),
        appId: firebaseAppId.trim(),
        authDomain: `${firebaseProjectId.trim()}.firebaseapp.com`,
      };
      localStorage.setItem('fexam_firebase_config', JSON.stringify(fbConfig));
      localStorage.setItem('fexam_fb_apiKey', firebaseApiKey.trim());
      localStorage.setItem('fexam_fb_projectId', firebaseProjectId.trim());
      localStorage.setItem('fexam_fb_appId', firebaseAppId.trim());

      initFirebase(fbConfig);
    }

    alert('Đã lưu cấu hình dịch vụ thành công!');
    onClose();
  };

  const handleResetDemoData = () => {
    if (window.confirm('Bạn có muốn khôi phục dữ liệu mẫu ban đầu (Demo data)?')) {
      resetAllData();
      alert('Đã khôi phục dữ liệu mẫu thành công!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
            <h3 className="text-lg font-bold text-slate-900">Cấu hình Đám mây & Cơ sở dữ liệu</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 mt-4">
          {/* Cloudinary Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-brand-900 uppercase">
                Cloudinary (Lưu trữ ảnh đề thi)
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Cloud Name
                </label>
                <input
                  type="text"
                  placeholder="dvpj3etcm"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Upload Preset
                </label>
                <input
                  type="text"
                  placeholder="fexambythongtran"
                  value={uploadPreset}
                  onChange={(e) => setUploadPreset(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Firebase Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-amber-50/40 border border-amber-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900 uppercase">
                Firebase (Database & Auth Cloud)
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Firebase API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={firebaseApiKey}
                  onChange={(e) => setFirebaseApiKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Project ID
                </label>
                <input
                  type="text"
                  placeholder="fexam-app-123"
                  value={firebaseProjectId}
                  onChange={(e) => setFirebaseProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục dữ liệu mẫu</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
