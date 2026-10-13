(async function () {
  const [I, SOURCE] = await Promise.all([
    fetch('assets/intent.json').then(r => r.json()),
    fetch('assets/tests-source.json').then(r => r.json()),
  ]);
  let G, F;
  const human = document.getElementById('founder');
  function portrait() {
    if (!G || !human || human.readyState < 2) return;
    G.save(); G.setTransform(G.canvas.width / 1920, 0, 0, G.canvas.height / 1080, 0, 0);
    const h = human.videoWidth * 1080 / 640;
    G.drawImage(human, 0, Math.max(0, (human.videoHeight - h) / 2), human.videoWidth,
      Math.min(h, human.videoHeight), 1280, 0, 640, 1080); G.restore();
  }
  if (human) {
    human.muted = true; human.preload = 'auto'; human.load();
    ST.waitFor(new Promise((ok, no) => {
      if (human.readyState >= 2) ok();
      else { human.addEventListener('loadeddata', ok, { once: true });
        human.addEventListener('error', () => no(new Error('Founder media failed to load')), { once: true }); }
    }), 'founder footage');
    ST.adapter('founder-clock', async t => {
      const at = Math.min(110.11, Math.max(0, t)) + 1 / 60;
      if (Math.abs(human.currentTime - at) >= .008) {
        await new Promise((ok, no) => {
          const timeout = setTimeout(() => no(new Error('Founder seek timeout')), 10000);
          human.addEventListener('seeked', () => { clearTimeout(timeout); ok(); }, { once: true });
          human.currentTime = at;
        });
      }
      portrait();
    });
  }
  const INK = '#192720', GREEN = '#235e3d', MINT = '#b5e5c2', PAPER = '#f3f5f2', MUTED = '#354b3d';
  const intervals = [0, 4.4, 19.2, 31.57, 39.21, 44.37, 53.39, 63, 74.03, 80.43, 91.63, 101.39, 110.133];
  const p = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const ease = v => 1 - Math.pow(1 - v, 4);
  const soft = v => .5 - .5 * Math.cos(Math.PI * v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const short = (s, a = 13, b = 10) => s.length > a + b + 3 ? s.slice(0, a) + '...' + s.slice(-b) : s;
  const deadline = new Date(Number(I.deadline) * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  function text(s, x, y, size = 60, color = INK, align = 'left', mono = false, decor = false) {
    F.text(String(s), x, y, { size, color, align, weight: mono ? 400 : 500, family: mono ? 'mono' : 'sans', decor });
  }
  function enter(s, x, y, t, at, size = 60, color = INK, align = 'left', mono = false) {
    const v = ease(p(t, at, at + .4));
    G.save(); G.beginPath(); G.rect(0, y - size * 1.1, 1280, size * 1.6); G.clip();
    G.globalAlpha = v; text(s, x, y + (1 - v) * size * .7, size, color, align, mono); G.restore();
  }
  function line(x1, y1, x2, y2, progress = 1, color = GREEN, width = 3) {
    G.strokeStyle = color; G.lineWidth = width; G.beginPath(); G.moveTo(x1, y1);
    G.lineTo(lerp(x1, x2, progress), lerp(y1, y2, progress)); G.stroke();
  }
  function route(points, u, color = GREEN, width = 3) { F.path(points, u, { color, width, smooth: true }); }
  function point(points, u) {
    const n = points.length - 1, j = Math.min(n - 1, Math.floor(u * n)), v = u * n - j;
    return [lerp(points[j][0], points[j + 1][0], soft(v)), lerp(points[j][1], points[j + 1][1], soft(v))];
  }
  function amount(value, label, x, y, size = 105, color = INK, alpha = 1) {
    G.save(); G.globalAlpha = alpha;
    text(label, x, y - size * .85, 36, MUTED, 'center');
    text(value, x, y + 13, size, color, 'center', true);
    text('ETH', x, y + size * .62, 34, color, 'center'); G.restore();
  }
  function movingAmount(value, label, t, a, b, points, size = 82, color = GREEN) {
    const u = p(t, a, b), q = point(points, u);
    route(points, u, '#aac2af', 3);
    G.save(); G.shadowColor = 'rgba(255,255,255,.95)'; G.shadowBlur = 18;
    amount(value, label, q[0], q[1], size, color); G.restore(); return q;
  }
  function capture(name, crop, alpha = 1, pan = [0, 0], zoom = 1) {
    const h = F.img[name]; if (!h || !h.ready || !h.img) return;
    const [cx, cy, cw, ch] = crop, z = Math.max(1280 / cw, 1080 / ch) * zoom;
    G.save(); G.globalAlpha = alpha;
    G.drawImage(h.img, cx, cy, cw, ch,
      (1280 - cw * z) / 2 + pan[0], (1080 - ch * z) / 2 + pan[1], cw * z, ch * z); G.restore();
  }
  function background(t, name = 'quote', strength = .15) {
    G.fillStyle = PAPER; G.fillRect(0, 0, 1920, 1080);
    capture(name, [290, 265, 1080, 635], strength,
      [-14 * Math.sin(t * .08), 8 * Math.cos(t * .06)], 1.05);
    const light = G.createLinearGradient(0, 0, 1280, 1080);
    light.addColorStop(0, 'rgba(255,255,255,.24)'); light.addColorStop(1, 'rgba(226,236,224,.18)');
    G.fillStyle = light; G.fillRect(0, 0, 1280, 1080);
  }
  // Explanatory drawing from the real signed request. Not a fabricated capture.
  function paymentDocument(t, opts = {}) {
    const { x = 640, y = 540, scale = 1, angle = 0, alpha = 1, focus = -1, state = 'Signed payment' } = opts;
    G.save(); G.translate(x, y); G.rotate(angle); G.scale(scale, scale); G.globalAlpha = alpha;
    G.shadowColor = 'rgba(25,39,32,.13)'; G.shadowBlur = 42; G.shadowOffsetX = 17; G.shadowOffsetY = 28;
    G.fillStyle = '#fff'; G.fillRect(-555, -397, 1110, 794); G.shadowColor = 'transparent';
    G.fillStyle = GREEN; G.fillRect(-555, -397, 9, 794);
    text(state, -487, -315, 50, INK); text('EIP-712', 481, -315, 35, MUTED, 'right', false, true);
    line(-487, -282, 487, -282, 1, '#dce3db', 2);
    const secondary = scale < .94;
    const rows = [['Target', short(I.target)], ['Payment value', '0.0010 ETH'],
      ['Calldata', 'purchase(beneficiary)'], ['Data hash', short(I.dataHash)],
      ['Nonce', short(I.nonce)], ['Deadline', deadline]];
    rows.forEach((row, n) => {
      const yy = -212 + n * 84;
      if (focus === n) { G.fillStyle = '#e3f0e4'; G.fillRect(-494, yy - 39, 994, 72); }
      text(row[0], -480, yy, 36, MUTED, 'left', false, secondary);
      text(row[1], -145, yy, n === 1 ? 52 : 38, INK, 'left', true, secondary);
      line(-480, yy + 29, 480, yy + 29, 1, '#e2e8e0', 1);
    });
    text('Account ' + short(I.account, 10, 8), -480, 326, 33, MUTED, 'left', true, true);
    text('Base Sepolia · 84532', 480, 326, 33, MUTED, 'right', false, true); G.restore();
  }
  function smallBand(s, y, size = 60, color = INK) {
    G.save(); G.fillStyle = PAPER; G.fillRect(0, y - size - 22, 1280, size + 65);
    text(s, 640, y, size, color, 'center'); G.restore();
  }
  function liveProof(t, a, kind = 'executed') {
    const u = t - a;
    const crop = kind === 'refunded' ? [890, 350, 470, 480]
      : u < 3.2 ? [908, 338, 435, 455] : [957, 655, 290, 245];
    capture(kind, crop, 1, [lerp(55, -15, soft(p(t, a, a + 4))), 0], u < 3.2 ? 1 : .98);
    if (u < 3.2) smallBand(kind === 'refunded' ? 'Sponsor refunded' : 'The payment completed.', 965, 68);
    else { G.fillStyle = PAPER; G.fillRect(0, 0, 1280, 180); text('Inspect the actual transaction.', 60, 119, 66); }
  }
  function codeProof(t, a) {
    const k = Math.min(3, Math.floor((t - a) / 1.6)), test = SOURCE.tests[k];
    const labels = ['Execution replay', 'Reentrancy', 'Failed-call retention', 'Sponsor-only refund'];
    G.fillStyle = INK; G.fillRect(0, 0, 1280, 1080);
    G.save(); G.translate(-12 * p(t, a + k * 1.6, a + k * 1.6 + 1.6), 0);
    text(labels[k], 70, 145, 78, '#f3f5f2'); text(SOURCE.source, 70, 218, 38, '#b5e5c2');
    line(70, 266, 1200, 266, 1, '#557361', 2);
    const block = test.lines.slice(1).filter(s => s.trim()).slice(0, 10);
    block.forEach((s, n) => {
      const str = s.replace(/^  /, '');
      text(str, 75, 346 + n * 46, 31, '#a0b5a7', 'left', true, true);
    });
    const selections = [
      ['"execute"', '"NotFunded"'],
      ['"blocked"', 'true'],
      ['"reverted"', 'sponsorships'],
      ['"withdrawRefund",', '"InvalidIntent",'],
    ];
    G.fillStyle = '#243e2d'; G.fillRect(50, 792, 1180, 208);
    selections[k].forEach((s, n) => text(s, 84, 858 + n * 66, k === 2 && n === 0 ? 34 : 43,
      '#f3f5f2', 'left', true, k === 2 && n === 0)); G.restore();
  }
  function virtualTime(t) {
    if (t < 19.2) return t;
    if (t < 19.533333) return 19.199;
    if (t < 44.703333) return t - .333333;
    if (t < 45.2) return 44.369;
    return t - .83;
  }
  function scene(realTime, g, f) {
    G = g; F = f; const t = virtualTime(realTime);
    let i = intervals.findIndex((v, n) => n < intervals.length - 1 && t >= v && t < intervals[n + 1]);
    if (i < 0) i = 11;
    const a = intervals[i], b = intervals[i + 1], u = t - a;
    G.save(); G.beginPath(); G.rect(0, 0, 1280, 1080); G.clip();
    background(t, i >= 7 ? 'executed' : 'quote', .22);
    if (i === 0) {
      capture('quote', [305, 397, 532, 286], .94, [-40 * ease(p(t, 0, 4.4)), -64], 1);
      G.fillStyle = PAPER; G.fillRect(0, 724, 1280, 356);
      text('0.0003 ETH missing', 640, 867, 95, INK, 'center', true);
      if (u > 1.4) enter('Ajnas N B · LastWei', 640, 998, t, 1.4, 48, GREEN, 'center');
    } else if (i === 1) {
      if (u < 4.8) { capture('quote', [325, 287, 510, 225], .80, [-40 * p(t, a, a + 4.8), 0], 1); smallBand('One workshop checkout', 953, 59); }
      else if (u < 9.8) {
        capture('quote', [328, 492, 505, 192], .72, [0, -15 * p(t, a + 4.8, a + 9.8)], 1);
        G.fillStyle = PAPER; G.fillRect(0, 712, 1280, 368);
        amount('0.0007', 'Owner has', 360, 834, 88); amount('0.0010', 'Action needs', 930, 834, 88);
      } else {
        paymentDocument(t, { x: 778, y: 330, scale: .79, angle: -.047, alpha: 1, focus: 1 });
        const q = point([[360, 1120], [360, 890], [360, 850]], ease(p(t, a + 9.8, a + 11.0)));
        amount('0.0003', 'Exact shortfall', q[0], q[1], 150, GREEN);
      }
    } else if (i === 2) {
      capture('quote', [303, 420, 540, 350], .33);
      paymentDocument(t, { x: 640, y: 480, scale: .50, angle: -.025, alpha: 1 });
      text('Existing workaround',640,78,35,MUTED,'center');
      const phrases = ['Leave the app', 'Buy more ETH', 'Return to checkout'], k = Math.min(2, Math.floor(u / 4.05));
      enter(phrases[k], 640, 153, t, a + k * 4.05, 74, INK, 'center');
      movingAmount('0.0003', 'The same shortfall', t, a, b - .6,
        [[280, 895], [420, 850], [720, 860], [980, 890], [910, 945], [320, 935]], 85);
    } else if (i === 3) {
      paymentDocument(t, { x: 770, y: 330, scale: .64, angle: -.035, focus: 1 });
      if (u < 3.75) movingAmount('0.0003', 'Sponsor exactly this gap', t, a, a + 3.4,
        [[310, 925], [430, 877], [640, 850]], 142);
      else {
        const v = ease(p(t, a + 3.75, a + 5.0));
        movingAmount('0.0007', 'Owner', t, a + 3.75, a + 5.0, [[220, 890], [325, 815], [435, 760]], 82, INK);
        movingAmount('0.0003', 'Sponsor', t, a + 3.75, a + 5.0, [[1060, 890], [975, 815], [845, 760]], 82);
        if (v > .8) { G.fillStyle = '#fff'; G.fillRect(300, 703, 835, 265); amount('0.0010', 'One authorized payment', 710, 855, 114, GREEN); }
      }
    } else if (i === 4) {
      capture('wallet', [877, 447, 480, 450], .24);
      const focus = t < 41.37 ? 0 : t < 41.81 ? 1 : t < 42.45 ? 3 : t < 43.61 ? 4 : 5;
      paymentDocument(t, { x: lerp(770, 640, ease(p(t, a, a + .7))), y: lerp(468, 522, ease(p(t, a, a + .7))),
        scale: lerp(.80, 1.04, ease(p(t, a, a + .7))), angle: lerp(-.035, 0, ease(p(t, a, a + .7))), focus });
      if (t > 41.6) smallBand('Calldata hash', 1010, 49, GREEN);
    } else if (i === 5) {
      const flight = ease(p(t, a + 7.3, b));
      paymentDocument(t, { x: 640 + 275 * flight, y: 495, scale: .90, angle: .025 * flight, focus: 1, state: 'Reserved for this action' });
      if (u < 4.0) {
        movingAmount('0.0007', 'Owner contribution', t, a + .2, a + 2.5, [[-150, 870], [295, 851], [430, 469]], 79, INK);
        movingAmount('0.0003', 'Sponsor shortfall', t, a + .3, a + 2.7, [[1420, 870], [987, 851], [850, 469]], 79);
        smallBand('0.0010 ETH reserved in escrow', 1010, 61, GREEN);
      } else {
        text('Gas is paid separately.', 65, 922, 64);
        text('Executor', 65 + 575 * p(t, a + 4, b), 1008, 44, GREEN);
        line(65, 948, 1200, 948, p(t, a + 4, b), '#99b4a0', 3);
      }
    } else if (i === 6) {
      if (u < 3.2) {
        paymentDocument(t, { x: lerp(915, 640, ease(p(t, a, a + 1.0))), y: 390, scale: .77, focus: 1, state: 'If call reverts: value retained' });
        movingAmount('0.0010', 'Locked payment stays intact', t, a, a + 1.3, [[1090, 795], [820, 820], [640, 880]], 92);
      } else if (u < 6.5) {
        paymentDocument(t, { x: 640, y: 345, scale: .64, angle: -.024, focus: 5, state: 'After expiry: reclaim' });
        movingAmount('0.0007', 'Owner available', t, a + 3.2, a + 4.6, [[590, 650], [450, 805], [300, 835]], 91, INK);
        movingAmount('0.0003', 'Sponsor refund credit', t, a + 3.35, a + 4.75, [[740, 650], [850, 805], [1000, 835]], 91);
      } else {
        capture('quote', [904, 545, 444, 296], .22);
        enter('Then the sponsor withdraws.', 640, 171, t, a + 6.5, 73, INK, 'center');
        movingAmount('0.0003', 'withdrawRefund', t, a + 6.5, a + 8.5, [[1000, 835], [890, 650], [640, 535]], 134);
        smallBand('Refund credit returns to the sponsor.', 990, 51, GREEN);
      }
    } else if (i === 7) {
      if (u < 7.6) liveProof(t, a, 'executed');
      else {
        capture('evidence', [957, 655, 290, 245], .14);
        G.fillStyle = '#fff'; G.fillRect(32, 35, 1216, 1010);
        text('Recorded Base Sepolia request', 70, 112, 59);
        text('Target', 70, 198, 36, MUTED);
        text(I.target, 70, 252, 43, INK, 'left', true);
        text('Calldata hash', 70, 322, 36, MUTED);
        text(I.dataHash.slice(0, 33), 70, 376, 43, INK, 'left', true);
        text(I.dataHash.slice(33), 70, 430, 43, INK, 'left', true);
        text('Nonce', 70, 500, 36, MUTED);
        text(I.nonce, 70, 554, 43, INK, 'left', true);
        text('Execution transaction', 70, 629, 36, MUTED);
        text(I.receiptHashes.execution.slice(0, 33), 70, 683, 43, GREEN, 'left', true);
        text(I.receiptHashes.execution.slice(33), 70, 737, 43, GREEN, 'left', true);
        line(70, 792, 1210, 792, ease(p(t, a + 8, a + 8.5)), MINT, 6);
        text('0.001 ETH to the signed checkout', 70, 876, 56);
        text('Chain 84532 · historical recorded intent', 70, 962, 43, MUTED);
      }
    } else if (i === 8) codeProof(t, a);
    else if (i === 9) {
      if (u < 5.5) capture('quote', [577, 447 + 19 * u, 290, 245], 1, [0, 0], 1);
      else capture('executed', [910, 340, 440, 460], 1, [-40 * p(t, a + 5.5, b), 0], 1);
      smallBand('Next experiment: merchant checkout pilot', 948, 52);
      text('Measure completion and sponsor cost',640,1015,38,MUTED,'center');
    } else if (i === 10) {
      capture('wallet', [875, 450, 482, 451], .36);
      paymentDocument(t, { x: lerp(640, 450, soft(p(t, a, b))), y: 518, scale: .81, angle: -.04, alpha: .9, state: 'Open-source prototype' });
      G.fillStyle = PAPER; G.fillRect(40, 739, 1200, 310);
      text('Base Sepolia', 85, 838, 86); text('Test ETH · chain 84532', 85, 907, 43, MUTED);
      if (u > 5.5) enter('Unaudited prototype', 85, 1015, t, a + 5.5, 72, GREEN);
    } else {
      if (u < 5.5) { capture('executed', [907, 338, 440, 458], 1, [-25 * soft(p(t, a, a + 5.5)), 0], 1); smallBand('Finish the action.', 994, 78); }
      else { capture('executed', [910, 560, 440, 275], .18); F.drawImage('logo', 220, 414, 166, 166); text('LastWei', 430, 550, 112); text('lastwei.ajnasnb.workers.dev',640,735,43,GREEN,'center'); }
    }
    G.restore(); portrait(); line(1280, 0, 1280, 1080, 1, '#dde5dc', 2);
  }
  Film.start({
    design: [1920, 1080], look: { base: 'paper', grain: .012, grainFps: 0, vignette: 0, dust: 0, labels: false },
    fontFamilies: { sans: 'Geist', mono: 'Geist Mono' },
    fonts: [
      { family: 'Geist', src: 'assets/geist-latin-500-normal.woff2', weight: 500 },
      { family: 'Geist', src: 'assets/geist-latin-700-normal.woff2', weight: 700 },
      { family: 'Geist Mono', src: 'assets/geist-mono-latin-400-normal.woff2', weight: 400 },
    ],
    images: { logo: 'assets/logo.png', quote: 'assets/v3-live-quote.png', evidence: 'assets/v3-live-evidence.png',
      executed: 'assets/v3-live-executed.png', refunded: 'assets/v3-live-refunded.png', wallet: 'assets/v3-live-wallet-review.png' },
    scenes: scene, acts: intervals.slice(0, -1).map((t, i) => [t, 'Beat ' + (i + 1)]),
  });
})();
