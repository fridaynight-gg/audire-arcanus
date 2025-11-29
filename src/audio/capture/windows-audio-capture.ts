import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { Readable } from 'stream';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import {
  IAudioCapture,
  AudioDevice,
  AudioCaptureOptions,
} from './audio-capture.interface';

const execAsync = promisify(exec);

@Injectable()
export class WindowsAudioCapture implements IAudioCapture {
  private readonly logger = new Logger(WindowsAudioCapture.name);
  private ffmpegProcess: ChildProcess | null = null;
  private recordingStream: Readable | null = null;

  getPlatform(): 'win32' {
    return 'win32';
  }

  async listDevices(): Promise<AudioDevice[]> {
    try {
      // Use ffmpeg to list DirectShow audio devices
      const { stdout, stderr } = await execAsync(
        `"${ffmpegPath}" -list_devices true -f dshow -i dummy 2>&1`,
      );

      const output = stdout + stderr;
      const devices: AudioDevice[] = [];
      const lines = output.split('\n');
      let isAudioSection = false;

      for (const line of lines) {
        if (line.includes('DirectShow audio devices')) {
          isAudioSection = true;
          continue;
        }

        if (isAudioSection && line.includes('DirectShow video devices')) {
          isAudioSection = false;
          break;
        }

        if (isAudioSection) {
          // Match device names in quotes
          const match = line.match(/"([^"]+)"/);
          if (match) {
            const name = match[1];
            const isStereoMix =
              name.toLowerCase().includes('stereo mix') ||
              name.toLowerCase().includes('wave out mix') ||
              name.toLowerCase().includes('what u hear');

            devices.push({
              id: name,
              name: name,
              type: isStereoMix ? 'loopback' : 'input',
              isDefault: devices.length === 0,
            });
          }
        }
      }

      this.logger.log(`Found ${devices.length} audio devices on Windows`);

      // If no devices found, return defaults
      if (devices.length === 0) {
        return [
          {
            id: 'audio=Microphone',
            name: 'Default Microphone',
            type: 'input',
            isDefault: true,
          },
        ];
      }

      return devices;
    } catch (error) {
      this.logger.error('Failed to list audio devices', error);
      // Return default devices if detection fails
      return [
        {
          id: 'audio=Microphone',
          name: 'Default Microphone',
          type: 'input',
          isDefault: true,
        },
      ];
    }
  }

  async startCapture(options: AudioCaptureOptions): Promise<Readable> {
    const {
      deviceId = 'audio=Microphone',
      sampleRate = 48000,
      channels = 2,
      bitDepth = 16,
    } = options;

    this.logger.log(
      `Starting audio capture from ${deviceId}: ${sampleRate}Hz, ${channels}ch, ${bitDepth}bit`,
    );
    this.logger.log(`Using ffmpeg at: ${ffmpegPath}`);

    try {
      // Stop any existing capture
      this.stopCapture();

      // Format device ID for DirectShow
      // If it doesn't have 'audio=' prefix, add it
      const formattedDeviceId = deviceId.startsWith('audio=')
        ? deviceId
        : `audio=${deviceId}`;

      // Build ffmpeg arguments for Windows DirectShow
      // Buffer size: 4800 samples = 100ms at 48kHz
      // For s16le format: 4800 samples × 2 channels × 2 bytes = 19,200 bytes per 100ms chunk
      const args = [
        '-f',
        'dshow', // Input format for Windows
        '-i',
        formattedDeviceId, // Device name
        '-f',
        's16le', // Output format: signed 16-bit little-endian PCM
        '-ar',
        sampleRate.toString(), // Sample rate (48000 Hz)
        '-ac',
        channels.toString(), // Number of channels (2 = stereo)
        '-', // Output to stdout (pipe)
      ];

      this.logger.log(`Spawning ffmpeg with args: ${args.join(' ')}`);

      // Spawn ffmpeg process
      this.ffmpegProcess = spawn(ffmpegPath, args);

      if (!this.ffmpegProcess.stdout) {
        throw new Error('Failed to create ffmpeg stdout stream');
      }

      this.recordingStream = this.ffmpegProcess.stdout;

      // Handle ffmpeg stderr for logging
      if (this.ffmpegProcess.stderr) {
        this.ffmpegProcess.stderr.on('data', (data) => {
          // Only log errors, not all ffmpeg output
          const message = data.toString();
          if (message.includes('error') || message.includes('Error')) {
            this.logger.error(`ffmpeg: ${message}`);
          } else {
            this.logger.debug(`ffmpeg: ${message}`);
          }
        });
      }

      // Handle process events
      this.ffmpegProcess.on('error', (error) => {
        this.logger.error('ffmpeg process error', error);
      });

      this.ffmpegProcess.on('exit', (code, signal) => {
        this.logger.log(
          `ffmpeg process exited with code ${code}, signal ${signal}`,
        );
        this.recordingStream = null;
        this.ffmpegProcess = null;
      });

      // Handle stream events
      this.recordingStream.on('error', (error: Error) => {
        this.logger.error('Recording stream error', error);
      });

      this.recordingStream.on('end', () => {
        this.logger.log('Recording stream ended');
      });

      return this.recordingStream;
    } catch (error) {
      this.logger.error('Failed to start audio capture', error);
      throw error;
    }
  }

  stopCapture(): void {
    if (this.ffmpegProcess) {
      this.logger.log('Stopping audio capture');

      // On Windows, try to kill gracefully first
      this.ffmpegProcess.kill('SIGTERM');

      // Force kill after 2 seconds if still running
      setTimeout(() => {
        if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
          this.logger.warn('Force killing ffmpeg process');
          this.ffmpegProcess.kill('SIGKILL');
        }
      }, 2000);

      this.ffmpegProcess = null;
      this.recordingStream = null;
    }
  }
}
