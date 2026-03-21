import { Star, Check, X, Zap, MapPin } from 'lucide-react';
import { SalarySkeleton } from './SkeletonCard';
import type { Job, JobStatus, AutoApplyStatus } from '../types';

interface JobCardProps {
  job: Job;
  status: JobStatus;
  isSaved: boolean;
  isApplied: boolean;
  autoApplyStatus: AutoApplyStatus;
  enriching?: boolean;
  onSave: () => void;
  onApply: () => void;
  onReject: () => void;
  onOpen: () => void;
  index?: number;
}

function SalaryBadge({ source }: { source?: string }) {
  switch (source) {
    case 'linkedin':
      return <span className="badge badge-indigo">LinkedIn</span>;
    case 'coresignal':
      return <span className="badge badge-emerald">Market</span>;
    case 'openai':
      return <span className="badge badge-amber">AI est.</span>;
    default:
      return <span className="badge badge-neutral">Est.</span>;
  }
}

export function JobCard({
  job,
  status,
  isSaved,
  isApplied,
  autoApplyStatus,
  enriching = false,
  onSave,
  onApply,
  onReject,
  onOpen,
  index = 0,
}: JobCardProps) {
  const statusClass = isApplied
    ? 'card-status-applied'
    : isSaved
    ? 'card-status-saved'
    : '';

  return (
    <div
      className={`card card-interactive stagger-in ${statusClass}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Top row: title + applied badge */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className="text-[13px] font-medium text-primary leading-snug cursor-pointer hover:text-accent transition-colors flex-1"
          onClick={onOpen}
        >
          {job.title || 'Untitled Position'}
        </h3>
        {isApplied && (
          <span className="badge badge-emerald shrink-0">
            <Check className="w-2.5 h-2.5" />
            Applied
          </span>
        )}
        {status === 'queued' && !isSaved && !isApplied && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 animate-glow-pulse" />
        )}
      </div>

      <p className="text-[11px] text-secondary mb-2">
        {job.company.name || 'Company Name Not Available'}
      </p>

      {/* Salary — shimmer skeleton while enriching */}
      {job.salary ? (
        <div className="flex items-center gap-2 mb-2">
          <span className="mono text-xs font-semibold text-primary">
            ${(job.salary.min / 1000).toFixed(0)}k&ndash;${(job.salary.max / 1000).toFixed(0)}k
          </span>
          <SalaryBadge source={job.salary.source} />
        </div>
      ) : enriching ? (
        <SalarySkeleton />
      ) : null}

      {/* Location & tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {job.location.city && (
          <span className="badge badge-neutral">
            <MapPin className="w-2.5 h-2.5" />
            {job.location.city}
          </span>
        )}
        {job.location.remote && (
          <span className="badge badge-indigo">Remote</span>
        )}
        {job.easyApply && (
          <span className="badge badge-emerald">
            <Zap className="w-2.5 h-2.5" />
            Easy Apply
          </span>
        )}
        {job.matchScore && (
          <div className="group relative">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              job.matchScore.overall >= 80 ? 'bg-success-muted text-success' :
              job.matchScore.overall >= 60 ? 'bg-accent/10 text-accent' :
              'bg-muted/10 text-muted'
            }`}>
              {job.matchScore.overall}% match
            </span>
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50
              bg-elevated border border-edge rounded-lg p-2.5 shadow-lg min-w-[180px]">
              <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Skills</span>
                  <span className="text-primary font-medium">{job.matchScore.skills}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Experience</span>
                  <span className="text-primary font-medium">{job.matchScore.experience}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Fit</span>
                  <span className="text-primary font-medium">{job.matchScore.fit}%</span>
                </div>
                <p className="text-muted pt-1 border-t border-edge">{job.matchScore.reasoning}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 pt-2.5 border-t border-edge">
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`btn btn-sm flex-1 ${isSaved ? 'bg-info-muted text-info border-transparent' : 'btn-secondary'}`}
        >
          <Star className={`w-3 h-3 transition-transform ${isSaved ? 'fill-current scale-110' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          disabled={isApplied || autoApplyStatus === 'running'}
          className={`btn btn-sm flex-1 ${
            isApplied
              ? 'bg-success-muted text-success border-transparent'
              : 'btn-primary'
          }`}
        >
          {job.easyApply && !isApplied ? (
            <><Zap className="w-3 h-3" />Auto</>
          ) : (
            <><Check className="w-3 h-3" />{isApplied ? 'Applied' : 'Apply'}</>
          )}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onReject(); }}
          className="btn btn-sm btn-ghost w-8 p-0! hover:text-danger hover:bg-danger-muted"
          title="Hide this job"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
