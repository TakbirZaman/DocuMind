'use client';

import { useState, useEffect } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import ChatInterface from '../components/ChatInterface';
import { useToast, ToastContainer } from '../components/Toast';

export interface Document {
  _id: string;
  originalName: string;
  filename: string;
  pageCount: number;
  charCount: number;
  uploadedAt: string;
  chunksCreated?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const { toasts, show, dismiss } = useToast();

  const fetchDocuments = async () => {
    setFetchError(null);
    try {
      const res = await fetch(`${API}/api/documents`);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      setDocuments(data);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch');
      show('Could not load documents — is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // health check
    fetch(`${API}/health`).then(r => setHealthOk(r.ok)).catch(() => setHealthOk(false));
  }, []);

  const handleUploadSuccess = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    setSelectedDoc(doc);
    setSidebarOpen(false);
    show(`✓ ${doc.originalName} ready — ${doc.chunksCreated} chunks`, 'success');
  };

  const handleSelect = (doc: Document) => {
    setSelectedDoc(doc);
    setSidebarOpen(false);
  };

  const handleDelete = async (id: string) => {
    const docName = documents.find(d => d._id === id)?.originalName || 'Document';
    try {
      const res = await fetch(`${API}/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setDocuments(prev => prev.filter(d => d._id !== id));
      if (selectedDoc?._id === id) setSelectedDoc(null);
      show(`Deleted ${docName}`, 'info');
    } catch (err: any) {
      show(err.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 flex-shrink-0 flex flex-col border-r border-border bg-panel
        transform transition-transform duration-200 lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 2h6l3 3v7H2V2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M7.5 2v3.5H11" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M4 7h5M4 9.5h3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-semibold text-text text-sm tracking-tight">DocuMind</span>
              <span className={`ml-1 w-2 h-2 rounded-full ${healthOk === null ? 'bg-yellow-400' : healthOk ? 'bg-green-400' : 'bg-red-400'}`} title={healthOk ? 'Backend online' : healthOk === false ? 'Backend offline' : 'Checking...'} />
            </div>
            <p className="text-muted text-xs mt-1.5">Chat with your PDFs</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted hover:text-text" aria-label="Close menu">✕</button>
        </div>

        {/* Upload */}
        <div className="px-4 py-4 border-b border-border">
          <DocumentUpload apiBase={API} onSuccess={handleUploadSuccess} />
          {healthOk === false && (
            <p className="text-xs text-red-300 mt-2 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              Backend offline — check <code className="font-mono">http://localhost:5000/health</code>
            </p>
          )}
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">
              Documents {documents.length > 0 ? `· ${documents.length}` : ''}
            </span>
            <button onClick={fetchDocuments} className="text-xs text-muted hover:text-text p-1" aria-label="Refresh documents" title="Refresh">↻</button>
          </div>
          {loading ? (
            <div className="px-4 space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : fetchError && documents.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-red-300 text-xs mb-2">{fetchError}</p>
              <button onClick={fetchDocuments} className="text-xs px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-dim">Retry</button>
            </div>
          ) : (
            <DocumentList
              documents={documents}
              selectedId={selectedDoc?._id ?? null}
              onSelect={handleSelect}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted">
            Powered by <span className="text-accent">GPT-4o-mini</span> + RAG
          </p>
          <p className="text-[11px] text-muted/60 mt-1">Tip: try “Summarize the key points”</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-panel flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md border border-border text-muted hover:text-text" aria-label="Open menu">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <span className="font-semibold text-text text-sm">DocuMind</span>
          {selectedDoc && <span className="text-xs text-muted truncate ml-2">— {selectedDoc.originalName}</span>}
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedDoc ? (
            <ChatInterface document={selectedDoc} apiBase={API} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-8">
      <div className="w-16 h-16 rounded-2xl bg-panel border border-border flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M5 4h12l6 6v14H5V4z" stroke="#5b8dee" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M16 4v7h6" stroke="#5b8dee" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M9 13h10M9 17h7M9 21h5" stroke="#5b8dee" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className="text-text font-semibold text-xl mb-2">No document selected</h2>
      <p className="text-muted text-sm max-w-xs leading-relaxed mb-6">
        Upload a PDF and select it to start asking questions about its contents.
      </p>
      <div className="rounded-lg border border-border bg-panel px-4 py-3 text-left max-w-sm w-full">
        <p className="text-xs font-medium text-text mb-2">How it works</p>
        <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
          <li>Upload a PDF (up to 50 MB)</li>
          <li>We extract, chunk &amp; embed it</li>
          <li>Ask anything — we answer from your doc</li>
        </ol>
      </div>
    </div>
  );
}
