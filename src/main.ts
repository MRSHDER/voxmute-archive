import "./style.css";

/* =========================================================
   折声 / VoxMute — TXC 内部档案
   贯穿全站的一条线：载波在“有人靠近”时上扬。
   访客的指针就是观察者——靠近声波、身体或日志，读数都会变化。
   ========================================================= */

const BASE = import.meta.env.BASE_URL;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const C = { signal: "#c6e03a", star: "#4a52e0", screen: "#07080a", ink: "#1b1d22", grid: "rgba(198,224,58,0.06)" };

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

/** 页面在滚动中的进度：0 = 刚贴顶，1 = 即将离开 */
function progress(section: HTMLElement): number {
  if (reduce) return 1;
  const r = section.getBoundingClientRect();
  const total = r.height - innerHeight;
  return total <= 0 ? 1 : clamp(-r.top / total);
}
const visible = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

/** 让画布按设备像素比清晰绘制 */
function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function load(src: string) {
  return new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => { console.warn(`[voxmute] 图片缺失：${src}`); fail(); };
    img.src = src;
  });
}

/** 机器视觉：用 Sobel 算子把原画转成荧光线稿（只算一次，缓存成画布） */
function edges(img: HTMLImageElement, size = 1024, color = C.signal): HTMLCanvasElement {
  const s = size, c = document.createElement("canvas");
  c.width = c.height = s;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, s, s);
  const src = x.getImageData(0, 0, s, s).data;
  const lum = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) {
    const a = src[i * 4 + 3] / 255;
    // 亮度 × 透明度：轮廓和内部色块边界都能被找出来
    lum[i] = ((src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255) * a + a * .35;
  }
  const out = x.createImageData(s, s), d = out.data;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  for (let y = 1; y < s - 1; y++) for (let xx = 1; xx < s - 1; xx++) {
    const i = y * s + xx;
    const gx = -lum[i - s - 1] - 2 * lum[i - 1] - lum[i + s - 1] + lum[i - s + 1] + 2 * lum[i + 1] + lum[i + s + 1];
    const gy = -lum[i - s - 1] - 2 * lum[i - s] - lum[i - s + 1] + lum[i + s - 1] + 2 * lum[i + s] + lum[i + s + 1];
    const m = Math.hypot(gx, gy);
    if (m > .22) { const o = i * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.min(255, m * 260); }
  }
  x.putImageData(out, 0, 0);
  return c;
}

/* ---------- 通用：[data-at] 元素按进度点亮；.bar 涂黑条按进度擦开 ---------- */
function stepElements(section: HTMLElement, p: number) {
  section.querySelectorAll<HTMLElement>("[data-at]").forEach(el => {
    const at = parseFloat(el.dataset.at!);
    if (el.classList.contains("bar")) el.style.setProperty("--cover", String(1 - smooth(at, at + .07, p)));
    else el.classList.toggle("on", p >= at);
  });
}

/* ======================= 第 1 页 ======================= */
const p1 = $("#p1");
const locked = $<HTMLButtonElement>("#locked-field"), lockedMsg = $("#locked-msg");
let lockTries = 0;
locked.addEventListener("click", () => {
  lockTries++;
  lockedMsg.textContent = lockTries < 3 ? "权限不足：需三级以上授权" : "不存在可供调阅的记录";
  locked.classList.remove("denied"); void locked.offsetWidth; locked.classList.add("denied");
});

/* ======================= 第 2 页：声波 ======================= */
const p2 = $("#p2"), wave = $<HTMLCanvasElement>("#wave"), waveState = $("#wave-state");
let wavePointer: { x: number; y: number } | null = null;
wave.addEventListener("pointermove", e => { const r = wave.getBoundingClientRect(); wavePointer = { x: e.clientX - r.left, y: e.clientY - r.top }; });
wave.addEventListener("pointerleave", () => { wavePointer = null; });
let carrierBoost = 0;

