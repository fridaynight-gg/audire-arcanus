import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  Logger,
  OnApplicationShutdown,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';
import { StreamingService } from '../streaming/streaming.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LobbyGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LobbyGateway.name);
  private socketToListener: Map<string, string> = new Map();

  constructor(
    private readonly lobbyService: LobbyService,
    @Inject(forwardRef(() => StreamingService))
    private readonly streamingService: StreamingService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const listenerId = this.socketToListener.get(client.id);
    if (listenerId) {
      const listener = this.lobbyService.getListener(listenerId);
      if (listener) {
        const lobby = this.lobbyService.getLobby(listener.lobbyId);
        const lobbyName = lobby ? lobby.name : 'Unknown Lobby';

        this.logger.log(
          `Listener disconnected: ${listener.username} from ${lobbyName}`,
        );

        // Broadcast listener disconnect event
        this.server.emit('listener-disconnected', {
          username: listener.username,
          lobbyName: lobbyName,
          lobbyId: listener.lobbyId,
        });
      }

      this.lobbyService.removeListener(listenerId);
      this.socketToListener.delete(client.id);
      this.broadcastLobbyUpdate();

      // Update streaming stats if this lobby is currently streaming
      if (listener) {
        const lobby = this.lobbyService.getLobby(listener.lobbyId);
        if (lobby) {
          this.streamingService.updateLobbyInfo(
            lobby.id,
            lobby.name,
            lobby.listenerCount,
          );
        }
      }
    }
  }

  @SubscribeMessage('join-lobby')
  handleJoinLobby(
    @MessageBody() data: { joinCode: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Find lobby by join code
    const lobby = this.lobbyService.getLobbyByJoinCode(data.joinCode);

    if (!lobby) {
      return { success: false, error: 'Invalid join code' };
    }

    // Get client IP address
    const ipAddress =
      client.handshake.headers['x-forwarded-for'] ||
      client.handshake.address ||
      'Unknown';

    const listener = this.lobbyService.addListener(
      lobby.id,
      data.username,
      ipAddress as string,
    );

    if (!listener) {
      return { success: false, error: 'Failed to join lobby' };
    }

    this.socketToListener.set(client.id, listener.id);
    client.join(`lobby-${lobby.id}`);

    this.logger.log(
      `Listener joined: ${data.username} (${ipAddress}) → ${lobby.name} [${lobby.joinCode}]`,
    );

    // Broadcast listener connected event
    this.server.emit('listener-connected', {
      username: data.username,
      lobbyName: lobby.name,
      lobbyId: lobby.id,
      joinCode: lobby.joinCode,
      ipAddress: ipAddress,
    });

    this.broadcastLobbyUpdate();

    // Check if this lobby is currently streaming
    const streamStatus = this.streamingService.getActiveStream(lobby.id);
    const isStreaming = streamStatus !== null;

    if (isStreaming) {
      // Emit stream-started event to the newly joined client
      client.emit('stream-started', { lobbyId: lobby.id });
      this.logger.log(
        `Notified ${data.username} that lobby ${lobby.name} is already streaming`,
      );
    }

    // Return streaming status in response so client knows immediately
    return { success: true, listener, lobby, isStreaming };
  }

  @SubscribeMessage('leave-lobby')
  handleLeaveLobby(@ConnectedSocket() client: Socket) {
    const listenerId = this.socketToListener.get(client.id);
    if (listenerId) {
      const listener = this.lobbyService.getListener(listenerId);
      if (listener) {
        const lobby = this.lobbyService.getLobby(listener.lobbyId);
        const lobbyName = lobby ? lobby.name : 'Unknown Lobby';

        this.logger.log(
          `Listener left: ${listener.username} from ${lobbyName}`,
        );

        // Broadcast listener disconnect event
        this.server.emit('listener-disconnected', {
          username: listener.username,
          lobbyName: lobbyName,
          lobbyId: listener.lobbyId,
        });
      }

      this.lobbyService.removeListener(listenerId);
      this.socketToListener.delete(client.id);
      this.broadcastLobbyUpdate();

      // Update streaming stats if this lobby is currently streaming
      if (listener) {
        const lobby = this.lobbyService.getLobby(listener.lobbyId);
        if (lobby) {
          this.streamingService.updateLobbyInfo(
            lobby.id,
            lobby.name,
            lobby.listenerCount,
          );
        }
      }
    }
    return { success: true };
  }

  broadcastLobbyUpdate() {
    const lobbies = this.lobbyService.getAllLobbies();
    this.server.emit('lobbies-updated', lobbies);
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down (${signal})`);

    // Notify all clients that all lobbies are being closed
    const lobbies = this.lobbyService.getAllLobbies();
    lobbies.forEach((lobby) => {
      this.server.to(`lobby-${lobby.id}`).emit('lobby-closed', {
        lobbyId: lobby.id,
        lobbyName: lobby.name,
        reason: 'Host application closed',
      });
    });

    // Also broadcast a general shutdown event
    this.server.emit('server-shutdown', {
      message: 'Host application has closed',
    });

    this.logger.log('Sent lobby-closed events to all connected clients');
  }
}
