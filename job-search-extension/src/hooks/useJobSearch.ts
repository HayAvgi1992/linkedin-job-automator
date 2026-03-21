import { useState } from 'react';
import { useJobStore } from '../store/jobStore';
import { useProfileStore } from '../store/profileStore';
import type { Job, MatchScore } from '../types';

export function useJobSearch() {
  const { setJobs, addJobs, updateJobsSalary, updateJobsMatchScore, updateStatus, setEnriching } = useJobStore();
  const enriching = useJobStore(s => s.enriching);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(4);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);

  const enrichJobsWithSalary = async (jobsToEnrich: Job[]): Promise<Array<{ id: string; salary: Job['salary'] }>> => {
    const jobsNeedingEnrichment = jobsToEnrich.filter(j => !j.salary);
    if (jobsNeedingEnrichment.length === 0) return [];

    setEnriching(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'enrichSalary',
        jobs: jobsNeedingEnrichment.map(j => ({
          id: j.linkedinJobId,
          title: j.title,
          company: j.company.name,
          location: j.location.city,
        })),
      });

      if (response?.success) {
        const enrichedData = response.data;
        return enrichedData.jobs
          .filter((e: any) => e.salary)
          .map((e: any) => ({ id: e.id, salary: e.salary }));
      }
      return [];
    } catch (err: any) {
      console.error('Salary enrichment failed:', err.message);
      return [];
    } finally {
      setEnriching(false);
    }
  };

  const searchJobs = async (params: {
    keywords: string;
    location: string;
    remoteOnly: boolean;
    easyApplyOnly: boolean;
  }) => {
    setLoading(true);
    setLoadingStage('Searching LinkedIn...');
    setLoadingProgress(0);
    setError('');
    setCurrentPage(4);
    setHasMoreJobs(true);

    let keepalive: ReturnType<typeof setInterval> | null = null;
    let storageListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null = null;

    try {
      // Step 1: Capture LinkedIn tab ID
      const [tab] = await chrome.tabs.query({ active: true, url: '*://www.linkedin.com/*' });
      const tabId = tab?.id;

      // Step 2: Fetch 4 pages of search results
      const allJobs: Job[] = [];
      const allAppliedJobIds: string[] = [];
      const maxPages = 4;

      for (let page = 0; page < maxPages; page++) {
        setLoadingProgress(((page + 1) / maxPages) * 100);

        const response = await chrome.runtime.sendMessage({
          action: 'searchLinkedInJobs',
          params: {
            keywords: params.keywords,
            location: params.location,
            remote: params.remoteOnly,
            easyApply: params.easyApplyOnly,
            count: 25,
            start: page * 25,
          },
        });

        if (response?.success) {
          allJobs.push(...(response.data || []));
          if (Array.isArray(response.appliedJobIds)) {
            allAppliedJobIds.push(...response.appliedJobIds);
          }
        } else {
          console.error('Failed to fetch page', page, response?.error);
        }

        if (page < maxPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Filter out non-Easy Apply if requested
      const filteredJobs = params.easyApplyOnly
        ? allJobs.filter(j => j.easyApply)
        : allJobs;

      if (filteredJobs.length === 0) {
        setJobs([]);
        return;
      }

      // Step 3: Determine non-applied job IDs
      const appliedSet = new Set(allAppliedJobIds);
      const nonAppliedJobs = filteredJobs.filter(j => !appliedSet.has(j.linkedinJobId));
      const nonAppliedJobIds = nonAppliedJobs.map(j => j.linkedinJobId);

      // Step 4: Update loading stage and start keepalive
      setLoadingStage('Fetching job details...');
      keepalive = setInterval(() => {
        try { chrome.runtime.sendMessage({ action: '_keepalive' }); } catch {}
      }, 20000);

      // Step 5: Listen for description progress updates
      storageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area !== 'local') return;
        if (changes._descriptionProgress?.newValue) {
          const progress = changes._descriptionProgress.newValue as { done: number; total: number };
          setLoadingStage(`Fetching job details (${progress.done}/${progress.total})...`);
        }
      };
      chrome.storage.onChanged.addListener(storageListener);

      // Step 6: Parallel pipeline — descriptions + salary
      const [descriptionsResult, salaryUpdates] = await Promise.all([
        // Fetch descriptions for non-applied jobs
        nonAppliedJobIds.length > 0
          ? chrome.runtime.sendMessage({ action: 'fetchJobDescriptions', tabId, jobIds: nonAppliedJobIds })
          : Promise.resolve({ success: true, descriptions: {} }),
        // Salary enrichment
        enrichJobsWithSalary(filteredJobs),
      ]);

      // Build descriptions map
      const descriptions: Record<string, string> = descriptionsResult?.success
        ? (descriptionsResult.descriptions || {})
        : {};

      // Step 7: Match score ranking
      setLoadingStage('Analyzing match...');
      let scoreUpdates: Array<{ id: string; matchScore: MatchScore }> = [];
      const resumeInfo = useProfileStore.getState().resumeInfo;

      if (resumeInfo && nonAppliedJobs.length > 0) {
        const visitorId = useProfileStore.getState().visitorId;
        const batchSize = 15;
        const batches: Job[][] = [];

        for (let i = 0; i < nonAppliedJobs.length; i += batchSize) {
          batches.push(nonAppliedJobs.slice(i, i + batchSize));
        }

        const rankResults = await Promise.all(
          batches.map(batch =>
            chrome.runtime.sendMessage({
              action: 'rankJobs',
              visitorId,
              jobs: batch.map(j => ({
                jobId: j.linkedinJobId,
                title: j.title,
                company: j.company.name,
                location: j.location.city,
                description: descriptions[j.linkedinJobId] || '',
                salary: j.salary,
              })),
            })
          )
        );

        for (const result of rankResults) {
          if (result?.success && Array.isArray(result.scores)) {
            scoreUpdates.push(
              ...result.scores.map((s: any) => ({ id: s.jobId, matchScore: s.matchScore }))
            );
          }
        }
      }

      // Step 8: Merge everything — strip descriptions before persisting
      const jobsWithoutDescriptions = filteredJobs.map(j => ({
        ...j,
        description: '',
      }));

      setJobs(jobsWithoutDescriptions);

      if (salaryUpdates.length > 0) {
        updateJobsSalary(salaryUpdates);
      }

      if (scoreUpdates.length > 0) {
        updateJobsMatchScore(scoreUpdates);
      }

      // Step 9: Mark already-applied jobs
      allAppliedJobIds.forEach(id => updateStatus(id, 'applied'));

    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with extension');
    } finally {
      if (keepalive) clearInterval(keepalive);
      if (storageListener) chrome.storage.onChanged.removeListener(storageListener);
      setLoading(false);
      setLoadingStage('');
      setLoadingProgress(0);
    }
  };

  const loadMoreJobs = async (params: {
    keywords: string;
    location: string;
    remoteOnly: boolean;
    easyApplyOnly: boolean;
  }) => {
    if (loadingMore || !hasMoreJobs) return;
    setLoadingMore(true);

    try {
      const newJobs: Job[] = [];
      const pagesToLoad = 2;

      for (let i = 0; i < pagesToLoad; i++) {
        const page = currentPage + i;
        const response = await chrome.runtime.sendMessage({
          action: 'searchLinkedInJobs',
          params: {
            keywords: params.keywords,
            location: params.location,
            remote: params.remoteOnly,
            easyApply: params.easyApplyOnly,
            count: 25,
            start: page * 25,
          },
        });

        if (response?.success) {
          const batch = response.data || [];
          newJobs.push(...batch);
          if (Array.isArray(response.appliedJobIds) && response.appliedJobIds.length > 0) {
            console.log('Jobs already applied on LinkedIn (load more):', response.appliedJobIds);
          }
          if (batch.length < 25) {
            setHasMoreJobs(false);
            break;
          }
        } else {
          break;
        }
      }

      if (newJobs.length > 0) {
        addJobs(newJobs);
        setCurrentPage(currentPage + pagesToLoad);
        // Fire-and-forget salary enrichment for load-more (no ranking)
        enrichJobsWithSalary(newJobs).then(updates => {
          if (updates.length > 0) updateJobsSalary(updates);
        });
      } else {
        setHasMoreJobs(false);
      }
    } catch (err: any) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    loading,
    loadingStage,
    loadingProgress,
    error,
    enriching,
    loadingMore,
    hasMoreJobs,
    searchJobs,
    loadMoreJobs,
  };
}
