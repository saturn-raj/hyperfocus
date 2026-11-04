import type { FormEvent, RefObject } from 'react';
import type { OnboardingDraft } from '../../domain/model';
export interface StepProps {
  draft: OnboardingDraft;
  heading: RefObject<HTMLHeadingElement | null>;
  next: (event?: FormEvent) => void;
  finish: (event: FormEvent) => void;
  goBack: () => void;
  patch: (next: Partial<OnboardingDraft>) => void;
  end: string;
}
