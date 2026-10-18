import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  hlsReadyRetryOptions,
  hwCapsCacheTtlSeconds,
  vaapiTonemapPreferenceOverride,
} from './startupTuning.ts';

describe('startup tuning', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('hwCapsCacheTtlSeconds', () => {
    test('defaults to upstream 1h', () => {
      vi.stubEnv('TUNARR_HW_CAPS_CACHE_SECONDS', '');
      expect(hwCapsCacheTtlSeconds()).toBe(3600);
    });

    test('reads a configured TTL', () => {
      vi.stubEnv('TUNARR_HW_CAPS_CACHE_SECONDS', '604800');
      expect(hwCapsCacheTtlSeconds()).toBe(604800);
    });

    test.each(['0', '-1', 'week'])('falls back to 1h for %s', (v) => {
      vi.stubEnv('TUNARR_HW_CAPS_CACHE_SECONDS', v);
      expect(hwCapsCacheTtlSeconds()).toBe(3600);
    });
  });

  describe('vaapiTonemapPreferenceOverride', () => {
    test('undefined when unset (upstream preference applies)', () => {
      vi.stubEnv('TUNARR_VAAPI_TONEMAP_PREFERENCE', '');
      expect(vaapiTonemapPreferenceOverride()).toBeUndefined();
    });

    test.each([
      ['vaapi', 'vaapi'],
      [' VAAPI ', 'vaapi'],
      ['opencl', 'opencl'],
    ])('reads %j as %s', (raw, expected) => {
      vi.stubEnv('TUNARR_VAAPI_TONEMAP_PREFERENCE', raw);
      expect(vaapiTonemapPreferenceOverride()).toBe(expected);
    });

    test('ignores unknown values', () => {
      vi.stubEnv('TUNARR_VAAPI_TONEMAP_PREFERENCE', 'cuda');
      expect(vaapiTonemapPreferenceOverride()).toBeUndefined();
    });
  });

  describe('hlsReadyRetryOptions', () => {
    test('defaults to upstream: 15 x 1000ms', () => {
      vi.stubEnv('TUNARR_HLS_READY_POLL_MS', '');
      expect(hlsReadyRetryOptions()).toEqual({
        retries: 15,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 1000,
        randomize: false,
      });
    });

    test('a faster poll keeps the ~15s budget', () => {
      vi.stubEnv('TUNARR_HLS_READY_POLL_MS', '200');
      const opts = hlsReadyRetryOptions();
      expect(opts.minTimeout).toBe(200);
      expect(opts.maxTimeout).toBe(200);
      expect(opts.retries * opts.minTimeout).toBe(15_000);
    });

    test.each(['10', '5000', 'soon'])('ignores out-of-range %s', (v) => {
      vi.stubEnv('TUNARR_HLS_READY_POLL_MS', v);
      expect(hlsReadyRetryOptions().minTimeout).toBe(1000);
    });
  });
});
