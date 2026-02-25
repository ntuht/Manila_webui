"""
Manila 环境客户端 —— 通过子进程与 Node.js 桥接服务通信

用法:
    env = ManilaEnvClient(player_count=3)
    obs, mask, player_id = env.reset(seed=42)
    obs, mask, player_id, done, rewards = env.step(action_id)
"""

import subprocess
import json
import os
import sys
from pathlib import Path
from typing import Optional
import numpy as np


class ManilaEnvClient:
    """Manila 游戏环境，通过 Node.js 桥接进程与 TS 引擎通信"""

    def __init__(self, player_count: int = 3):
        self.player_count = player_count
        self.obs_dim: int = 0
        self.action_dim: int = 0
        self._process: Optional[subprocess.Popen] = None
        self._start_bridge()

    def _start_bridge(self):
        """启动 Node.js 桥接子进程"""
        bridge_dir = Path(__file__).parent.parent
        bridge_script = bridge_dir / "src" / "bridge-server.ts"

        self._process = subprocess.Popen(
            ["npx", "tsx", str(bridge_script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(bridge_dir),
            text=True,
            bufsize=1,
            shell=True,  # Windows 需要 shell=True 来运行 npx
        )

        # 读取 ready 消息
        ready = self._recv()
        if "ready" not in ready:
            raise RuntimeError(f"Bridge failed to start: {ready}")

        self.obs_dim = ready.get("obsDim", 128)
        self.action_dim = ready.get("actionDim", 256)

    def _send(self, msg: dict):
        """发送 JSON 行到桥接进程"""
        if not self._process or self._process.poll() is not None:
            raise RuntimeError("Bridge process is not running")
        line = json.dumps(msg) + "\n"
        self._process.stdin.write(line)
        self._process.stdin.flush()

    def _recv(self) -> dict:
        """从桥接进程接收一行 JSON"""
        if not self._process or self._process.poll() is not None:
            raise RuntimeError("Bridge process is not running")
        line = self._process.stdout.readline()
        if not line:
            stderr = self._process.stderr.read() if self._process.stderr else ""
            raise RuntimeError(f"Bridge process ended unexpectedly. stderr: {stderr}")
        return json.loads(line.strip())

    def reset(self, seed: Optional[int] = None, opponent_mode: str = 'neural') -> tuple:
        """
        重置游戏环境

        Args:
            seed: 随机种子
            opponent_mode: 对手模式 ('neural'=发送所有决策, 'ev'=P1/P2 由 EV 策略自动执行)

        Returns:
            (obs, mask, player_id, potential): 初始观测、动作掩码、当前玩家ID、势能值
        """
        cmd = {"cmd": "reset", "playerCount": self.player_count, "opponentMode": opponent_mode}
        if seed is not None:
            cmd["seed"] = seed

        self._send(cmd)
        resp = self._recv()

        if "error" in resp:
            raise RuntimeError(f"Reset failed: {resp['error']}")

        obs = np.array(resp["obs"], dtype=np.float32)
        mask = np.array(resp["mask"], dtype=np.int8)
        player_id = resp["playerId"]
        potential = resp.get("potential", 0.0)

        return obs, mask, player_id, potential

    def step(self, action: int) -> tuple:
        """
        执行一个动作

        Args:
            action: 动作 ID (0 ~ action_dim-1)

        Returns:
            (obs, mask, player_id, done, rewards, potential):
                obs: 下一个观测 (float32 数组)
                mask: 下一个动作掩码 (int8 数组)
                player_id: 下一个需要决策的玩家 ID
                done: 游戏是否结束
                rewards: 如果结束，各玩家的奖励 dict
                potential: 下一状态的势能 Φ(s') (终端时为 0)
        """
        self._send({"cmd": "step", "action": int(action)})
        resp = self._recv()

        if "error" in resp:
            raise RuntimeError(f"Step failed: {resp['error']}")

        obs = np.array(resp["obs"], dtype=np.float32)
        mask = np.array(resp["mask"], dtype=np.int8)
        player_id = resp.get("playerId", "")
        done = resp["done"]
        rewards = resp.get("rewards")
        potential = resp.get("potential", 0.0)

        return obs, mask, player_id, done, rewards, potential

    def close(self):
        """关闭桥接进程"""
        if self._process and self._process.poll() is None:
            try:
                self._send({"cmd": "quit"})
            except Exception:
                pass
            self._process.terminate()
            self._process.wait(timeout=5)

    def __del__(self):
        self.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


# ==================== 并行环境管理器 ====================

class ParallelManilaEnv:
    """管理多个并行的 Manila 环境实例，加速数据采集"""

    def __init__(self, num_envs: int = 4, player_count: int = 3):
        self.envs = [ManilaEnvClient(player_count) for _ in range(num_envs)]
        self.num_envs = num_envs

    def reset_all(self, base_seed: int = 0) -> list:
        """重置所有环境"""
        results = []
        for i, env in enumerate(self.envs):
            results.append(env.reset(seed=base_seed + i * 1000))
        return results

    def close_all(self):
        """关闭所有环境"""
        for env in self.envs:
            env.close()


if __name__ == "__main__":
    # 快速测试
    print("Starting Manila environment...")
    with ManilaEnvClient(player_count=3) as env:
        print(f"  obs_dim={env.obs_dim}, action_dim={env.action_dim}")

        obs, mask, pid, phi = env.reset(seed=42)
        print(f"  Initial: player={pid}, obs_shape={obs.shape}, legal_actions={mask.sum()}, potential={phi:.4f}")

        step = 0
        done = False
        phi_values = [phi]
        while not done and step < 500:
            # 随机选择合法动作
            legal = np.where(mask == 1)[0]
            action = np.random.choice(legal)
            obs, mask, pid, done, rewards, phi = env.step(action)
            phi_values.append(phi)
            step += 1

        print(f"  Game ended after {step} steps")
        if rewards:
            print(f"  Rewards: {rewards}")
        print(f"  Potential range: [{min(phi_values):.4f}, {max(phi_values):.4f}]")
        print(f"  Final potential: {phi_values[-1]:.4f} (should be 0.0)")
    print("Done!")
