import "./style.css";

const DURATION = 30;
const W = 1920;
const H = 1080;

const canvas = document.querySelector<HTMLCanvasElement>("#frame")!;
const ctx = canvas.getContext("2d", { alpha: false })!;
const timeLabel = document.querySelector<HTMLElement>("#time-label")!;
const hud = document.querySelector<HTMLElement>("#hud")!;

const COLORS = {
  bg: "#070808",
  panel: "#101214",
  panel2: "#16191c",
  line: "#2a2f32",
  text: "#d8ddd6",
  mute: "#8b928c",
  dim: "#5c635d",
  acid: "#d6ff3a",
  acidDim: "#7a9320",
  violet: "#7a6cff",
  warn: "#ff5a3a",
  scan: "rgba(210, 255, 80, 0.045)",
};

type Phase =
  | "boot"
  | "monitors"
  | "dossier"
  | "vitals"
  | "glitch"
  | "card";

function phaseAt(t: number): Phase {
  if (t < 3) return "boot";
  if (t < 8) return "monitors";
  if (t < 15) return "dossier";
  if (t < 23) return "vitals";
  if (t < 27.2) return "glitch";
  return "card";
}

let playing = true;
let t0 = performance.now();
let elapsed = 0;

function fmt(sec: number): string {
  return sec.toFixed(2).padStart(5, "0");
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f));
}

function drawNoise(density = 0.08, alpha = 0.12): void {
  const count = Math.floor(W * H * density * 0.00035);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const s = Math.random() < 0.15 ? 2 : 1;
    ctx.fillStyle = Math.random() > 0.5 ? "#cfd6c8" : "#000";
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function drawScanlines(t: number): void {
  ctx.save();
  ctx.fillStyle = COLORS.scan;
  const offset = (t * 38) % 4;
  for (let y = offset; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }
  const bandY = ((t * 90) % (H + 80)) - 40;
  const g = ctx.createLinearGradient(0, bandY, 0, bandY + 70);
  g.addColorStop(0, "rgba(214,255,58,0)");
  g.addColorStop(0.5, "rgba(214,255,58,0.05)");
  g.addColorStop(1, "rgba(214,255,58,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY, W, 70);
  ctx.restore();
}

function drawVignette(): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 980);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawFrameChrome(t: number, title: string): void {
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 20, W - 48, H - 40);

  ctx.fillStyle = COLORS.acid;
  ctx.fillRect(24, 20, 8, 8);
  ctx.fillRect(W - 32, 20, 8, 8);
  ctx.fillRect(24, H - 28, 8, 8);
  ctx.fillRect(W - 32, H - 28, 8, 8);

  ctx.font = "13px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillStyle = COLORS.dim;
  ctx.textAlign = "left";
  ctx.fillText("TXC / BIO-SIGNAL DIV.", 44, 44);
  ctx.fillText("CLASSIFICATION: INTERNAL", 44, H - 36);

  ctx.textAlign = "right";
  ctx.fillText(`TC ${fmt(t)}`, W - 44, 44);
  ctx.fillText("CAM-NET / REC", W - 44, H - 36);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.mute;
  ctx.fillText(title, W / 2, 44);
}

