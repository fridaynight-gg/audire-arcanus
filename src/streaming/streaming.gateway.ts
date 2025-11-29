import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamingService } from './streaming.service';
import { AudioService } from '../audio/audio.service';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { LobbyService } from '../lobby/lobby.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class StreamingGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamingGateway.name);

  constructor(
    private readonly streamingService: StreamingService,
    private readonly audioService: AudioService,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
  ) {}

  afterInit() {
    this.logger.log('Streaming gateway initialized');
  }

  @SubscribeMessage('start-stream')
  handleStartStream(
    @MessageBody() data: { lobbyId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    try {
      const { lobbyId } = data;

      if (!lobbyId) {
        this.logger.error('Missing lobbyId in start-stream request');
        return { success: false, error: 'Missing lobby ID' };
      }

      // Get the active audio stream
      const audioStream = this.audioService.getAudioStream();

      if (!audioStream) {
        this.logger.warn(
          'No active audio stream - waiting for host to start streaming',
        );
        return {
          success: true,
          waiting: true,
          message: 'Waiting for host to start audio stream',
        };
      }

      // Get lobby info for stats
      const lobby = this.lobbyService.getLobby(lobbyId);
      const lobbyName = lobby ? lobby.name : 'Unknown Lobby';
      const listenerCount = lobby ? lobby.listenerCount : 0;

      // Start streaming to the lobby
      const success = this.streamingService.startStream(
        lobbyId,
        audioStream,
        lobbyName,
        listenerCount,
      );

      if (success) {
        this.logger.log(`Started streaming to lobby ${lobbyId}`);

        // Set up audio data forwarding with error handling
        audioStream.on('data', (chunk: Buffer) => {
          try {
            // Broadcast to all clients in this lobby
            this.server.to(`lobby-${lobbyId}`).emit('audio-data', chunk);
          } catch (error) {
            this.logger.error(
              `Error broadcasting audio data to lobby ${lobbyId}:`,
              error,
            );
          }
        });

        // Handle stream errors
        audioStream.on('error', (error) => {
          this.logger.error(`Audio stream error for lobby ${lobbyId}:`, error);
          this.server
            .to(`lobby-${lobbyId}`)
            .emit('stream-error', { error: 'Audio stream interrupted' });
        });

        return { success: true };
      }

      return { success: false, error: 'Failed to start stream' };
    } catch (error) {
      this.logger.error('Error in handleStartStream:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  @SubscribeMessage('stop-stream')
  handleStopStream(
    @MessageBody() data: { lobbyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { lobbyId } = data;
    this.streamingService.stopStream(lobbyId);
    this.logger.log(`Stopped streaming to lobby ${lobbyId}`);

    // Notify all clients in the lobby that streaming has stopped
    this.server.to(`lobby-${lobbyId}`).emit('stream-stopped', { lobbyId });

    return { success: true };
  }

  @SubscribeMessage('webrtc-offer')
  handleOffer(
    @MessageBody() data: { lobbyId: string; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Handle WebRTC offer from client
    // For now, just acknowledge
    this.logger.log(
      `Received WebRTC offer from client ${client.id} for lobby ${data.lobbyId}`,
    );
    return { success: true };
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @MessageBody() data: { lobbyId: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Handle WebRTC answer from client
    this.logger.log(`Received WebRTC answer from client ${client.id}`);
    return { success: true };
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { lobbyId: string; candidate: any },
    @ConnectedSocket() _client: Socket,
  ) {
    // TODO: Handle ICE candidate exchange
    this.logger.log(`Received ICE candidate from client ${_client.id}`);
    return { success: true };
  }

  broadcastAudioData(lobbyId: string, audioData: Buffer) {
    // Broadcast audio data to all clients in the lobby
    this.server.to(`lobby-${lobbyId}`).emit('audio-data', audioData);
  }
}
