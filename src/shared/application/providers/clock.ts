export interface Clock {
  now(): Date;
}

/** Default wall clock; callers may supply a fixed clock for deterministic tests. */
export const systemClock: Clock = {
  now: () => new Date(Date.now()),
};
