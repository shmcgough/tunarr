import { FrameState } from '@/ffmpeg/builder/state/FrameState.js';
import { FrameDataLocation, FrameSize } from '@/ffmpeg/builder/types.js';
import { describe, expect, test } from 'vitest';
import { HlsOutputFormat } from './HlsOutputFormat.ts';

function makeFormat(
  isFirstTranscode: boolean,
  playlistPath = '/some/path/stream.m3u8',
  initSegmentSeconds?: number,
) {
  const state = new FrameState({
    isAnamorphic: false,
    scaledSize: FrameSize.FHD,
    paddedSize: FrameSize.FHD,
    frameDataLocation: FrameDataLocation.Software,
  });
  return new HlsOutputFormat(
    state,
    24,
    playlistPath,
    '/some/path/data%06d.ts',
    '/stream/channels/test-uuid/hls/',
    isFirstTranscode,
    false,
    false,
    initSegmentSeconds,
  );
}

function optValue(opts: string[], flag: string) {
  const idx = opts.indexOf(flag);
  return idx === -1 ? undefined : opts[idx + 1];
}

// Shorter first segments for faster channel start-up.
describe('HlsOutputFormat init segments', () => {
  test('unset keeps upstream keyframes and no -hls_init_time', () => {
    const opts = makeFormat(true, undefined, 0).options();
    expect(opts).not.toContain('-hls_init_time');
    expect(optValue(opts, '-force_key_frames')).toBe('expr:gte(t,n_forced*4)');
  });

  test('first transcode gets 1s init segments and a 1s-then-4s keyframe grid', () => {
    const opts = makeFormat(true, undefined, 1).options();
    expect(optValue(opts, '-hls_init_time')).toBe('1');
    expect(optValue(opts, '-hls_time')).toBe('4');
    expect(optValue(opts, '-force_key_frames')).toBe(
      'expr:if(lt(n_forced*1,4),gte(t,n_forced*1),gte(t,4+(n_forced-4)*4))',
    );
  });

  test('-hls_init_time precedes the output path', () => {
    const playlistPath = '/some/path/stream.m3u8';
    const opts = makeFormat(true, playlistPath, 2).options();
    expect(opts.indexOf('-hls_init_time')).toBeLessThan(
      opts.lastIndexOf(playlistPath),
    );
  });

  test('later transcodes in a session are unaffected', () => {
    const opts = makeFormat(false, undefined, 1).options();
    expect(opts).not.toContain('-hls_init_time');
    expect(optValue(opts, '-force_key_frames')).toBe('expr:gte(t,n_forced*4)');
  });

  test.each([3, 4, 5, -1])(
    'init of %i (not a proper divisor of 4) is ignored',
    (init) => {
      const opts = makeFormat(true, undefined, init).options();
      expect(opts).not.toContain('-hls_init_time');
    },
  );
});

describe('HlsOutputFormat', () => {
  test('includes -master_pl_name playlist.m3u8 for first transcode', () => {
    const opts = makeFormat(true).options();
    const idx = opts.indexOf('-master_pl_name');
    expect(idx).toBeGreaterThan(-1);
    expect(opts[idx + 1]).toBe('playlist.m3u8');
  });

  test('includes -master_pl_name playlist.m3u8 for subsequent transcodes', () => {
    const opts = makeFormat(false).options();
    const idx = opts.indexOf('-master_pl_name');
    expect(idx).toBeGreaterThan(-1);
    expect(opts[idx + 1]).toBe('playlist.m3u8');
  });

  test('-master_pl_name appears before the output path', () => {
    const playlistPath = '/some/path/stream.m3u8';
    const opts = makeFormat(true, playlistPath).options();
    const masterIdx = opts.indexOf('-master_pl_name');
    const outputIdx = opts.lastIndexOf(playlistPath);
    expect(masterIdx).toBeGreaterThan(-1);
    expect(outputIdx).toBeGreaterThan(-1);
    expect(masterIdx).toBeLessThan(outputIdx);
  });
});
