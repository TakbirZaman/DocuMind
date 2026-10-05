'use client';

import { useState, useCallback, useRef } from 'react';
import type { Document } from '../app/page';

interface Props {
  apiBase: string;
  onSuccess: (doc: Document) => void;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

export default function DocumentUpload({ apiBase, onSuccess }: Props) {
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setState('error');
      setMessage('Only PDF files are accepted.');
      setTimeout(() => setState('idle'), 3000);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setState('error');
      setMessage('File too large — max 50 MB.');
      setTimeout(() => setState('idle'), 3000);
      return;
    }
    if (file.size === 0) {
      setState('error');
      setMessage('File is empty.');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    setState('uploading');
    setMessage('');

    const form = new FormData();
    form.append('pdf', file);

    try {
      const res = await fetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setState('success');
      setMessage(`${data.chunksCreated} chunks vectorized`);
      onSuccess({
        _id: data.documentId,
        originalName: data.filename,
        filename: data.filename,
        pageCount: data.pageCount || 0,
        charCount: 0,
        uploadedAt: new Date().toISOString(),
        chunksCreated: data.chunksCreated,
      });
      setTimeout(() => setState('idle'), 3000);
    } catch (err: any) {
      setState('error');
      setMessage(err.message);
      setTimeout(() => setState('idle'), 4000);
    }
  }, [apiBase, onSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const isUploading = state === 'uploading';

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF document"
        aria-disabled={isUploading}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isUploading) { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setState('dragging'); }}
        onDragLeave={() => { if (!isUploading) setState('idle'); }}
        onDrop={onDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
          transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
          ${state === 'dragging' ? 'border-accent bg-accent/10 drop-active' : ''}
          ${state === 'idle' ? 'border-border hover:border-accent/50 hover:bg-accent/5' : ''}
          ${state === 'uploading' ? 'border-accent/40 bg-accent/5 cursor-not-allowed' : ''}
          ${state === 'success' ? 'border-green-500/50 bg-green-500/5' : ''}
          ${state === 'error' ? 'border-red-400/50 bg-red-400/5' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {state === 'uploading' ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-accent text-xs font-medium">Processing PDF…</span>
          </div>
        ) : state === 'success' ? (
          <div className="flex flex-col items-center gap-1 py-1">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="#22c55e" strokeWidth="1.5"/>
              <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-green-400 text-xs">{message}</span>
          </div>
        ) : state === 'error' ? (
          <div className="flex flex-col items-center gap-1 py-1">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="#f87171" strokeWidth="1.5"/>
              <path d="M9 5.5v4M9 12v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-red-400 text-xs text-center">{message}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 13V5M7 8l3-3 3 3" stroke="#5b8dee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="#5b8dee" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-muted">
              <span className="text-accent font-medium">Click to upload</span>
              {' '}or drag PDF here
            </p>
            <p className="text-[11px] text-muted/70">PDF only · max 50 MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
