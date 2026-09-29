# VoxMute / 折声 — TXC Internal Archive

低配可运行的代码渲染短片。Vite + TypeScript + HTML Canvas，约 30 秒、16:9（1920×1080）。

角色全身图放在 `public/voxmute.webp`，由 Canvas `drawImage` 画进监控格、档案页、生命体征和设定卡。

## 上传全身图（必做一次）

GitHub 网页：Add file → Upload files → 路径建成 `public/voxmute.webp` → Commit。

本地：

```bash
mkdir -p public
# 把折声全身图存成 public/voxmute.webp
npm install
npm run dev
```

## 启动

```bash
npm install
npm run dev
```

录屏：`F` 全屏，`H` 隐藏提示，`R` 从头播。
