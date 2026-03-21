import { Check, Trash2 } from 'lucide-react';
import { useQuestionStore } from '../store/questionStore';

export function SavedAnswers() {
  const { questions, deleteQuestion } = useQuestionStore();

  return (
    <div className="card">
      <h3 className="text-xs font-semibold text-primary mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-accent" />
          Saved Answers
          <span className="badge badge-neutral mono">{questions.length}</span>
        </span>
      </h3>

      {questions.length === 0 ? (
        <p className="text-[11px] text-center py-4 text-muted">
          No saved answers yet. They'll appear here as you apply to jobs.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-auto">
          {questions.slice(0, 10).map((q) => (
            <div key={q._id} className="p-2.5 rounded-lg bg-elevated group">
              <div className="flex justify-between items-start gap-2">
                <p className="text-[11px] font-medium text-primary leading-snug">
                  {q.questionText.length > 50 ? q.questionText.substring(0, 50) + '...' : q.questionText}
                </p>
                <button
                  onClick={() => deleteQuestion(q._id)}
                  className="btn-ghost rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-muted hover:text-danger" />
                </button>
              </div>
              <p className="text-[10px] text-secondary mt-1">
                A: {q.answer.length > 40 ? q.answer.substring(0, 40) + '...' : q.answer}
              </p>
              <p className="text-[9px] text-muted mt-0.5 mono">
                Used {q.timesUsed}x
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
