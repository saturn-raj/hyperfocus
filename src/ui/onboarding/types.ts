import type { FormEvent, RefObject } from 'react';
import type { OnboardingDraft, OnboardingGoal } from '../../domain/model';

/** Steps render fields; the page controller owns persistence and transitions. */
export interface StepProps {
  draft: OnboardingDraft;
  heading: RefObject<HTMLHeadingElement | null>;
  next: (event?: FormEvent) => void;
  finish: (event: FormEvent) => void;
  goBack: () => void;
  patch: (next: Partial<OnboardingDraft>) => void;
  goalPatch: (id: string, next: Partial<OnboardingGoal>) => void;
  end: string;
  total: number;
  goal: OnboardingGoal | undefined;
  core: OnboardingGoal | undefined;
  activeGoal: number;
  setActiveGoal: (index: number) => void;
  setError: (error: string) => void;
  suggestion: string;
  setSuggestion: (text: string) => void;
}
