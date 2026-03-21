import { create } from 'zustand';
import type { ProfileSettings, ResumeInfo } from '../types';

const DEFAULT_PROFILE: ProfileSettings = {
  city: '',
  state: '',
  country: 'United States',
  phoneNumber: '',
  email: '',
  workAuthorization: 'Yes',
  startDate: 'Immediately',
};

interface ProfileState {
  visitorId: string;
  profileSettings: ProfileSettings;
  resumeInfo: ResumeInfo | null;
  message: string;

  // Actions
  hydrate: () => Promise<void>;
  setProfileSettings: (settings: Partial<ProfileSettings>) => void;
  setResumeInfo: (info: ResumeInfo | null) => void;
  setMessage: (msg: string) => void;
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
}

function getOrCreateVisitorId(): string {
  let id = localStorage.getItem('visitorId');
  if (!id) {
    id = 'visitor_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('visitorId', id);
  }
  return id;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  visitorId: getOrCreateVisitorId(),
  profileSettings: { ...DEFAULT_PROFILE },
  resumeInfo: null,
  message: '',

  hydrate: async () => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.get(['resumeInfo', 'profileSettings'], (result: Record<string, any>) => {
        if (result.resumeInfo?.fileName) {
          set({ resumeInfo: result.resumeInfo as ResumeInfo });
        }
        if (result.profileSettings) {
          set({ profileSettings: { ...DEFAULT_PROFILE, ...(result.profileSettings as Partial<ProfileSettings>) } });
        }
        resolve();
      });
    });
  },

  setProfileSettings: (partial) => {
    set((state) => ({
      profileSettings: { ...state.profileSettings, ...partial },
    }));
  },

  setResumeInfo: (info) => {
    set({ resumeInfo: info });
    if (info) {
      chrome.storage.local.set({ resumeInfo: info });
    }
  },

  setMessage: (msg) => set({ message: msg }),

  loadProfile: async () => {
    try {
      const { visitorId } = get();
      const response = await chrome.runtime.sendMessage({
        action: 'profile_get',
        visitorId,
      });
      if (response?.success && response.profile) {
        if (response.profile.resume) {
          const resumeData: ResumeInfo = {
            fileName: response.profile.resume.fileName,
            skills: response.profile.resume.skills,
            yearsExperience: response.profile.resume.yearsExperience,
          };
          set({ resumeInfo: resumeData });
          chrome.storage.local.set({ resumeInfo: resumeData });
        }
        const settings: ProfileSettings = {
          city: response.profile.city || '',
          state: response.profile.state || '',
          country: response.profile.country || 'United States',
          phoneNumber: response.profile.phoneNumber || '',
          email: response.profile.email || '',
          workAuthorization: response.profile.workAuthorization || 'Yes',
          startDate: response.profile.startDate || 'Immediately',
        };
        set({ profileSettings: settings });
        chrome.storage.local.set({ profileSettings: settings });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  },

  saveProfile: async () => {
    const { visitorId, profileSettings } = get();
    set({ message: 'Saving profile...' });
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'profile_save',
        data: { visitorId, ...profileSettings },
      });
      if (response?.success) {
        chrome.storage.local.set({ profileSettings });
        set({ message: 'Profile saved!' });
        setTimeout(() => set({ message: '' }), 2000);
      } else {
        set({ message: 'Failed to save profile' });
      }
    } catch (err: any) {
      set({ message: 'Error: ' + err.message });
    }
  },

  uploadResume: async (file: File) => {
    const { visitorId } = get();
    set({ message: 'Uploading and parsing resume...' });
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await chrome.runtime.sendMessage({
        action: 'profile_uploadResume',
        visitorId,
        fileName: file.name,
        fileBase64: base64,
        fileType: file.type,
      });

      if (response?.success) {
        const info: ResumeInfo = response.resume;
        set({ resumeInfo: info, message: 'Resume uploaded successfully!' });
        chrome.storage.local.set({ resumeInfo: info });
        setTimeout(() => set({ message: '' }), 3000);
      } else {
        set({ message: 'Failed to upload resume: ' + (response?.error || 'Unknown error') });
      }
    } catch (err: any) {
      set({ message: 'Error: ' + err.message });
    }
  },
}));
