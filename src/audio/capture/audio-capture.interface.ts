import { Readable } from 'stream';

export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output' | 'loopback';
  isDefault: boolean;
}

export interface AudioCaptureOptions {
  deviceId?: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
}

export interface IAudioCapture {
  /**
   * List all available audio devices on the system
   */
  listDevices(): Promise<AudioDevice[]>;

  /**
   * Start capturing audio from the specified device
   */
  startCapture(options: AudioCaptureOptions): Promise<Readable>;

  /**
   * Stop audio capture
   */
  stopCapture(): void;

  /**
   * Get the current platform
   */
  getPlatform(): 'darwin' | 'win32' | 'linux' | 'unknown';
}