function drawWave(p: number, t: number) {
  const { ctx, w, h } = fit(wave);
  const mid = h / 2, cutX = w * .5;
  const cut = smooth(.38, .48, p);          // 剪断的进度
  ctx.clearRect(0, 0, w, h);
  // 刻度
  ctx.strokeStyle = "rgba(217,219,212,.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + .5, mid - 4); ctx.lineTo(x + .5, mid + 4); ctx.stroke(); }

  // 指针靠近载波时读数上扬
  const near = wavePointer ? Math.exp(-((wavePointer.y - mid) ** 2) / 1800) : 0;
  carrierBoost += ((wavePointer && wavePointer.x > cutX ? near : 0) - carrierBoost) * .08;

  // 人声：切断点右侧随剪断衰减为零
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const env = .55 + .45 * Math.sin(x * .013 + t * .0011) * Math.sin(x * .005 - t * .0007);
    let a = (Math.sin(x * .09 + t * .006) * .6 + Math.sin(x * .23 - t * .004) * .3 + Math.sin(x * .41 + t * .011) * .15) * env * h * .32;
    if (x > cutX) a *= 1 - cut;
    x === 0 ? ctx.moveTo(x, mid + a) : ctx.lineTo(x, mid + a);
  }
  ctx.strokeStyle = "rgba(217,219,212,.75)"; ctx.lineWidth = 1.4; ctx.stroke();

  // 载波：剪断后才显出来，一条细而稳定的荧光线
  if (cut > 0) {
    ctx.beginPath();
    for (let x = cutX; x <= w; x += 2) {
      const local = wavePointer ? Math.exp(-((x - wavePointer.x) ** 2) / 9000) : 0;
      const amp = (1.6 + carrierBoost * 3 + local * carrierBoost * 26) * cut;
      const y = mid + Math.sin(x * .18 - t * .02) * amp;
      x === cutX ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = C.signal; ctx.globalAlpha = cut; ctx.lineWidth = 1.6;
    ctx.shadowColor = C.signal; ctx.shadowBlur = 6 + carrierBoost * 10; ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // 切口
  const drop = smooth(.3, .4, p);
  if (drop > 0) {
    ctx.strokeStyle = "#d9dbd4"; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cutX, 0); ctx.lineTo(cutX, h * drop); ctx.stroke(); ctx.setLineDash([]);
  }
  waveState.textContent = cut > .9 ? `已切断　载波 ${(87 + carrierBoost * 6).toFixed(1)} Hz` : "记录中";
  waveState.classList.toggle("cut", cut > .9);
}

/* ======================= 第 3 页：体征扫描 ======================= */
const p3 = $("#p3"), monitor = p3.querySelector<HTMLElement>(".monitor")!, scan = $<HTMLCanvasElement>("#scan");
const scanPct = $("#scan-pct"), reticle = $("#reticle"), reticleXY = $("#reticle-xy"), calloutList = $("#callouts");
type Part = { id: string; name: string; x: number; y: number; text: string; star?: boolean };
// 坐标是在 2048×2048 全身图上取的相对位置
const PARTS: Part[] = [
  { id: "ear", name: "耳标 i0", x: .673, y: .103, text: "收容标签。编号末两位“i0”的含义没有登记，经办人一栏被涂黑。" },
  { id: "eye", name: "目视单元", x: .53, y: .217, text: "黄绿色虹膜，瞳孔正中有一点红。对光和注视都有反应——被观察时，它会回看。" },
  { id: "mouth", name: "缝合口", x: .49, y: .27, text: "切断手术留下的缝合痕，呈锯齿像素状。口部开合正常，只是没有声音。" },
  { id: "star", name: "胸口信号源", x: .5, y: .445, text: "载波的源头，一枚钴蓝色四芒星。读数升高时会亮起，两颊的同色标记随之闪烁。", star: true },
  { id: "chain", name: "约束装置", x: .686, y: .49, text: "腕部束环和断链。链条在收容第三日凌晨断开，录像里对象没有移动。" },
  { id: "tail", name: "尾部", x: .855, y: .68, text: "情绪最可靠的指标。日志显示，载波上扬之前，尾巴总是先动。" },
];
calloutList.innerHTML = PARTS.map(p => `
  <li class="callout ${p.x < .5 ? "left" : ""} ${p.star ? "star" : ""}" data-part="${p.id}">
    <button type="button" aria-expanded="false" aria-controls="d-${p.id}">
      <span class="dot"></span><span class="lead"></span><span class="name">${p.name}</span>
    </button>
    <p class="detail" id="d-${p.id}">${p.text}</p>
  </li>`).join("");
calloutList.addEventListener("click", e => {
  const btn = (e.target as HTMLElement).closest("button"); if (!btn) return;
  const open = btn.getAttribute("aria-expanded") !== "true";
  calloutList.querySelectorAll("button").forEach(b => { b.setAttribute("aria-expanded", "false"); b.nextElementSibling!.classList.remove("open"); });
  if (open) { btn.setAttribute("aria-expanded", "true"); btn.nextElementSibling!.classList.add("open"); }
  // 窄屏：详情放到屏幕底部的条里
  const detail = $("#scan-detail");
  detail.textContent = open ? `${btn.querySelector(".name")!.textContent}：${btn.nextElementSibling!.textContent}` : "";
  detail.classList.toggle("open", open);
});
let scanPointer: { x: number; y: number } | null = null, gaze = 0;
monitor.addEventListener("pointermove", e => {
  const r = monitor.getBoundingClientRect(); scanPointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  monitor.classList.add("aim"); reticle.style.transform = `translate(${scanPointer.x}px, ${scanPointer.y}px)`;
});
monitor.addEventListener("pointerleave", () => { scanPointer = null; monitor.classList.remove("aim"); });

