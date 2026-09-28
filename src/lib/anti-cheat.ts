/**
 * Anti-Cheat Utilities, Sound Effects Engine & Keystroke Dynamics
 */

class AudioAlertSystem {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playNotice() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
      osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {}
  }

  playWarning() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {}
  }

  playTimerTick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {}
  }
}

export const soundEngine = new AudioAlertSystem();

/**
 * Keystroke Dynamics Analyzer
 * Detects unnatural automated bot typing (Auto-Type macros, AI answer dumpers)
 */
export class KeystrokeDynamicsTracker {
  private lastKeyTime: number = 0;
  private keyIntervals: number[] = [];
  private lastValueLength: number = 0;

  /**
   * Check if input change is a macro / automated bot injection
   */
  checkInput(currentValue: string): { isBot: boolean; reason?: string } {
    const now = performance.now();
    const charDiff = currentValue.length - this.lastValueLength;
    const timeDiff = now - this.lastKeyTime;

    this.lastValueLength = currentValue.length;
    this.lastKeyTime = now;

    // 1. Check sudden string explosion (> 8 characters pasted or typed in < 40ms)
    if (charDiff > 8 && timeDiff < 40) {
      return {
        isBot: true,
        reason: `Phát hiện chèn văn bản siêu tốc (${charDiff} ký tự trong ${Math.round(timeDiff)}ms)`,
      };
    }

    // 2. Track keypress cadence consistency
    if (timeDiff > 0 && timeDiff < 1000) {
      this.keyIntervals.push(timeDiff);
      if (this.keyIntervals.length > 8) {
        this.keyIntervals.shift();

        // Calculate variance of intervals (bots have robotic fixed interval e.g. exactly 20ms +- 1ms)
        const avg = this.keyIntervals.reduce((a, b) => a + b, 0) / this.keyIntervals.length;
        const variance =
          this.keyIntervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
          this.keyIntervals.length;

        if (avg < 30 && variance < 2) {
          return {
            isBot: true,
            reason: 'Phát hiện nhịp gõ phím giả lập cố định (Bot/Macro Typing)',
          };
        }
      }
    }

    return { isBot: false };
  }

  reset() {
    this.lastKeyTime = 0;
    this.keyIntervals = [];
    this.lastValueLength = 0;
  }
}

/**
 * Request fullscreen securely
 */
export async function enterFullscreen(element: HTMLElement = document.documentElement): Promise<boolean> {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
      return true;
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request failed:', err);
  }
  return false;
}

/**
 * Exit fullscreen securely
 */
export async function exitFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if ((document as any).webkitFullscreenElement) {
      await (document as any).webkitExitFullscreen();
    }
  } catch (err) {
    console.warn('Exit fullscreen failed:', err);
  }
}

/**
 * Check if currently in fullscreen
 */
export function isFullscreenActive(): boolean {
  return Boolean(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}
