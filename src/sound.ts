/* =========================================================
   配乐：全部由 Web Audio 实时合成，没有音频文件。
   - 底层：冷色调的持续和声 + 磁带底噪。纸页上声音发闷，进入监视器后滤波打开
   - 载波音：一条细正弦，音量跟随画面上的载波读数
   - 旋律：隔一阵响一个钟片单音（D 小调五声），不连成曲子
   - 音效：翻页、盖章、声波断开、扫描到部位
   浏览器不允许未经操作自动出声：默认“开”，但要等访客第一次点击/触摸/按键才真正开始。
   ========================================================= */

type Mode = "paper" | "monitor";

class Score {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private padFilter!: BiquadFilterNode;
  private carrierGain!: GainNode;
  private carrierOsc!: OscillatorNode;
  private noise!: AudioBuffer;
  private bellTimer = 0;
  private carrier = 0;
  on = false;

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    // 轻微压缩，防止音效叠加时爆音
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // 噪声样本（底噪和音效共用）
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { b = .97 * b + .03 * (Math.random() * 2 - 1); d[i] = b * 3; } // 偏暖的“粉噪”

    // 持续和声：D2、A2、C3、F3，每个音两只略微失谐的振荡器
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = "lowpass"; this.padFilter.frequency.value = 380; this.padFilter.Q.value = .7;
    const pad = ctx.createGain(); pad.gain.value = .07;
    this.padFilter.connect(pad).connect(this.master);
    for (const f of [73.42, 110, 130.81, 174.61]) {
      for (const det of [-6, 5]) {
        const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f; o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = f < 100 ? .5 : .28;
        o.connect(g).connect(this.padFilter); o.start();
      }
    }
    // 极慢的滤波起伏，让和声在“呼吸”
    const lfo = ctx.createOscillator(); lfo.frequency.value = .05;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 120;
    lfo.connect(lfoAmt).connect(this.padFilter.frequency); lfo.start();

    // 磁带底噪
    const hiss = ctx.createBufferSource(); hiss.buffer = this.noise; hiss.loop = true;
    const hf = ctx.createBiquadFilter(); hf.type = "bandpass"; hf.frequency.value = 2400; hf.Q.value = .5;
    const hg = ctx.createGain(); hg.gain.value = .012;
    hiss.connect(hf).connect(hg).connect(this.master); hiss.start();

    // 载波：348 Hz（87 Hz 的两个八度之上，笔记本扬声器也听得见），带一点颤音
    this.carrierOsc = ctx.createOscillator(); this.carrierOsc.type = "sine"; this.carrierOsc.frequency.value = 348;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
    const vibAmt = ctx.createGain(); vibAmt.gain.value = 1.5;
    vib.connect(vibAmt).connect(this.carrierOsc.frequency); vib.start();
    this.carrierGain = ctx.createGain(); this.carrierGain.gain.value = 0;
    this.carrierOsc.connect(this.carrierGain).connect(this.master); this.carrierOsc.start();
  }

  async toggle() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    this.on = !this.on;
    if (this.on) {
      await ctx.resume();
      this.master.gain.setTargetAtTime(.9, ctx.currentTime, .6);
      this.scheduleBell(2.5);
    } else {
      this.master.gain.setTargetAtTime(0, ctx.currentTime, .25);
      clearTimeout(this.bellTimer);
    }
    return this.on;
  }

  /** 纸页闷、监视器亮 */
  setMode(mode: Mode) {
    if (!this.ctx) return;
    this.padFilter.frequency.setTargetAtTime(mode === "monitor" ? 950 : 380, this.ctx.currentTime, .8);
  }

  /** 0–1：载波读数 */
  setCarrier(v: number) {
    if (!this.ctx || !this.on) return;
    v = Math.max(0, Math.min(1, v));
    if (Math.abs(v - this.carrier) < .01) return;
    this.carrier = v;
    const t = this.ctx.currentTime;
    this.carrierGain.gain.setTargetAtTime(v * .05, t, .12);
    this.carrierOsc.frequency.setTargetAtTime(348 + v * 24, t, .2);
  }

  /** 钴蓝色的钟片单音：D 小调五声音阶，随机间隔 */
  private scheduleBell(delay: number) {
    clearTimeout(this.bellTimer);
    this.bellTimer = window.setTimeout(() => {
      if (!this.on) return;
      const notes = [587.33, 698.46, 880, 1046.5, 1174.66]; // D5 F5 A5 C6 D6
      this.bell(notes[Math.floor(Math.random() * notes.length)], .05);
      this.scheduleBell(6 + Math.random() * 7);
    }, delay * 1000);
  }

  bell(freq = 880, level = .06) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [mult, amp] of [[1, 1], [2.76, .35], [5.4, .12]] as const) {   // 钟片的非整数泛音
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level * amp, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + 3.2 / mult);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 3.5);
    }
  }

  private burst(dur: number, type: BiquadFilterType, freq: number, level: number, q = 1) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur);
  }

  /** 翻页：一声纸张的摩擦 */
  page() { this.burst(.35, "bandpass", 1800, .08, .6); }

  /** 盖章：低沉的一下 */
  stamp() {
    if (!this.ctx || !this.on) return;
    this.burst(.12, "lowpass", 300, .35);
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + .15);
    const g = ctx.createGain(); g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + .3);
  }

  /** 声波断开：短促的高频“咔” */
  snip() { this.burst(.06, "highpass", 3500, .25); }

  /** 扫描到一个部位：极短的提示音 */
  blip() {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = 1320;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2200;
    const g = ctx.createGain(); g.gain.setValueAtTime(.03, t); g.gain.exponentialRampToValueAtTime(.0001, t + .09);
    o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + .1);
  }
}

export const score = new Score();
