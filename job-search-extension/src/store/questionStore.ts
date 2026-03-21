import { create } from 'zustand';
import type { SavedQuestion } from '../types';

interface QuestionState {
  questions: SavedQuestion[];

  // Actions
  hydrate: () => Promise<void>;
  loadQuestions: (visitorId: string) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
}

export const useQuestionStore = create<QuestionState>((set) => ({
  questions: [],

  hydrate: async () => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.get(['cachedQuestions'], (result) => {
        if (result.cachedQuestions && Array.isArray(result.cachedQuestions)) {
          set({ questions: result.cachedQuestions });
        }
        resolve();
      });
    });
  },

  loadQuestions: async (visitorId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'questions_getAll',
        visitorId,
      });
      if (response?.success) {
        const questions = response.questions || [];
        set({ questions });
        chrome.storage.local.set({ cachedQuestions: questions });
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  },

  deleteQuestion: async (questionId: string) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'questions_delete',
        questionId,
      });
      set((state) => {
        const questions = state.questions.filter(q => q._id !== questionId);
        // Persist updated cache so deletion survives popup close/reopen
        chrome.storage.local.set({ cachedQuestions: questions });
        return { questions };
      });
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  },
}));
