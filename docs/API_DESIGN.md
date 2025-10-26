# API 设计文档

## 概述

本文档定义了 Manila Web UI 项目的 API 接口设计，包括前端内部 API 和未来后端 API。

## 前端内部 API

### 游戏状态管理

#### GameStore API

```typescript
// stores/gameStore.ts
interface GameStore {
  // 状态
  gameState: GameState;
  currentPhase: GamePhase;
  players: PlayerState[];
  ships: ShipState[];
  
  // 动作
  startGame(config: GameConfig): void;
  endGame(): void;
  resetGame(): void;
  
  // 阶段管理
  startAuction(): void;
  startInvestment(): void;
  startSailing(): void;
  startSettlement(): void;
  
  // 玩家操作
  makeBid(playerId: string, amount: number): ActionResult;
  selectInvestment(playerId: string, slot: InvestmentSlot): ActionResult;
  useNavigator(playerId: string, action: NavigatorAction): ActionResult;
  
  // 查询
  getValidActions(playerId: string): GameAction[];
  getPlayerState(playerId: string): PlayerState | undefined;
  getGameHistory(): GameHistoryEntry[];
}
```

#### 使用示例

```typescript
// 在组件中使用
const { gameState, makeBid, getValidActions } = useGameStore();

const handleBid = (amount: number) => {
  const result = makeBid(currentPlayerId, amount);
  if (!result.success) {
    showError(result.error);
  }
};
```

### 游戏引擎 API

#### GameEngine 类

```typescript
// game/engine.ts
export class GameEngine {
  constructor(config: GameConfig);
  
  // 游戏控制
  startGame(): void;
  pauseGame(): void;
  resumeGame(): void;
  endGame(): void;
  
  // 动作处理
  processAction(action: GameAction): ActionResult;
  validateAction(action: GameAction): ValidationResult;
  
  // 状态查询
  getGameState(): GameState;
  getCurrentPhase(): GamePhase;
  getValidActions(playerId: string): GameAction[];
  
  // 历史记录
  getGameHistory(): GameHistoryEntry[];
  undoLastAction(): ActionResult;
  redoAction(): ActionResult;
}
```

#### 使用示例

```typescript
const engine = new GameEngine({
  players: 3,
  rounds: 3,
  aiStrategies: ['greedy', 'risk_aware']
});

// 处理玩家操作
const result = engine.processAction({
  type: 'BID',
  playerId: 'player1',
  amount: 15
});

if (result.success) {
  updateUI(result.newState);
} else {
  showError(result.error);
}
```

### 组件通信 API

#### 事件系统

```typescript
// utils/eventBus.ts
export class EventBus {
  // 事件监听
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  
  // 事件触发
  emit(event: string, data?: any): void;
  
  // 一次性监听
  once(event: string, callback: Function): void;
}

// 事件类型
export const GAME_EVENTS = {
  PHASE_CHANGED: 'phase_changed',
  PLAYER_ACTION: 'player_action',
  GAME_END: 'game_end',
  ERROR: 'error'
} as const;
```

#### 使用示例

```typescript
// 监听游戏事件
eventBus.on(GAME_EVENTS.PHASE_CHANGED, (newPhase) => {
  updatePhaseUI(newPhase);
});

// 触发事件
eventBus.emit(GAME_EVENTS.PLAYER_ACTION, {
  playerId: 'player1',
  action: 'BID',
  amount: 15
});
```

## 后端 API（Phase 3）

### REST API

#### 游戏管理

```typescript
// POST /api/games
interface CreateGameRequest {
  players: number;
  rounds: number;
  aiStrategies: string[];
  config?: GameConfig;
}

interface CreateGameResponse {
  gameId: string;
  gameState: GameState;
  players: PlayerInfo[];
}

// GET /api/games/:gameId
interface GetGameResponse {
  gameId: string;
  gameState: GameState;
  currentPhase: GamePhase;
  players: PlayerInfo[];
  history: GameHistoryEntry[];
}

// POST /api/games/:gameId/actions
interface GameActionRequest {
  playerId: string;
  action: GameAction;
}

interface GameActionResponse {
  success: boolean;
  newState?: GameState;
  error?: string;
  validActions?: GameAction[];
}
```

#### 玩家管理

```typescript
// GET /api/games/:gameId/players
interface GetPlayersResponse {
  players: PlayerInfo[];
  currentPlayer: string;
  turnOrder: string[];
}

// GET /api/games/:gameId/players/:playerId
interface GetPlayerResponse {
  player: PlayerInfo;
  validActions: GameAction[];
  holdings: PlayerHoldings;
}
```

#### 游戏历史

```typescript
// GET /api/games/:gameId/history
interface GetHistoryResponse {
  entries: GameHistoryEntry[];
  totalRounds: number;
  currentRound: number;
}

// GET /api/games/:gameId/history/:round
interface GetRoundHistoryResponse {
  round: number;
  phases: PhaseHistory[];
  summary: RoundSummary;
}
```

### WebSocket API

#### 连接管理

```typescript
// 连接事件
interface ConnectionEvents {
  'game:joined': { gameId: string; playerId: string };
  'game:left': { gameId: string; playerId: string };
  'game:error': { error: string; code: number };
}
```

#### 游戏事件

