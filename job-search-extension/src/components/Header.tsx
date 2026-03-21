import { Briefcase, Search, Zap, Sun, Moon } from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { useThemeStore } from '../store/themeStore';
import type { ViewType } from '../types';

interface HeaderProps {
  view: ViewType;
  onSetView: (view: ViewType) => void;
}

export function Header({ view, onSetView }: HeaderProps) {
  const jobs = useJobStore(s => s.jobs);
  const { theme, toggleTheme } = useThemeStore();

  const isSearchActive = view === 'search' || view === 'jobs';

  return (
    <div className="bg-surface border-b border-edge">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-muted flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-accent" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-primary tracking-tight leading-none">
              JobPilot
            </h1>
            <p className="text-[10px] text-muted mt-0.5">LinkedIn Automation</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="btn-ghost rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-3.5 h-3.5 transition-transform hover:-rotate-12" />
          )}
        </button>
      </div>

      {/* Navigation Tabs — with animated indicator */}
      <div className="flex px-3 pb-0 gap-1 relative">
        <button
          onClick={() => {
            const targetView = jobs.length > 0 ? 'jobs' : 'search';
            onSetView(targetView);
          }}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-t-lg transition-all duration-200 relative ${
            isSearchActive
              ? 'text-accent bg-accent-subtle'
              : 'text-secondary hover:text-primary hover:bg-hover'
          }`}
        >
          <Search className="w-3 h-3" />
          {jobs.length > 0 ? (
            <>Jobs <span className="mono text-[10px] ml-0.5 opacity-70">{jobs.length}</span></>
          ) : (
            'Search'
          )}
          {/* Animated underline indicator */}
          <span
            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t bg-accent transition-all duration-200"
            style={{
              opacity: isSearchActive ? 1 : 0,
              transform: isSearchActive ? 'scaleX(1)' : 'scaleX(0)',
            }}
          />
        </button>
        <button
          onClick={() => onSetView('autoApply')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-t-lg transition-all duration-200 relative ${
            view === 'autoApply'
              ? 'text-accent bg-accent-subtle'
              : 'text-secondary hover:text-primary hover:bg-hover'
          }`}
        >
          <Zap className="w-3 h-3" />
          Auto Apply
          <span
            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t bg-accent transition-all duration-200"
            style={{
              opacity: view === 'autoApply' ? 1 : 0,
              transform: view === 'autoApply' ? 'scaleX(1)' : 'scaleX(0)',
            }}
          />
        </button>
      </div>
    </div>
  );
}
