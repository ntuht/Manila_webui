# 开发指南

## 环境要求

### 必需软件

- **Node.js**: 18.0+ (推荐使用 LTS 版本)
- **npm**: 9.0+ 或 **pnpm**: 8.0+
- **Git**: 2.30+
- **VS Code**: 推荐编辑器

### 推荐工具

- **VS Code 扩展**:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Importer
  - Tailwind CSS IntelliSense
  - Prettier - Code formatter
  - ESLint
  - Auto Rename Tag
  - Bracket Pair Colorizer

- **浏览器扩展**:
  - React Developer Tools
  - Redux DevTools (Zustand 兼容)

## 项目设置

### 1. 克隆项目

```bash
git clone <repository-url>
cd Manila_webui
```

### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm (推荐)
pnpm install
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
code .env.local
```

### 4. 启动开发服务器

```bash
# 开发模式
npm run dev

# 或使用 pnpm
pnpm dev
```

访问 `http://localhost:5173` 查看应用。

## 开发工作流

### 1. 分支管理

```bash
# 从 develop 分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 开发完成后
git add .
git commit -m "feat(scope): your commit message"
git push origin feature/your-feature-name

# 创建 Pull Request
```

### 2. 代码规范

#### TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### ESLint 配置

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### 3. 提交规范

使用 Conventional Commits 规范：

```bash
# 功能开发
git commit -m "feat(auction): add bidding UI component"

# Bug 修复
git commit -m "fix(game): correct ship position calculation"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(investment): extract slot selection logic"

# 性能优化
git commit -m "perf(ui): memoize expensive calculations"
```

## 项目结构详解

### 目录结构

```
src/
├── components/           # React 组件
│   ├── Board/          # 游戏棋盘组件
│   ├── Auction/        # 拍卖阶段组件
│   ├── Investment/     # 投资阶段组件
│   ├── Ship/           # 船只相关组件
│   ├── Player/         # 玩家信息组件
│   └── Shared/         # 共享组件
├── game/               # 游戏逻辑
│   ├── engine.ts       # 游戏引擎
│   ├── rules.ts        # 游戏规则
│   ├── ai.ts          # AI 策略
│   └── types.ts       # 类型定义
├── stores/             # 状态管理
│   └── gameStore.ts    # 游戏状态存储
├── hooks/              # 自定义 Hooks
├── utils/              # 工具函数
├── styles/             # 样式文件
├── assets/             # 静态资源
└── types/              # 类型定义
```

### 组件开发规范

#### 1. 组件文件结构

```typescript
// components/Player/PlayerCard.tsx
import React from 'react';
import { PlayerState } from '../../game/types';
import { Card } from '../Shared/Card';

interface PlayerCardProps {
  player: PlayerState;
  onSelect?: (id: string) => void;
  isActive?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onSelect,
  isActive = false
}) => {
  const handleClick = () => {
    onSelect?.(player.id);
  };

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isActive ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      <h3 className="font-semibold text-lg">{player.name}</h3>
      <p className="text-gray-600">现金: {player.cash}</p>
    </Card>
  );
};
```

#### 2. 组件测试

```typescript
// components/Player/PlayerCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerCard } from './PlayerCard';
import { PlayerState } from '../../game/types';

describe('PlayerCard', () => {
  const mockPlayer: PlayerState = {
    id: '1',
    name: 'Alice',
    cash: 30,
    stocks: [],
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
    const onSelect = jest.fn();
    render(<PlayerCard player={mockPlayer} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

### 状态管理

#### Zustand Store 结构

```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameState, GameActions } from '../game/types';

interface GameStore extends GameState, GameActions {}

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      gameState: null,
      currentPhase: 'LOBBY',
      players: [],
      ships: [],
      
      // 动作
      startGame: (config) => {
        set({ gameState: initializeGame(config) });
      },
      
      makeBid: (playerId, amount) => {
        const result = processBid(get().gameState, playerId, amount);
        if (result.success) {
          set({ gameState: result.newState });
        }
        return result;
      },
      
      // 其他动作...
    }),
    { name: 'game-store' }
  )
);
```

### 游戏逻辑开发

#### 1. 游戏引擎

```typescript
// game/engine.ts
export class GameEngine {
  private state: GameState;
  private rules: GameRules;
  
  constructor(config: GameConfig) {
    this.state = this.initializeState(config);
    this.rules = new GameRules();
  }
  
  public processAction(action: GameAction): ActionResult {
    // 验证动作
    const validation = this.rules.validateAction(action, this.state);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    
    // 执行动作
    const newState = this.applyAction(this.state, action);
    this.state = newState;
    
    return { success: true, newState };
  }
  
