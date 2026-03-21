import { FileText, Upload } from 'lucide-react';
import { useProfileStore } from '../store/profileStore';

export function ResumeSection() {
  const { resumeInfo, uploadResume } = useProfileStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadResume(file);
  };

  return (
    <div className="card">
      <h3 className="text-xs font-semibold text-primary mb-3 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-accent" />
        Resume
      </h3>

      {resumeInfo ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">{resumeInfo.fileName}</span>
            <label className="text-[11px] text-accent cursor-pointer hover:underline">
              Change
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          <div className="text-[11px] text-secondary space-y-0.5">
            <p className="mono">{resumeInfo.yearsExperience} years experience</p>
            <p>Skills: {resumeInfo.skills.slice(0, 5).join(', ')}{resumeInfo.skills.length > 5 ? '...' : ''}</p>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-edge-hover rounded-lg p-5 text-center">
          <Upload className="w-5 h-5 mx-auto mb-2 text-muted" />
          <label className="cursor-pointer">
            <span className="text-xs font-medium text-accent hover:underline">Upload Resume (PDF)</span>
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          </label>
          <p className="text-[10px] text-muted mt-1">Max 2MB</p>
        </div>
      )}
    </div>
  );
}
