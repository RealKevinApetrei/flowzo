"use client";

import { useRef, useCallback } from "react";

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: (id: string) => void;
  onQuickTap: (id: string, position: { x: number; y: number }) => void;
}

export function useLongPress({
  threshold = 500,
  onLongPress,
  onQuickTap,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargingIdRef = useRef<string | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    chargingIdRef.current = null;
    firedRef.current = false;
  }, []);

  const onPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      firedRef.current = false;
      chargingIdRef.current = id;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress(id);
        chargingIdRef.current = null;
      }, threshold);
    },
    [threshold, onLongPress],
  );

  const onPointerUp = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!firedRef.current && chargingIdRef.current === id) {
        onQuickTap(id, { x: e.clientX, y: e.clientY });
      }
      chargingIdRef.current = null;
      firedRef.current = false;
    },
    [onQuickTap],
  );

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerLeave = useCallback(() => {
    clear();
  }, [clear]);

  return {
    chargingIdRef,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  };
}
