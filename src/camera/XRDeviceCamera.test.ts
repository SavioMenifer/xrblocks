import type {WebGLRenderer} from 'three';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import {StreamState} from '../video/VideoStream';

import {DeviceCameraOptions} from './CameraOptions';
import {XRDeviceCamera} from './XRDeviceCamera';

function createMockOptions() {
  return new DeviceCameraOptions({
    enabled: true,
    willCaptureFrequently: false,
    videoConstraints: {facingMode: 'environment' as const},
  });
}

/**
 * Creates a mock MediaStream with a single video track.
 */
function createMockStream(): MediaStream {
  const track = {
    kind: 'video',
    getSettings: () => ({deviceId: 'mock-device', facingMode: 'environment'}),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

function createMockRenderer(mode: XRSessionMode): WebGLRenderer {
  return {
    xr: {
      getSession: () => ({mode}) as unknown as XRSession,
    },
  } as unknown as WebGLRenderer;
}

describe('XRDeviceCamera', () => {
  let camera: XRDeviceCamera;

  beforeEach(() => {
    camera = new XRDeviceCamera(createMockOptions());

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          {
            kind: 'videoinput',
            deviceId: 'mock-device',
            label: 'Mock Camera',
            groupId: 'mock-group',
          },
        ]),
        getUserMedia: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('continues streaming when video.play() is rejected after metadata loads', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(
      createMockStream()
    );

    const playError = new Error('NotAllowedError: play() request was rejected');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const testCamera = camera as unknown as XRDeviceCamera & {
      handleVideoStreamLoadedMetadata: (
        resolve: () => void,
        reject: (_: Error) => void,
        allowRetry?: boolean
      ) => void;
      video_: HTMLVideoElement;
    };
    const originalHandleMetadata = testCamera.handleVideoStreamLoadedMetadata;
    testCamera.handleVideoStreamLoadedMetadata = vi.fn(
      (resolve: () => void) => {
        camera.width = 1920;
        camera.height = 1080;
        camera.aspectRatio = 1920 / 1080;
        camera.loaded = true;
        resolve();
      }
    );
    const videoMock = document.createElement('video') as HTMLVideoElement & {
      srcObject: MediaStream | null;
      src: string;
      play: () => Promise<void>;
    };
    Object.defineProperty(videoMock, 'srcObject', {
      set(_: MediaStream | null) {},
    });
    Object.defineProperty(videoMock, 'src', {
      set(_: string) {},
    });
    videoMock.play = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        videoMock.onloadedmetadata?.call(
          videoMock,
          new Event('loadedmetadata')
        );
      });
      return Promise.reject(playError);
    });
    Object.assign(videoMock, {
      autoplay: true,
      muted: true,
      playsInline: true,
    });
    Object.defineProperty(camera, 'video_', {
      value: videoMock,
      writable: true,
      configurable: true,
    });
    const stateChanges: StreamState[] = [];
    camera.addEventListener('statechange', (event) => {
      stateChanges.push(event.state);
    });

    await expect(camera.init()).resolves.toBeUndefined();
    expect(stateChanges).toContain(StreamState.STREAMING);
    expect(stateChanges).not.toContain(StreamState.ERROR);
    expect(warnSpy).toHaveBeenCalledWith(
      'video.play() rejected (may still autoplay):',
      playError
    );
    testCamera.handleVideoStreamLoadedMetadata = originalHandleMetadata;
    warnSpy.mockRestore();
  });

  it('falls back to XR camera access in immersive-ar sessions', async () => {
    const getUserMediaError = new Error('NotReadableError');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      getUserMediaError
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    camera.setRenderer(createMockRenderer('immersive-ar'));

    await expect(camera.init()).resolves.toBeUndefined();
    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.state).toBe(StreamState.INITIALIZING);

    warnSpy.mockRestore();
  });

  it('surfaces getUserMedia errors outside immersive-ar sessions', async () => {
    const getUserMediaError = new Error('NotReadableError');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      getUserMediaError
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    camera.setRenderer(createMockRenderer('immersive-vr'));

    await expect(camera.init()).rejects.toThrow(getUserMediaError);
    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.ERROR);

    errorSpy.mockRestore();
  });
});
