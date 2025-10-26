# 测试指南

## 测试策略

### 测试金字塔

```
    E2E Tests (少量)
   /               \
  /                 \
 /                   \
/ Integration Tests   \
\ (适量)             /
 \                   /
  \                 /
   \               /
    Unit Tests (大量)
```

### 测试覆盖率目标

- **单元测试**: 80%+
- **集成测试**: 60%+
- **E2E 测试**: 关键用户流程

## 测试工具配置

### 1. Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

### 2. 测试环境设置

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展 expect 匹配器
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});
```

### 3. 测试工具

```typescript
// src/test/test-utils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { GameProvider } from '../stores/GameProvider';

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return <GameProvider>{children}</GameProvider>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## 单元测试

### 1. 游戏逻辑测试

```typescript
// game/rules.test.ts
import { describe, it, expect } from 'vitest';
import { GameRules } from '../rules';
import { PlayerState, StockHolding } from '../types';

describe('GameRules', () => {
  const rules = new GameRules();
  
  describe('validateBid', () => {
    it('should accept valid bid within player cash', () => {
      const player: PlayerState = {
        id: '1',
        name: 'Alice',
        cash: 30,
        stocks: [],
        investments: [],
        isActive: true,
        isAI: false
      };
      
      const result = rules.validateBid(25, player);
      expect(result.isValid).toBe(true);
    });
    
    it('should accept bid with mortgage', () => {
      const player: PlayerState = {
        id: '1',
        name: 'Alice',
        cash: 10,
        stocks: [{ cargoType: 'JADE', quantity: 2 }],
        investments: [],
        isActive: true,
        isAI: false
      };
      
      const result = rules.validateBid(25, player);
      expect(result.isValid).toBe(true);
    });
    
    it('should reject bid exceeding available funds', () => {
      const player: PlayerState = {
        id: '1',
        name: 'Alice',
        cash: 10,
        stocks: [],
        investments: [],
        isActive: true,
        isAI: false
      };
      
      const result = rules.validateBid(25, player);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('资金不足');
    });
  });
  
  describe('calculateMortgageValue', () => {
    it('should calculate correct mortgage value', () => {
      const stocks: StockHolding[] = [
        { cargoType: 'JADE', quantity: 2 },
        { cargoType: 'SILK', quantity: 1 }
      ];
      
      const value = rules.calculateMortgageValue(stocks);
      expect(value).toBe(36); // (2 + 1) * 12
    });
  });
});
```

### 2. 游戏引擎测试

```typescript
// game/engine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine';
import { GameConfig, GameAction } from '../types';

describe('GameEngine', () => {
  let engine: GameEngine;
  let config: GameConfig;
  
  beforeEach(() => {
    config = {
      players: 3,
      rounds: 3,
      aiStrategies: ['greedy']
    };
    engine = new GameEngine(config);
  });
  
  describe('processAction', () => {
    it('should process valid bid action', () => {
      const action: GameAction = {
        type: 'BID',
        playerId: 'player1',
        amount: 15,
        timestamp: Date.now()
      };
      
      const result = engine.processAction(action);
      expect(result.success).toBe(true);
      expect(result.newState).toBeDefined();
    });
    
    it('should reject invalid action', () => {
      const action: GameAction = {
        type: 'BID',
        playerId: 'invalid-player',
        amount: 15,
        timestamp: Date.now()
      };
      
      const result = engine.processAction(action);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('game phases', () => {
    it('should transition through phases correctly', () => {
      engine.startGame();
      expect(engine.getCurrentPhase()).toBe('AUCTION');
      
      // 模拟拍卖完成
      engine.processAction({
        type: 'BID',
        playerId: 'player1',
        amount: 15,
        timestamp: Date.now()
      });
      
      // 验证阶段转换
      expect(engine.getCurrentPhase()).toBe('INVESTMENT');
    });
  });
});
```

### 3. AI 策略测试

```typescript
// game/ai.test.ts
import { describe, it, expect } from 'vitest';
import { GreedyStrategy, RiskAwareStrategy } from '../ai';
import { GameState } from '../types';

describe('AI Strategies', () => {
  const mockGameState: GameState = {
    gameId: 'test-game',
    phase: 'AUCTION',
    round: 1,
    players: [
      {
        id: 'ai-player',
        name: 'AI',
        cash: 30,
        stocks: [],
        investments: [],
        isActive: true,
        isAI: true
      }
    ],
    ships: [],
    stockPrices: { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 },
    gameConfig: { players: 3, rounds: 3, aiStrategies: [] },
    history: []
  };
  
  describe('GreedyStrategy', () => {
    it('should make aggressive bids', () => {
      const strategy = new GreedyStrategy();
      const bid = strategy.selectBid(mockGameState, 'ai-player');
      
      expect(bid).toBeGreaterThan(0);
      expect(bid).toBeLessThanOrEqual(30);
    });
  });
  
  describe('RiskAwareStrategy', () => {
    it('should make conservative bids', () => {
      const strategy = new RiskAwareStrategy();
      const bid = strategy.selectBid(mockGameState, 'ai-player');
      
      expect(bid).toBeGreaterThan(0);
      expect(bid).toBeLessThanOrEqual(20); // 更保守
    });
  });
});
```

