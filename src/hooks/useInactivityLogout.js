// src/hooks/useInactivityLogout.js
// Auto logout setelah tidak ada aktivitas selama TIMEOUT_MS
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 jam

// Event yang dianggap "aktivitas user"
const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown',
  'scroll', 'touchstart', 'click',
];

export function useInactivityLogout() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const timerRef   = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await logout();
      navigate('/login', { replace: true });
    }, TIMEOUT_MS);
  }, [logout, navigate]);

  useEffect(() => {
    // Mulai timer pertama kali
    resetTimer();

    // Reset setiap ada aktivitas
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      );
    };
  }, [resetTimer]);
}
