import { afterEach, describe, expect, test, vi } from 'vitest';
import { hlsWrapInitialBurstSeconds } from './hlsWrapInitialBurst.ts';

describe('hlsWrapInitialBurstSeconds', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('defaults to 0 (upstream behaviour) when unset', () => {
    vi.stubEnv('TUNARR_HLS_WRAP_INITIAL_BURST_SECONDS', '');
    expect(hlsWrapInitialBurstSeconds()).toBe(0);
  });

  test('reads the configured burst', () => {
    vi.stubEnv('TUNARR_HLS_WRAP_INITIAL_BURST_SECONDS', '10');
    expect(hlsWrapInitialBurstSeconds()).toBe(10);
  });

  test('clamps negative values to 0', () => {
    vi.stubEnv('TUNARR_HLS_WRAP_INITIAL_BURST_SECONDS', '-5');
    expect(hlsWrapInitialBurstSeconds()).toBe(0);
  });

  test('ignores non-numeric values', () => {
    vi.stubEnv('TUNARR_HLS_WRAP_INITIAL_BURST_SECONDS', 'fast');
    expect(hlsWrapInitialBurstSeconds()).toBe(0);
  });
});