## 组件测试

### 1. 基础组件测试

```typescript
// components/Shared/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  
  it('should show loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 2. 游戏组件测试

```typescript
// components/Player/PlayerCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerCard } from './PlayerCard';
import { PlayerState } from '../../game/types';

describe('PlayerCard', () => {
  const mockPlayer: PlayerState = {
    id: '1',
    name: 'Alice',
    cash: 30,
    stocks: [{ cargoType: 'JADE', quantity: 2 }],
    investments: [],
    isActive: true,
    isAI: false
  };
  
  it('should render player information', () => {
    render(<PlayerCard player={mockPlayer} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('现金: 30')).toBeInTheDocument();
  });
  
  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<PlayerCard player={mockPlayer} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
  
  it('should show active state', () => {
    render(<PlayerCard player={mockPlayer} isActive />);
    expect(screen.getByText('Alice').closest('div')).toHaveClass('ring-2');
  });
});
```

### 3. 状态管理测试

```typescript
// stores/gameStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { GameConfig } from '../game/types';

describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });
  
  it('should initialize with default state', () => {
    const state = useGameStore.getState();
    expect(state.currentPhase).toBe('LOBBY');
    expect(state.players).toEqual([]);
  });
  
  it('should start game with config', () => {
    const config: GameConfig = {
      players: 3,
      rounds: 3,
      aiStrategies: ['greedy']
    };
    
    useGameStore.getState().startGame(config);
    const state = useGameStore.getState();
    
    expect(state.currentPhase).toBe('AUCTION');
    expect(state.players).toHaveLength(3);
  });
  
  it('should process bid action', () => {
    const config: GameConfig = {
      players: 3,
      rounds: 3,
      aiStrategies: ['greedy']
    };
    
    useGameStore.getState().startGame(config);
    const result = useGameStore.getState().makeBid('player1', 15);
    
    expect(result.success).toBe(true);
  });
});
```

## 集成测试

### 1. 游戏流程测试

```typescript
// game/integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine';
import { GameConfig, GameAction } from '../types';

describe('Game Flow Integration', () => {
  let engine: GameEngine;
  let config: GameConfig;
  
  beforeEach(() => {
    config = {
      players: 3,
      rounds: 3,
      aiStrategies: ['greedy', 'risk_aware']
    };
    engine = new GameEngine(config);
  });
  
  it('should complete full auction phase', async () => {
    engine.startGame();
    
    // 模拟所有玩家出价
    const bids: GameAction[] = [
      { type: 'BID', playerId: 'player1', amount: 10, timestamp: Date.now() },
      { type: 'BID', playerId: 'player2', amount: 15, timestamp: Date.now() },
      { type: 'BID', playerId: 'player3', amount: 20, timestamp: Date.now() }
    ];
    
    for (const bid of bids) {
      const result = engine.processAction(bid);
      expect(result.success).toBe(true);
    }
    
    // 验证拍卖阶段完成
    expect(engine.getCurrentPhase()).toBe('INVESTMENT');
  });
  
  it('should complete full game cycle', async () => {
    engine.startGame();
    
    // 模拟完整游戏流程
    // 1. 拍卖阶段
    await simulateAuctionPhase(engine);
    
    // 2. 投资阶段
    await simulateInvestmentPhase(engine);
    
    // 3. 航行阶段
    await simulateSailingPhase(engine);
    
    // 4. 结算阶段
    await simulateSettlementPhase(engine);
    
    // 验证游戏状态
    const state = engine.getGameState();
    expect(state.round).toBe(1);
    expect(state.phase).toBe('AUCTION'); // 下一轮开始
  });
});

async function simulateAuctionPhase(engine: GameEngine) {
  // 模拟拍卖逻辑
}

async function simulateInvestmentPhase(engine: GameEngine) {
  // 模拟投资逻辑
}

async function simulateSailingPhase(engine: GameEngine) {
  // 模拟航行逻辑
}

async function simulateSettlementPhase(engine: GameEngine) {
  // 模拟结算逻辑
}
```

### 2. 组件集成测试

```typescript
// components/Game/GameInterface.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameInterface } from './GameInterface';
import { GameProvider } from '../../stores/GameProvider';

