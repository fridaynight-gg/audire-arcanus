import { Injectable, Logger } from '@nestjs/common';
import { IAudioCapture } from './audio-capture.interface';
import { MacOSAudioCapture } from './macos-audio-capture';
import { WindowsAudioCapture } from './windows-audio-capture';

@Injectable()
export class AudioCaptureFactory {
  private readonly logger = new Logger(AudioCaptureFactory.name);

  create(): IAudioCapture {
    const platform = process.platform;

    this.logger.log(`Creating audio capture for platform: ${platform}`);

    switch (platform) {
      case 'darwin':
        return new MacOSAudioCapture();
      case 'win32':
        return new WindowsAudioCapture();
      case 'linux':
        // Linux could use ALSA or PulseAudio - for now, use similar to macOS
        this.logger.warn('Linux support is experimental, using SoX backend');
        return new MacOSAudioCapture(); // SoX works on Linux too
      default:
        this.logger.error(`Unsupported platform: ${platform}`);
        throw new Error(`Audio capture not supported on platform: ${platform}`);
    }
  }
}
