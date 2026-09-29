import "./style.css";
import { VOXMUTE_URL, VOXMUTE_CARD_URL } from "./voxmuteUrl";

const DURATION = 30;
const W = 1920;
const H = 1080;

const canvas = document.querySelector<HTMLCanvasElement>("#frame")!;
const ctx = canvas.getContext("2d", { alpha: false })!;
const timeLabel = document.querySelector<HTMLElement>("#time-label")!;
const hud = document.querySelector<HTMLElement>("#hud")!;

const C = {
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
  scan: "rgba(210,255,80,0.045)",
};

const subject = new Image();
subject.src = VOXMUTE_URL;

const cardSubject = new Image();
cardSubject.src = VOXMUTE_CARD_URL;

let playing = true;
let t0 = performance.now();
let elapsed = 0;

const fmt = (s: number) => s.toFixed(2).padStart(5, "0");
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f));
}

function drawSubject(x: number, y: number, h: number, alpha = 1, img: HTMLImageElement = subject) {
  if (!img.complete || !img.naturalWidth) return;
  const w = h * (img.naturalWidth / img.naturalHeight);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - w / 2, y, w, h);
  ctx.restore();
}

function drawNoise() {
  ctx.save();
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#cfd6c8" : "#000";
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  ctx.restore();
}

function drawScanlines(t: number) {
  ctx.fillStyle = C.scan;
  const offset = (t * 38) % 4;
  for (let y = offset; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  const bandY = ((t * 90) % (H + 80)) - 40;
  const g = ctx.createLinearGradient(0, bandY, 0, bandY + 70);
  g.addColorStop(0, "rgba(214,255,58,0)");
  g.addColorStop(0.5, "rgba(214,255,58,0.05)");
  g.addColorStop(1, "rgba(214,255,58,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY, W, 70);
}

function drawVignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 980);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function chrome(t: number, title: string) {
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 20, W - 48, H - 40);
  ctx.fillStyle = C.acid;
  ctx.fillRect(24, 20, 8, 8);
  ctx.fillRect(W - 32, 20, 8, 8);
  ctx.fillRect(24, H - 28, 8, 8);
  ctx.fillRect(W - 32, H - 28, 8, 8);
  ctx.font = "13px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillStyle = C.dim;
  ctx.textAlign = "left";
  ctx.fillText("TXC / BIO-SIGNAL DIV.", 44, 44);
  ctx.fillText("CLASSIFICATION: INTERNAL", 44, H - 36);
  ctx.textAlign = "right";
  ctx.fillText(`TC ${fmt(t)}`, W - 44, 44);
  ctx.fillText("CAM-NET / REC", W - 44, H - 36);
  ctx.textAlign = "center";
  ctx.fillStyle = C.mute;
  ctx.fillText(title, W / 2, 44);
}

function phaseAt(t: number) {
  if (t < 3) return "boot";
  if (t < 8) return "monitors";
  if (t < 15) return "dossier";
  if (t < 23) return "vitals";
  if (t < 27.2) return "glitch";
  return "card";
}

function drawBoot(t: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = (0.55 + 0.45 * Math.sin(t * 27)) * easeOut(t / 1.2);
  ctx.fillStyle = C.acidDim;
  ctx.fillRect(W / 2 - 220, H / 2 - 70, 440, 2);
  ctx.textAlign = "center";
  ctx.fillStyle = C.acid;
  ctx.font = "22px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("SYSTEM POWER ON", W / 2, H / 2 - 96);
  ctx.fillStyle = C.text;
  ctx.font = "42px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TXC INTERNAL ARCHIVE", W / 2, H / 2 - 18);
  ctx.fillStyle = C.mute;
  ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("BIO-ACOUSTIC CONTAINMENT UNIT", W / 2, H / 2 + 22);
  ctx.fillText("LOADING FILE" + ".".repeat((Math.floor(t * 4) % 4) + 1), W / 2, H / 2 + 64);
  ctx.fillStyle = C.line;
  ctx.fillRect(W / 2 - 180, H / 2 + 88, 360, 6);
  ctx.fillStyle = C.acid;
  ctx.fillRect(W / 2 - 180, H / 2 + 88, 360 * clamp(t / 2.8, 0, 1), 6);
  ctx.globalAlpha = 1;
}

