import { FileText, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProfileStore } from '../store/profileStore';

export function ResumeSection() {
  const { resumeInfo, uploadResume, setMessage } = useProfileStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleFile = (file: File) => {
      if (file.type !== 'application/pdf') {
        setMessage('Only PDF files are supported');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      uploadResume(file);
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) setIsDragging(true);
    };

    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [uploadResume, setMessage]);

  const dropZoneClass = `border border-dashed rounded-lg transition-colors ${
    isDragging ? 'border-accent bg-accent/5' : 'border-edge-hover'
  }`;

  return (
    <div className="card">
      <h3 className="text-xs font-semibold text-primary mb-3 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-accent" />
        Resume
      </h3>

      {resumeInfo ? (
        <div className={`${dropZoneClass} space-y-2 p-3`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">{resumeInfo.fileName}</span>
            <span className="text-[11px] text-accent">Drop PDF to replace</span>
          </div>
          <div className="text-[11px] text-secondary space-y-0.5">
            <p className="mono">{resumeInfo.yearsExperience} years experience</p>
            <p>Skills: {resumeInfo.skills.slice(0, 5).join(', ')}{resumeInfo.skills.length > 5 ? '...' : ''}</p>
          </div>
        </div>
      ) : (
        <div className={`${dropZoneClass} p-5 text-center`}>
          <Upload className="w-5 h-5 mx-auto mb-2 text-muted" />
          <p className="text-xs font-medium text-accent">upload resume (only pdf)</p>
          <p className="text-[10px] text-muted mt-1">Max 2MB</p>
        </div>
      )}
    </div>
  );
}
