import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Readable } from 'stream';
import { AudioCaptureFactory } from './capture/audio-capture.factory';
import { IAudioCapture, AudioDevice } from './capture/audio-capture.interface';

export interface AudioSource {
  id: string;
  name: string;
  type: 'input' | 'output' | 'loopback';
  isActive: boolean;
  isDefault: boolean;
}

@Injectable()
export class AudioService implements OnModuleInit {
  private readonly logger = new Logger(AudioService.name);
  private audioCapture: IAudioCapture;
  private activeSource: AudioSource | null = null;
  private audioStream: Readable | null = null;
  private availableDevices: AudioDevice[] = [];

  constructor(private readonly audioCaptureFactory: AudioCaptureFactory) {
    this.audioCapture = this.audioCaptureFactory.create();
  }

  async onModuleInit() {
    // Load available devices on startup
    await this.refreshDevices();
  }

  private async refreshDevices(): Promise<void> {
    try {
      this.availableDevices = await this.audioCapture.listDevices();
      this.logger.log(
        `Discovered ${this.availableDevices.length} audio devices`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh audio devices', error);
      this.availableDevices = [];
    }
  }

  async getAvailableSources(): Promise<AudioSource[]> {
    // Refresh devices list
    await this.refreshDevices();

    return this.availableDevices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      isActive: this.activeSource?.id === device.id,
      isDefault: device.isDefault,
    }));
  }

  async selectSource(sourceId: string): Promise<boolean> {
    try {
      // Stop any existing capture
      if (this.audioStream) {
        this.stopCapture();
      }

      const device = this.availableDevices.find((d) => d.id === sourceId);
      if (!device) {
        this.logger.error(`Audio device not found: ${sourceId}`);
        return false;
      }

      this.logger.log(`Selecting audio source: ${device.name}`);

      // Start capturing from the selected device
      this.audioStream = await this.audioCapture.startCapture({
        deviceId: sourceId,
        sampleRate: 48000,
        channels: 2,
        bitDepth: 16,
      });

      if (!this.audioStream) {
        this.logger.error('Failed to create audio stream');
        return false;
      }

      // Add error handler to the stream
      this.audioStream.on('error', (error) => {
        this.logger.error(
          `Audio stream error for device ${device.name}:`,
          error,
        );
        this.handleStreamError(error);
      });

      this.audioStream.on('close', () => {
        this.logger.warn(`Audio stream closed for device ${device.name}`);
      });

      this.activeSource = {
        id: device.id,
        name: device.name,
        type: device.type,
        isActive: true,
        isDefault: device.isDefault,
      };

      this.logger.log(`Successfully started capturing from: ${device.name}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to select audio source', error);
      this.activeSource = null;
      this.audioStream = null;
      return false;
    }
  }

  private handleStreamError(error: Error): void {
    this.logger.error('Audio stream encountered an error:', error);

    // Clean up the stream
    if (this.audioStream) {
      try {
        this.audioStream.destroy();
      } catch (destroyError) {
        this.logger.error('Error destroying stream:', destroyError);
      }
      this.audioStream = null;
    }

    // Reset active source
    if (this.activeSource) {
      this.activeSource.isActive = false;
      this.activeSource = null;
    }
  }

  getActiveSource(): AudioSource | null {
    return this.activeSource;
  }

  getAudioStream(): Readable | null {
    return this.audioStream;
  }

  stopCapture(): void {
    if (this.audioStream) {
      this.logger.log('Stopping audio capture');
      this.audioCapture.stopCapture();
      this.audioStream = null;

      if (this.activeSource) {
        this.activeSource.isActive = false;
        this.activeSource = null;
      }
    }
  }

  getPlatform(): string {
    return this.audioCapture.getPlatform();
  }
}
