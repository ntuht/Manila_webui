"""
ONNX 模型导出 + 验证工具

用法:
    python export_onnx.py --checkpoint runs/ppo_xxx/models/best.pt
    python export_onnx.py --checkpoint runs/ppo_xxx/models/best.pt --output manila_brain.onnx
"""

import argparse
import numpy as np
import torch
from pathlib import Path

try:
    import onnx
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

try:
    import onnxruntime as ort
    HAS_ORT = True
except ImportError:
    HAS_ORT = False

from network import ManilaPPONet


def export(checkpoint_path: str, output_path: str, obs_dim: int = 128, action_dim: int = 256):
    """从 PyTorch checkpoint 导出 ONNX"""
    print(f"Loading checkpoint: {checkpoint_path}")

    # 加载模型
    model = ManilaPPONet(obs_dim, action_dim)
    state = torch.load(checkpoint_path, map_location="cpu", weights_only=True)

    # 支持完整 checkpoint 和纯 state_dict
    if isinstance(state, dict) and "model_state_dict" in state:
        model.load_state_dict(state["model_state_dict"])
        print(f"  Training games: {state.get('total_games', '?')}")
    else:
        model.load_state_dict(state)

    model.eval()

    # 导出 ONNX
    print(f"Exporting to: {output_path}")
    model.export_onnx(output_path)

    # 验证 ONNX 模型
    if HAS_ONNX:
        print("\nValidating ONNX model...")
        onnx_model = onnx.load(output_path)
        onnx.checker.check_model(onnx_model)
        print("  ONNX model is valid ✓")
    else:
        print("\n  Skipping ONNX validation (onnx package not available)")

    # 对比 PyTorch 和 ONNX Runtime 输出
    if HAS_ORT:
        print("\nComparing PyTorch vs ONNX Runtime outputs...")
        verify_consistency(model, output_path, obs_dim, action_dim)
    else:
        print("  Skipping consistency check (onnxruntime not available)")

    # 输出文件信息
    file_size = Path(output_path).stat().st_size
    print(f"\nModel stats:")
    print(f"  File size: {file_size / 1024:.1f} KB")
    print(f"  Parameters: {model.count_parameters():,}")
    print(f"  obs_dim: {obs_dim}")
    print(f"  action_dim: {action_dim}")


def verify_consistency(
    model: ManilaPPONet,
    onnx_path: str,
    obs_dim: int,
    action_dim: int,
    num_tests: int = 100,
):
    """验证 PyTorch 和 ONNX Runtime 输出的一致性"""

    session = ort.InferenceSession(onnx_path)

    max_diff_logits = 0
    max_diff_value = 0

    for i in range(num_tests):
        # 随机输入
        obs = np.random.randn(1, obs_dim).astype(np.float32)
        mask = np.zeros((1, action_dim), dtype=np.float32)
        # 随机选择 10-30 个合法动作
        legal_ids = np.random.choice(action_dim, size=np.random.randint(10, 30), replace=False)
        mask[0, legal_ids] = 1.0

        # PyTorch
        with torch.no_grad():
            pt_logits, pt_value = model(
                torch.tensor(obs), torch.tensor(mask)
            )
        pt_logits = pt_logits.numpy()
        pt_value = pt_value.numpy()

        # ONNX Runtime
        ort_out = session.run(None, {"obs": obs, "action_mask": mask})
        ort_logits, ort_value = ort_out

        # 比较 (只比较合法动作的 logit)
        for j in legal_ids:
            diff = abs(pt_logits[0, j] - ort_logits[0, j])
            max_diff_logits = max(max_diff_logits, diff)
        diff_v = abs(pt_value[0, 0] - ort_value[0, 0])
        max_diff_value = max(max_diff_value, diff_v)

    print(f"  Max logit difference:  {max_diff_logits:.2e}")
    print(f"  Max value difference:  {max_diff_value:.2e}")

    if max_diff_logits < 1e-4 and max_diff_value < 1e-4:
        print("  Consistency check PASSED ✓")
    else:
        print("  ⚠ Warning: differences exceed 1e-4")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True,
                        help="PyTorch checkpoint 路径")
    parser.add_argument("--output", type=str, default="manila_brain.onnx",
                        help="输出 ONNX 路径")
    parser.add_argument("--obs-dim", type=int, default=128)
    parser.add_argument("--action-dim", type=int, default=256)
    args = parser.parse_args()

    export(args.checkpoint, args.output, args.obs_dim, args.action_dim)
