import { getEnvVar, getNumericEnvVar, TUNARR_ENV_VARS } from '@/util/env.js';

/**
 * Start-up tuning knobs read from the environment. Each one
 * returns upstream's value when its env var is unset or invalid.
 */

const UpstreamHwCapsCacheSeconds = 60 * 60;
const UpstreamReadyPollMs = 1000;
const ReadyBudgetMs = 15_000; // upstream: 15 retries x 1000ms

/**
 * TTL of the VAAPI/Nvidia hardware capability probe cache.
 *
 * The probe (vainfo plus an OpenCL-from-VAAPI test) took ~2.4s on a
 * low-power Intel iGPU, and with upstream's 1h TTL the first tune of each
 * hour paid it, which in a home is most tunes. The cache is in-memory, so a
 * restart re-probes regardless.
 */
export function hwCapsCacheTtlSeconds(): number {
  const v = getNumericEnvVar(TUNARR_ENV_VARS.HW_CAPS_CACHE_SECONDS);
  return v && v > 0 ? v : UpstreamHwCapsCacheSeconds;
}

/**
 * Override for which VAAPI hardware tonemap filter to prefer.
 *
 * Upstream prefers tonemap_opencl whenever OpenCL can be derived from the
 * VAAPI device. On some low-power Intel iGPUs that path is far slower than
 * tonemap_vaapi: measured 0.69x vs 2.99x real time on a 4K HDR10 source,
 * which is too slow for a live channel to ever start. Returns undefined
 * (keep upstream's preference) unless set to "vaapi" or "opencl".
 */
export function vaapiTonemapPreferenceOverride(): 'vaapi' | 'opencl' | undefined {
  const v = getEnvVar(TUNARR_ENV_VARS.VAAPI_TONEMAP_PREFERENCE)
    ?.trim()
    .toLowerCase();
  return v === 'vaapi' || v === 'opencl' ? v : undefined;
}

/**
 * async-retry options for "is the HLS session ready". Upstream polls once a
 * second, so a session ready at +1.05s is only noticed at +2s. A shorter
 * interval keeps upstream's ~15s give-up budget by scaling the retry count.
 */
export function hlsReadyRetryOptions() {
  const v = getNumericEnvVar(TUNARR_ENV_VARS.HLS_READY_POLL_MS);
  const pollMs = v && v >= 50 && v <= UpstreamReadyPollMs ? v : UpstreamReadyPollMs;
  return {
    retries: Math.ceil(ReadyBudgetMs / pollMs),
    factor: 1,
    minTimeout: pollMs,
    maxTimeout: pollMs,
    randomize: false,
  };
}
