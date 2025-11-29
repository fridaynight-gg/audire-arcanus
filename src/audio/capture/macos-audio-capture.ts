import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { Readable } from 'stream';
import { path as ffmpegPathOriginal } from '@ffmpeg-installer/ffmpeg';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  IAudioCapture,
  AudioDevice,
  AudioCaptureOptions,
} from './audio-capture.interface';

const execAsync = promisify(exec);

@Injectable()
export class MacOSAudioCapture implements IAudioCapture {
  private readonly logger = new Logger(MacOSAudioCapture.name);
  private ffmpegProcess: ChildProcess | null = null;
  private recordingStream: Readable | null = null;

  getPlatform(): 'darwin' {
    return 'darwin';
  }

  // Get the correct ffmpeg path for both development and production
  private getFfmpegPath(): string {
    // Check if path is inside asar - binaries can't be executed from asar
    const isInsideAsar = ffmpegPathOriginal.includes('.asar');

    // In development, use the package's path (only if not in asar)
    if (!isInsideAsar && existsSync(ffmpegPathOriginal)) {
      return ffmpegPathOriginal;
    }

    // In production (Electron app), check for ffmpeg in Resources folder
    if (process.resourcesPath) {
      const productionPath = join(
        process.resourcesPath,
        'ffmpeg-installer',
        'darwin-arm64',
        'ffmpeg',
      );

      if (existsSync(productionPath)) {
        return productionPath;
      }

      // Try x64 version
      const productionPathX64 = join(
        process.resourcesPath,
        'ffmpeg-installer',
        'darwin-x64',
        'ffmpeg',
      );

      if (existsSync(productionPathX64)) {
        return productionPathX64;
      }
    }

    // Fallback to original path
    this.logger.warn('ffmpeg binary not found, using fallback path');
    return ffmpegPathOriginal;
  }

  async listDevices(): Promise<AudioDevice[]> {
    try {
      const ffmpegPath = this.getFfmpegPath();

      // Use ffmpeg to list audio devices on macOS
      // Note: ffmpeg exits with code 1 when listing devices, so we catch the error
      let output = '';
      try {
        const { stdout, stderr } = await execAsync(
          `"${ffmpegPath}" -f avfoundation -list_devices true -i "" 2>&1`,
        );
        output = stdout + stderr;
      } catch (error: any) {
        // ffmpeg exits with code 1 for -list_devices, but stdout contains the device list
        if (error.stdout || error.stderr) {
          output = (error.stdout || '') + (error.stderr || '');
        } else {
          this.logger.error('ffmpeg execution failed:', error.message);
          throw error;
        }
      }

      const devices: AudioDevice[] = [];

      // Parse ffmpeg output to extract audio devices
      const lines = output.split('\n');
      let isAudioSection = false;

      for (const line of lines) {
        if (line.includes('AVFoundation audio devices:')) {
          isAudioSection = true;
          continue;
        }

        if (isAudioSection && line.includes('AVFoundation video devices:')) {
          isAudioSection = false;
          break;
        }

        if (isAudioSection) {
          // Match lines like: [AVFoundation indev @ 0x...] [0] Built-in Microphone
          const match = line.match(/\[(\d+)\]\s+(.+)$/);
          if (match) {
            const [, id, name] = match;
            // All devices in AVFoundation audio devices section are inputs (microphones/line-in)
            // Note: Output devices (speakers) would be queried separately
            devices.push({
              id: `:${id.trim()}`, // Format as :0, :1, etc for ffmpeg
              name: name.trim(),
              type: 'input', // All AVFoundation audio devices are input devices
              isDefault: id === '0',
            });
          }
        }
      }

      // Add note about BlackHole for system audio
      if (devices.length > 0) {
        devices.push({
          id: 'system-audio',
          name: 'System Audio (requires BlackHole)',
          type: 'loopback',
          isDefault: false,
        });
      }

      this.logger.log(`Discovered ${devices.length} audio devices on macOS`);
      return devices;
    } catch (error) {
      this.logger.error('Failed to list audio devices:', error);
      // Return empty array if detection fails
      return [
        {
          id: ':0',
          name: 'Default Microphone',
          type: 'input',
          isDefault: true,
        },
      ];
    }
  }

  async startCapture(options: AudioCaptureOptions): Promise<Readable> {
    const {
      deviceId = ':0',
      sampleRate = 48000,
      channels = 2,
      bitDepth = 16,
    } = options;

    this.logger.log(
      `Starting audio capture from ${deviceId}: ${sampleRate}Hz, ${channels}ch, ${bitDepth}bit`,
    );

    const ffmpegPath = this.getFfmpegPath();
    this.logger.log(`Using ffmpeg at: ${ffmpegPath}`);

    try {
      // Stop any existing capture
      this.stopCapture();

      // Build ffmpeg arguments for macOS AVFoundation
      // Buffer size: 4800 samples = 100ms at 48kHz
      // For s16le format: 4800 samples × 2 channels × 2 bytes = 19,200 bytes per 100ms chunk
      const args = [
        '-f',
        'avfoundation', // Input format for macOS
        '-i',
        deviceId, // Device ID (e.g., :0, :1)
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

      // Send SIGTERM to gracefully stop ffmpeg
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
