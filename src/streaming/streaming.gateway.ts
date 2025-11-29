import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
export class StreamingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamingGateway.name);

  // Buffer chunker for consistent audio packet sizes
  // 48kHz × 2 channels × 2 bytes × 0.1s = 19,200 bytes per 100ms chunk
  private readonly CHUNK_SIZE = 19200;
  private audioBuffers: Map<string, Buffer> = new Map();

  constructor(
    private readonly streamingService: StreamingService,
    private readonly audioService: AudioService,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
  ) {}

  afterInit() {
    this.logger.log('Streaming gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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

        // Initialize buffer for this lobby
        this.audioBuffers.set(lobbyId, Buffer.alloc(0));

        // Set up audio data forwarding with chunking for consistent packet sizes
        let packetCount = 0;
        audioStream.on('data', (chunk: Buffer) => {
          try {
            packetCount++;

            // Log first few chunks from ffmpeg
            if (packetCount <= 5) {
              this.logger.log(
                `[FFMPEG] Chunk #${packetCount}: ${chunk.length} bytes`,
              );
            }

            // Add chunk to buffer
            const currentBuffer =
              this.audioBuffers.get(lobbyId) || Buffer.alloc(0);
            const newBuffer = Buffer.concat([currentBuffer, chunk]);

            // Send complete chunks
            let offset = 0;
            let chunksEmitted = 0;
            while (offset + this.CHUNK_SIZE <= newBuffer.length) {
              const packet = newBuffer.slice(offset, offset + this.CHUNK_SIZE);
              // Broadcast consistent-sized chunks to all clients
              this.server.to(`lobby-${lobbyId}`).emit('audio-data', packet);
              offset += this.CHUNK_SIZE;
              chunksEmitted++;
            }

            // Log chunking activity
            if (packetCount <= 5) {
              this.logger.log(
                `[CHUNKER] Received ${chunk.length} bytes, buffered ${currentBuffer.length}, emitted ${chunksEmitted} chunks, remaining ${newBuffer.length - offset} bytes`,
              );
            }

            // Store remaining bytes for next iteration
            this.audioBuffers.set(lobbyId, newBuffer.slice(offset));
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

    // Clean up audio buffer for this lobby
    this.audioBuffers.delete(lobbyId);

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
