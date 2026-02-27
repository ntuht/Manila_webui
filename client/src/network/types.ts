/**
 * Network Layer Types for Manila Multiplayer
 */
import type { PlayerColor } from '../types/uiTypes';

// ==================== Room Management ====================

export interface RoomPlayer {
    peerId: string;
    name: string;
    color: PlayerColor;
    isReady: boolean;
    isHost: boolean;
    isConnected: boolean;
    /** Engine player slot index (0-based), assigned by host */
    slotIndex: number;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomState {
    roomCode: string;
    hostPeerId: string;
    players: RoomPlayer[];
    status: RoomStatus;
    /** AI configs for unfilled slots */
    aiSlots: AISlotConfig[];
    maxPlayers: 3 | 4;
}

export interface AISlotConfig {
    slotIndex: number;
    name: string;
    strategy: string;
}

// ==================== Network Messages ====================

export type MetaMessageType =
    | 'room-state'      // Host → Guest: full room state sync
    | 'player-join'     // Guest → Host: request to join
    | 'player-ready'    // Guest → Host: toggle ready
    | 'player-color'    // Guest → Host: change color
    | 'kick'            // Host → Guest: kicked from room
    | 'game-start'      // Host → All: game is starting
    | 'heartbeat'       // bidirectional
    | 'error';          // any direction

export interface MetaMessage {
    type: MetaMessageType;
    payload: unknown;
    senderId: string;
    timestamp: number;
}

// ==================== Connection Events ====================

export interface NetworkCallbacks {
    onPeerJoin?: (peerId: string) => void;
    onPeerLeave?: (peerId: string) => void;
    onPlayerJoinRequest?: (peerId: string, data: { name: string; color: string }) => void;
    onPlayerReadyChange?: (peerId: string, ready: boolean) => void;
    onRoomStateUpdate?: (state: unknown) => void;
    onGameStart?: (engineConfig: unknown) => void;
    onRemoteAction?: (action: unknown) => void;
    onStateSync?: (state: unknown) => void;
    onError?: (error: string) => void;
}
