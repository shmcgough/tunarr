import { getNumericEnvVar, TUNARR_ENV_VARS } from '@/util/env.js';

/**
 * Seconds of the channel's HLS that the MPEG-TS wrapper (the
 * stream an HDHomeRun client such as Plex consumes) may read faster than
 * real time when it starts.
 *
 * Upstream reads at a strict 1x with no burst, so a client can only fill its
 * start-up buffer in real time and every tune pays that buffer in wall-clock
 * time. The HLS producer already bursts its first 60s, so the media exists;
 * this lets the wrapper pass it through. Unset, 0 or negative keeps upstream
 * behaviour.
 */
export function hlsWrapInitialBurstSeconds(): number {
  return Math.max(
    0,
    getNumericEnvVar(TUNARR_ENV_VARS.HLS_WRAP_INITIAL_BURST_SECONDS) ?? 0,
  );
}
