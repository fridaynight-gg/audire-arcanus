import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { StatsService } from '../stats/stats.service';

export interface StreamConfig {
  codec: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private isStreaming = false;
  private activeStreams: Map<
    string,
    { lobbyId: string; stream: Readable; lobbyName: string; listeners: number }
  > = new Map();
  private config: StreamConfig = {
    codec: 'pcm',
    bitrate: 320000,
    sampleRate: 48000,
    channels: 2,
  };

  constructor(private readonly statsService: StatsService) {}

  startStream(
    lobbyId: string,
    audioStream: Readable,
    lobbyName?: string,
    listenerCount?: number,
  ): boolean {
    if (!audioStream) {
      this.logger.error('No audio stream provided');
      return false;
    }

    this.logger.log(`Starting stream for lobby ${lobbyId}`);

    // Store the stream for this lobby
    this.activeStreams.set(lobbyId, {
      lobbyId,
      stream: audioStream,
      lobbyName: lobbyName || 'Unknown Lobby',
      listeners: listenerCount || 0,
    });

    this.isStreaming = true;

    // Update stats
    this.statsService.updateLobbyStats(
      lobbyId,
      lobbyName || 'Unknown Lobby',
      true,
      this.config.bitrate,
      listenerCount || 0,
    );

    // Listen for audio data chunks
    audioStream.on('data', (chunk: Buffer) => {
      this.handleAudioChunk(lobbyId, chunk);
      this.statsService.addBytesTransferred(lobbyId, chunk.length);
    });

    audioStream.on('error', (error) => {
      this.logger.error(`Stream error for lobby ${lobbyId}:`, error);
    });

    audioStream.on('end', () => {
      this.logger.log(`Stream ended for lobby ${lobbyId}`);
      this.stopStream(lobbyId);
    });

    return true;
  }

  private handleAudioChunk(lobbyId: string, chunk: Buffer): void {
    // This will be called by the StreamingGateway to broadcast
    // For now, just log the chunk size
    // this.logger.debug(`Audio chunk for lobby ${lobbyId}: ${chunk.length} bytes`);
  }

  stopStream(lobbyId?: string): void {
    if (lobbyId) {
      const streamData = this.activeStreams.get(lobbyId);

      if (streamData) {
        this.logger.log(`Stopping stream for lobby ${lobbyId}`);

        // Remove all event listeners from the audio stream
        streamData.stream.removeAllListeners('data');
        streamData.stream.removeAllListeners('error');
        streamData.stream.removeAllListeners('end');

        // Update stats for this lobby with actual info
        this.statsService.updateLobbyStats(
          lobbyId,
          streamData.lobbyName,
          false,
          this.config.bitrate,
          streamData.listeners,
        );

        this.activeStreams.delete(lobbyId);
      }

      if (this.activeStreams.size === 0) {
        this.isStreaming = false;
      }
    } else {
      // Stop all streams
      this.logger.log('Stopping all streams');

      // Clean up all streams
      this.activeStreams.forEach((streamData, lobbyId) => {
        streamData.stream.removeAllListeners('data');
        streamData.stream.removeAllListeners('error');
        streamData.stream.removeAllListeners('end');

        this.statsService.updateLobbyStats(
          lobbyId,
          streamData.lobbyName,
          false,
          this.config.bitrate,
          streamData.listeners,
        );
      });

      this.activeStreams.clear();
      this.isStreaming = false;
    }
  }

  getStreamStatus(): {
    isStreaming: boolean;
    config: StreamConfig;
    activeLobbies: number;
  } {
    return {
      isStreaming: this.isStreaming,
      config: this.config,
      activeLobbies: this.activeStreams.size,
    };
  }

  getActiveStream(lobbyId: string): Readable | null {
    const streamData = this.activeStreams.get(lobbyId);
    return streamData ? streamData.stream : null;
  }

  updateConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Stream configuration updated', this.config);
  }

  getConfig(): StreamConfig {
    return { ...this.config };
  }

  updateLobbyInfo(lobbyId: string, lobbyName: string, listenerCount: number) {
    const streamData = this.activeStreams.get(lobbyId);
    if (streamData) {
      streamData.lobbyName = lobbyName;
      streamData.listeners = listenerCount;

      // Update stats with new info
      this.statsService.updateLobbyStats(
        lobbyId,
        lobbyName,
        true, // Still streaming
        this.config.bitrate,
        listenerCount,
      );
    }
  }
}
