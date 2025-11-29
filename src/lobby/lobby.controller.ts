import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyGateway } from './lobby.gateway';
import { StatsService } from '../stats/stats.service';
import { StreamingService } from '../streaming/streaming.service';

@Controller('lobby')
export class LobbyController {
  constructor(
    private readonly lobbyService: LobbyService,
    private readonly lobbyGateway: LobbyGateway,
    private readonly statsService: StatsService,
    @Inject(forwardRef(() => StreamingService))
    private readonly streamingService: StreamingService,
  ) {}

  @Get()
  getAllLobbies() {
    return this.lobbyService.getAllLobbies();
  }

  @Get(':id')
  getLobby(@Param('id') id: string) {
    const lobby = this.lobbyService.getLobby(id);
    if (!lobby) {
      throw new HttpException('Lobby not found', HttpStatus.NOT_FOUND);
    }
    return lobby;
  }

  @Get(':id/listeners')
  getListeners(@Param('id') id: string) {
    const lobby = this.lobbyService.getLobby(id);
    if (!lobby) {
      throw new HttpException('Lobby not found', HttpStatus.NOT_FOUND);
    }
    return this.lobbyService.getListenersInLobby(id);
  }

  @Post()
  createLobby(@Body('name') name: string, @Body('bitrate') bitrate?: number) {
    if (!name) {
      throw new HttpException('Lobby name required', HttpStatus.BAD_REQUEST);
    }
    return this.lobbyService.createLobby(name, bitrate);
  }

  @Patch(':id/rename')
  renameLobby(@Param('id') id: string, @Body('name') name: string) {
    if (!name || !name.trim()) {
      throw new HttpException('New name required', HttpStatus.BAD_REQUEST);
    }

    const lobby = this.lobbyService.renameLobby(id, name.trim());
    if (!lobby) {
      throw new HttpException('Lobby not found', HttpStatus.NOT_FOUND);
    }

    // Broadcast rename event to all clients
    this.lobbyGateway.server.emit('lobby-renamed', {
      lobbyId: lobby.id,
      newName: lobby.name,
    });

    // Update streaming stats if currently streaming
    this.streamingService.updateLobbyInfo(
      lobby.id,
      lobby.name,
      lobby.listenerCount,
    );

    return { success: true, lobby };
  }

  @Delete(':id')
  closeLobby(@Param('id') id: string) {
    const lobby = this.lobbyService.getLobby(id);
    if (!lobby) {
      throw new HttpException('Lobby not found', HttpStatus.NOT_FOUND);
    }

    const lobbyName = lobby.name;

    // Stop streaming for this lobby first
    this.streamingService.stopStream(id);

    // Emit stream-stopped event to clients
    this.lobbyGateway.server.to(`lobby-${id}`).emit('stream-stopped', {
      lobbyId: id,
    });

    // Emit lobby-closed event to all clients in the lobby
    this.lobbyGateway.server.to(`lobby-${id}`).emit('lobby-closed', {
      lobbyId: id,
      lobbyName: lobbyName,
    });

    // Remove lobby stats
    this.statsService.removeLobbyStats(id);

    // Finally close the lobby (removes listeners and lobby data)
    const success = this.lobbyService.closeLobby(id);

    return { success: true };
  }
}
