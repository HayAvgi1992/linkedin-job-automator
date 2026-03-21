import { useEffect } from 'react';
import { useProfileStore } from '../store/profileStore';
import { useQuestionStore } from '../store/questionStore';
import { ResumeSection } from './ResumeSection';
import { ProfileSettings } from './ProfileSettings';
import { BulkApplySection } from './BulkApplySection';
import { SavedAnswers } from './SavedAnswers';

export function AutoApplyView() {
  const { visitorId, loadProfile } = useProfileStore();
  const { loadQuestions } = useQuestionStore();

  useEffect(() => {
    loadProfile();
    loadQuestions(visitorId);
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-base p-4">
      <div className="space-y-3">
        <BulkApplySection />
        <ResumeSection />
        <ProfileSettings />
        <SavedAnswers />
      </div>
    </div>
  );
}
