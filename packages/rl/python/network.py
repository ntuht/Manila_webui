"""
Manila PPO Actor-Critic 网络

架构:
    - 共享特征提取: MLP (obs_dim → 256 → 256)
    - Actor 头: Linear(256 → action_dim) + Action Masking
    - Critic 头: Linear(256 → 1)

参数量: ~130K, 导出 ONNX 约 500 KB
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.distributions import Categorical
import numpy as np


class ManilaPPONet(nn.Module):
    """PPO Actor-Critic 网络 (MLP)"""

    def __init__(self, obs_dim: int = 184, action_dim: int = 288, hidden: int = 256):
        super().__init__()
        self.obs_dim = obs_dim
        self.action_dim = action_dim

        # 共享特征提取层
        self.shared = nn.Sequential(
            nn.Linear(obs_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
        )

        # Actor 头 (策略网络)
        self.actor = nn.Linear(hidden, action_dim)

        # Critic 头 (价值网络)
        self.critic = nn.Linear(hidden, 1)

        # 初始化
        self._init_weights()

    def _init_weights(self):
        """正交初始化 (PPO 常用)"""
        for module in self.shared:
            if isinstance(module, nn.Linear):
                nn.init.orthogonal_(module.weight, gain=np.sqrt(2))
                nn.init.zeros_(module.bias)
        nn.init.orthogonal_(self.actor.weight, gain=0.01)
        nn.init.zeros_(self.actor.bias)
        nn.init.orthogonal_(self.critic.weight, gain=1.0)
        nn.init.zeros_(self.critic.bias)

    def forward(self, obs: torch.Tensor, mask: torch.Tensor):
        """
        前向传播

        Args:
            obs: (batch, obs_dim) 浮点观测
            mask: (batch, action_dim) 0/1 动作掩码

        Returns:
            logits: (batch, action_dim) 动作 logits (已 mask)
            value: (batch, 1) 状态价值
        """
        h = self.shared(obs)
        logits = self.actor(h)

        # Action Masking: 将非法动作的 logit 设为极小值
        mask_bool = mask.bool()
        logits = logits.masked_fill(~mask_bool, -1e8)

        value = self.critic(h)
        return logits, value

    def get_action_and_value(
        self,
        obs: torch.Tensor,
        mask: torch.Tensor,
        action: torch.Tensor = None,
        deterministic: bool = False,
    ):
        """
        采样动作 + 计算所有 PPO 需要的值

        Args:
            obs: (batch, obs_dim)
            mask: (batch, action_dim)
            action: (batch,) 预指定的动作 (用于计算 log_prob, 如不提供则采样)
            deterministic: 是否使用贪心策略

        Returns:
            action: (batch,) 采样/指定的动作
            log_prob: (batch,) 动作的 log 概率
            entropy: (batch,) 策略熵
            value: (batch,) 状态价值
        """
        logits, value = self.forward(obs, mask)
        probs = Categorical(logits=logits)

        if action is None:
            if deterministic:
                action = logits.argmax(dim=-1)
            else:
                action = probs.sample()

        log_prob = probs.log_prob(action)
        entropy = probs.entropy()

        return action, log_prob, entropy, value.squeeze(-1)

    def get_value(self, obs: torch.Tensor, mask: torch.Tensor):
        """仅计算状态价值 (用于 GAE 计算)"""
        h = self.shared(obs)
        return self.critic(h).squeeze(-1)

    def export_onnx(self, path: str):
        """导出为 ONNX 格式 (只导出 actor 部分用于推理)"""
        self.eval()
        self.cpu()  # 确保模型在 CPU 上（ONNX 导出不需要 GPU）
        dummy_obs = torch.randn(1, self.obs_dim)
        dummy_mask = torch.ones(1, self.action_dim)

        torch.onnx.export(
            self,
            (dummy_obs, dummy_mask),
            path,
            input_names=["obs", "action_mask"],
            output_names=["action_logits", "value"],
            opset_version=17,
            dynamic_axes={
                "obs": {0: "batch"},
                "action_mask": {0: "batch"},
                "action_logits": {0: "batch"},
                "value": {0: "batch"},
            },
        )
        print(f"Exported ONNX model to {path}")

    def count_parameters(self) -> int:
        """返回可训练参数总数"""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


if __name__ == "__main__":
    net = ManilaPPONet()
    print(f"Parameters: {net.count_parameters():,}")
    print(f"Architecture:\n{net}")

    # 测试前向传播
    obs = torch.randn(4, 184)
    mask = torch.ones(4, 288)
    mask[:, 100:200] = 0  # 模拟部分掩码

    logits, value = net(obs, mask)
    print(f"\nForward pass:")
    print(f"  logits shape: {logits.shape}")
    print(f"  value shape:  {value.shape}")
    print(f"  masked logits min: {logits[:, 100:200].max().item():.1f} (should be -1e8)")

    # 测试采样
    action, log_prob, entropy, val = net.get_action_and_value(obs, mask)
    print(f"\nSampling:")
    print(f"  actions: {action.tolist()}")
    print(f"  log_probs: {log_prob.tolist()}")
    print(f"  entropy: {entropy.mean().item():.4f}")
