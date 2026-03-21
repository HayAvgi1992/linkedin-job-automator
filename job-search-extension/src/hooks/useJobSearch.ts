import { useState } from 'react';
import { useJobStore } from '../store/jobStore';
import type { Job } from '../types';

export function useJobSearch() {
  const { setJobs, addJobs, updateJobsSalary, setEnriching } = useJobStore();
  const enriching = useJobStore(s => s.enriching);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(4);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);

  const enrichJobsWithSalary = async (jobsToEnrich: Job[]) => {
    const jobsNeedingEnrichment = jobsToEnrich.filter(j => !j.salary);
    if (jobsNeedingEnrichment.length === 0) return;

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
        const updates = enrichedData.jobs
          .filter((e: any) => e.salary)
          .map((e: any) => ({ id: e.id, salary: e.salary }));
        updateJobsSalary(updates);
      }
    } catch (error: any) {
      console.error('Salary enrichment failed:', error.message);
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
    setLoadingProgress(0);
    setError('');
    setCurrentPage(4);
    setHasMoreJobs(true);

    try {
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

      // Bug 1 fix: LinkedIn API is unreliable with Easy Apply filter —
      // it sometimes returns non-EA jobs. Filter them out at ingestion.
      const filteredJobs = params.easyApplyOnly
        ? allJobs.filter(j => j.easyApply)
        : allJobs;

      if (allAppliedJobIds.length > 0) {
        console.log('Jobs already applied on LinkedIn:', allAppliedJobIds);
      }

      setJobs(filteredJobs);
      enrichJobsWithSalary(filteredJobs);
    } catch (error: any) {
      setError(error?.message || 'Failed to communicate with extension');
    } finally {
      setLoading(false);
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
        enrichJobsWithSalary(newJobs);
      } else {
        setHasMoreJobs(false);
      }
    } catch (error: any) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    loading,
    loadingProgress,
    error,
    enriching,
    loadingMore,
    hasMoreJobs,
    searchJobs,
    loadMoreJobs,
  };
}