function cell(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  seed: number,
  t: number,
  withSubject = false,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#0b0c0d";
  ctx.fillRect(x + 8, y + 32, w - 16, h - 40);
  if (withSubject) drawSubject(x + w * 0.5, y + 28, h - 48, 0.95);
  for (let i = 0; i < 6; i++) {
    const yy = y + ((t * 40 + i * 28 + seed * 13) % h);
    ctx.fillStyle = `rgba(214,255,58,${0.03 + 0.03 * hash(seed + i)})`;
    ctx.fillRect(x, yy, w, 3);
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = C.acid;
  ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 10, y + 18);
  ctx.fillStyle = C.mute;
  ctx.textAlign = "right";
  ctx.fillText(`ID ${String(1000 + seed).slice(-4)}`, x + w - 10, y + 18);
  ctx.strokeStyle = C.line;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

function drawMonitors(t: number) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  chrome(t, "MULTI-FEED / HOLDING BAY");
  const labels = ["CAM-03  HOLD A", "CAM-07  OBSERVE", "CAM-11  ISOLATION", "CAM-14  AUDIO LAB", "CAM-19  CORRIDOR", "CAM-22  NIGHT WATCH"];
  const gridX = 56;
  const gridY = 68;
  const gap = 16;
  const cols = 3;
  const cw = (W - gridX * 2 - gap * (cols - 1)) / cols;
  const ch = (H - gridY - 64 - gap) / 2;
  for (let i = 0; i < 6; i++) {
    cell(
      gridX + (i % cols) * (cw + gap),
      gridY + Math.floor(i / cols) * (ch + gap),
      cw,
      ch,
      labels[i],
      17 + i * 9,
      t,
      i === 0, // only CAM-03 HOLD A carries the subject
    );
  }
  if (Math.sin(t * 8) > 0) {
    ctx.fillStyle = C.warn;
    ctx.font = "13px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("LIVE", 56, H - 56);
  }
}

function drawDossier(t: number) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  chrome(t, "SUBJECT FILE / OPEN");
  const local = t - 8;
  const reveal = easeOut(local / 1.4);
  ctx.fillStyle = C.panel;
  ctx.fillRect(80, 80, 720, 900);
  ctx.strokeStyle = C.line;
  ctx.strokeRect(80, 80, 720, 900);
  drawSubject(440, 200, 720, 0.96 * reveal);
  ctx.globalAlpha = reveal;
  ctx.textAlign = "left";
  ctx.fillStyle = C.dim;
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TXC-BS-09 / RESTRICTED", 110, 120);
  ctx.fillStyle = C.acid;
  ctx.font = "18px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("SUBJECT DESIGNATION", 110, 168);
  ctx.fillStyle = C.text;
  ctx.font = "48px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("VoxMute", 110, 230);
  ctx.fillStyle = C.acid;
  ctx.font = "36px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText("折声", 110, 280);
  ctx.fillStyle = C.mute;
  ctx.font = "18px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("Non-verbal Signal Subject", 110, 320);
  ctx.fillStyle = C.panel2;
  ctx.fillRect(860, 80, 980, 900);
  ctx.strokeStyle = C.line;
  ctx.strokeRect(860, 80, 980, 900);
  ctx.fillStyle = C.acid;
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
    ctx.fillStyle = local > 0.6 + i * 0.35 ? C.text : C.line;
    ctx.fillText(`${String(i + 1).padStart(2, "0")}  ${line}`, 900, 200 + i * 48);
  });
  ctx.fillStyle = C.violet;
  ctx.fillText("NOTE: NON-LINGUISTIC. DO NOT CLASSIFY AS SILENCE.", 900, 920);
  ctx.globalAlpha = 1;
}

function waveY(x: number, t: number, amp: number) {
  return (Math.sin(x * 0.018 + t * 7.2) * 0.45 + Math.sin(x * 0.041 + t * 11) * 0.28 + (noise1(x * 0.08 + t * 6) - 0.5) * 0.7) * amp;
}

