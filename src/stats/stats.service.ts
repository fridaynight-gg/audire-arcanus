import { Injectable } from '@nestjs/common';

export interface StreamStats {
  bitrate: number;
  latency: number;
  packetsLost: number;
  totalListeners: number;
  uptime: number;
}

export interface LobbyStreamStats {
  lobbyId: string;
  lobbyName: string;
  isStreaming: boolean;
  bitrate: number;
  listenerCount: number;
  bytesTransferred: number;
  startTime?: Date;
}

@Injectable()
export class StatsService {
  private stats: StreamStats = {
    bitrate: 0,
    latency: 0,
    packetsLost: 0,
    totalListeners: 0,
    uptime: 0,
  };

  private lobbyStats: Map<string, LobbyStreamStats> = new Map();
  private startTime: Date | null = null;

  startTracking() {
    this.startTime = new Date();
  }

  updateStats(partial: Partial<StreamStats>) {
    this.stats = { ...this.stats, ...partial };

    if (this.startTime) {
      this.stats.uptime = Date.now() - this.startTime.getTime();
    }
  }

  updateLobbyStats(
    lobbyId: string,
    lobbyName: string,
    isStreaming: boolean,
    bitrate: number,
    listenerCount: number,
  ) {
    const existing = this.lobbyStats.get(lobbyId);

    if (!existing) {
      this.lobbyStats.set(lobbyId, {
        lobbyId,
        lobbyName,
        isStreaming,
        bitrate,
        listenerCount,
        bytesTransferred: 0,
        startTime: isStreaming ? new Date() : undefined,
      });
    } else {
      // Update existing stats
      existing.lobbyName = lobbyName; // Update name in case it changed
      existing.isStreaming = isStreaming;
      existing.bitrate = bitrate;
      existing.listenerCount = listenerCount;

      // Reset start time if streaming just started
      if (isStreaming && !existing.startTime) {
        existing.startTime = new Date();
      } else if (!isStreaming) {
        existing.startTime = undefined;
        // Don't reset bytesTransferred - keep it to show total transferred
      }
    }
  }

  addBytesTransferred(lobbyId: string, bytes: number) {
    const stats = this.lobbyStats.get(lobbyId);
    if (stats) {
      stats.bytesTransferred += bytes;
    }
  }

  getStats(): StreamStats {
    return { ...this.stats };
  }

  getLobbyStats(): LobbyStreamStats[] {
    return Array.from(this.lobbyStats.values());
  }

  removeLobbyStats(lobbyId: string) {
    this.lobbyStats.delete(lobbyId);
  }

  reset() {
    this.stats = {
      bitrate: 0,
      latency: 0,
      packetsLost: 0,
      totalListeners: 0,
      uptime: 0,
    };
    this.lobbyStats.clear();
    this.startTime = null;
  }
}
