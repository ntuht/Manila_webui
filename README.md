# Manila Web UI

> 马尼拉桌游的现代化 Web 界面实现

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)

## 🎮 项目简介

Manila Web UI 是一个交互式的 Web 应用，为经典桌游马尼拉（Manila）提供：

- 🎯 **人机对战模式** - 与 AI 对手进行游戏
- 👁️ **观战模式** - 观看 AI vs AI 对局
- 📊 **数据分析** - 游戏统计和策略分析
- 🔄 **回放系统** - 回放历史对局

## ✨ 特性

### 当前版本 (Phase 1 - 开发中)

- [ ] 完整的游戏规则实现
- [ ] 流畅的游戏界面
- [ ] 多种 AI 策略
- [ ] 响应式设计

### 计划中 (Phase 2-4)

- [ ] AI vs AI 观战模式
- [ ] 游戏回放功能
- [ ] C++ 引擎集成
- [ ] Electron 桌面应用

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 9+ 或 pnpm 8+

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd Manila_webui

# 安装前端依赖
cd client
npm install

# 启动开发服务器
npm run dev
```

### 开发

```bash
# 开发模式（支持热重载）
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 运行测试
npm run test
```

### 构建

```bash
# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
Manila_webui/
├── client/                 # React 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── game/           # 游戏逻辑
│   │   ├── stores/         # 状态管理
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── utils/          # 工具函数
│   │   └── styles/         # 样式文件
│   └── public/             # 静态资源
├── server/                 # 后端服务（Phase 3）
├── desktop/                # Electron 桌面应用（Phase 4）
├── docs/                   # 项目文档
└── README.md
```

## 🎲 游戏规则

Manila 是一个策略桌游，玩家通过竞拍、投资和股票交易来获取最高分数。详细规则请参考：

- [游戏规则说明](docs/GAME_RULES.md)
- [原始规则文档](docs/马尼拉模拟规则.txt)

## 📚 文档

- [架构设计](docs/ARCHITECTURE.md) - 系统架构和技术选型
- [开发指南](docs/DEVELOPMENT.md) - 开发环境设置和流程
- [API 设计](docs/API_DESIGN.md) - API 接口文档
- [UI 设计](docs/UI_DESIGN.md) - UI/UX 设计规范
- [测试指南](docs/TESTING.md) - 测试策略和规范
- [部署指南](docs/DEPLOYMENT.md) - 部署流程说明
- [项目进度](docs/PROGRESS.md) - 开发进度追踪
- [技术决策](docs/DECISIONS.md) - 重要技术决策记录

## 🛠️ 技术栈

### 前端

- **框架**: React 18 + TypeScript 5
- **构建工具**: Vite 5
- **状态管理**: Zustand
- **样式**: TailwindCSS 3
- **动画**: Framer Motion
- **测试**: Vitest + React Testing Library

### 后端（Phase 3）

- **运行时**: Node.js 18+
- **框架**: Express
- **实时通信**: Socket.io
- **C++ 绑定**: N-API

### 桌面应用（Phase 4）

- **框架**: Electron

## 🤝 贡献指南

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解：

- 代码规范
- 提交规范
- Pull Request 流程
- 开发最佳实践

## 📋 开发路线图

查看 [ROADMAP.md](docs/ROADMAP.md) 了解详细的开发计划。

**当前阶段**: Phase 1 - 基础框架搭建

**近期目标**:
- ✅ 项目初始化
- ⏳ 类型定义
- ⏳ 组件库开发
- ⏳ 游戏引擎实现

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- 原始 Manila 游戏设计
- Manila C++ 引擎项目（位于 docs/ 目录的参考文档）

## 📮 联系方式

如有问题或建议，请：

- 提交 Issue
- 发起 Discussion
- 查看文档

---

**项目状态**: 🚧 活跃开发中

最后更新: 2025-10-26

