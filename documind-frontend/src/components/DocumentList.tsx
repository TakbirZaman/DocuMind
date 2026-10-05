'use client';

import { useState } from 'react';
import type { Document } from '../app/page';

interface Props {
  documents: Document[];
  selectedId: string | null;
  onSelect: (doc: Document) => void;
  onDelete: (id: string) => void;
}

function formatBytes(chars: number): string {
  if (!chars) return '';
  const kb = chars / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DocumentList({ documents, selectedId, onSelect, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-muted text-xs">No documents yet.</p>
        <p className="text-muted text-xs mt-1">Upload a PDF to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 pb-4" role="list" aria-label="Documents">
      {documents.map(doc => (
        <div
          key={doc._id}
          role="listitem"
          tabIndex={0}
          aria-selected={selectedId === doc._id}
          onClick={() => onSelect(doc)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(doc); } }}
          className={`
            group relative rounded-lg px-3 py-2.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
            ${selectedId === doc._id
              ? 'bg-accent/15 border border-accent/30'
              : 'hover:bg-white/5 border border-transparent'}
          `}
        >
          <div className="flex items-start justify-between gap-2">
            {/* Doc icon + name */}
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                  <path d="M2 1h7l3 3v11H2V1z"
                    stroke={selectedId === doc._id ? '#5b8dee' : '#8b95a8'}
                    strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
                  <path d="M8.5 1v3.5H12"
                    stroke={selectedId === doc._id ? '#5b8dee' : '#8b95a8'}
                    strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium truncate leading-snug ${
                  selectedId === doc._id ? 'text-accent' : 'text-text'
                }`}>
                  {doc.originalName || doc.filename}
                </p>
                <p className="text-muted text-xs mt-0.5">
                  {doc.pageCount ? `${doc.pageCount}p · ` : ''}
                  {timeAgo(doc.uploadedAt)}
                </p>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirmDelete === doc._id) {
                  onDelete(doc._id);
                  setConfirmDelete(null);
                } else {
                  setConfirmDelete(doc._id);
                  setTimeout(() => setConfirmDelete(null), 3000);
                }
              }}
              className={`
                flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                ${confirmDelete === doc._id
                  ? 'opacity-100 text-red-400 hover:text-red-300'
                  : 'text-muted hover:text-text'}
              `}
              title={confirmDelete === doc._id ? 'Click again to confirm' : 'Delete document'}
            >
              {confirmDelete === doc._id ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 3h9M4 3V2h4v1M5 5.5v3M7 5.5v3M2.5 3l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
