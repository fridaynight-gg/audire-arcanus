import { Injectable } from '@nestjs/common';

export interface Lobby {
  id: string;
  name: string;
  joinCode: string;
  createdAt: Date;
  listenerCount: number;
  bitrate: number;
  isActive: boolean;
}

export interface Listener {
  id: string;
  lobbyId: string;
  username: string;
  connectedAt: Date;
  ipAddress?: string;
}

@Injectable()
export class LobbyService {
  private lobbies: Map<string, Lobby> = new Map();
  private listeners: Map<string, Listener> = new Map();

  createLobby(name: string, bitrate: number = 320): Lobby {
    const id = this.generateId();
    const joinCode = this.generateJoinCode();
    const lobby: Lobby = {
      id,
      name,
      joinCode,
      createdAt: new Date(),
      listenerCount: 0,
      bitrate,
      isActive: true,
    };

    this.lobbies.set(id, lobby);
    return lobby;
  }

  getLobby(id: string): Lobby | undefined {
    return this.lobbies.get(id);
  }

  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values());
  }

  renameLobby(id: string, newName: string): Lobby | null {
    const lobby = this.lobbies.get(id);
    if (!lobby) {
      return null;
    }

    lobby.name = newName;
    return lobby;
  }

  closeLobby(id: string): boolean {
    const lobby = this.lobbies.get(id);
    if (!lobby) {
      return false;
    }

    // Remove all listeners from this lobby
    Array.from(this.listeners.values())
      .filter((listener) => listener.lobbyId === id)
      .forEach((listener) => this.listeners.delete(listener.id));

    this.lobbies.delete(id);
    return true;
  }

  addListener(
    lobbyId: string,
    username: string,
    ipAddress?: string,
  ): Listener | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return null;
    }

    const listenerId = this.generateId();
    const listener: Listener = {
      id: listenerId,
      lobbyId,
      username,
      connectedAt: new Date(),
      ipAddress,
    };

    this.listeners.set(listenerId, listener);
    lobby.listenerCount++;

    return listener;
  }

  removeListener(listenerId: string): boolean {
    const listener = this.listeners.get(listenerId);
    if (!listener) {
      return false;
    }

    const lobby = this.lobbies.get(listener.lobbyId);
    if (lobby) {
      lobby.listenerCount--;
    }

    this.listeners.delete(listenerId);
    return true;
  }

  getListener(listenerId: string): Listener | undefined {
    return this.listeners.get(listenerId);
  }

  getListenersInLobby(lobbyId: string): Listener[] {
    return Array.from(this.listeners.values()).filter(
      (listener) => listener.lobbyId === lobbyId,
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private generateJoinCode(): string {
    // Generate a 6-digit join code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getLobbyByJoinCode(joinCode: string): Lobby | undefined {
    return Array.from(this.lobbies.values()).find(
      (lobby) => lobby.joinCode === joinCode,
    );
  }
}
