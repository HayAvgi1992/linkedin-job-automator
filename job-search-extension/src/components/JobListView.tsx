import { useState } from 'react';
import { Briefcase, Star, Check } from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { useAutoApplyStore } from '../store/autoApplyStore';
import { useJobSearch } from '../hooks/useJobSearch';
import { useAutoApply } from '../hooks/useAutoApply';
import { JobCard } from './JobCard';
import { SkeletonCard } from './SkeletonCard';
import type { ViewType, JobFilter } from '../types';

interface JobListViewProps {
  onSetView: (view: ViewType) => void;
}

export function JobListView({ onSetView }: JobListViewProps) {
  const [filter, setFilter] = useState<JobFilter>('queue');
  const { jobs, jobStatuses, getFilteredJobs, getJobStatus, toggleSave, markApplied, markRejected, clearJobs, enriching } = useJobStore();
  const autoApplyStatus = useAutoApplyStore(s => s.status);
  const { loading, loadingMore, hasMoreJobs, loadMoreJobs } = useJobSearch();
  const { applyToJob } = useAutoApply();

  const filteredJobs = getFilteredJobs(filter);

  const openJob = (jobId: string) => {
    chrome.tabs.create({ url: `https://www.linkedin.com/jobs/view/${jobId}` });
  };

  const handleApply = (job: typeof jobs[0]) => {
    if (job.easyApply && jobStatuses[job.linkedinJobId] !== 'applied') {
      applyToJob(job);
    } else {
      markApplied(job.linkedinJobId);
      openJob(job.linkedinJobId);
    }
  };

  const handleReject = (jobId: string) => {
    // markRejected already removes the job from the array AND persists immediately.
    // No need to call removeJob — that would trigger a redundant debounced write.
    markRejected(jobId);
  };

  const queueJobs = jobs.filter(j => {
    const s = jobStatuses[j.linkedinJobId];
    return s !== 'applied' && s !== 'rejected' && s !== 'skipped';
  });
  const queueCount = queueJobs.length;
  const easyApplyCount = queueJobs.filter(j => j.easyApply).length;
  const savedCount = jobs.filter(j => jobStatuses[j.linkedinJobId] === 'saved').length;
  const appliedCount = jobs.filter(j => jobStatuses[j.linkedinJobId] === 'applied').length;

  const filters: { key: JobFilter; label: string; count: number; subCount?: string; icon: typeof Star | null }[] = [
    { key: 'queue', label: 'Queue', count: queueCount, subCount: easyApplyCount < queueCount ? `${easyApplyCount} EA` : undefined, icon: null },
    { key: 'saved', label: 'Saved', count: savedCount, icon: Star },
    { key: 'applied', label: 'Applied', count: appliedCount, icon: Check },
  ];

  return (
    <div className="flex-1 flex flex-col bg-base">
      {/* Results Header */}
      <div className="px-4 py-3 border-b border-edge bg-surface">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { clearJobs(); onSetView('search'); }}
            className="btn btn-ghost btn-sm px-0! h-auto! text-secondary hover:text-primary"
          >
            &larr; Back
          </button>
          <span className="text-[11px] text-muted mono">
            {filteredJobs.length} results
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5">
          {filters.map(({ key, label, count, subCount, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="filter-tab flex-1"
              data-active={filter === key}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
              <span className="filter-tab-count">{count}</span>
              {subCount && <span className="mono text-[9px] opacity-50">{subCount}</span>}
            </button>
          ))}
        </div>

        {enriching && (
          <div className="mt-2.5 enrichment-bar" />
        )}
      </div>

      {/* Job Cards — with tab content transition */}
      <div className="flex-1 overflow-auto p-3" key={filter}>
        {/* Skeleton loading state */}
        {loading && filteredJobs.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-elevated mx-auto mb-3 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-muted" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">
              {filter === 'saved' ? 'No saved jobs yet' : filter === 'applied' ? 'No applications yet' : 'No jobs found'}
            </p>
            <p className="text-xs text-muted">
              {filter === 'queue' ? 'Try different search terms' : 'Start saving or applying to jobs'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 tab-content">
            {filteredJobs.map((job, index) => {
              const status = getJobStatus(job.linkedinJobId);
              const isSaved = status === 'saved';
              const isApplied = status === 'applied';

              return (
                <JobCard
                  key={job.linkedinJobId || index}
                  job={job}
                  status={status}
                  isSaved={isSaved}
                  isApplied={isApplied}
                  autoApplyStatus={autoApplyStatus}
                  enriching={enriching}
                  onSave={() => toggleSave(job.linkedinJobId)}
                  onApply={() => handleApply(job)}
                  onReject={() => handleReject(job.linkedinJobId)}
                  onOpen={() => openJob(job.linkedinJobId)}
                  index={index}
                />
              );
            })}

            {/* Load More — with skeleton preview */}
            {filter === 'queue' && hasMoreJobs && filteredJobs.length > 0 && (
              loadingMore ? (
                <div className="space-y-2 mt-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <SkeletonCard key={`more-${i}`} index={i} />
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => loadMoreJobs({ keywords: '', location: '', remoteOnly: false, easyApplyOnly: false })}
                  className="btn btn-secondary w-full mt-2"
                >
                  Load More Jobs
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
