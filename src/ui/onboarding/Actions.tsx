import { ArrowLeft, ArrowRight } from 'lucide-react';
export function Actions({ onBack, nextLabel }: { onBack: () => void; nextLabel: string }) {
  return (
    <div className="onboarding-actions">
      <button type="button" className="text-button muted" onClick={onBack}>
        <ArrowLeft size={15} /> Back
      </button>
      <button type="submit" className="button primary onboarding-primary">
        {nextLabel}
        <ArrowRight size={17} />
      </button>
    </div>
  );
}
