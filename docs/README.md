> 语言规范：本文件主要面向人类阅读，采用简体中文撰写。

# 文档索引

本索引帮助团队在 10 分钟内定位所需资料，按读者场景分组。

## 入门与背景

- `README.md`：项目概览、构建与演示示例。
- `HANDOVER_TO_CODEX.md`：版本交接与当前风险提示。
- `ROADMAP.md`：长期功能规划与阶段目标。

## 开发指南

- `docs/ARCHITECTURE_INDEX.md`：模块—文件对应关系与调用关系。
- `docs/LEAGUE_GUIDE.md`：联赛系统特性、CLI 示例与架构。
- `docs/TESTING.md`：测试分类、断言规范与运行命令。
- `docs/TROUBLESHOOTING.md`：常见故障及排查步骤。

## 参考资料

- `SPEC.md`：游戏规则与阶段流程规格。
- `docs/API_REFERENCE.md`：联赛与策略接口说明。
- `JSON_SCHEMA.md`：JSON 审计输出模式（Agent 解析）。

## 历史记录

- `RELEASE_NOTES.md`：已发布版本的功能清单与已知问题。
- `DECISIONS.md`：架构决策记录。
- `docs/history/v-series.md`：版本演进摘要与关键交付。

## 回放与数据分析

- `docs/replay/guide.md`：复盘数据结构、采集链路与技术债。
- `docs/API_REFERENCE.md#监控和可视化`：SSE、Web API 与可视化接口。

## 工具与配置

- `config/league_presets.json`：预设联赛配置（Agent 可解析）。
- `SCENARIOS.md`：场景测试断言与覆盖要求。
- `docs/` 目录下其它 Markdown：按上述分组补充具体能力。

> 提交新功能时，请同步更新本索引、相关分组文档及 `RELEASE_NOTES.md`，并在 `DECISIONS.md` 中记录关键决策。
