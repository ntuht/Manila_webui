"""导出中间 checkpoint 到客户端"""
from network import ManilaPPONet
import torch, os, sys

ckpt_path = sys.argv[1] if len(sys.argv) > 1 else "runs/ppo_v2_20260225_140849/models/model_450192.pt"
out_path = r"c:\Users\Admin\Documents\projects\Manila_webui\client\public\models\manila_brain.onnx"

ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
args = ckpt.get("args", {})
obs_dim = args.get("obs_dim", 184)
action_dim = args.get("action_dim", 288)
hidden = args.get("hidden_dim", 256)

print(f"Loading {ckpt_path}")
print(f"  obs_dim={obs_dim}, action_dim={action_dim}, hidden={hidden}")
print(f"  total_games={args.get('total_games','?')}")

model = ManilaPPONet(obs_dim, action_dim, hidden)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
model.export_onnx(out_path)
print(f"Deployed: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")
