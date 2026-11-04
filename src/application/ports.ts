import type { State } from '../domain/model';

/** Persistence is supplied at composition time, never selected by a use case. */
export interface Repository {
  load(): State | null;
  save(state: State): void;
}
