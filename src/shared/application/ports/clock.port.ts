// Current time, abstracted so the rules that depend on it are testable.
export interface ClockPort {
  now(): Date;
}

export const CLOCK = Symbol("CLOCK");
