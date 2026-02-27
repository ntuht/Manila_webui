/**
 * Multiplayer Store — manages P2P room state and network synchronization
 *
 * Separated from gameStore to keep concerns clean:
 * - multiplayerStore: connection, room, player list, sync
 * - gameStore: game engine state, UI derivation
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState as EngineState, Action, GameConfig as EngineConfig } from '@manila/engine';
import { createGame } from '@manila/engine';
import { getNetworkManager, destroyNetworkManager } from '../network';
import type { RoomPlayer, RoomState, AISlotConfig } from '../network';
import type { PlayerColor, UIAIPlayerConfig } from '../types/uiTypes';
import { PLAYER_COLORS } from '../types/uiTypes';
import { useGameStore } from './gameStore';

// ==================== Store Interface ====================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface MultiplayerStore {
    // Connection state
    isMultiplayer: boolean;
    isHost: boolean;
    roomCode: string | null;
    roomState: RoomState | null;
    connectionStatus: ConnectionStatus;
    localPeerId: string | null;
    localPlayerId: string | null;  // engine player ID for local user
    localPlayerName: string;
    localPlayerColor: PlayerColor;

    // Room operations
    createRoom: (playerName: string, color: PlayerColor, maxPlayers: 3 | 4) => Promise<string>;
    joinRoom: (roomCode: string, playerName: string, color: PlayerColor) => Promise<void>;
    leaveRoom: () => void;
    setReady: (ready: boolean) => void;
    updateAISlots: (aiSlots: AISlotConfig[]) => void;

    // Game start (host only)
    startMultiplayerGame: () => void;

    // Action dispatch — called by gameStore when in multiplayer mode
    sendActionToHost: (action: Action) => void;

    // Internal handlers
    _handlePeerJoin: (peerId: string) => void;
    _handlePeerLeave: (peerId: string) => void;
    _handleRemoteAction: (data: unknown) => void;
    _handleStateSync: (data: unknown) => void;

    // Cleanup
    reset: () => void;
}

// ==================== AI Defaults ====================

function buildDefaultAISlots(maxPlayers: 3 | 4, humanCount: number): AISlotConfig[] {
    const slots: AISlotConfig[] = [];
    for (let i = humanCount; i < maxPlayers; i++) {
        slots.push({ slotIndex: i, name: `AI ${i}`, strategy: 'onnx' });
    }
    return slots;
}

// ==================== Store Implementation ====================

export const useMultiplayerStore = create<MultiplayerStore>()(
    devtools(
        (set, get) => ({
            // Initial state
            isMultiplayer: false,
            isHost: false,
            roomCode: null,
            roomState: null,
            connectionStatus: 'disconnected' as ConnectionStatus,
            localPeerId: null,
            localPlayerId: null,
            localPlayerName: '你',
            localPlayerColor: 'red' as PlayerColor,

            // ===================== Create Room =====================

            createRoom: async (playerName: string, color: PlayerColor, maxPlayers: 3 | 4) => {
                const nm = getNetworkManager();

                set({
                    isMultiplayer: true,
                    isHost: true,
                    connectionStatus: 'connecting',
                    localPlayerName: playerName,
                    localPlayerColor: color,
                });

                // Set up network callbacks — set once, never overridden
                nm.setCallbacks({
                    onPeerJoin: (peerId) => {
                        console.log('[Multiplayer] Peer connected:', peerId);
                    },
                    onPeerLeave: (peerId) => get()._handlePeerLeave(peerId),
                    onPlayerJoinRequest: (peerId, data) => {
                        // A guest sent their join info — add them to the room
                        console.log('[Multiplayer] Player join request:', peerId, data);
                        const currentRoom = get().roomState;
                        if (!currentRoom) return;

                        // Don't add if already in room
                        if (currentRoom.players.some(p => p.peerId === peerId)) return;

                        // Assign the next available slot
                        const existingSlots = currentRoom.players.map(p => p.slotIndex);
                        let nextSlot = 0;
                        while (existingSlots.includes(nextSlot)) nextSlot++;

                        const newPlayer: RoomPlayer = {
                            peerId,
                            name: data.name || `Player ${currentRoom.players.length + 1}`,
                            color: (data.color as PlayerColor) || PLAYER_COLORS[currentRoom.players.length % PLAYER_COLORS.length],
                            isReady: false,
                            isHost: false,
                            isConnected: true,
                            slotIndex: nextSlot,
                        };

                        // Remove an AI slot if one exists at this index
                        const updatedAISlots = currentRoom.aiSlots.filter(ai => ai.slotIndex !== nextSlot);

                        const updatedRoom: RoomState = {
                            ...currentRoom,
                            players: [...currentRoom.players, newPlayer],
                            aiSlots: updatedAISlots,
                        };

                        set({ roomState: updatedRoom });
                        broadcastRoomState(updatedRoom);
                    },
                    onPlayerReadyChange: (peerId, ready) => {
                        const currentRoom = get().roomState;
                        if (!currentRoom) return;

                        const updatedRoom: RoomState = {
                            ...currentRoom,
                            players: currentRoom.players.map(p =>
                                p.peerId === peerId ? { ...p, isReady: ready } : p
                            ),
                        };
                        set({ roomState: updatedRoom });
                        broadcastRoomState(updatedRoom);
                    },
                    onRemoteAction: (data) => get()._handleRemoteAction(data),
                    onError: (err) => console.error('[Multiplayer] Error:', err),
                });

                const roomCode = await nm.createRoom();

                const hostPlayer: RoomPlayer = {
                    peerId: nm.peerId,
                    name: playerName,
                    color,
                    isReady: true, // host is always ready
                    isHost: true,
                    isConnected: true,
                    slotIndex: 0,
                };

                const roomState: RoomState = {
                    roomCode,
                    hostPeerId: nm.peerId,
                    players: [hostPlayer],
                    status: 'waiting',
                    aiSlots: buildDefaultAISlots(maxPlayers, 1),
                    maxPlayers,
                };

                set({
                    roomCode,
                    roomState,
                    localPeerId: nm.peerId,
                    connectionStatus: 'connected',
                });

                return roomCode;
            },

            // ===================== Join Room =====================

            joinRoom: async (roomCode: string, playerName: string, color: PlayerColor) => {
                const nm = getNetworkManager();

                set({
                    isMultiplayer: true,
                    isHost: false,
                    connectionStatus: 'connecting',
                    localPlayerName: playerName,
                    localPlayerColor: color,
                });

                nm.setCallbacks({
                    onPeerJoin: () => {
                        // When we see a peer (the host), send our join info
                        nm.emitMeta('player-join', {
                            name: playerName,
                            color,
                        });
                    },
                    onRoomStateUpdate: (state) => {
                        set({ roomState: state as RoomState });
                    },
                    onGameStart: (payload) => {
                        // Host is starting the game — update room status
                        const { engineState, playerColors, aiConfigs, peerToPlayer } = payload as any;
                        const localPeerId = get().localPeerId;
                        const localPlayerId = localPeerId ? peerToPlayer?.[localPeerId] || null : null;
                        set({ connectionStatus: 'connected', localPlayerId });

                        // Store peer-to-player mapping
                        (window as any).__peerToPlayer = peerToPlayer;

                        // Sync the game state into gameStore
                        const gameStore = useGameStore.getState();
                        gameStore.startMultiplayerGame(engineState, playerColors, aiConfigs);
                    },
                    onStateSync: (data) => get()._handleStateSync(data),
                    onRemoteAction: (data) => get()._handleRemoteAction(data),
                    onError: (err) => console.error('[Multiplayer] Error:', err),
                });

                await nm.joinRoom(roomCode);

                set({
                    roomCode: roomCode.toUpperCase(),
                    localPeerId: nm.peerId,
                    connectionStatus: 'connected',
                });
            },

            // ===================== Leave Room =====================

            leaveRoom: () => {
                destroyNetworkManager();
                set({
                    isMultiplayer: false,
                    isHost: false,
                    roomCode: null,
                    roomState: null,
                    connectionStatus: 'disconnected',
                    localPeerId: null,
                });
                // Also end any running game
                useGameStore.getState().endGame();
            },

            // ===================== Ready Toggle =====================

            setReady: (ready: boolean) => {
                const { roomState, localPeerId, isHost } = get();
                if (!roomState || !localPeerId) return;

                if (isHost) {
                    // Host modifies room state directly and broadcasts
                    const updated = {
                        ...roomState,
                        players: roomState.players.map(p =>
                            p.peerId === localPeerId ? { ...p, isReady: ready } : p
                        ),
                    };
                    set({ roomState: updated });
                    broadcastRoomState(updated);
                } else {
                    // Guest sends ready message to host
                    const nm = getNetworkManager();
                    nm.emitMeta('player-ready', { ready });
                }
            },

            // ===================== AI Slots =====================

            updateAISlots: (aiSlots: AISlotConfig[]) => {
                const { roomState, isHost } = get();
                if (!roomState || !isHost) return;

                const updated = { ...roomState, aiSlots };
                set({ roomState: updated });
                broadcastRoomState(updated);
            },

            // ===================== Start Game (Host) =====================

            startMultiplayerGame: () => {
                const { roomState, isHost } = get();
                if (!roomState || !isHost) return;

                const humanPlayers = roomState.players.filter(p => p.isConnected);
                const aiSlots = roomState.aiSlots;
                const totalPlayers = humanPlayers.length + aiSlots.length;

                if (totalPlayers < 3 || totalPlayers > 4) {
                    console.error('[Multiplayer] Invalid player count:', totalPlayers);
                    return;
                }

                // Check all non-host humans are ready
                const allReady = humanPlayers.every(p => p.isHost || p.isReady);
                if (!allReady) {
                    console.warn('[Multiplayer] Not all players are ready');
                    return;
                }

                // Build engine config
                const playerNames: string[] = [];
                const playerColors: Record<string, PlayerColor> = {};
                const aiConfigs = new Map<string, UIAIPlayerConfig>();

                // Assign slots: humans first, then AI
                for (let i = 0; i < humanPlayers.length; i++) {
                    playerNames.push(humanPlayers[i].name);
                }
                for (const ai of aiSlots) {
                    playerNames.push(ai.name);
                }

                const engineConfig: EngineConfig = {
                    playerCount: totalPlayers as 3 | 4,
                    rounds: 99,
                    playerNames,
                };

                // Create the game
                let engineState = createGame(engineConfig);

                // Mark AI players
                for (let i = humanPlayers.length; i < engineState.players.length; i++) {
                    engineState.players[i].isAI = true;
                }

                // Set up AI configs
                for (const ai of aiSlots) {
                    const aiPlayerIndex = humanPlayers.length + aiSlots.indexOf(ai);
                    const playerId = engineState.players[aiPlayerIndex].id;
                    aiConfigs.set(playerId, { name: ai.name, strategy: ai.strategy });
                }

                // Assign colors
                for (let i = 0; i < humanPlayers.length; i++) {
                    playerColors[engineState.players[i].id] = humanPlayers[i].color;
                }
                // AI gets remaining colors
                const usedColors = new Set(Object.values(playerColors));
                const availableColors = PLAYER_COLORS.filter(c => !usedColors.has(c));
                for (let i = humanPlayers.length; i < engineState.players.length; i++) {
                    playerColors[engineState.players[i].id] = availableColors[(i - humanPlayers.length) % availableColors.length];
                }

                // Map peerId → engine playerId for action routing
                const peerToPlayer: Record<string, string> = {};
                for (let i = 0; i < humanPlayers.length; i++) {
                    peerToPlayer[humanPlayers[i].peerId] = engineState.players[i].id;
                }

                // Update room state to "playing"
                const updatedRoom = { ...roomState, status: 'playing' as const };
                set({ roomState: updatedRoom });

                // Start the game locally (host)
                const aiConfigsObj: Record<string, UIAIPlayerConfig> = {};
                aiConfigs.forEach((v, k) => { aiConfigsObj[k] = v; });

                useGameStore.getState().startMultiplayerGame(engineState, playerColors, aiConfigsObj);

                // Broadcast game start + initial state to guests
                const nm = getNetworkManager();
                nm.emitMeta('game-start', {
                    engineState,
                    playerColors,
                    aiConfigs: aiConfigsObj,
                    peerToPlayer,
                });

                // Store peer-to-player mapping + set local player ID
                (window as any).__peerToPlayer = peerToPlayer;
                const localPlayerId = peerToPlayer[nm.peerId] || null;
                set({ roomState: updatedRoom, localPlayerId });
            },

            // ===================== Action Send (Guest → Host) =====================

            sendActionToHost: (action: Action) => {
                const nm = getNetworkManager();
                nm.dispatchToHost(action);
            },

            // ===================== Internal Handlers =====================

            _handlePeerJoin: (_peerId: string) => {
                // No-op: player-add logic is handled by onPlayerJoinRequest in createRoom callbacks
            },

            _handlePeerLeave: (peerId: string) => {
                const { isHost, roomState } = get();
                if (!isHost || !roomState) return;

                const updatedRoom: RoomState = {
                    ...roomState,
                    players: roomState.players.map(p =>
                        p.peerId === peerId ? { ...p, isConnected: false } : p
                    ),
                };

                set({ roomState: updatedRoom });
                broadcastRoomState(updatedRoom);
            },

            _handleRemoteAction: (data: unknown) => {
                const { isHost } = get();
                if (!isHost) return;

                // Host: execute the action on the game engine
                const action = data as Action;
                console.log('[Multiplayer] Host received remote action:', action);

                const result = useGameStore.getState().dispatchAction(action);

                if (result.success) {
                    // Broadcast new state to all guests
                    const nm = getNetworkManager();
                    const engineState = useGameStore.getState().engineState;
                    if (engineState) {
                        nm.broadcastState(engineState);
                    }
                }
            },

            _handleStateSync: (data: unknown) => {
                const { isHost } = get();
                if (isHost) return; // host doesn't receive state syncs

                // Guest: update local engine state
                const engineState = data as EngineState;
                console.log('[Multiplayer] Guest received state sync, phase:', engineState.phase);

                useGameStore.getState().syncState(engineState);
            },

            // ===================== Reset =====================

            reset: () => {
                destroyNetworkManager();
                set({
                    isMultiplayer: false,
                    isHost: false,
                    roomCode: null,
                    roomState: null,
                    connectionStatus: 'disconnected',
                    localPeerId: null,
                    localPlayerId: null,
                });
            },
        }),
        { name: 'multiplayer-store' }
    )
);

// ==================== Helper ====================

function broadcastRoomState(roomState: RoomState) {
    const nm = getNetworkManager();
    nm.emitMeta('room-state', roomState);
}

// Expose on window for cross-store access
(window as any).__multiplayerStore = useMultiplayerStore;
