import { stateSchema, type State } from './model';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Reads legacy v1 documents without rewriting their IDs or reclassifying their goals. */
export function migrateBackup(input: unknown): State {
  const document = record(input);
  const onboarding = record(document?.onboarding);
  const draft = record(onboarding?.draft);
  let candidate = input;

  // A prior signature is an accepted record, independent of a future mutable setup draft.
  // Stable IDs make repeat reads and export/import cycles idempotent.
  if (
    document &&
    onboarding &&
    onboarding.commitments === undefined &&
    typeof onboarding.completedAt === 'number' &&
    Number.isFinite(onboarding.completedAt) &&
    onboarding.completedAt >= 0 &&
    draft &&
    typeof draft.commitment === 'string' &&
    draft.commitment.trim() &&
    typeof draft.signature === 'string' &&
    draft.signature.trim()
  ) {
    candidate = {
      ...document,
      onboarding: {
        ...onboarding,
        history: onboarding.history ?? [draft],
        commitments: [
          {
            id: `legacy-commitment-${onboarding.completedAt}`,
            text: draft.commitment,
            signature: draft.signature,
            signedAt: onboarding.completedAt,
            revision: 1,
          },
        ],
      },
    };
  }

  return stateSchema.parse(candidate);
}
