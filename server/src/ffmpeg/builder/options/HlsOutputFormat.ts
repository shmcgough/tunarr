import type { FrameState } from '@/ffmpeg/builder/state/FrameState.js';
import { getNumericEnvVar, TUNARR_ENV_VARS } from '@/util/env.js';
import { OutputOption } from './OutputOption.ts';

export class HlsOutputFormat extends OutputOption {
  public static SegmentSeconds = 4;

  constructor(
    private desiredState: FrameState,
    private mediaFrameRate: number,
    private playlistPath: string,
    private segmentTemplate: string,
    private baseStreamUrl: string,
    private isFirstTranscode: boolean,
    private oneSecondGop: boolean,
    private emitEndList: boolean = false,
    // See initSegmentSeconds(). Defaults to the env var.
    private initSegmentSecondsOverride?: number,
  ) {
    super();
  }

  /**
   * Length of the first segments of a session's FIRST transcode.
   *
   * A client cannot start until the first segment is complete, and with
   * 4s segments that means encoding 4s of video before anything is listed.
   * A shorter init segment (via extra keyframes + -hls_init_time) gets the
   * first bytes out sooner; after SegmentSeconds of output the cadence
   * returns to normal. Only divisors of SegmentSeconds are honoured, so the
   * keyframe grid lines up again; anything else (or unset/0) keeps upstream
   * behaviour.
   */
  private initSegmentSeconds(): number {
    if (!this.isFirstTranscode) return 0;
    const v =
      this.initSegmentSecondsOverride ??
      getNumericEnvVar(TUNARR_ENV_VARS.HLS_INIT_SEGMENT_SECONDS) ??
      0;
    const seg = HlsOutputFormat.SegmentSeconds;
    return v > 0 && v < seg && seg % v === 0 ? v : 0;
  }

  options(): string[] {
    const frameRate = this.desiredState.frameRate ?? this.mediaFrameRate;
    const gop = this.oneSecondGop
      ? frameRate
      : frameRate * HlsOutputFormat.SegmentSeconds;
    const seg = HlsOutputFormat.SegmentSeconds;
    const init = this.initSegmentSeconds();
    // Keyframes every `init` seconds until `seg`, then every `seg` seconds:
    // with init=1, seg=4 -> 0,1,2,3,4,8,12...
    const forceKeyFrames =
      init > 0
        ? `expr:if(lt(n_forced*${init},${seg}),gte(t,n_forced*${init}),gte(t,${seg}+(n_forced-${seg / init})*${seg}))`
        : `expr:gte(t,n_forced*${seg})`;
    const opts = [
      '-g',
      `${gop}`,
      '-keyint_min',
      `${frameRate * HlsOutputFormat.SegmentSeconds}`,
      '-force_key_frames',
      forceKeyFrames,
      '-f',
      'hls',
      ...(init > 0 ? ['-hls_init_time', `${init}`] : []),
      '-hls_time',
      `${HlsOutputFormat.SegmentSeconds}`,
      '-hls_list_size',
      '0',
      '-segment_list_flags',
      '+live',
      '-hls_segment_type',
      'mpegts',
      '-hls_segment_filename',
      this.segmentTemplate,
      '-hls_base_url',
      this.baseStreamUrl,
      '-master_pl_name',
      'playlist.m3u8',
    ];

    const flags = ['program_date_time', 'append_list', 'independent_segments'];
    if (!this.emitEndList) flags.push('omit_endlist');
    if (!this.isFirstTranscode) flags.push('discont_start');

    opts.push('-hls_flags', flags.join('+'));

    if (!this.isFirstTranscode) {
      opts.push('-mpegts_flags', '+initial_discontinuity');
    }

    opts.push(this.playlistPath);

    return opts;
  }
}
