import { useAutoApplyStore } from '../store/autoApplyStore';
import { useAutoApply } from '../hooks/useAutoApply';

export function MissingInputModal() {
  const { missingInput, missingInputValue, setMissingInputValue } = useAutoApplyStore();
  const { submitMissingInput, cancelMissingInput } = useAutoApply();

  if (!missingInput) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-edge rounded-xl shadow-2xl max-w-sm w-full p-5 modal-panel">
        <h3 className="text-sm font-semibold text-primary mb-1.5">
          Input Required
        </h3>
        <p className="text-[11px] text-secondary mb-4">
          We need your input to continue applying to <strong className="text-primary">{missingInput.jobTitle}</strong>
        </p>

        <label className="block text-xs font-medium text-primary mb-2">
          {missingInput.field}
        </label>

        {missingInput.type === 'select' && missingInput.options ? (
          <select
            value={missingInputValue}
            onChange={(e) => setMissingInputValue(e.target.value)}
            className="select mb-4"
          >
            <option value="">Select an option</option>
            {missingInput.options.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        ) : missingInput.type === 'radio' && missingInput.options ? (
          <div className="space-y-2 mb-4">
            {missingInput.options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2.5 text-xs cursor-pointer text-secondary hover:text-primary transition-colors">
                <input
                  type="radio"
                  name="missingInput"
                  value={opt}
                  checked={missingInputValue === opt}
                  onChange={(e) => setMissingInputValue(e.target.value)}
                  className="w-4 h-4 accent-(--accent)"
                />
                {opt}
              </label>
            ))}
          </div>
        ) : missingInput.type === 'textarea' ? (
          <textarea
            value={missingInputValue}
            onChange={(e) => setMissingInputValue(e.target.value)}
            placeholder={`Enter ${missingInput.field.toLowerCase()}`}
            className="input mb-4 h-auto! py-2"
            rows={3}
          />
        ) : (
          <input
            type="text"
            value={missingInputValue}
            onChange={(e) => setMissingInputValue(e.target.value)}
            placeholder={`Enter ${missingInput.field.toLowerCase()}`}
            className="input mb-4"
            autoFocus
          />
        )}

        <p className="text-[10px] text-muted mb-4">
          This will be saved for future applications with similar questions.
        </p>

        <div className="flex gap-2">
          <button
            onClick={cancelMissingInput}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={submitMissingInput}
            disabled={!missingInputValue.trim()}
            className="btn btn-primary flex-1"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
