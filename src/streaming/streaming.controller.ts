import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { AudioService } from '../audio/audio.service';
import { StreamingGateway } from './streaming.gateway';
import { LobbyService } from '../lobby/lobby.service';

@Controller('streaming')
export class StreamingController {
  constructor(
    private readonly streamingService: StreamingService,
    private readonly audioService: AudioService,
    private readonly streamingGateway: StreamingGateway,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
  ) {}

  @Post('start')
  async startStreaming(@Body('lobbyId') lobbyId: string) {
    if (!lobbyId) {
      throw new HttpException('Lobby ID required', HttpStatus.BAD_REQUEST);
    }

    const audioStream = this.audioService.getAudioStream();
    if (!audioStream) {
      throw new HttpException(
        'No audio source selected',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get lobby info for stats
    const lobby = this.lobbyService.getLobby(lobbyId);
    const lobbyName = lobby ? lobby.name : 'Unknown Lobby';
    const listenerCount = lobby ? lobby.listenerCount : 0;

    const success = this.streamingService.startStream(
      lobbyId,
      audioStream,
      lobbyName,
      listenerCount,
    );
    if (!success) {
      throw new HttpException(
        'Failed to start stream',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Set up audio data broadcasting to clients
    audioStream.on('data', (chunk: Buffer) => {
      try {
        this.streamingGateway.server
          .to(`lobby-${lobbyId}`)
          .emit('audio-data', chunk);
      } catch (error) {
        console.error(
          `Error broadcasting audio data to lobby ${lobbyId}:`,
          error,
        );
      }
    });

    audioStream.on('error', (error) => {
      console.error(`Audio stream error for lobby ${lobbyId}:`, error);
      this.streamingGateway.server
        .to(`lobby-${lobbyId}`)
        .emit('stream-error', { error: 'Audio stream interrupted' });
    });

    // Notify all clients in lobby that streaming has started
    this.streamingGateway.server
      .to(`lobby-${lobbyId}`)
      .emit('stream-started', { lobbyId });

    return {
      success: true,
      message: 'Streaming started',
      lobbyId,
    };
  }

  @Post('stop')
  async stopStreaming(@Body('lobbyId') lobbyId: string) {
    if (!lobbyId) {
      throw new HttpException('Lobby ID required', HttpStatus.BAD_REQUEST);
    }

    this.streamingService.stopStream(lobbyId);

    // Notify all clients in lobby that streaming has stopped
    this.streamingGateway.server
      .to(`lobby-${lobbyId}`)
      .emit('stream-stopped', { lobbyId });

    return {
      success: true,
      message: 'Streaming stopped',
      lobbyId,
    };
  }

  @Get('status/:lobbyId')
  getStreamingStatus(@Param('lobbyId') lobbyId: string) {
    const stream = this.streamingService.getActiveStream(lobbyId);
    const status = this.streamingService.getStreamStatus();

    return {
      lobbyId,
      isStreaming: stream !== null,
      globalStatus: status,
    };
  }

  @Get('status')
  getGlobalStatus() {
    return this.streamingService.getStreamStatus();
  }
}
