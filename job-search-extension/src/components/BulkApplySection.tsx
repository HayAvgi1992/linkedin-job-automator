import { useState } from 'react';
import { Zap, Briefcase, Loader2, Square, Clock, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Ban } from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { useAutoApplyStore } from '../store/autoApplyStore';
import { useAutoApply } from '../hooks/useAutoApply';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function BulkApplySection() {
  const { jobs, jobStatuses } = useJobStore();
  const { status, message, bulkProgress, bulkResults, bulkStartedAt, currentJobTitle, currentJobCompany } = useAutoApplyStore();
  const { startAutoApply, startBulkAutoApply, stopBulkApply, clearBulkResults } = useAutoApply();
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const isRunning = status === 'running';
  const isBulkRunning = isRunning && bulkProgress.total > 0;
  const isSingleRunning = isRunning && bulkProgress.total === 0;

  // Bug 1 fix: separate counts for total queue vs Easy Apply ready
  const queueCount = jobs.filter(j => {
    const s = jobStatuses[j.linkedinJobId];
    return s !== 'applied' && s !== 'rejected' && s !== 'skipped';
  }).length;

  const readyToApply = jobs.filter(j => {
    const s = jobStatuses[j.linkedinJobId];
    return j.easyApply && s !== 'applied' && s !== 'rejected' && s !== 'skipped';
  }).length;

  const nonEasyApply = queueCount - readyToApply;
  const appliedCount = jobs.filter(j => jobStatuses[j.linkedinJobId] === 'applied').length;

  // Timing calculations
  const elapsed = bulkStartedAt ? Date.now() - bulkStartedAt : 0;
  const avgTimePerJob = bulkProgress.current > 0 ? elapsed / bulkProgress.current : 0;
  const remaining = bulkProgress.total - bulkProgress.current;
  const eta = avgTimePerJob > 0 ? remaining * avgTimePerJob : 0;
  const progressPercent = bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0;

  // Results breakdown
  const appliedResults = bulkResults.filter(r => r.status === 'applied');
  const failedResults = bulkResults.filter(r => r.status === 'failed');
  const skippedResults = bulkResults.filter(r => r.status === 'skipped');
  const cancelledResults = bulkResults.filter(r => r.status === 'cancelled');
  const hasResults = bulkResults.length > 0 && !isBulkRunning;

  return (
    <>
      {/* Bulk Auto Apply */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-primary flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent" />
            Bulk Auto Apply
          </h3>
          {/* Inline stats — no nested cards */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-secondary">
              <span className="mono font-bold text-primary">{readyToApply}</span> ready
              {nonEasyApply > 0 && <span className="text-muted ml-1">+{nonEasyApply}</span>}
            </span>
            <span className="text-success">
              <span className="mono font-bold">{appliedCount}</span> applied
            </span>
          </div>
        </div>

        {/* Active progress (during bulk apply) */}
        {isBulkRunning && (
          <div className="mb-3 space-y-2">
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Current job info */}
            <div className="text-[11px] text-secondary">
              <div className="font-medium text-primary truncate">
                {currentJobTitle || 'Loading...'}
              </div>
              {currentJobCompany && (
                <div className="text-muted truncate">{currentJobCompany}</div>
              )}
            </div>

            {/* Timing */}
            <div className="flex justify-between text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(elapsed)} elapsed
              </span>
              {eta > 0 && (
                <span>~{formatDuration(eta)} remaining</span>
              )}
            </div>

            {/* Live tally */}
            <div className="flex gap-3 text-[10px]">
              {appliedResults.length > 0 && (
                <span className="text-success">{appliedResults.length} applied</span>
              )}
              {failedResults.length > 0 && (
                <span className="text-danger">{failedResults.length} failed</span>
              )}
              {skippedResults.length > 0 && (
                <span className="text-warning">{skippedResults.length} skipped</span>
              )}
            </div>
          </div>
        )}

        {/* Results summary (after bulk apply completes) */}
        {hasResults && (
          <div className="mb-3 pt-3 border-t border-edge space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">Results</span>
              <button
                onClick={clearBulkResults}
                className="text-[10px] text-muted hover:text-primary transition-colors"
              >
                Dismiss
              </button>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-1.5">
              {appliedResults.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-muted text-success text-[10px] font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {appliedResults.length} applied
                </span>
              )}
              {failedResults.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-medium">
                  <XCircle className="w-3 h-3" /> {failedResults.length} failed
                </span>
              )}
              {skippedResults.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-medium">
                  <AlertTriangle className="w-3 h-3" /> {skippedResults.length} skipped
                </span>
              )}
              {cancelledResults.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/10 text-muted text-[10px] font-medium">
                  <Ban className="w-3 h-3" /> {cancelledResults.length} cancelled
                </span>
              )}
            </div>

            {/* Expandable details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-accent hover:text-primary transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Hide' : 'Show'} details
            </button>

            {showDetails && (
              <div className="space-y-1">
                <div className="max-h-40 overflow-auto space-y-1">
                  {bulkResults
                    .filter(r => showCancelled || r.status !== 'cancelled')
                    .map((r) => (
                    <div
                      key={r.jobId}
                      className="flex items-start gap-2 text-[10px] py-1 border-b border-edge last:border-0"
                    >
                      {r.status === 'applied' && <CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" />}
                      {r.status === 'failed' && <XCircle className="w-3 h-3 text-danger shrink-0 mt-0.5" />}
                      {r.status === 'skipped' && <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />}
                      {r.status === 'cancelled' && <Ban className="w-3 h-3 text-muted shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-primary truncate">{r.title}</div>
                        {r.company && <div className="text-muted truncate">{r.company}</div>}
                        {r.error && <div className="text-danger">{r.error}</div>}
                        {r.duration != null && r.duration > 0 && <div className="text-muted">{formatDuration(r.duration)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {cancelledResults.length > 0 && (
                  <button
                    onClick={() => setShowCancelled(!showCancelled)}
                    className="text-[10px] text-muted hover:text-primary transition-colors"
                  >
                    {showCancelled ? 'Hide' : 'Show'} {cancelledResults.length} cancelled (not attempted)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action button: Start / Stop */}
        {isBulkRunning ? (
          <button
            onClick={stopBulkApply}
            className="btn btn-lg w-full bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Stop After Current Job</span>
          </button>
        ) : (
          <button
            onClick={startBulkAutoApply}
            disabled={isRunning || readyToApply === 0}
            className="btn btn-primary btn-lg w-full"
          >
            <Zap className="w-4 h-4" />
            <span>Auto Apply to All <span className="mono">({readyToApply})</span></span>
          </button>
        )}

        {message && !isBulkRunning && !hasResults && (
          <p className={`text-[11px] mt-2 text-center animate-fade-in ${
            message.includes('Error') || message.includes('Failed') || message.includes('failed') ? 'text-danger' : 'text-success'
          }`}>
            {message}
          </p>
        )}
      </div>

      {/* Single Job Apply */}
      <div className="card">
        <h3 className="text-xs font-semibold text-primary mb-3 flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 text-accent" />
          Single Job Apply
        </h3>
        <p className="text-[11px] text-secondary mb-3">
          Navigate to a LinkedIn job with Easy Apply, then click below.
        </p>
        <button
          onClick={startAutoApply}
          disabled={isRunning}
          className={`btn btn-secondary w-full ${isSingleRunning ? 'btn-pulse' : ''}`}
        >
          {isSingleRunning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Applying...</span></>
          ) : (
            <><Zap className="w-4 h-4" /><span>Apply to Current Job</span></>
          )}
        </button>
      </div>
    </>
  );
}
