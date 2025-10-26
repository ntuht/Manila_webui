# 贡献指南

感谢您考虑为 Manila Web UI 项目做出贡献！

## 📋 目录

1. [行为准则](#行为准则)
2. [如何贡献](#如何贡献)
3. [开发流程](#开发流程)
4. [代码规范](#代码规范)
5. [提交规范](#提交规范)
6. [Pull Request 流程](#pull-request-流程)
7. [问题报告](#问题报告)

## 行为准则

- 尊重所有贡献者
- 欢迎建设性的反馈
- 专注于项目目标
- 保持专业和友好的交流

## 如何贡献

### 贡献方式

- 🐛 报告 Bug
- 💡 提出新特性建议
- 📝 改进文档
- 🔧 修复问题
- ✨ 实现新功能
- ✅ 编写测试
- 🎨 优化 UI/UX

### 开始之前

1. 查看 [Issues](../../issues) 了解当前任务
2. 阅读 [ROADMAP.md](docs/ROADMAP.md) 了解项目方向
3. 熟悉 [开发指南](docs/DEVELOPMENT.md)

## 开发流程

### 1. Fork 项目

```bash
# Fork 项目到你的 GitHub 账户
# 然后克隆你的 fork
git clone https://github.com/YOUR_USERNAME/Manila_webui.git
cd Manila_webui
```

### 2. 设置开发环境

```bash
# 添加上游仓库
git remote add upstream https://github.com/ORIGINAL_OWNER/Manila_webui.git

# 安装依赖
cd client
npm install
```

### 3. 创建分支

```bash
# 从 develop 分支创建功能分支
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### 4. 开发

```bash
# 启动开发服务器
npm run dev

# 运行测试（开发时）
npm run test:watch

# 类型检查
npm run type-check
```

### 5. 提交更改

遵循 [提交规范](#提交规范)

```bash
git add .
git commit -m "feat(auction): add bidding UI component"
```

### 6. 推送并创建 PR

```bash
git push origin feature/your-feature-name
# 然后在 GitHub 上创建 Pull Request
```

## 代码规范

### TypeScript 规范

- **使用 TypeScript 严格模式**
- **避免使用 `any` 类型**
- **优先使用 `interface` 而非 `type`**（除非需要联合类型）
- **导出所有公共类型**

```typescript
// ✅ 好的做法
interface PlayerState {
  id: string;
  name: string;
  cash: number;
  stocks: StockHolding[];
}

function updatePlayer(player: PlayerState): PlayerState {
  return { ...player, cash: player.cash + 10 };
}

// ❌ 避免
function updatePlayer(player: any) {
  player.cash += 10;
  return player;
}
```

### React 规范

- **使用函数组件和 Hooks**
- **组件命名使用 PascalCase**
- **Props 接口以 `Props` 结尾**
- **使用 `React.FC` 或显式类型标注**

```typescript
// ✅ 好的做法
interface PlayerCardProps {
  player: PlayerState;
  onSelect?: (id: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect }) => {
  return (
    <div onClick={() => onSelect?.(player.id)}>
      {player.name}
    </div>
  );
};

// ❌ 避免
export const playerCard = (props) => {
  return <div>{props.player.name}</div>;
};
```

### 样式规范

- **使用 TailwindCSS 工具类**
- **避免内联样式**（除非动态值）
- **复杂样式抽取为组件类**

```typescript
// ✅ 好的做法
<div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
  <PlayerCard player={player} />
</div>

// ❌ 避免
<div style={{ display: 'flex', padding: '16px' }}>
  <PlayerCard player={player} />
</div>
```

### 文件命名

- **组件文件**: `PascalCase.tsx` (例: `PlayerCard.tsx`)
- **工具文件**: `camelCase.ts` (例: `gameUtils.ts`)
- **类型文件**: `camelCase.types.ts` (例: `game.types.ts`)
- **测试文件**: `*.test.ts` 或 `*.spec.ts`

### 目录结构

```
components/
  ├── Player/
  │   ├── PlayerCard.tsx
  │   ├── PlayerPanel.tsx
  │   ├── index.ts           # 导出所有组件
  │   └── Player.test.tsx
  └── Shared/
      ├── Button.tsx
      └── index.ts
```

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关
- `ci`: CI/CD 配置
- `revert`: 回滚提交

### Scope 范围

- `auction`: 拍卖阶段
- `investment`: 投资阶段
- `sailing`: 航行阶段
- `settlement`: 结算阶段
- `ai`: AI 策略
- `ui`: 用户界面
- `game`: 游戏引擎
- `types`: 类型定义
- `docs`: 文档

### 示例

```bash
# 新功能
feat(auction): add mortgage stock selection UI

# Bug 修复
fix(game): correct ship position calculation after dice roll

# 文档
docs(readme): update installation instructions

# 重构
refactor(investment): extract slot selection logic to hook

# 性能优化
perf(ui): memoize expensive game state calculations
```

### Subject 要求

- 使用祈使句（"add" 而非 "added"）
- 不大写首字母
- 不以句号结尾
- 限制在 50 个字符内

### Body（可选）

- 详细说明更改内容
- 解释为什么做这个更改
- 每行限制在 72 个字符内

### Footer（可选）

- 关联 Issue: `Closes #123`
- Breaking Changes: `BREAKING CHANGE: description`

## Pull Request 流程

### PR 要求

1. **分支命名**
   - `feature/功能名称` - 新功能
   - `fix/问题描述` - Bug 修复
   - `docs/文档类型` - 文档更新
   - `refactor/重构内容` - 代码重构

2. **PR 标题**
   - 遵循提交规范格式
   - 清晰描述主要更改

3. **PR 描述**
   ```markdown
   ## 更改内容
   - 添加了拍卖阶段的出价 UI
   - 实现了抵押股票功能
   
   ## 相关 Issue
   Closes #42
   
   ## 测试
   - [x] 单元测试通过
   - [x] 手动测试完成
   - [ ] E2E 测试（如适用）
   
   ## 截图（如适用）
   ![Screenshot](url)
   
   ## 检查清单
   - [x] 代码遵循项目规范
   - [x] 添加了必要的测试
   - [x] 更新了相关文档
   - [x] 所有测试通过
   ```

4. **代码审查**
   - 至少需要一位审查者批准
   - 解决所有审查意见
   - 确保 CI 检查通过

5. **合并策略**
   - `develop` 分支: Squash and merge
   - `main` 分支: Merge commit

### PR 检查清单

提交 PR 前确保：

- [ ] 代码通过 TypeScript 类型检查
- [ ] 代码通过 ESLint 检查
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 遵循代码规范
- [ ] 提交信息符合规范
- [ ] PR 描述清晰完整

## 问题报告

### Bug 报告

使用 Bug 报告模板，包含：

1. **问题描述** - 清晰描述问题
2. **复现步骤** - 详细的复现步骤
3. **期望行为** - 应该发生什么
4. **实际行为** - 实际发生了什么
5. **环境信息** - 浏览器、操作系统、Node 版本等
6. **截图/日志** - 相关的截图或错误日志

### 功能请求

使用功能请求模板，包含：

1. **功能描述** - 想要什么功能
2. **使用场景** - 为什么需要这个功能
3. **建议实现** - 如何实现（可选）
4. **替代方案** - 其他可能的方案
5. **优先级** - 功能的重要程度

## 测试要求

### 单元测试

- 所有工具函数必须有测试
- 游戏逻辑必须有测试
- 覆盖率目标: 80%+

```typescript
// game/rules.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStockPrice } from './rules';

describe('calculateStockPrice', () => {
  it('should increase price by 5 when ship docks', () => {
    expect(calculateStockPrice(10, true)).toBe(15);
  });
  
  it('should maintain price when ship does not dock', () => {
    expect(calculateStockPrice(10, false)).toBe(10);
  });
});
```

### 组件测试

- 关键 UI 组件需要测试
- 测试用户交互
- 测试边界情况

```typescript
// components/Player/PlayerCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerCard } from './PlayerCard';

describe('PlayerCard', () => {
  it('should render player name', () => {
    const player = { id: '1', name: 'Alice', cash: 30, stocks: [] };
    render(<PlayerCard player={player} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
  
  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn();
    const player = { id: '1', name: 'Alice', cash: 30, stocks: [] };
    render(<PlayerCard player={player} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

## 文档贡献

文档同样重要！可以贡献的方面：

- 修复文档中的错误
- 改进现有文档的清晰度
- 添加示例代码
- 翻译文档（英文/中文）
- 添加图表和示意图

## 联系方式

- **Issue 讨论**: 在 GitHub Issues 中讨论
- **功能建议**: 使用 GitHub Discussions
- **紧急问题**: 提交 Issue 并标记 `urgent`

## 感谢

感谢所有贡献者的付出！每一个贡献都让项目变得更好。

---

Happy Coding! 🎮

