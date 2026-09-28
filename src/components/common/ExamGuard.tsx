import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Maximize2,
  AlertTriangle,
  Shield,
  EyeOff,
} from 'lucide-react';
import { enterFullscreen, isFullscreenActive, soundEngine } from '../../lib/anti-cheat';
import { ViolationRecord } from '../../types';

interface ExamGuardProps {
  children: React.ReactNode;
  maxStrikes?: number;
  onViolation: (violation: ViolationRecord) => void;
  onForceSubmit: () => void;
  requireFullscreen?: boolean;
  disabled?: boolean;
}

export const ExamGuard: React.FC<ExamGuardProps> = ({
  children,
  maxStrikes = 3,
  onViolation,
  onForceSubmit,
  requireFullscreen = true,
  disabled = false,
}) => {
  if (disabled) {
    return <>{children}</>;
  }

  // Guard states
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [recentWarning, setRecentWarning] = useState<string | null>(null);

  // Initial window dimensions to catch AI Sidebars (Monica, Edge Copilot, QuestionAI, Arc, Opera)
  const initialWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const initialHeightRef = useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 1080);
  
  // Guard lock ref: While true, ALL subsequent events are ignored so 1 action NEVER fires multiple strikes!
  const isLockedOutRef = useRef<boolean>(false);
  const lastStrikeTimestampRef = useRef<number>(0);
  const strikesCountRef = useRef<number>(0);

  // Store latest callbacks in refs to avoid recreating event listeners on every render
  const onViolationRef = useRef(onViolation);
  const onForceSubmitRef = useRef(onForceSubmit);
  useEffect(() => {
    onViolationRef.current = onViolation;
    onForceSubmitRef.current = onForceSubmit;
  }, [onViolation, onForceSubmit]);

  // Unified single-strike recorder (Guaranteed exactly 1 strike per event)
  const recordViolationOnce = useCallback(
    (type: ViolationRecord['type'], message: string) => {
      const now = Date.now();
      // If already in locked out state or fired within 2000ms, ignore to guarantee exactly 1 strike
      if (isLockedOutRef.current || now - lastStrikeTimestampRef.current < 2000) {
        setIsLockedOut(true);
        return;
      }

      isLockedOutRef.current = true;
      lastStrikeTimestampRef.current = now;
      setIsLockedOut(true);
      setRecentWarning(message);
      soundEngine.playWarning();

      strikesCountRef.current += 1;
      const currentStrike = strikesCountRef.current;
      setStrikes(currentStrike);

      const record: ViolationRecord = {
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        message: `${message} (Lần ${currentStrike}/${maxStrikes})`,
        timestamp: new Date().toISOString(),
      };
      
      // Execute onViolation cleanly outside React state setters to prevent duplicate triggers
      onViolationRef.current(record);

      if (currentStrike >= maxStrikes) {
        setTimeout(() => {
          onForceSubmitRef.current();
        }, 600);
      }
    },
    [maxStrikes]
  );

  // 1. Initial Gate: Fullscreen Activation
  const handleStartExamFullscreen = async () => {
    await enterFullscreen();
    initialWidthRef.current = window.innerWidth;
    initialHeightRef.current = window.innerHeight;
    setHasStartedFullscreen(true);
    isLockedOutRef.current = false;
    setIsLockedOut(false);
    soundEngine.playNotice();
  };

  // Resume from lockout
  const handleResumeExam = async () => {
    if (requireFullscreen) {
      await enterFullscreen();
    }
    initialWidthRef.current = window.innerWidth;
    initialHeightRef.current = window.innerHeight;
    setIsLockedOut(false);
    
    // 1.5s grace period so browser fullscreen resize animation does not trigger false positive
    setTimeout(() => {
      isLockedOutRef.current = false;
    }, 1500);
  };

  // 2. Global CSS Injection for targeted AI Extension suppression
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'fexam-anti-cheat-global-style';
    styleEl.innerHTML = `
      [class*="questionai" i]:not([class*="fexam-"]), [id*="questionai" i]:not([id*="fexam-"]), [class*="qai-" i], [id*="qai-" i],
      [class*="monica" i]:not([class*="fexam-"]), [id*="monica" i]:not([id*="fexam-"]), monica-root,
      [class*="sider" i]:not([class*="fexam-"]), [id*="sider" i]:not([id*="fexam-"]), sider-root,
      [class*="merlin" i], [id*="merlin" i],
      [class*="gauth" i], [id*="gauth" i],
      [class*="harpa" i], [id*="harpa" i],
      [class*="chatgpt" i], [id*="chatgpt" i],
      [class*="copilot" i], [id*="copilot" i],
      [class*="studyx" i], [id*="studyx" i],
      [class*="mathway" i], [id*="mathway" i],
      [class*="cohere" i], [id*="cohere" i],
      [class*="snip" i]:not([class*="fexam-"]), [id*="snip" i]:not([id*="fexam-"]),
      [class*="scissors" i], [id*="scissors" i],
      [class*="screenshot" i]:not([class*="fexam-"]), [id*="screenshot" i]:not([id*="fexam-"]),
      [class*="crop-overlay" i], [id*="crop-overlay" i],
      iframe:not([data-fexam-allowed]),
      canvas.snip-canvas, canvas.screen-capture-canvas {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
        z-index: -99999 !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      try {
        styleEl.remove();
      } catch {}
    };
  }, []);

  // 3. Main Security Listeners & Targeted AI Extension Purger
  useEffect(() => {
    if (!hasStartedFullscreen) return;

    // Chặn Copy, Cut, Paste, Context Menu, Drag & Drop, SelectStart
    const preventAction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Clear text selection completely to prevent AI extension scrapers
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) {
        sel.removeAllRanges();
      }
    };

    // Chặn phím tắt cấm & phím tắt kích hoạt AI (Monica, Copilot, ChatGPT, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j' || e.key === 'M' || e.key === 'm')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'a' || e.key === 'A' || e.key === 'm' || e.key === 'M')) ||
        (e.altKey && (e.key === 'm' || e.key === 'M' || e.key === 'q' || e.key === 'Q')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        recordViolationOnce('copy_paste', `Thực hiện phím tắt cấm / phím tắt mở AI (${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.key})`);
        return false;
      }
    };

    // Ngăn chặn sự kiện kéo chuột chọn vùng (Block Drag-to-Snip Marquee Selection của QuestionAI & Extension)
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Cho phép tương tác bình thường với nút bấm, input, modal thi
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'BUTTON' ||
        target?.closest('button') ||
        target?.closest('input') ||
        target?.closest('textarea') ||
        target?.closest('#fexam-anti-screenshot-curtain')
      ) {
        return;
      }

      // Nếu kéo chuột hoặc bấm ngoài khu vực cho phép -> Hủy vùng chọn
      window.getSelection()?.removeAllRanges();
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Khi nhấn giữ chuột trái và kéo trên trang thi để vẽ khung cắt
      if (e.buttons === 1) {
        const target = e.target as HTMLElement;
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
        if (!isInput) {
          window.getSelection()?.removeAllRanges();
          // Chặn propagation nếu chuột đang di chuyển trong trạng thái kéo chọn vùng của extension
          if (target && !target.closest('#root')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
              target.remove();
            } catch {}
          }
        }
      }
    };

    document.addEventListener('contextmenu', preventAction, true);
    document.addEventListener('copy', preventAction, true);
    document.addEventListener('cut', preventAction, true);
    document.addEventListener('paste', preventAction, true);
    document.addEventListener('dragstart', preventAction, true);
    document.addEventListener('drop', preventAction, true);
    document.addEventListener('selectstart', preventAction, true);
    document.addEventListener('selectionchange', handleSelectionChange, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);

    // Quản lý Focus & Màn Chập (Blackout) tức thì khi mất focus
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolationOnce('tab_switch', 'Chuyển sang tab khác hoặc ẩn trình duyệt');
      }
    };

    const handleWindowBlur = () => {
      if (!document.hasFocus()) {
        recordViolationOnce('mouse_leave', 'Mất tiêu điểm (Click ra ngoài / Mở AI Sidebar / Chụp màn hình)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handleWindowBlur);

    // Bắt Fullscreen Exit
    const handleFullscreenChange = () => {
      const active = isFullscreenActive();
      if (!active && requireFullscreen) {
        recordViolationOnce('fullscreen_exit', 'Thoát khỏi chế độ toàn màn hình');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Bắt AI Sidebar (Monica / Edge Copilot / Opera Aria / DevTools)
    const handleResize = () => {
      if (!hasStartedFullscreen) return;
      
      const currentWidth = window.innerWidth;
      const screenWidth = window.screen.availWidth || window.screen.width;
      const widthDelta = initialWidthRef.current - currentWidth;
      const screenDelta = screenWidth - currentWidth;

      // Nếu chiều ngang bị bóp hẹp do mở thanh AI Sidebar bên cạnh (Monica, Copilot, DevTools)
      if (screenDelta > 160 || widthDelta > 160) {
        recordViolationOnce('devtools', 'Phát hiện mở thanh công cụ AI Sidebar / Side Panel');
      }
    };
    window.addEventListener('resize', handleResize);

    // 4. Targeted AI Extension & Snip Overlay Purger (Triệt tiêu toàn diện QuestionAI, Monica, Sider, Iframes)
    const purgeAiExtensionsFromDom = () => {
      const aiSelectors = [
        '[class*="questionai" i]', '[id*="questionai" i]',
        '[class*="qai-" i]', '[id*="qai-" i]',
        '[class*="monica" i]', '[id*="monica" i]', 'monica-root',
        '[class*="sider" i]', '[id*="sider" i]', 'sider-root',
        '[class*="merlin" i]', '[id*="merlin" i]',
        '[class*="gauth" i]', '[id*="gauth" i]',
        '[class*="harpa" i]', '[id*="harpa" i]',
        '[class*="chatgpt" i]', '[id*="chatgpt" i]',
        '[class*="copilot" i]', '[id*="copilot" i]',
        '[class*="studyx" i]', '[id*="studyx" i]',
        '[class*="mathway" i]', '[id*="mathway" i]',
        '[class*="snip" i]', '[id*="snip" i]',
        '[class*="scissors" i]', '[id*="scissors" i]',
        '[class*="screen-capture" i]', '[id*="screen-capture" i]',
        '[class*="screenshot" i]', '[id*="screenshot" i]',
        'iframe:not([data-fexam-allowed])',
      ];

      // 4.1. Xóa theo selector extension đã biết (Tuyệt đối không xóa node bên trong #root để tránh làm sập React reconciliation)
      aiSelectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            if (el.id !== 'root' && !el.id.startsWith('fexam-') && !el.closest('#root')) {
              el.remove();
            }
          });
        } catch {}
      });

      // 4.2. Quét và triệt tiêu các lớp phủ quét màn hình (Snip Overlays / Foreign Fullscreen Nodes outside #root)
      try {
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach((child) => {
          if (
            child.id === 'root' ||
            child.id.startsWith('fexam-') ||
            child.tagName === 'SCRIPT' ||
            child.tagName === 'STYLE' ||
            child.tagName === 'NOSCRIPT'
          ) {
            return;
          }

          const htmlEl = child as HTMLElement;
          const tagName = htmlEl.tagName.toLowerCase();

          // Nếu là custom element (chứa gạch nối e.g. questionai-root, monica-box), iframe, canvas độc lập -> Xóa ngay
          if (tagName.includes('-') || tagName === 'iframe' || tagName === 'canvas' || tagName === 'embed' || tagName === 'object') {
            htmlEl.remove();
            return;
          }

          // Nếu phần tử có position fixed/absolute che màn hình hoặc z-index cao bất thường ngoài #root -> Xóa ngay
          const style = window.getComputedStyle(htmlEl);
          if (
            (style.position === 'fixed' || style.position === 'absolute') &&
            (parseInt(style.zIndex, 10) > 100 || style.zIndex === 'auto') &&
            (htmlEl.offsetWidth > window.innerWidth * 0.5 || htmlEl.offsetHeight > window.innerHeight * 0.5)
          ) {
            htmlEl.remove();
          }
        });
      } catch {}
    };

    // Polling Liveness Check & Purge every 200ms
    const intervalChecker = setInterval(() => {
      if (!hasStartedFullscreen) return;

      purgeAiExtensionsFromDom();

      // Check Fullscreen
      if (requireFullscreen && !isFullscreenActive()) {
        recordViolationOnce('fullscreen_exit', 'Thoát khỏi chế độ toàn màn hình');
        return;
      }

      // Check Document Focus
      if (!document.hasFocus() || document.hidden) {
        recordViolationOnce('mouse_leave', 'Mất tiêu điểm cửa sổ thi');
        return;
      }

      // Check AI Sidebar width
      const screenWidth = window.screen.availWidth || window.screen.width;
      if (screenWidth - window.innerWidth > 180) {
        recordViolationOnce('devtools', 'Phát hiện thanh công cụ AI Sidebar đang mở bên cạnh');
        return;
      }
    }, 200);

    // MutationObserver on document.documentElement (Root level) for AI injected popups & snip canvases
    const rootObserver = new MutationObserver(() => {
      purgeAiExtensionsFromDom();
    });

    rootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Initial purge
    purgeAiExtensionsFromDom();

    return () => {
      document.removeEventListener('contextmenu', preventAction, true);
      document.removeEventListener('copy', preventAction, true);
      document.removeEventListener('cut', preventAction, true);
      document.removeEventListener('paste', preventAction, true);
      document.removeEventListener('dragstart', preventAction, true);
      document.removeEventListener('drop', preventAction, true);
      document.removeEventListener('selectstart', preventAction, true);
      document.removeEventListener('selectionchange', handleSelectionChange, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalChecker);
      rootObserver.disconnect();
    };
  }, [hasStartedFullscreen, requireFullscreen, recordViolationOnce]);

  // GATE 1: Must click start fullscreen button
  if (!hasStartedFullscreen && requireFullscreen) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 select-none">
        <div className="max-w-lg w-full bg-slate-900 border border-brand-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/10">
            <Maximize2 className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Yêu Cầu Toàn Màn Hình</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kỳ thi yêu cầu chế độ <strong className="text-white font-bold">Toàn màn hình (Fullscreen)</strong> và kích hoạt <strong className="text-white font-bold">Hệ thống Giám sát Chống Gian lận FEXAM Guard Pro</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-2 text-slate-300">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Shield className="w-4 h-4" />
              <span>Quy chế phòng thi nghiêm ngặt:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li>Không chuyển tab, không mở AI Sidebar/Popup (QuestionAI, Monica, Copilot...) hoặc ứng dụng khác.</li>
              <li>Mọi thao tác thoát toàn màn hình hoặc mất tiêu điểm sẽ <strong className="text-amber-300 font-bold">kích hoạt Màn chập đen & ẩn đề thi ngay lập tức</strong>.</li>
              <li>Vi phạm quá <strong className="text-rose-400 font-bold">{maxStrikes} lần</strong> sẽ bị <strong className="text-rose-400 font-bold">đình chỉ thi và nộp bài tự động</strong>.</li>
            </ul>
          </div>

          <button
            onClick={handleStartExamFullscreen}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-brand-500/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Kích Hoạt Toàn Màn Hình & Bắt Đầu Thi</span>
          </button>
        </div>
      </div>
    );
  }

  // GATE 2: Permanently Locked / Disqualified after exceeding strikes
  if (strikes >= maxStrikes) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-slate-900 border border-rose-600 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-rose-600/20 text-rose-500 border border-rose-600/40 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white">BÀI THI ĐÃ BỊ ĐÌNH CHỈ</h2>
            <p className="text-xs text-rose-300 leading-relaxed">
              Bạn đã vi phạm quy chế thi quá <strong className="text-white font-bold">{maxStrikes} lần cho phép</strong>. Bài thi đã bị hệ thống tự động thu bài gửi về Giám thị!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 font-semibold">
            Lý do vi phạm: <span className="text-white font-bold">{recentWarning || 'Mất tiêu điểm nhiều lần'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen select-none bg-[#F8FAFC]"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* 1. Main Exam Content: When locked out, 100% hidden (display: none + invisible) so NO AI/OCR screenshot can capture it */}
      <div
        style={{
          display: isLockedOut ? 'none' : 'block',
          visibility: isLockedOut ? 'hidden' : 'visible',
          opacity: isLockedOut ? 0 : 1,
        }}
      >
        {children}
      </div>

      {/* 2. MÀN CHẬP TỨC THÌ (Zero-Delay Solid Blackout Curtain) chống AI chụp ảnh màn hình */}
      {isLockedOut && (
        <div
          id="fexam-blackout-curtain-modal"
          className="fixed inset-0 w-screen h-screen bg-black flex items-center justify-center p-6 select-none"
          style={{
            backgroundColor: '#000000',
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            visibility: 'visible',
            opacity: 1,
            zIndex: 2147483647,
          }}
        >
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
              <EyeOff className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white tracking-tight">
                MÀN HÌNH BỊ KHÓA DO VI PHẠM
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đề thi đã bị kích hoạt màn chập đen để chống gian lận. Bạn đang có <span className="text-amber-400 font-bold">{strikes}/{maxStrikes}</span> lần vi phạm.
              </p>
            </div>

            {recentWarning && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-2.5 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="leading-snug">{recentWarning}</span>
              </div>
            )}

            <button
              onClick={handleResumeExam}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Tiếp Tục Làm Bài & Bật Lại Toàn Màn Hình</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
