import { useCallback, useRef } from "react";

/**
 * Fraud/security alert beep using the Web Audio API — no external
 * audio file or CDN dependency. Two short square-wave tones for a
 * distinct "alarm" character. Respects a mute flag persisted in
 * localStorage so the admin/customer can silence alerts.
 */
export function useAlertSound() {
  const ctxRef = useRef(null);

  const isMuted = useCallback(() => localStorage.getItem("bs_muted") === "1", []);

  const setMuted = useCallback((muted) => {
    localStorage.setItem("bs_muted", muted ? "1" : "0");
  }, []);

  const playBeep = useCallback(() => {
    if (isMuted()) return;
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      const now = ctx.currentTime;

      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.18);
      });
    } catch (e) {
      // Audio unavailable (e.g. autoplay policy) — fail silently, alert
      // is still visible in the UI.
      console.warn("Alert sound unavailable:", e);
    }
  }, [isMuted]);

  return { playBeep, isMuted, setMuted };
}
