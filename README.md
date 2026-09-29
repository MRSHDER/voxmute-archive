# VoxMute / 折声 — TXC Internal Archive

低配可运行的代码渲染短片。Vite + TypeScript + HTML Canvas，约 30 秒、16:9（1920×1080）。

## 启动

```bash
npm install
npm run dev
```

录屏：`F` 全屏，`H` 隐藏提示，`R` 从头播。

## 角色全身图

折声全身图位于 `public/voxmute.webp`（2048×2048，带 alpha 通道），由 Canvas
`drawImage` 画进监控格、档案页、生命体征和设定卡。

替换素材时直接覆盖该文件即可，无需改动代码：

```bash
# 建议保持方形构图与透明背景，范围 2048×2048 以内
cp <新的折声全身图.webp> public/voxmute.webp
```

背景必须透明：`drawSubject()` 按原始宽高比整幅绘制，不透明底色会盖住场景。

若该文件缺失，`drawSubject()` 会静默跳过绘制，画面只剩背景——浏览器控制台会给出
`[voxmute] portrait missing` 提示。

## 历史说明

仓库早先尝试把整张图以 base64 塞进 `src/voxmuteA..D.ts` 并在运行时拼成
`data:` URI。该方案已废弃并删除：`voxmuteA.ts` 中的 base64 只写到图片声明大小的
25%（8295 字符，长度不是 4 的倍数，无法解码），`voxmuteB/C/D.ts` 则是占位字符串，
拼出的 URI 从未能渲染。现在统一走 `public/` 静态资源。

GitHub 完全支持二进制文件，用网页端 Upload files 或 `git add` 都能正确保存，
之前"接口按文本走、图会坏"的说法是误判——真正的故障是那段 base64 被截断了。