```typescript
// 游戏状态更新
interface GameStateUpdate {
  type: 'GAME_STATE_UPDATE';
  gameId: string;
  state: GameState;
  phase: GamePhase;
  timestamp: number;
}

// 玩家操作
interface PlayerAction {
  type: 'PLAYER_ACTION';
  gameId: string;
  playerId: string;
  action: GameAction;
  timestamp: number;
}

// 阶段变更
interface PhaseChange {
  type: 'PHASE_CHANGE';
  gameId: string;
  oldPhase: GamePhase;
  newPhase: GamePhase;
  timestamp: number;
}
```

#### 使用示例

```typescript
// 客户端 WebSocket 连接
const socket = io('ws://localhost:3000');

// 加入游戏
socket.emit('join_game', { gameId: 'game123', playerId: 'player1' });

// 监听游戏状态更新
socket.on('game_state_update', (update: GameStateUpdate) => {
  updateGameUI(update.state);
});

// 发送玩家操作
socket.emit('player_action', {
  gameId: 'game123',
  playerId: 'player1',
  action: { type: 'BID', amount: 15 }
});
```

## 数据模型

### 核心类型定义

```typescript
// 游戏状态
interface GameState {
  gameId: string;
  phase: GamePhase;
  round: number;
  players: PlayerState[];
  ships: ShipState[];
  stockPrices: StockPrices;
  gameConfig: GameConfig;
  history: GameHistoryEntry[];
}

// 玩家状态
interface PlayerState {
  id: string;
  name: string;
  cash: number;
  stocks: StockHolding[];
  investments: Investment[];
  isActive: boolean;
  isAI: boolean;
  aiStrategy?: string;
}

// 船只状态
interface ShipState {
  id: string;
  cargoType: CargoType;
  position: number;
  crew: CrewMember[];
  isDocked: boolean;
  isInShipyard: boolean;
}

// 游戏动作
interface GameAction {
  type: ActionType;
  playerId: string;
  data: any;
  timestamp: number;
}

// 动作类型
enum ActionType {
  BID = 'BID',
  BUY_STOCK = 'BUY_STOCK',
  MORTGAGE_STOCK = 'MORTGAGE_STOCK',
  SELECT_INVESTMENT = 'SELECT_INVESTMENT',
  USE_NAVIGATOR = 'USE_NAVIGATOR',
  ROLL_DICE = 'ROLL_DICE'
}
```

### 错误处理

```typescript
// 错误类型
interface GameError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// 错误代码
export const ERROR_CODES = {
  INVALID_ACTION: 'INVALID_ACTION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_PLAYER: 'INVALID_PLAYER',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  PHASE_MISMATCH: 'PHASE_MISMATCH',
  ACTION_NOT_ALLOWED: 'ACTION_NOT_ALLOWED'
} as const;
```

## 认证和授权

### JWT Token

```typescript
// 认证请求
interface AuthRequest {
  username: string;
  password: string;
}

// 认证响应
interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

// 用户信息
interface UserInfo {
  id: string;
  username: string;
  email: string;
  preferences: UserPreferences;
}
```

### 权限控制

```typescript
// 权限级别
enum PermissionLevel {
  READ_ONLY = 'READ_ONLY',
  PLAYER = 'PLAYER',
  SPECTATOR = 'SPECTATOR',
  ADMIN = 'ADMIN'
}

// 权限检查
interface PermissionCheck {
  gameId: string;
  playerId: string;
  action: string;
  requiredLevel: PermissionLevel;
}
```

## 性能优化

### 缓存策略

```typescript
// 缓存配置
interface CacheConfig {
  gameState: { ttl: 60 }; // 60 秒
  playerData: { ttl: 30 }; // 30 秒
  gameHistory: { ttl: 300 }; // 5 分钟
}

// 缓存键
export const CACHE_KEYS = {
  GAME_STATE: (gameId: string) => `game:${gameId}:state`,
  PLAYER_DATA: (gameId: string, playerId: string) => `game:${gameId}:player:${playerId}`,
  GAME_HISTORY: (gameId: string) => `game:${gameId}:history`
} as const;
```

### 分页和限制

```typescript
// 分页参数
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页响应
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## 测试 API

### 测试工具

```typescript
// 测试游戏创建
interface TestGameConfig {
  players: number;
  aiStrategies: string[];
  seed?: number;
  fastMode?: boolean;
}

// 测试辅助函数
export class TestHelper {
  static createTestGame(config: TestGameConfig): Promise<GameState>;
  static simulateGame(gameId: string, actions: GameAction[]): Promise<GameResult>;
  static validateGameState(state: GameState): ValidationResult;
}
```

## 版本控制

### API 版本

```typescript
// 版本信息
interface ApiVersion {
  version: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  migrationGuide?: string;
}

// 版本检查
export const API_VERSIONS = {
  v1: '1.0.0',
  v2: '2.0.0'
} as const;
```

### 向后兼容

```typescript
// 版本适配器
interface VersionAdapter {
  fromV1ToV2(v1Data: any): any;
  fromV2ToV1(v2Data: any): any;
}

// 自动版本检测
export class ApiClient {
  private detectVersion(response: any): string;
  private adaptResponse(data: any, version: string): any;
}
```

## 监控和日志

### 日志格式

```typescript
// 日志条目
interface LogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context: {
    gameId?: string;
    playerId?: string;
    action?: string;
    phase?: string;
  };
  metadata?: any;
}
```

### 性能指标

```typescript
// 性能指标
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  gameCount: number;
}
```

---

*最后更新: 2025-10-26*
