# VoxMute / 折声 — TXC Internal Archive

低配可运行的代码渲染短片。用 Vite + TypeScript + HTML Canvas 在浏览器里播一段约 30 秒的 16:9（1920×1080）内部档案画面，方便用 OBS 或系统录屏出片。

不做 React、不做 three.js、没有后端、不依赖图片素材。

## 启动

需要 Node.js 18+。

```bash
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173）。

录屏建议：按 `F` 进入全屏，按 `H` 隐藏左下角提示，再按 `R` 从头播放。

## 操作

| 键 | 作用 |
| --- | --- |
| Space | 播放 / 暂停（结束后再按一次会重播） |
| R | 从头重播 |
| F | 全屏 |
| H | 隐藏 / 显示提示 |

## 时间轴

- 0–3s 黑屏开机，`TXC INTERNAL ARCHIVE`
- 3–8s 多路监控分屏（扫描线、时间码、噪点）
- 8–15s 角色档案 `VoxMute / 折声`，副标题 `Non-verbal Signal Subject`
- 15–23s 声纹波形 + 生命体征，闪现 `VOICE FUNCTION SEVERED` / `SIGNAL STILL ACTIVE`
- 23–30s 故障，停在设定卡

设定卡文案：

- VoxMute
- 折声
- Art by MRSHDER
- Character Design by Goose hair

## 结构

```
.
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src
    ├── main.ts
    ├── style.css
    └── vite-env.d.ts
```

画面全部由 Canvas 画矩形、文字、波形、扫描线和噪点。风格按现实机构内部监控 / 实验档案来，而不是赛博霓虹。