  private applyAction(state: GameState, action: GameAction): GameState {
    // 根据动作类型执行相应逻辑
    switch (action.type) {
      case 'BID':
        return this.processBid(state, action);
      case 'INVESTMENT':
        return this.processInvestment(state, action);
      // 其他动作...
    }
  }
}
```

#### 2. 游戏规则

```typescript
// game/rules.ts
export class GameRules {
  public validateBid(bid: number, player: PlayerState): ValidationResult {
    if (bid < 0) {
      return { isValid: false, error: '出价不能为负数' };
    }
    
    if (bid > player.cash + this.calculateMortgageValue(player.stocks)) {
      return { isValid: false, error: '资金不足' };
    }
    
    return { isValid: true };
  }
  
  public calculateMortgageValue(stocks: StockHolding[]): number {
    return stocks.length * 12; // 每张股票抵押获得 12 现金
  }
}
```

## 测试策略

### 1. 单元测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

#### 测试示例

```typescript
// game/rules.test.ts
import { describe, it, expect } from 'vitest';
import { GameRules } from './rules';

describe('GameRules', () => {
  const rules = new GameRules();
  
  describe('validateBid', () => {
    it('should accept valid bid', () => {
      const player = { cash: 30, stocks: [] };
      const result = rules.validateBid(25, player);
      expect(result.isValid).toBe(true);
    });
    
    it('should reject bid exceeding available funds', () => {
      const player = { cash: 10, stocks: [] };
      const result = rules.validateBid(25, player);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('资金不足');
    });
  });
});
```

### 2. 组件测试

```typescript
// 使用 React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { GameBoard } from '../GameBoard';

describe('GameBoard', () => {
  it('should render ship tracks', () => {
    render(<GameBoard />);
    expect(screen.getByText('翡翠')).toBeInTheDocument();
    expect(screen.getByText('丝绸')).toBeInTheDocument();
  });
});
```

### 3. 集成测试

```typescript
// game/integration.test.ts
describe('Game Flow Integration', () => {
  it('should complete full auction phase', async () => {
    const engine = new GameEngine({ players: 3 });
    engine.startGame();
    
    // 模拟拍卖阶段
    const bidResult = engine.processAction({
      type: 'BID',
      playerId: 'player1',
      amount: 15
    });
    
    expect(bidResult.success).toBe(true);
  });
});
```

## 调试技巧

### 1. React DevTools

- 安装 React Developer Tools 浏览器扩展
- 使用 Components 标签页查看组件树
- 使用 Profiler 标签页分析性能

### 2. Zustand DevTools

```typescript
// 启用 DevTools
export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // store 实现
    }),
    { name: 'game-store' }
  )
);
```

### 3. 游戏状态调试

```typescript
// utils/debug.ts
export const debugGameState = (state: GameState) => {
  console.group('Game State Debug');
  console.log('Current Phase:', state.phase);
  console.log('Players:', state.players);
  console.log('Ships:', state.ships);
  console.log('Stock Prices:', state.stockPrices);
  console.groupEnd();
};
```

## 性能优化

### 1. React 优化

```typescript
// 使用 React.memo 避免不必要的重渲染
export const PlayerCard = React.memo<PlayerCardProps>(({ player, onSelect }) => {
  return (
    <div onClick={() => onSelect?.(player.id)}>
      {player.name}
    </div>
  );
});

// 使用 useMemo 优化计算
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(gameState);
}, [gameState.players, gameState.ships]);

// 使用 useCallback 优化函数
const handlePlayerSelect = useCallback((playerId: string) => {
  setSelectedPlayer(playerId);
}, []);
```

### 2. 状态管理优化

```typescript
// 使用选择器避免不必要的订阅
export const usePlayerState = (playerId: string) => 
  useGameStore(state => state.players.find(p => p.id === playerId));

export const useGamePhase = () => 
  useGameStore(state => state.currentPhase);
```

## 部署

### 1. 开发环境

```bash
# 启动开发服务器
npm run dev

# 访问应用
open http://localhost:5173
```

### 2. 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 3. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 生产部署
vercel --prod
```

## 常见问题

### Q: 如何添加新的游戏阶段？

A: 在 `game/types.ts` 中定义新的阶段类型，在 `game/engine.ts` 中实现处理逻辑，在组件中创建对应的 UI。

### Q: 如何调试状态更新？

A: 使用 Zustand DevTools 或添加 console.log 在 store 的 action 中。

### Q: 如何处理异步操作？

A: 使用 async/await 或 Promise，在 action 中处理异步逻辑。

### Q: 如何优化性能？

A: 使用 React.memo、useMemo、useCallback，避免不必要的重渲染。

## 开发最佳实践

### 1. 代码组织

- 按功能模块组织代码
- 保持组件单一职责
- 使用 TypeScript 严格模式
- 编写清晰的注释

### 2. 测试驱动开发

- 先写测试，再写实现
- 保持测试覆盖率 > 80%
- 测试边界情况
- 模拟外部依赖

### 3. 性能考虑

- 避免在 render 中创建对象
- 使用 React.memo 优化组件
- 合理使用状态管理
- 监控性能指标

---

*最后更新: 2025-10-26*
