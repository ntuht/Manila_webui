# 架构设计文档

## 概述

Manila Web UI 采用现代化的前端架构，支持独立运行和未来与 C++ 引擎集成。

## 技术栈

### 前端技术栈

- **React 18** - 用户界面框架
- **TypeScript 5** - 类型安全的 JavaScript
- **Vite 5** - 快速构建工具
- **TailwindCSS 3** - 原子化 CSS 框架
- **Zustand** - 轻量级状态管理
- **Framer Motion** - 动画库
- **Vitest** - 测试框架

### 后端技术栈（Phase 3）

- **Node.js 18+** - 运行时环境
- **Express** - Web 框架
- **Socket.io** - 实时通信
- **N-API** - C++ 绑定层

## 项目结构

```
Manila_webui/
├── client/                    # React 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── Board/        # 游戏棋盘组件
│   │   │   ├── Auction/      # 拍卖阶段组件
│   │   │   ├── Investment/   # 投资阶段组件
│   │   │   ├── Ship/         # 船只相关组件
│   │   │   ├── Player/       # 玩家信息组件
│   │   │   └── Shared/       # 共享组件
│   │   ├── game/             # 游戏逻辑
│   │   │   ├── engine.ts     # 游戏引擎
│   │   │   ├── rules.ts      # 游戏规则
│   │   │   ├── ai.ts         # AI 策略
│   │   │   └── types.ts      # 类型定义
│   │   ├── stores/           # 状态管理
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── utils/            # 工具函数
│   │   └── styles/           # 样式文件
│   ├── public/               # 静态资源
│   └── package.json
├── server/                   # 后端服务（Phase 3）
├── desktop/                  # Electron 桌面应用（Phase 4）
└── docs/                     # 项目文档
```

## 架构模式

### 1. 组件化架构

采用 React 函数组件 + Hooks 模式：

```typescript
// 组件示例
interface PlayerCardProps {
  player: PlayerState;
  onSelect?: (id: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect }) => {
  return (
    <div className="player-card" onClick={() => onSelect?.(player.id)}>
      <h3>{player.name}</h3>
      <p>现金: {player.cash}</p>
    </div>
  );
};
```

### 2. 状态管理

使用 Zustand 进行状态管理：

```typescript
// stores/gameStore.ts
interface GameState {
  players: PlayerState[];
  currentPhase: GamePhase;
  ships: ShipState[];
  // ... 其他状态
}

interface GameActions {
  startGame: (config: GameConfig) => void;
  makeBid: (playerId: string, amount: number) => void;
  selectInvestment: (playerId: string, slot: InvestmentSlot) => void;
  // ... 其他动作
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // 状态和动作实现
}));
```

### 3. 游戏引擎设计

#### 核心引擎

```typescript
// game/engine.ts
export class GameEngine {
  private state: GameState;
  private rules: GameRules;
  
  constructor(config: GameConfig) {
    this.state = this.initializeState(config);
    this.rules = new GameRules();
  }
  
  // 游戏阶段管理
  public startAuction(): void;
  public startInvestment(): void;
  public startSailing(): void;
  public startSettlement(): void;
  
  // 动作处理
  public processAction(action: GameAction): ActionResult;
  
  // 状态查询
  public getGameState(): GameState;
  public getValidActions(playerId: string): GameAction[];
}
```

#### 游戏规则

```typescript
// game/rules.ts
export class GameRules {
  // 拍卖规则
  public validateBid(bid: number, player: PlayerState): boolean;
  public calculateMortgageValue(stocks: StockHolding[]): number;
  
  // 投资规则
  public getAvailableSlots(phase: GamePhase): InvestmentSlot[];
  public calculateSlotCost(slot: InvestmentSlot): number;
  
  // 航行规则
  public rollDice(): DiceResult;
  public moveShip(ship: ShipState, dice: DiceResult): ShipState;
  
  // 结算规则
  public calculateRewards(ships: ShipState[]): RewardDistribution;
  public updateStockPrices(ships: ShipState[]): StockPriceUpdate;
}
```

### 4. AI 策略系统

```typescript
// game/ai.ts
export interface AIStrategy {
  name: string;
  selectBid(state: GameState, playerId: string): number;
  selectInvestment(state: GameState, playerId: string): InvestmentSlot;
  selectNavigatorAction(state: GameState, playerId: string): NavigatorAction;
}

export class GreedyStrategy implements AIStrategy {
  selectBid(state: GameState, playerId: string): number {
    // 贪婪策略实现
  }
}

export class RiskAwareStrategy implements AIStrategy {
  selectBid(state: GameState, playerId: string): number {
    // 风险感知策略实现
  }
}
```

