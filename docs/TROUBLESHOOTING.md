# Manila 联赛系统故障排除指南

## 目录
1. [常见问题](#常见问题)
2. [编译错误](#编译错误)
3. [运行时错误](#运行时错误)
4. [性能问题](#性能问题)
5. [配置问题](#配置问题)
6. [调试技巧](#调试技巧)
7. [日志分析](#日志分析)
8. [联系支持](#联系支持)

## 常见问题

### 问题1: "Not enough strategies" 错误

**症状**: 运行联赛时出现 "Not enough strategies" 错误信息

**原因**: 策略数量少于玩家数量

**解决方案**:
1. 确保策略数量 ≥ 玩家数量
2. 检查策略名称是否正确
3. 验证策略是否已正确注册

```bash
# 错误示例
manila_demo --league --strategies greedy,risk_aware --players 3

# 正确示例
manila_demo --league --strategies greedy,risk_aware,hybrid --players 3
```

### 问题2: "Total Matches: 0" 问题

**症状**: 联赛执行后显示 "Total Matches: 0"

**原因**: 配置参数导致没有生成比赛

**解决方案**:
1. 检查 `num_games` 参数
2. 检查 `num_players` 参数
3. 确保策略数量足够

```bash
# 检查配置
manila_demo --league --strategies greedy,risk_aware,hybrid --players 3 --rounds 5 --log-verbosity verbose
```

### 问题3: 策略未注册错误

**症状**: 运行时出现策略未找到的错误

**原因**: 忘记调用 `register_default_strategies()`

**解决方案**:
1. 在 `main()` 函数中添加策略注册调用
2. 确保在联赛模式启动前注册策略

```cpp
// 在 main() 中添加
league::register_default_strategies();
```

### 问题4: HTML报告生成失败

**症状**: HTML报告文件为空或格式错误

**原因**: 联赛结果为空或配置错误

**解决方案**:
1. 确保联赛成功执行
2. 检查输出文件路径权限
3. 验证联赛结果数据

```bash
# 检查联赛结果
manila_demo --league --strategies greedy,risk_aware,hybrid --players 3 --rounds 2 --viz-html test.html
```

## 编译错误

### 错误1: "make_ev_invest not found"

**症状**: 编译时出现 `make_ev_invest` 未找到的错误

**原因**: 使用了不存在的策略工厂函数

**解决方案**:
```cpp
// 错误代码
policies->invest = strategy::make_ev_invest();

// 正确代码
policies->invest = strategy::make_default_invest();
```

### 错误2: "strategy::Policies" 未定义

**症状**: 编译时出现策略类型未定义错误

**原因**: 缺少必要的头文件包含

**解决方案**:
```cpp
#include "manila/strategy.hpp"
#include "manila/league.hpp"
```

### 错误3: 命名空间错误

**症状**: 编译时出现命名空间相关错误

**原因**: 命名空间使用不正确

**解决方案**:
```cpp
// 使用完整命名空间
std::unique_ptr<manila::strategy::Policies> strategy = registry.create_strategy("greedy", false);

// 或使用 using 声明
using namespace manila::league;
using namespace manila::strategy;
```

## 运行时错误

### 错误1: 内存访问违规

**症状**: 程序崩溃，出现内存访问错误

**原因**: 空指针访问或数组越界

**解决方案**:
1. 检查指针是否为空
2. 验证数组边界
3. 使用调试器定位问题

```cpp
// 安全的指针访问
if (strategy && strategy->bid) {
    int bid = strategy->bid->decide_bid(state, player_id, current_highest);
}
```

### 错误2: 超时错误

**症状**: 比赛执行超时

**原因**: 游戏循环过于复杂或死循环

**解决方案**:
1. 增加超时时间
2. 简化游戏逻辑
3. 检查循环条件

```cpp
// 设置更长的超时时间
config.timeout_seconds = 60.0;
```

### 错误3: 文件IO错误

**症状**: 无法读取或写入文件

**原因**: 文件路径错误或权限不足

**解决方案**:
1. 检查文件路径
2. 验证文件权限
3. 确保目录存在

```bash
# 检查文件权限
ls -la output/
chmod 644 output/league_results.html
```

## 性能问题

### 问题1: 联赛执行缓慢

**症状**: 联赛执行时间过长

**原因**: 比赛数量过多或游戏逻辑复杂

**解决方案**:
1. 减少比赛数量
2. 简化游戏逻辑
3. 使用多线程（未来版本）

```bash
# 减少比赛数量进行测试
manila_demo --league --strategies greedy,risk_aware --players 3 --rounds 5
```

### 问题2: 内存使用过多

**症状**: 程序内存使用量过大

**原因**: 内存泄漏或数据结构过大

**解决方案**:
1. 检查内存泄漏
2. 优化数据结构
3. 及时释放资源

```cpp
// 及时释放资源
{
    auto strategy = registry.create_strategy("greedy", false);
    // 使用策略
} // 自动释放
```

### 问题3: CPU使用率过高

**症状**: 程序CPU使用率持续很高

**原因**: 无限循环或计算密集

**解决方案**:
1. 检查循环条件
2. 优化算法
3. 添加适当的延迟

## 配置问题

### 问题1: 无效的配置参数

**症状**: 程序拒绝无效的配置参数

**原因**: 参数值超出有效范围

**解决方案**:
```cpp
// 验证配置参数
if (config.num_players < 2 || config.num_players > 6) {
    throw ConfigException("Invalid number of players");
}
if (config.num_games < 1 || config.num_games > 1000) {
    throw ConfigException("Invalid number of games");
}
```

### 问题2: 策略配置错误

**症状**: 策略行为不符合预期

**原因**: 策略配置不正确

**解决方案**:
1. 检查策略参数
2. 验证策略逻辑
3. 使用默认配置测试

```bash
# 使用默认配置测试
manila_demo --league --strategies greedy --players 3 --rounds 1
```

## 调试技巧

### 技巧1: 启用详细日志

```bash
manila_demo --league --log-verbosity verbose --strategies greedy,risk_aware,hybrid
```

### 技巧2: 使用调试器

```bash
# 使用 GDB 调试
gdb ./manila_demo
(gdb) run --league --strategies greedy,risk_aware,hybrid --players 3 --rounds 1
(gdb) break league::League::run_league
(gdb) continue
```

### 技巧3: 添加调试输出

```cpp
// 在关键位置添加调试输出
std::cout << "Debug: Strategy count = " << strategies.size() << std::endl;
std::cout << "Debug: Config players = " << config.num_players << std::endl;
```

### 技巧4: 单元测试

```cpp
// 创建简单的测试用例
TEST(debug_league_basic) {
    league::register_default_strategies();
    auto& registry = league::StrategyRegistry::instance();
    EXPECT_TRUE(registry.is_strategy_available("greedy"));
}
```

## 日志分析

### 日志级别

- **ERROR**: 严重错误，程序无法继续
- **WARN**: 警告信息，程序可以继续但可能有问题
- **INFO**: 一般信息，程序正常运行
- **DEBUG**: 调试信息，详细的执行过程
- **VERBOSE**: 最详细的信息，包括所有细节

### 常见日志消息

```
[INFO] Starting league with 3 strategies
[DEBUG] Strategy 'greedy' registered successfully
[DEBUG] Strategy 'risk_aware' registered successfully
[DEBUG] Strategy 'hybrid' registered successfully
[INFO] Running 10 matches with 3 players each
[DEBUG] Match 1/10: greedy vs risk_aware vs hybrid
[INFO] Match 1 completed in 0.5 seconds
[WARN] Match 2 failed: timeout
[ERROR] League execution failed: insufficient strategies
```

### 日志分析工具

```bash
# 过滤错误日志
manila_demo --league --log-verbosity verbose 2>&1 | grep ERROR

# 统计日志消息
manila_demo --league --log-verbosity verbose 2>&1 | grep -c "Match completed"

# 查看特定策略的日志
manila_demo --league --log-verbosity verbose 2>&1 | grep "greedy"
```

## 联系支持

### 报告问题

当遇到无法解决的问题时，请提供以下信息：

1. **错误信息**: 完整的错误消息和堆栈跟踪
2. **环境信息**: 操作系统、编译器版本、依赖库版本
3. **复现步骤**: 详细的操作步骤
4. **配置文件**: 相关的配置文件和参数
5. **日志文件**: 完整的日志输出

### 问题报告模板

```
标题: [BUG] 联赛系统执行失败

环境:
- 操作系统: Windows 10
- 编译器: MSVC 2019
- 版本: v1.4.1

问题描述:
运行联赛时出现 "Total Matches: 0" 错误

复现步骤:
1. 运行命令: manila_demo --league --strategies greedy,risk_aware --players 3
2. 观察输出: Total Matches: 0

期望结果:
应该执行 1 场比赛

实际结果:
没有执行任何比赛

日志输出:
[INFO] Starting league with 2 strategies
[ERROR] Not enough strategies for 3 players
```

### 获取帮助

- **文档**: 查看 `docs/` 目录下的相关文档
- **示例**: 参考 `examples/` 目录下的示例代码
- **测试**: 运行测试套件验证功能
- **社区**: 参与项目讨论和问题反馈

### 调试资源

- **API参考**: `docs/API_REFERENCE.md`
- **联赛指南**: `docs/LEAGUE_GUIDE.md`
- **测试用例**: `tests/test_league_fix.cpp`
- **示例代码**: `examples/myopic_engine_demo.cpp`