function drawWave(x: number, y: number, w: number, h: number, t: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.strokeStyle = C.acid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= w; i += 2) {
    const yy = y + h / 2 + waveY(i + t * 120, t, h * 0.38);
    i === 0 ? ctx.moveTo(x + i, yy) : ctx.lineTo(x + i, yy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawVitals(t: number) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  chrome(t, "SIGNAL DESK / LIVE TRACE");
  const local = t - 15;
  drawSubject(1680, 80, 320, 0.35);
  ctx.fillStyle = C.dim;
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("ROOM MIC  /  RESIDUAL CARRIER", 80, 100);
  drawWave(80, 120, W - 160, 280, t);
  const boxes = [
    ["HR", String(72 + Math.round(Math.sin(t * 2.4) * 3)), "BPM"],
    ["RESP", String(14 + Math.round(noise1(t) * 2)), "/MIN"],
    ["CORE", "36.6", "C"],
    ["VOICE", "NULL", "CH"],
    ["CARRIER", "ON", ""],
  ];
  boxes.forEach((b, i) => {
    const x = 60 + i * 360;
    ctx.fillStyle = C.panel2;
    ctx.fillRect(x, 460, 340, 150);
    ctx.strokeStyle = C.line;
    ctx.strokeRect(x, 460, 340, 150);
    ctx.fillStyle = C.dim;
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(b[0], x + 20, 492);
    ctx.fillStyle = b[0] === "VOICE" ? C.warn : C.acid;
    ctx.font = "44px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(b[1], x + 20, 552);
    ctx.fillStyle = C.mute;
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(b[2], x + 20, 584);
  });
  ctx.textAlign = "center";
  if (local > 2.2 && Math.sin(t * 10) > -0.2) {
    ctx.fillStyle = C.warn;
    ctx.font = "36px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText("VOICE FUNCTION SEVERED", W / 2, 700);
  }
  if (local > 4.4 && Math.sin(t * 7 + 1) > -0.15) {
    ctx.fillStyle = C.acid;
    ctx.font = "32px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText("SIGNAL STILL ACTIVE", W / 2, 760);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = C.mute;
  ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("TRACE CONTINUES AFTER LARYNGEAL CUTOFF.", 60, 860);
  ctx.fillText("DO NOT INTERPRET AS SPEECH. TREAT AS RESIDUAL FIELD.", 60, 892);
}

function drawGlitch(t: number) {
  drawVitals(Math.min(t, 22.9));
  const g = (t - 23) / 4.2;
  const slices = 10 + Math.floor(g * 18);
  for (let i = 0; i < slices; i++) {
    const y = hash(i + Math.floor(t * 20)) * H;
    const hgt = 8 + hash(i + 9) * 48;
    const dx = (hash(i + t * 3) - 0.5) * 80 * (0.4 + g);
    ctx.drawImage(canvas, 0, y, W, hgt, dx, y, W, hgt);
  }
  ctx.fillStyle = C.acid;
  ctx.font = "20px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("ARCHIVE STREAM UNSTABLE", 60, 980);
}

function drawCard(t: number) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, H);
  drawScanlines(t * 0.3);
  const a = easeOut((t - 27.2) / 0.8);
  drawSubject(W / 2, 30, 520, a, cardSubject);
  ctx.globalAlpha = a;
  ctx.textAlign = "center";
  ctx.fillStyle = C.text;
  ctx.font = "64px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("VoxMute", W / 2, 600);
  ctx.fillStyle = C.acid;
  ctx.font = "48px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText("折声", W / 2, 662);
  ctx.fillStyle = C.line;
  ctx.fillRect(W / 2 - 160, 690, 320, 1);
  ctx.fillStyle = C.mute;
  ctx.font = "22px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("Art by MRSHDER", W / 2, 738);
  ctx.fillText("Character Design by Goose hair", W / 2, 778);
  ctx.fillStyle = C.dim;
  ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("NON-VERBAL SIGNAL SUBJECT", W / 2, 834);
  ctx.globalAlpha = 1;
}

function renderFrame(t: number) {
  const p = phaseAt(t);
  if (p === "boot") drawBoot(t);
  else if (p === "monitors") drawMonitors(t);
  else if (p === "dossier") drawDossier(t);
  else if (p === "vitals") drawVitals(t);
  else if (p === "glitch") drawGlitch(t);
  else drawCard(t);
  if (p !== "boot") {
    drawScanlines(t);
    drawNoise();
    drawVignette();
  } else drawNoise();
}

function tick(now: number) {
  if (playing) {
    elapsed = (now - t0) / 1000;
    if (elapsed > DURATION) {
      elapsed = DURATION;
      playing = false;
    }
  } else t0 = now - elapsed * 1000;
  renderFrame(elapsed);
  timeLabel.textContent = `${fmt(elapsed)} / ${fmt(DURATION)}`;
  requestAnimationFrame(tick);
}

function restart() {
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
