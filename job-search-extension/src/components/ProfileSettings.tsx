import { useState } from 'react';
import { MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { useProfileStore } from '../store/profileStore';

export function ProfileSettings() {
  const [expanded, setExpanded] = useState(false);
  const { profileSettings, setProfileSettings, saveProfile, message } = useProfileStore();

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-xs font-semibold flex items-center justify-between text-primary"
      >
        <span className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-accent" />
          Profile Settings
        </span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          <p className="text-[10px] text-muted">
            Used to auto-fill common application questions.
          </p>

          <div>
            <label className="block text-[10px] font-medium text-secondary mb-1">Country</label>
            <select
              value={profileSettings.country}
              onChange={(e) => setProfileSettings({ country: e.target.value })}
              className="select"
            >
              <option value="United States">United States</option>
              <option value="India">India</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Singapore">Singapore</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Ireland">Ireland</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-secondary mb-1">City</label>
              <input
                type="text"
                value={profileSettings.city}
                onChange={(e) => setProfileSettings({ city: e.target.value })}
                placeholder="New York"
                className="input"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-secondary mb-1">State/Province</label>
              <input
                type="text"
                value={profileSettings.state}
                onChange={(e) => setProfileSettings({ state: e.target.value })}
                placeholder="NY"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-secondary mb-1">Phone Number</label>
            <input
              type="tel"
              value={profileSettings.phoneNumber}
              onChange={(e) => setProfileSettings({ phoneNumber: e.target.value })}
              placeholder="+1 555-123-4567"
              className="input"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-secondary mb-1">Email</label>
            <input
              type="email"
              value={profileSettings.email}
              onChange={(e) => setProfileSettings({ email: e.target.value })}
              placeholder="you@email.com"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-secondary mb-1">
                Authorized in {profileSettings.country}?
              </label>
              <select
                value={profileSettings.workAuthorization}
                onChange={(e) => setProfileSettings({ workAuthorization: e.target.value })}
                className="select"
              >
                <option value="Yes">Yes (Authorized)</option>
                <option value="No">No (Need Sponsorship)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-secondary mb-1">Start Date</label>
              <select
                value={profileSettings.startDate}
                onChange={(e) => setProfileSettings({ startDate: e.target.value })}
                className="select"
              >
                <option value="Immediately">Immediately</option>
                <option value="2 weeks">2 weeks</option>
                <option value="1 month">1 month</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={message === 'Saving profile...'}
            className="btn btn-primary w-full"
          >
            {message === 'Saving profile...' ? 'Saving...' : 'Save Profile'}
          </button>

          {message && message !== 'Saving profile...' && (
            <p className={`text-[11px] text-center ${
              message.includes('Error') || message.includes('Failed')
                ? 'text-danger'
                : 'text-success'
            }`}>
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