## 数据流设计

### 1. 游戏状态流

```
用户操作 → Action → GameEngine → State Update → UI 更新
```

### 2. 组件通信

```
父组件 → Props → 子组件
子组件 → Callback → 父组件
全局状态 → Zustand Store → 所有组件
```

### 3. 异步操作

```
用户操作 → Async Action → Loading State → Success/Error → UI 更新
```

## 性能优化策略

### 1. React 优化

- 使用 `React.memo` 避免不必要的重渲染
- 使用 `useMemo` 和 `useCallback` 优化计算
- 组件懒加载

```typescript
// 组件优化示例
export const PlayerCard = React.memo<PlayerCardProps>(({ player, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect?.(player.id);
  }, [player.id, onSelect]);
  
  return (
    <div onClick={handleClick}>
      {/* 组件内容 */}
    </div>
  );
});
```

### 2. 状态管理优化

- 状态分割，避免大对象
- 使用选择器减少订阅
- 批量更新状态

```typescript
// 状态选择器
export const usePlayerState = (playerId: string) => 
  useGameStore(state => state.players.find(p => p.id === playerId));

export const useGamePhase = () => 
  useGameStore(state => state.currentPhase);
```

### 3. 渲染优化

- 虚拟化长列表
- 防抖用户输入
- 动画性能优化

## 错误处理

### 1. 错误边界

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Game Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 2. 游戏状态验证

```typescript
// utils/validation.ts
export const validateGameState = (state: GameState): ValidationResult => {
  const errors: string[] = [];
  
  // 验证玩家状态
  if (state.players.some(p => p.cash < 0)) {
    errors.push('玩家现金不能为负数');
  }
  
  // 验证船只状态
  if (state.ships.some(s => s.position < 0 || s.position > 13)) {
    errors.push('船只位置超出范围');
  }
  
  return { isValid: errors.length === 0, errors };
};
```

## 测试策略

### 1. 单元测试

```typescript
// game/rules.test.ts
describe('GameRules', () => {
  it('should validate bid correctly', () => {
    const rules = new GameRules();
    const player = { cash: 30, stocks: [] };
    expect(rules.validateBid(25, player)).toBe(true);
    expect(rules.validateBid(35, player)).toBe(false);
  });
});
```

### 2. 组件测试

```typescript
// components/PlayerCard.test.tsx
describe('PlayerCard', () => {
  it('should render player information', () => {
    const player = { id: '1', name: 'Alice', cash: 30 };
    render(<PlayerCard player={player} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

### 3. 集成测试

```typescript
// game/integration.test.ts
describe('Game Flow', () => {
  it('should complete full game cycle', async () => {
    const engine = new GameEngine();
    engine.startGame({ players: 3, rounds: 3 });
    
    // 模拟完整游戏流程
    // 验证最终状态
  });
});
```

## 部署架构

### Phase 1: 静态部署

```
GitHub → Vercel/Netlify → CDN → 用户浏览器
```

### Phase 3: 全栈部署

```
Frontend (Vercel) ←→ Backend (Railway/DigitalOcean) ←→ C++ Engine
```

### Phase 4: 桌面应用

```
Electron App ←→ Local Backend ←→ C++ Engine
```

## 扩展性设计

### 1. 插件系统

```typescript
// 策略插件接口
export interface StrategyPlugin {
  name: string;
  version: string;
  createStrategy(): AIStrategy;
}

// 插件注册
export class StrategyRegistry {
  private plugins: Map<string, StrategyPlugin> = new Map();
  
  register(plugin: StrategyPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  createStrategy(name: string): AIStrategy {
    const plugin = this.plugins.get(name);
    return plugin?.createStrategy() ?? new DefaultStrategy();
  }
}
```

### 2. 主题系统

```typescript
// 主题配置
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
}

// 主题切换
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  
  const switchTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme.name);
  }, []);
  
  return { theme, switchTheme };
};
```

## 安全考虑

### 1. 输入验证

- 所有用户输入必须验证
- 防止 XSS 攻击
- 限制文件上传

### 2. 状态安全

- 游戏状态不可变
- 操作权限验证
- 防作弊机制

### 3. 数据保护

- 敏感数据加密
- 安全的本地存储
- 隐私保护

## 监控和调试

### 1. 开发工具

- React DevTools
- Redux DevTools (Zustand 兼容)
- 游戏状态调试器

### 2. 性能监控

- 渲染性能分析
- 内存使用监控
- 网络请求追踪

### 3. 错误追踪

- 错误日志收集
- 用户行为追踪
- 崩溃报告

---

*最后更新: 2025-10-26*