function drawBoot(t: number): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  const flicker = 0.55 + 0.45 * Math.sin(t * 27);
  ctx.globalAlpha = flicker * easeOut(t / 1.2);

  ctx.fillStyle = COLORS.acidDim;
  ctx.fillRect(W / 2 - 220, H / 2 - 70, 440, 2);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.acid;
  ctx.font = "22px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("SYSTEM POWER ON", W / 2, H / 2 - 96);

  ctx.fillStyle = COLORS.text;
  ctx.font = "42px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TXC INTERNAL ARCHIVE", W / 2, H / 2 - 18);

  ctx.fillStyle = COLORS.mute;
  ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("BIO-ACOUSTIC CONTAINMENT UNIT", W / 2, H / 2 + 22);

  const dots = Math.floor((t * 4) % 4);
  ctx.fillText("LOADING FILE" + ".".repeat(dots + 1), W / 2, H / 2 + 64);

  ctx.fillStyle = COLORS.line;
  ctx.fillRect(W / 2 - 180, H / 2 + 88, 360, 6);
  ctx.fillStyle = COLORS.acid;
  ctx.fillRect(W / 2 - 180, H / 2 + 88, 360 * clamp(t / 2.8, 0, 1), 6);

  ctx.globalAlpha = 1;
  if (t > 2.4 && Math.random() > 0.4) {
    ctx.fillStyle = "rgba(214,255,58,0.04)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMonitorCell(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  seed: number,
  t: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, w, h);

  const cx = x + w * 0.5;
  const cy = y + h * 0.58;
  const breathe = 1 + 0.03 * Math.sin(t * 2.1 + seed);

  ctx.fillStyle = "#1b1f22";
  ctx.fillRect(x + 8, y + h * 0.35, w - 16, h * 0.62);

  ctx.strokeStyle = "#2c3336";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 18, 38 * breathe, 52 * breathe, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy + 20);
  ctx.lineTo(cx, cy + 78);
  ctx.stroke();

  ctx.strokeStyle = COLORS.violet;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy + 8);
  ctx.lineTo(cx + 16, cy + 8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (let i = 0; i < 6; i++) {
    const yy = y + ((t * 40 + i * 28 + seed * 13) % h);
    ctx.fillStyle = `rgba(214,255,58,${0.03 + 0.03 * hash(seed + i)})`;
    ctx.fillRect(x, yy, w, 3);
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = COLORS.acid;
  ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 10, y + 18);

  ctx.fillStyle = COLORS.mute;
  ctx.textAlign = "right";
  ctx.fillText(`ID ${String(1000 + seed).slice(-4)}`, x + w - 10, y + 18);

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

function drawMonitors(t: number): void {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawFrameChrome(t, "MULTI-FEED / HOLDING BAY");

  const labels = [
    "CAM-03  HOLD A",
    "CAM-07  OBSERVE",
    "CAM-11  ISOLATION",
    "CAM-14  AUDIO LAB",
    "CAM-19  CORRIDOR",
    "CAM-22  NIGHT WATCH",
  ];

  const gridX = 56;
  const gridY = 68;
  const gap = 16;
  const cols = 3;
  const rows = 2;
  const cw = (W - gridX * 2 - gap * (cols - 1)) / cols;
  const ch = (H - gridY - 64 - gap * (rows - 1)) / rows;

  for (let i = 0; i < 6; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    drawMonitorCell(
      gridX + c * (cw + gap),
      gridY + r * (ch + gap),
      cw,
      ch,
      labels[i],
      17 + i * 9,
      t,
    );
  }

  ctx.fillStyle = COLORS.warn;
  ctx.font = "13px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  const blink = Math.sin(t * 8) > 0;
  if (blink) ctx.fillText("\u25cf LIVE", 56, H - 56);
}

function drawDossier(t: number): void {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawFrameChrome(t, "SUBJECT FILE / OPEN");

  const local = t - 8;
  const reveal = easeOut(local / 1.4);

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(80, 80, 720, 900);
  ctx.strokeStyle = COLORS.line;
  ctx.strokeRect(80, 80, 720, 900);

  ctx.save();
  ctx.translate(440, 430);
  ctx.strokeStyle = COLORS.text;
  ctx.globalAlpha = 0.55 * reveal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -110, 70, 86, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, 150);
  ctx.moveTo(-90, 30);
  ctx.lineTo(90, 30);
  ctx.moveTo(0, 150);
  ctx.lineTo(-70, 280);
  ctx.moveTo(0, 150);
  ctx.lineTo(70, 280);
  ctx.stroke();

  ctx.strokeStyle = COLORS.violet;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-28, -18);
  ctx.lineTo(28, -18);
  ctx.stroke();
  ctx.fillStyle = COLORS.acid;
  ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("MUTE NODE", 40, -14);
  ctx.restore();

  ctx.globalAlpha = reveal;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TXC-BS-09 / RESTRICTED", 110, 120);

  ctx.fillStyle = COLORS.acid;
  ctx.font = "18px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("SUBJECT DESIGNATION", 110, 168);

  ctx.fillStyle = COLORS.text;
  ctx.font = "64px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("VoxMute", 110, 250);

  ctx.fillStyle = COLORS.acid;
  ctx.font = "48px 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("\u6298\u58f0", 110, 318);

  ctx.fillStyle = COLORS.mute;
  ctx.font = "22px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("Non-verbal Signal Subject", 110, 368);

  const fields = [
    ["STATUS", "CONTAINED / OBSERVE"],
    ["ORIGIN", "REDACTED"],
    ["VOICE PATH", "SEVERED"],
    ["RESIDUAL", "ACTIVE CARRIER"],
    ["CLEARANCE", "TXC-INTERNAL"],
  ];
  fields.forEach(([k, v], i) => {
    const yy = 820 + i * 28;
    ctx.fillStyle = COLORS.dim;
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(k, 110, yy);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(v, 280, yy);
  });

  ctx.fillStyle = COLORS.panel2;
  ctx.fillRect(860, 80, 980, 900);
  ctx.strokeStyle = COLORS.line;
  ctx.strokeRect(860, 80, 980, 900);

  ctx.fillStyle = COLORS.acid;
  ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("OBSERVATION LOG", 900, 130);

  const notes = [
    "Subject does not produce spoken language.",
    "Throat structure intact. Output path interrupted.",
    "Carrier wave remains measurable on room mics.",
    "Staff report residual vibration in dental bone.",
    "Do not attempt verbal prompting.",
    "Signal persists after lights-out.",
  ];
  ctx.font = "20px ui-monospace, Menlo, Consolas, monospace";
  notes.forEach((line, i) => {
    const show = local > 0.6 + i * 0.35;
    ctx.fillStyle = show ? COLORS.text : COLORS.line;
    ctx.fillText(`${String(i + 1).padStart(2, "0")}  ${line}`, 900, 200 + i * 48);
  });

  ctx.fillStyle = COLORS.violet;
  ctx.globalAlpha = 0.8 * reveal;
  ctx.font = "15px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("NOTE: NON-LINGUISTIC. DO NOT CLASSIFY AS SILENCE.", 900, 920);
  ctx.globalAlpha = 1;
}

