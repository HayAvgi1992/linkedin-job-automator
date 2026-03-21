import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useJobSearch } from '../hooks/useJobSearch';
import { useJobStore } from '../store/jobStore';
import { useProfileStore } from '../store/profileStore';
import { LOCATIONS } from '../constants/locations';
import type { ViewType } from '../types';

interface SearchViewProps {
  onSetView: (view: ViewType) => void;
}

export function SearchView({ onSetView }: SearchViewProps) {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [easyApplyOnly, setEasyApplyOnly] = useState(false);

  const { loading, loadingStage, error, searchJobs } = useJobSearch();
  const jobs = useJobStore(s => s.jobs);
  const { resumeInfo } = useProfileStore();

  const handleSearch = async () => {
    await searchJobs({ keywords, location, remoteOnly, easyApplyOnly });
    onSetView('jobs');
  };

  return (
    <div className="flex-1 overflow-auto bg-base p-4">
      {/* Search form */}
      <div className="space-y-4 animate-fade-in">
        {/* Keywords */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1.5">
            Job Title or Keywords
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. Software Engineer, Data Scientist"
            className="input input-lg"
            onKeyDown={(e) => e.key === 'Enter' && keywords && handleSearch()}
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1.5">
            Location
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="select"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filters row */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="checkbox"
            />
            <span className="text-xs font-medium text-secondary group-hover:text-primary transition-colors">
              Remote only
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={easyApplyOnly}
              onChange={(e) => setEasyApplyOnly(e.target.checked)}
              className="checkbox"
            />
            <span className="text-xs font-medium text-secondary group-hover:text-primary transition-colors">
              Easy Apply only
            </span>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg p-3 bg-danger-muted border border-danger/20 animate-fade-in">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading || !keywords}
          className="btn btn-primary btn-lg w-full"
        >
          <Search className="w-4 h-4" />
          <span>Search Jobs</span>
        </button>
      </div>

      {/* Loading spinner with stage text */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-sm text-secondary">{loadingStage || 'Loading...'}</p>
        </div>
      )}

      {/* Resume banner — shown when jobs are loaded but no resume exists */}
      {!loading && !resumeInfo && jobs.length > 0 && (
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 mb-3">
          <p className="text-xs text-accent">
            Upload your resume to see match scores for each job.
          </p>
        </div>
      )}
    </div>
  );
}
