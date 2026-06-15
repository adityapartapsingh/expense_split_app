'use client';

import React, { useState, useEffect } from 'react';
import api, { Group, ImportSession, ImportAnomaly, ImportReport } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

export default function ImportWizard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { error, success } = useToast();

  useEffect(() => {
    api.getGroups().then(data => setGroups(data.groups)).catch(() => {});
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        error('Only .csv files are allowed');
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedGroupId) return;
    setIsUploading(true);
    try {
      const response = await api.uploadCSV(selectedGroupId as number, file);
      const fullSession = await api.getImportSession(response.session.id);
      setSession(fullSession.session);
      setStep(2);
      success('CSV parsed successfully');
    } catch (err) {
      error('Failed to upload and parse CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDecision = async (anomalyId: number, decision: 'accept' | 'reject' | 'modify', correctedData?: any) => {
    if (!session) return;
    try {
      await api.updateAnomaly(session.id, anomalyId, { userDecision: decision, correctedData });
      // Update local state
      setSession({
        ...session,
        anomalies: session.anomalies.map(a => 
          a.id === anomalyId ? { ...a, userDecision: decision, correctedData: correctedData || a.correctedData } : a
        )
      });
    } catch (err) {
      error('Failed to save decision');
    }
  };

  const handleConfirm = async () => {
    if (!session) return;
    setIsConfirming(true);
    try {
      const response = await api.confirmImport(session.id);
      setReport(response.report);
      setStep(4);
      success('Import completed successfully');
    } catch (err) {
      error('Failed to confirm import. Please resolve all errors.');
    } finally {
      setIsConfirming(false);
    }
  };

  const hasPendingErrors = session?.anomalies.some(a => a.severity === 'error' && a.userDecision === 'pending');

  return (
    <div className="animate-in max-w-4xl mx-auto">
      <header className="page-header text-center">
        <h1 className="page-title">Import Expenses</h1>
        <p className="page-subtitle">Upload your CSV and review anomalies before finalizing.</p>
      </header>

      {/* Stepper */}
      <div className="stepper justify-center mb-10">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            <div className={`stepper-step ${step === s ? 'stepper-step--active' : step > s ? 'stepper-step--completed' : ''}`}>
              <div className="stepper-circle">{step > s ? '✓' : s}</div>
              <div className="stepper-label hidden md:block">
                {s === 1 ? 'Upload' : s === 2 ? 'Review' : s === 3 ? 'Confirm' : 'Result'}
              </div>
            </div>
            {s < 4 && <div className={`stepper-line ${step > s ? 'stepper-line--completed' : ''}`} style={{ width: '40px' }} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="glass-card flex flex-col gap-6">
          <div className="form-group">
            <label className="form-label">Select Group</label>
            <select 
              className="form-select" 
              value={selectedGroupId} 
              onChange={e => setSelectedGroupId(Number(e.target.value))}
            >
              <option value="" disabled>Choose a group...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div 
            className={`dropzone ${file ? 'dropzone--active' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              id="file-upload" 
              type="file" 
              accept=".csv" 
              className="hidden" 
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-brand-accent/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="dropzone-text">
              {file ? file.name : 'Drag & drop your CSV file here, or click to browse'}
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              className="btn btn-primary" 
              disabled={!file || !selectedGroupId || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? <span className="spinner spinner-sm"></span> : 'Upload & Analyze'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && session && (
        <div className="flex flex-col gap-6">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Review Anomalies</h2>
              <div className="flex gap-2">
                <span className="badge badge-error">{session.anomalies.filter(a => a.severity === 'error').length} Errors</span>
                <span className="badge badge-warning">{session.anomalies.filter(a => a.severity === 'warning').length} Warnings</span>
                <span className="badge badge-info">{session.anomalies.filter(a => a.severity === 'info').length} Info</span>
              </div>
            </div>
            <p className="text-sm text-muted mb-4">
              Please review the following issues found in your CSV. All errors must be resolved before proceeding.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {session.anomalies.map(anomaly => (
              <div key={anomaly.id} className="glass-card" style={{ borderLeft: `4px solid var(--${anomaly.severity === 'error' ? 'error' : anomaly.severity === 'warning' ? 'warning' : 'info'})` }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>Row {anomaly.rowNumber}</span>
                    <span className={`badge badge-${anomaly.severity}`}>{anomaly.anomalyType}</span>
                  </div>
                  <div>
                    {anomaly.userDecision !== 'pending' && (
                      <span className={`badge badge-${anomaly.userDecision === 'accept' ? 'success' : anomaly.userDecision === 'reject' ? 'error' : 'primary'}`}>
                        {anomaly.userDecision.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="font-medium mb-1">{anomaly.description}</p>
                <p className="text-sm text-muted mb-4">Suggestion: {anomaly.suggestedAction}</p>
                
                <div className="bg-input rounded-md p-3 mb-4 overflow-x-auto text-xs font-mono">
                  <div className="text-muted mb-1 uppercase tracking-wider">Original Row Data</div>
                  {JSON.stringify(anomaly.originalData)}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                  <button 
                    className={`btn btn-sm ${anomaly.userDecision === 'accept' ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => handleDecision(anomaly.id, 'accept')}
                  >
                    ✓ Accept Fix
                  </button>
                  <button 
                    className={`btn btn-sm ${anomaly.userDecision === 'reject' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => handleDecision(anomaly.id, 'reject')}
                  >
                    ✕ Skip Row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-6">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <div className="flex items-center gap-4">
              {hasPendingErrors && <span className="text-sm text-error">Resolve all errors to continue</span>}
              <button 
                className="btn btn-primary" 
                onClick={() => setStep(3)}
                disabled={hasPendingErrors}
              >
                Next Step →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && session && (
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6 text-center">Confirm Import</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-input p-4 rounded-lg text-center">
              <div className="text-3xl font-bold">{session.totalRows}</div>
              <div className="text-sm text-muted uppercase tracking-wider">Total Rows</div>
            </div>
            <div className="bg-input p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-success">
                {session.totalRows - session.anomalies.filter(a => a.userDecision === 'reject').length}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">To Import</div>
            </div>
            <div className="bg-input p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-error">
                {session.anomalies.filter(a => a.userDecision === 'reject').length}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">To Skip</div>
            </div>
            <div className="bg-input p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-info">
                {session.anomalies.filter(a => a.userDecision === 'accept' || a.userDecision === 'modify').length}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">Anomalies Fixed</div>
            </div>
          </div>

          <div className="flex justify-between">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back to Review</button>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? <span className="spinner"></span> : 'Start Import'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && report && (
        <div className="glass-card text-center animate-in flex flex-col items-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-semantic-success/20 flex items-center justify-center text-semantic-success shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-2">Import Complete!</h2>
          <p className="text-muted mb-8">Successfully imported {report.importedCount} rows into your group.</p>
          
          <div className="flex justify-center gap-4">
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => window.print()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Save Report
            </button>
            <Link href={`/dashboard/groups/${session?.groupId}`} className="btn btn-primary">
              Go to Group →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