let subject: HTMLImageElement | null = null, subjectEdges: HTMLCanvasElement | null = null;

function drawScan(p: number, t: number) {
  const { ctx, w, h } = fit(scan);
  ctx.fillStyle = C.screen; ctx.fillRect(0, 0, w, h);
  // 网格
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  for (let x = (w / 2) % 40; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke(); }
  for (let y = (h / 2) % 40; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); ctx.stroke(); }

  const size = Math.min(h * .9, w * (w < 700 ? 1.05 : .62));
  const bx = (w - size) / 2, by = (h - size) / 2 + 10;
  const sp = smooth(.06, .86, p);                   // 扫描进度
  const scanY = by + size * (.02 + sp * .96);

  // 被扫过的区域：打底光，让深色毛发在黑屏上能看清
  if (subject && subjectEdges) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, scanY); ctx.clip();
    const glow = ctx.createRadialGradient(w / 2, by + size * .45, 10, w / 2, by + size * .45, size * .62);
    glow.addColorStop(0, "#2c3036"); glow.addColorStop(1, "rgba(7,8,10,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(subject, bx, by, size, size);
    ctx.globalAlpha = .18; ctx.drawImage(subjectEdges, bx, by, size, size); ctx.globalAlpha = 1;
    ctx.restore();
    // 未扫描区域：只有线框
    ctx.save(); ctx.beginPath(); ctx.rect(0, scanY, w, h - scanY); ctx.clip();
    ctx.globalAlpha = .55 + .1 * Math.sin(t * .004); ctx.drawImage(subjectEdges, bx, by, size, size);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // 注视：指针离身体越近，胸口的星越亮
  const star = PARTS.find(q => q.star)!;
  const sx = bx + star.x * size, sy = by + star.y * size;
  const dist = scanPointer ? Math.hypot(scanPointer.x - sx, scanPointer.y - sy) : 1e9;
  gaze += (Math.exp(-dist / (size * .35)) - gaze) * .06;
  if (scanY > sy) {
    const pulse = .5 + .5 * Math.sin(t * .006);
    const rad = size * (.03 + gaze * .03) * (1 + pulse * .2);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad * 3);
    g.addColorStop(0, `rgba(90,100,255,${.35 + gaze * .5})`); g.addColorStop(1, "rgba(74,82,224,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rad * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  // 扫描线
  if (sp < 1) {
    const band = ctx.createLinearGradient(0, scanY - 70, 0, scanY);
    band.addColorStop(0, "rgba(198,224,58,0)"); band.addColorStop(1, "rgba(198,224,58,.16)");
    ctx.fillStyle = band; ctx.fillRect(0, scanY - 70, w, 70);
    ctx.fillStyle = C.signal; ctx.fillRect(0, scanY, w, 1.2);
  }
  // 左侧刻度尺
  ctx.fillStyle = "rgba(198,224,58,.5)"; ctx.font = "10px ui-monospace, Consolas, monospace";
  for (let i = 0; i <= 10; i++) { const y = by + size * i / 10; ctx.fillRect(bx - 18, y, i % 5 ? 6 : 12, 1); }
  ctx.fillText(`Y ${((scanY - by) / size).toFixed(3)}`, bx - 18, Math.min(scanY - 6, h - 12));

  // 部位标注：扫描线经过后出现
  calloutList.querySelectorAll<HTMLElement>(".callout").forEach(li => {
    const part = PARTS.find(q => q.id === li.dataset.part)!;
    const px = bx + part.x * size, py = by + part.y * size;
    li.style.left = `${px}px`; li.style.top = `${py}px`;
    li.classList.toggle("left", part.x < .5 || px + 130 > w);   // 右侧放不下时翻到左边
    li.classList.toggle("on", scanY > py + 4);
  });
  scanPct.textContent = `${String(Math.round(sp * 100)).padStart(2, "0")}%${sp >= 1 ? "　扫描完成" : ""}`;
  if (scanPointer) {
    const nx = (scanPointer.x - bx) / size, ny = (scanPointer.y - by) / size;
    const inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
    reticleXY.textContent = inside ? `X ${nx.toFixed(3)}  Y ${ny.toFixed(3)}  注视 ${(gaze * 100).toFixed(0)}` : "目标外";
  }
}

/* ======================= 第 4 页：观察日志 ======================= */
const p4 = $("#p4"), logEl = $("#log"), meterFill = $("#meter-fill"), meterVal = $("#meter-val");
const LOG: [string, string][] = [
  ["第1日 09:12", "对象入住 HOLD A。全程未发出声音。"],
  ["第1日 21:40", "房间麦克风出现一条窄带信号。排查设备后确认，来源是对象本身。"],
  ["第3日 03:07", "腕部链条断开。录像中对象没有移动。"],
  ["第3日 03:08", "载波短暂上扬。值班员称“像是在说话”，该描述已从记录中删除。"],
  ["第6日 14:30", "观察员靠近玻璃时读数稳定上升，离开后回落。"],
  ["第9日 ——", "对象开始回看监控镜头。"],
];
logEl.innerHTML = LOG.map(([time, text]) => `<li hidden><time>${time}</time><span data-text="${text}"></span></li>`).join("");
const logItems = [...logEl.querySelectorAll<HTMLLIElement>("li")];
let logHover = 0, logNear = 0;
p4.querySelector(".sheet")!.addEventListener("pointermove", () => { logNear = 1; });
p4.querySelector(".sheet")!.addEventListener("pointerleave", () => { logNear = 0; });

function drawLog(p: number) {
  const n = LOG.length, f = smooth(.05, .85, p) * n;
  logItems.forEach((li, i) => {
    const span = li.querySelector("span")!, text = span.dataset.text!;
    const k = clamp(f - i);
    li.hidden = k <= 0;
    span.textContent = text.slice(0, Math.ceil(text.length * k));
    span.classList.toggle("typing", k > 0 && k < 1);
  });
  logHover += (logNear - logHover) * .05;
  const v = 1.2 + smooth(.05, .85, p) * 2.6 + logHover * 1.6;
  meterFill.style.width = `${clamp(v / 6) * 100}%`;
  meterFill.classList.toggle("hot", v > 4.2);
  meterVal.textContent = v.toFixed(1);
}

/* ======================= 第 5 页：影像解封 ======================= */
const p5 = $("#p5"), card = $<HTMLCanvasElement>("#card"), portrait = $("#portrait");
let cardImg: HTMLImageElement | null = null, cardEdges: HTMLCanvasElement | null = null;
const rings: number[] = [];
portrait.addEventListener("click", () => rings.push(performance.now()));
portrait.addEventListener("pointermove", e => {
  if (reduce) return;
  const r = portrait.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
  portrait.style.transform = `perspective(900px) rotateY(${nx * 6}deg) rotateX(${-ny * 6}deg)`;
});
portrait.addEventListener("pointerleave", () => { portrait.style.transform = ""; });
portrait.style.transition = "transform .3s cubic-bezier(.2,.7,.2,1)";

function drawCard(p: number, t: number) {
  const { ctx, w, h } = fit(card);
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, w, h);
  if (!cardImg || !cardEdges) return;
  const line = smooth(.0, .35, p), color = smooth(.35, .8, p);
  // 线稿从上往下画出
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h * line); ctx.clip();
  ctx.globalAlpha = 1 - color * .85; ctx.drawImage(cardEdges, 0, 0, w, h); ctx.restore();
  ctx.globalAlpha = color; ctx.drawImage(cardImg, 0, 0, w, h); ctx.globalAlpha = 1;
  // 点击：载波一圈圈荡开
  const now = performance.now();
  for (let i = rings.length - 1; i >= 0; i--) {
    const k = (now - rings[i]) / 1400;
    if (k > 1) { rings.splice(i, 1); continue; }
    ctx.strokeStyle = C.signal; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2 - k * 1.5;
    ctx.beginPath(); ctx.arc(w * .5, h * .43, k * w * .7, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  void t;
}

/* ======================= 主循环 ======================= */
const sections: [HTMLElement, (p: number, t: number) => void][] = [
  [p1, p => stepElements(p1, p)],
  [p2, (p, t) => { stepElements(p2, p); drawWave(p, t); }],
  [p3, drawScan],
  [p4, drawLog],
  [p5, (p, t) => { stepElements(p5, p); drawCard(p, t); }],
];
function frame(t: number) {
  for (const [el, draw] of sections) if (visible(el)) draw(progress(el), reduce ? 0 : t);
  if (!reduce) requestAnimationFrame(frame);
}
function redrawStatic() { for (const [el, draw] of sections) draw(progress(el), 0); }

Promise.allSettled([load(`${BASE}voxmute.webp`), load(`${BASE}voxmute-card.webp`)]).then(([a, b]) => {
  if (a.status === "fulfilled") { subject = a.value; subjectEdges = edges(subject); }
  if (b.status === "fulfilled") { cardImg = b.value; cardEdges = edges(cardImg, 900); }
  if (reduce) redrawStatic();
});
if (reduce) { redrawStatic(); addEventListener("resize", redrawStatic); }
else requestAnimationFrame(frame);
