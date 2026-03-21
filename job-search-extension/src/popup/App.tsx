import { useState, useEffect } from 'react';
import { useJobStore } from '../store/jobStore';
import { useProfileStore } from '../store/profileStore';
import { useQuestionStore } from '../store/questionStore';
import { useAutoApplyStore } from '../store/autoApplyStore';
import { useThemeStore } from '../store/themeStore';
import { Header } from '../components/Header';
import { SearchView } from '../components/SearchView';
import { JobListView } from '../components/JobListView';
import { AutoApplyView } from '../components/AutoApplyView';
import { MissingInputModal } from '../components/MissingInputModal';
import type { ViewType } from '../types';

function App() {
  const [view, setView] = useState<ViewType>('search');
  const hydrateJobs = useJobStore(s => s.hydrate);
  const hydrateProfile = useProfileStore(s => s.hydrate);
  const hydrateQuestions = useQuestionStore(s => s.hydrate);
  const hydrateAutoApply = useAutoApplyStore(s => s.hydrate);
  const hydrateTheme = useThemeStore(s => s.hydrate);

  useEffect(() => {
    hydrateTheme();
    Promise.all([hydrateJobs(), hydrateProfile(), hydrateQuestions(), hydrateAutoApply()]).then(() => {
      chrome.storage.local.get(['lastView'], (result) => {
        if (result.lastView === 'jobs' && useJobStore.getState().jobs.length > 0) {
          setView('jobs');
        } else if (result.lastView === 'autoApply') {
          setView('autoApply');
        }
      });
    });
  }, []);

  const handleSetView = (newView: ViewType) => {
    setView(newView);
    chrome.storage.local.set({ lastView: newView });
  };

  return (
    <div className="w-full h-screen bg-base flex flex-col font-sans">
      <Header view={view} onSetView={handleSetView} />
      {view === 'search' && <SearchView onSetView={handleSetView} />}
      {view === 'jobs' && <JobListView onSetView={handleSetView} />}
      {view === 'autoApply' && <AutoApplyView />}
      <MissingInputModal />
    </div>
  );
}

export default App;