describe('GameInterface Integration', () => {
  it('should render complete game interface', () => {
    render(
      <GameProvider>
        <GameInterface />
      </GameProvider>
    );
    
    expect(screen.getByText('Manila')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /开始游戏/i })).toBeInTheDocument();
  });
  
  it('should handle game start flow', async () => {
    render(
      <GameProvider>
        <GameInterface />
      </GameProvider>
    );
    
    const startButton = screen.getByRole('button', { name: /开始游戏/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('拍卖阶段')).toBeInTheDocument();
    });
  });
});
```

## E2E 测试

### 1. Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

### 2. E2E 测试用例

```typescript
// e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should complete full game', async ({ page }) => {
    await page.goto('/');
    
    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    await expect(page.locator('text=拍卖阶段')).toBeVisible();
    
    // 拍卖阶段
    await page.fill('input[placeholder="出价金额"]', '15');
    await page.click('button:has-text("出价")');
    
    // 投资阶段
    await expect(page.locator('text=投资阶段')).toBeVisible();
    await page.click('[data-testid="crew-slot-1"]');
    
    // 航行阶段
    await expect(page.locator('text=航行阶段')).toBeVisible();
    await page.click('button:has-text("投掷骰子")');
    
    // 结算阶段
    await expect(page.locator('text=结算阶段')).toBeVisible();
    await page.click('button:has-text("下一轮")');
  });
  
  test('should handle AI players', async ({ page }) => {
    await page.goto('/');
    
    // 设置 AI 玩家
    await page.click('button:has-text("设置")');
    await page.selectOption('select[name="player2-strategy"]', 'greedy');
    await page.selectOption('select[name="player3-strategy"]', 'risk_aware');
    await page.click('button:has-text("确认")');
    
    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    
    // 验证 AI 自动操作
    await expect(page.locator('text=AI 玩家已出价')).toBeVisible();
  });
});
```

## 测试数据管理

### 1. 测试数据工厂

```typescript
// test/factories/GameFactory.ts
import { GameState, PlayerState, ShipState } from '../../src/game/types';

export class GameFactory {
  static createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
    return {
      id: 'player1',
      name: 'Test Player',
      cash: 30,
      stocks: [],
      investments: [],
      isActive: true,
      isAI: false,
      ...overrides
    };
  }
  
  static createShip(overrides: Partial<ShipState> = {}): ShipState {
    return {
      id: 'ship1',
      cargoType: 'JADE',
      position: 0,
      crew: [],
      isDocked: false,
      isInShipyard: false,
      ...overrides
    };
  }
  
  static createGameState(overrides: Partial<GameState> = {}): GameState {
    return {
      gameId: 'test-game',
      phase: 'AUCTION',
      round: 1,
      players: [this.createPlayer()],
      ships: [this.createShip()],
      stockPrices: { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 },
      gameConfig: { players: 3, rounds: 3, aiStrategies: [] },
      history: [],
      ...overrides
    };
  }
}
```

### 2. 测试工具函数

```typescript
// test/utils/testHelpers.ts
import { GameEngine } from '../../src/game/engine';
import { GameConfig } from '../../src/game/types';

export const createTestGame = (config: Partial<GameConfig> = {}) => {
  const defaultConfig: GameConfig = {
    players: 3,
    rounds: 3,
    aiStrategies: ['greedy']
  };
  
  return new GameEngine({ ...defaultConfig, ...config });
};

export const simulatePlayerActions = async (
  engine: GameEngine,
  actions: Array<{ playerId: string; action: any }>
) => {
  for (const { playerId, action } of actions) {
    const result = engine.processAction({
      ...action,
      playerId,
      timestamp: Date.now()
    });
    
    if (!result.success) {
      throw new Error(`Action failed: ${result.error}`);
    }
  }
};
```

## 性能测试

### 1. 渲染性能测试

```typescript
// test/performance/render.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GameBoard } from '../../src/components/Board/GameBoard';
import { GameProvider } from '../../src/stores/GameProvider';

describe('Render Performance', () => {
  it('should render game board within time limit', () => {
    const startTime = performance.now();
    
    render(
      <GameProvider>
        <GameBoard />
      </GameProvider>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(100); // 100ms 内完成渲染
  });
});
```

### 2. 内存泄漏测试

```typescript
// test/performance/memory.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/game/engine';

describe('Memory Management', () => {
  it('should not leak memory during game cycles', () => {
    const engine = new GameEngine({ players: 3, rounds: 3, aiStrategies: [] });
    
    // 模拟多个游戏周期
    for (let i = 0; i < 10; i++) {
      engine.startGame();
      // 执行游戏操作...
      engine.endGame();
    }
    
    // 检查内存使用
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

## 测试最佳实践

### 1. 测试命名

```typescript
// 好的测试命名
describe('GameRules', () => {
  describe('validateBid', () => {
    it('should accept valid bid within player cash', () => {});
    it('should reject bid exceeding available funds', () => {});
    it('should accept bid with mortgage when cash insufficient', () => {});
  });
});

// 避免的测试命名
describe('GameRules', () => {
  it('test1', () => {});
  it('should work', () => {});
});
```

### 2. 测试结构

```typescript
// AAA 模式：Arrange, Act, Assert
describe('GameEngine', () => {
  it('should process valid action', () => {
    // Arrange
    const engine = new GameEngine(config);
    const action = { type: 'BID', playerId: '1', amount: 15 };
    
    // Act
    const result = engine.processAction(action);
    
    // Assert
    expect(result.success).toBe(true);
  });
});
```

### 3. 测试隔离

```typescript
// 每个测试前重置状态
describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });
  
  it('should start with clean state', () => {
    const state = useGameStore.getState();
    expect(state.players).toEqual([]);
  });
});
```

---

*最后更新: 2025-10-26*