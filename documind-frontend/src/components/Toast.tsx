'use client';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let idCounter = 0;
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = (message: string, type: ToastType = 'info') => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  return { toasts, show, dismiss: (id: number) => setToasts(prev => prev.filter(t => t.id !== id)) };
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`
            pointer-events-auto min-w-[280px] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur
            flex items-start gap-2.5 animate-slide-in
            ${t.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-200' : ''}
            ${t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-200' : ''}
            ${t.type === 'info' ? 'bg-panel border-border text-text' : ''}
          `}
        >
          <span className="mt-0.5 flex-shrink-0">
            {t.type === 'success' && <SuccessIcon />}
            {t.type === 'error' && <ErrorIcon />}
            {t.type === 'info' && <InfoIcon />}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 ml-2" aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

function SuccessIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.3"/><path d="M4.5 8l2.5 2.5 4.5-5" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ErrorIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.3"/><path d="M8 5v3.5M8 11v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function InfoIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#5b8dee" strokeWidth="1.3"/><path d="M8 7.5v3M8 5.5v.5" stroke="#5b8dee" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
