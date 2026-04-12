import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeOptions {
  onScan: (code: string) => void;
  minLength?: number;
  maxDelay?: number;
}

export function useBarcodeScanner({ onScan, minLength = 3, maxDelay = 50 }: UseBarcodeOptions) {
  const buffer = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(() => {
    const code = buffer.current.trim();
    if (code.length >= minLength) onScan(code);
    buffer.current = '';
  }, [onScan, minLength]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') { flush(); return; }
      if (e.key.length !== 1) return;
      clearTimeout(timer.current);
      buffer.current += e.key;
      timer.current = setTimeout(() => { buffer.current = ''; }, maxDelay);
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer.current); };
  }, [flush, maxDelay]);
}
