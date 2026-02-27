/**
 * Network Manager — Trystero-based P2P networking for Manila multiplayer
 *
 * Uses MQTT strategy (public HiveMQ broker) for signaling.
 * All game data flows directly peer-to-peer via WebRTC data channels.
 */
import { joinRoom as trysteroJoinRoom } from 'trystero/mqtt';
import type { Room } from 'trystero';
import type { MetaMessage, NetworkCallbacks } from './types';

const APP_ID = 'manila-webui-v1';

// ==================== Room Code Generation ====================

/** Generate a 4-character alphanumeric room code (uppercase) */
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// ==================== Network Manager ====================

export class NetworkManager {
    private room: Room | null = null;
    private callbacks: NetworkCallbacks = {};

    // Trystero action senders (set after joining room)
    private sendMeta: ((data: MetaMessage, targetPeers?: string[]) => void) | null = null;
    private sendAction: ((data: unknown, targetPeers?: string[]) => void) | null = null;
    private sendState: ((data: unknown, targetPeers?: string[]) => void) | null = null;

    private _peerId: string = '';
    private _roomCode: string = '';
    private _isHost: boolean = false;
    private _destroyed: boolean = false;

    // Heartbeat
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private peerLastSeen: Map<string, number> = new Map();
    private readonly HEARTBEAT_MS = 5000;
    private readonly PEER_TIMEOUT_MS = 15000;

    get peerId() { return this._peerId; }
    get roomCode() { return this._roomCode; }
    get isHost() { return this._isHost; }

    setCallbacks(cb: NetworkCallbacks) {
        this.callbacks = cb;
    }

    // ==================== Create / Join Room ====================

    /**
     * Create a new room (caller becomes host).
     * Returns the room code.
     */
    async createRoom(): Promise<string> {
        this._roomCode = generateRoomCode();
        this._isHost = true;
        this._peerId = 'host-' + Math.random().toString(36).substring(2, 8);
        this.joinTrysteroRoom();
        return this._roomCode;
    }

    /**
     * Join an existing room by code (caller becomes guest).
     */
    async joinRoom(roomCode: string): Promise<void> {
        this._roomCode = roomCode.toUpperCase();
        this._isHost = false;
        this._peerId = 'guest-' + Math.random().toString(36).substring(2, 8);
        this.joinTrysteroRoom();
    }

    private joinTrysteroRoom() {
        console.log(`[Network] Joining room ${this._roomCode} as ${this._isHost ? 'HOST' : 'GUEST'} (peerId=${this._peerId})`);

        this.room = trysteroJoinRoom(
            { appId: `${APP_ID}-${this._roomCode}` },
            this._roomCode
        );

        // Set up data channels
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [sendMeta, getMeta] = this.room.makeAction<any>('meta');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [sendAction, getAction] = this.room.makeAction<any>('action');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [sendState, getState] = this.room.makeAction<any>('state');

        this.sendMeta = sendMeta as any;
        this.sendAction = sendAction as any;
        this.sendState = sendState as any;

        // Handle incoming messages
        getMeta((data: any, peerId: string) => this.handleMeta(data as MetaMessage, peerId));
        getAction((data: any, peerId: string) => this.handleAction(data, peerId));
        getState((data: any, peerId: string) => this.handleState(data, peerId));

        // Peer join/leave events
        this.room.onPeerJoin((peerId) => {
            console.log(`[Network] Peer joined: ${peerId}`);
            this.peerLastSeen.set(peerId, Date.now());
            this.callbacks.onPeerJoin?.(peerId);
        });

        this.room.onPeerLeave((peerId) => {
            console.log(`[Network] Peer left: ${peerId}`);
            this.peerLastSeen.delete(peerId);
            this.callbacks.onPeerLeave?.(peerId);
        });

        // Start heartbeat
        this.startHeartbeat();
    }

    // ==================== Send Methods ====================

    /** Guest → Host: send a game action */
    dispatchToHost(action: unknown) {
        if (!this.sendAction) {
            console.warn('[Network] Cannot send action - not connected');
            return;
        }
        this.sendAction(action);
    }

    /** Host → All Guests: broadcast game state */
    broadcastState(state: unknown) {
        if (!this.sendState) {
            console.warn('[Network] Cannot broadcast state - not connected');
            return;
        }
        this.sendState(state);
    }

    /** Send a meta message (to all peers or specific peer) */
    emitMeta(type: MetaMessage['type'], payload: unknown, targetPeers?: string[]) {
        if (!this.sendMeta) return;
        const msg: MetaMessage = {
            type,
            payload,
            senderId: this._peerId,
            timestamp: Date.now(),
        };
        this.sendMeta(msg, targetPeers);
    }

    // ==================== Incoming Handlers ====================

    private handleMeta(data: MetaMessage, peerId: string) {
        this.peerLastSeen.set(peerId, Date.now());

        switch (data.type) {
            case 'room-state':
                this.callbacks.onRoomStateUpdate?.(data.payload as any);
                break;
            case 'player-join':
                // Forward join request with payload data (name, color) to host
                this.callbacks.onPlayerJoinRequest?.(
                    peerId,
                    data.payload as { name: string; color: string },
                );
                break;
            case 'player-ready':
                this.callbacks.onPlayerReadyChange?.(
                    peerId,
                    (data.payload as { ready: boolean }).ready,
                );
                break;
            case 'game-start':
                this.callbacks.onGameStart?.(data.payload);
                break;
            case 'error':
                this.callbacks.onError?.(data.payload as string);
                break;
            case 'heartbeat':
                // Already updated lastSeen above
                break;
            default:
                break;
        }
    }

    private handleAction(data: unknown, peerId: string) {
        this.peerLastSeen.set(peerId, Date.now());
        this.callbacks.onRemoteAction?.(data);
    }

    private handleState(data: unknown, peerId: string) {
        this.peerLastSeen.set(peerId, Date.now());
        this.callbacks.onStateSync?.(data);
    }

    // ==================== Heartbeat ====================

    private startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this._destroyed) return;

            // Send heartbeat to all peers
            this.emitMeta('heartbeat', { peerId: this._peerId });

            // Check for timed-out peers
            const now = Date.now();
            for (const [peerId, lastSeen] of this.peerLastSeen) {
                if (now - lastSeen > this.PEER_TIMEOUT_MS) {
                    console.warn(`[Network] Peer timed out: ${peerId}`);
                    this.peerLastSeen.delete(peerId);
                    this.callbacks.onPeerLeave?.(peerId);
                }
            }
        }, this.HEARTBEAT_MS);
    }

    // ==================== Cleanup ====================

    destroy() {
        this._destroyed = true;
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        this.sendMeta = null;
        this.sendAction = null;
        this.sendState = null;
        this.peerLastSeen.clear();
        console.log('[Network] Destroyed');
    }
}

// Singleton instance
let instance: NetworkManager | null = null;

export function getNetworkManager(): NetworkManager {
    if (!instance) {
        instance = new NetworkManager();
    }
    return instance;
}

export function destroyNetworkManager() {
    if (instance) {
        instance.destroy();
        instance = null;
    }
}
