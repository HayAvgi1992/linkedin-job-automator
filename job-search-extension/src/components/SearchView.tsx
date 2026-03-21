import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useJobSearch } from '../hooks/useJobSearch';
import { LOCATIONS } from '../constants/locations';
import { SkeletonCard } from './SkeletonCard';
import type { ViewType } from '../types';

interface SearchViewProps {
  onSetView: (view: ViewType) => void;
}

export function SearchView({ onSetView }: SearchViewProps) {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [easyApplyOnly, setEasyApplyOnly] = useState(false);

  const { loading, loadingProgress, error, searchJobs } = useJobSearch();

  const handleSearch = async () => {
    await searchJobs({ keywords, location, remoteOnly, easyApplyOnly });
    onSetView('jobs');
  };

  return (
    <div className="flex-1 overflow-auto bg-base p-4">
      {/* Top progress bar */}
      {loading && (
        <div className="progress-top">
          <div
            className="progress-top-bar"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      {/* Search form — fades out when loading skeleton is shown */}
      {!loading ? (
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
      ) : (
        /* Skeleton preview while searching */
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="text-xs text-secondary">
              Searching... <span className="mono text-accent">{Math.round(loadingProgress)}%</span>
            </span>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