function waveformY(x: number, t: number, amp: number): number {
  const n =
    Math.sin(x * 0.018 + t * 7.2) * 0.45 +
    Math.sin(x * 0.041 + t * 11.0) * 0.28 +
    (noise1(x * 0.08 + t * 6) - 0.5) * 0.7;
  return n * amp;
}

function drawWave(x: number, y: number, w: number, h: number, t: number, color: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= w; i += 2) {
    const yy = y + h / 2 + waveformY(i + t * 120, t, h * 0.38);
    if (i === 0) ctx.moveTo(x + i, yy);
    else ctx.lineTo(x + i, yy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawVitals(t: number): void {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawFrameChrome(t, "SIGNAL DESK / LIVE TRACE");

  const local = t - 15;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(60, 72, W - 120, 360);
  ctx.fillStyle = COLORS.dim;
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("ROOM MIC  /  RESIDUAL CARRIER", 80, 100);
  drawWave(80, 120, W - 160, 280, t, COLORS.acid);

  const boxes = [
    ["HR", `${72 + Math.round(Math.sin(t * 2.4) * 3)}`, "BPM"],
    ["RESP", `${14 + Math.round(noise1(t) * 2)}`, "/MIN"],
    ["CORE", "36.6", "C"],
    ["VOICE", "NULL", "CH"],
    ["CARRIER", "ON", ""],
  ];
  boxes.forEach((b, i) => {
    const x = 60 + i * 360;
    ctx.fillStyle = COLORS.panel2;
    ctx.fillRect(x, 460, 340, 150);
    ctx.strokeStyle = COLORS.line;
    ctx.strokeRect(x, 460, 340, 150);
    ctx.fillStyle = COLORS.dim;
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(b[0], x + 20, 492);
    ctx.fillStyle = b[0] === "VOICE" ? COLORS.warn : COLORS.acid;
    ctx.font = "44px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(b[1], x + 20, 552);
    ctx.fillStyle = COLORS.mute;
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(b[2], x + 20, 584);
  });

  const flashA = local > 2.2 && Math.sin(t * 10) > -0.2;
  const flashB = local > 4.4 && Math.sin(t * 7 + 1) > -0.15;

  ctx.textAlign = "center";
  if (flashA) {
    ctx.fillStyle = COLORS.warn;
    ctx.font = "36px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText("VOICE FUNCTION SEVERED", W / 2, 700);
  }
  if (flashB) {
    ctx.fillStyle = COLORS.acid;
    ctx.font = "32px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText("SIGNAL STILL ACTIVE", W / 2, 760);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.mute;
  ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TRACE CONTINUES AFTER LARYNGEAL CUTOFF.", 60, 860);
  ctx.fillText("DO NOT INTERPRET AS SPEECH. TREAT AS RESIDUAL FIELD.", 60, 892);
}

function drawGlitch(t: number): void {
  drawVitals(Math.min(t, 22.9));

  const g = (t - 23) / 4.2;
  const slices = 10 + Math.floor(g * 18);
  for (let i = 0; i < slices; i++) {
    const y = hash(i + Math.floor(t * 20)) * H;
    const h = 8 + hash(i + 9) * 48;
    const dx = (hash(i + t * 3) - 0.5) * 80 * (0.4 + g);
    ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
  }

  if (Math.random() < 0.25 + g * 0.4) {
    ctx.fillStyle = `rgba(122,108,255,${0.06 + g * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (Math.random() < 0.12) {
    ctx.fillStyle = "rgba(214,255,58,0.08)";
    ctx.fillRect(0, hash(t * 40) * H, W, 12);
  }

  ctx.fillStyle = COLORS.acid;
  ctx.font = "20px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("ARCHIVE STREAM UNSTABLE", 60, 980);
}

function drawCard(t: number): void {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, H);

  const local = t - 27.2;
  const a = easeOut(local / 0.8);

  drawScanlines(t * 0.3);
  ctx.globalAlpha = a;

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TXC INTERNAL ARCHIVE  \u00b7  SUBJECT PLATE", W / 2, 280);

  ctx.fillStyle = COLORS.text;
  ctx.font = "92px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("VoxMute", W / 2, 430);

  ctx.fillStyle = COLORS.acid;
  ctx.font = "64px 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("\u6298\u58f0", W / 2, 520);

  ctx.fillStyle = COLORS.line;
  ctx.fillRect(W / 2 - 160, 560, 320, 1);

  ctx.fillStyle = COLORS.mute;
  ctx.font = "22px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("Art by MRSHDER", W / 2, 620);
  ctx.fillText("Character Design by Goose hair", W / 2, 662);

  ctx.fillStyle = COLORS.dim;
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("NON-VERBAL SIGNAL SUBJECT", W / 2, 760);

  ctx.globalAlpha = 1;
}

function renderFrame(t: number): void {
  const phase = phaseAt(t);
  switch (phase) {
    case "boot":
      drawBoot(t);
      break;
    case "monitors":
      drawMonitors(t);
      break;
    case "dossier":
      drawDossier(t);
      break;
    case "vitals":
      drawVitals(t);
      break;
    case "glitch":
      drawGlitch(t);
      break;
    case "card":
      drawCard(t);
      break;
  }

  if (phase !== "boot") {
    drawScanlines(t);
    drawNoise(0.07, 0.1);
    drawVignette();
  } else {
    drawNoise(0.04, 0.08);
  }
}

function tick(now: number): void {
  if (playing) {
    elapsed = (now - t0) / 1000;
    if (elapsed > DURATION) {
      elapsed = DURATION;
      playing = false;
    }
  } else {
    t0 = now - elapsed * 1000;
  }

  renderFrame(elapsed);
  timeLabel.textContent = `${fmt(elapsed)} / ${fmt(DURATION)}`;
  requestAnimationFrame(tick);
}

function restart(): void {
  elapsed = 0;
  t0 = performance.now();
  playing = true;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (elapsed >= DURATION) restart();
    else playing = !playing;
  }
  if (e.key === "r" || e.key === "R") restart();
  if (e.key === "h" || e.key === "H") hud.classList.toggle("hidden");
  if (e.key === "f" || e.key === "F") {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
});

requestAnimationFrame(tick);
