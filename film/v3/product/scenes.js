(async function () {
  const I = await fetch('assets/v3-intent-public.json').then(r => r.json());
  const B = [0,16,29.041667,45.753709,53.904584,62.913709,73.705126,89.779834,102.667];
  const P = { paper:'#f3f5f2', ink:'#192720', green:'#235e3d', mint:'#b5e5c2', muted:'#52665a', line:'#cfddd1' };
  let G, F;
  const clamp = v => Math.max(0,Math.min(1,v));
  const prog = (t,a,b) => clamp((t-a)/(b-a));
  const ease = v => 1-Math.pow(1-v,4);
  const mix = (a,b,p) => a+(b-a)*p;
  const wt = (x,y) => [96+x*1.2,y*1.2];
  const media = [document.getElementById('refund-wait'), document.getElementById('refund-done')];
  for (const v of media) ST.waitFor(new Promise((resolve,reject) => {
    if(v.readyState>=2) resolve();
    else {
      v.addEventListener('loadeddata',resolve,{once:true});
      v.addEventListener('error',()=>reject(new Error('Recorded demo clip failed to load')),{once:true});
    }
  }), 'genuine recorded product footage');
  ST.adapter('recorded-refund-time', async t => {
    if(t<B[5] || t>=B[6]) return;
    const local=t-B[5], index=local<4.2?0:1;
    const v=media[index], target=Math.min(v.duration-1/30,Math.max(0,index===0?local:local-4.2))+1/60;
    if(Math.abs(v.currentTime-target)<.008 && v.readyState>=2) return;
    await new Promise((resolve,reject) => {
      const timeout=setTimeout(()=>reject(new Error('Recorded product seek timed out')),10000);
      v.addEventListener('seeked',()=>{clearTimeout(timeout);resolve();},{once:true});
      v.currentTime=target;
    });
    // ST runs adapters together; redraw only once this frame's source seek is ready.
    Film.seek(t);
  });
  function text(s,x,y,size=60,color=P.ink,extra={}) {
    return F.text(s,x,y,{size,color,weight:500,family:'"Geist"',...extra});
  }
  function mono(s,x,y,size=60,color=P.ink,extra={}) {
    return F.text(s,x,y,{size,color,weight:400,family:'"Geist Mono"',...extra});
  }
  function rise(s,x,y,t,at,size=76,color=P.ink,extra={}) {
    const u=ease(prog(t,at,at+.5));
    G.save();G.beginPath();G.rect(0,y-size*1.15,1920,size*1.6);G.clip();
    text(s,x,y+size*.5*(1-u),size,color,{alpha:u,...extra});G.restore();
  }
  function revealMono(s,x,y,t,at,size=100,color=P.ink,extra={}) {
    const u=ease(prog(t,at,at+.45));
    mono(s,x+45*(1-u),y,size,color,{alpha:u,...extra});
  }
  function background(t) {
    G.fillStyle=P.paper;G.fillRect(0,0,1920,1080);
    const light=G.createRadialGradient(460+40*Math.sin(t*.17),220,40,700,400,1300);
    light.addColorStop(0,'#ffffff');light.addColorStop(1,'#e7eee6');
    G.fillStyle=light;G.fillRect(0,0,1920,1080);
  }
  function label(s,x=90,y=92,color=P.green) { text(s,x,y,36,color); }
  function line(x1,y1,x2,y2,u=1,color=P.green,w=3) {
    F.line(x1,y1,mix(x1,x2,u),mix(y1,y2,u),{color,width:w});
  }
  function imageWorld(name) {
    G.save();G.beginPath();G.rect(96,0,1728,1080);G.clip();
    F.drawImage(name,96,0,1728,1080,{fit:'fill'});G.restore();
  }
  function ui(name,t,keys) {
    const cam=F.camera(t,keys);
    F.withCamera(cam,()=>imageWorld(name));
  }
  function band(title,sub,t,at=0) {
    G.fillStyle=P.paper;G.fillRect(0,0,1920,165);
    rise(title,90,98,t,at,65);
    if(sub) text(sub,1830,97,36,P.green,{align:'right'});
  }
  function foot(s,t,at=0) {
    G.fillStyle=P.paper;G.fillRect(0,978,1920,102);
    rise(s,90,1010,t,at,38,P.muted);
  }
  function amount(value,name,x,y,t,at,size=130,color=P.ink) {
    rise(name,x,y-110,t,at,38,P.muted,{align:'center'});
    revealMono(value,x,y,t,at+.08,size,color,{align:'center'});
    rise('ETH',x,y+70,t,at+.2,36,P.green,{align:'center'});
  }
  function fullHash(h,x,y,size=36) { mono(h,x,y,size,P.ink); }
  function opening(local,p,t) {
    background(t);
    ui('quote',local,[[0,1035,570,1.33],[1.8,1050,596,1.36],[4.2,1130,650,1.6],[7,1050,670,1.5],[11,1180,630,1.32],[16,1070,560,1.27]]);
    G.fillStyle=P.paper;G.fillRect(0,0,980,1080);
    label('LastWei / payment value sponsorship');
    text('One tiny gap.',86,268,106);
    mono('0.0003',86,455,176,P.green);
    text('ETH missing.',92,532,54,P.muted);
    if(local<3.4) {
      const q=prog(local,0,3.4);
      line(90,598,810,598,.7,P.green,18);
      line(597,598,810,598,.2+.8*q,P.mint,18);
      text('One 0.001 ETH checkout.',92,755,49);
    } else {
      const q=ease(prog(local,3.4,4.2));
      G.fillStyle=P.paper;G.fillRect(0,580,980,500);
      amount('0.0007','Owner contribution',260,737,local,3.4,79);
      amount('0.0003','Sponsor shortfall',700,737,local,3.52,79);
      F.glyph('plus',482,715,40,{color:P.green,alpha:q});
      const joined=ease(prog(local,8,9));
      line(115,862,848,862,joined,P.green,4);
      if(local>8) revealMono('0.0010 ETH',482,987,local,8.25,80,P.ink,{align:'center'});
      else rise('Only the exact shortfall.',92,949,local,4.5,49);
    }
    if(local>11.2) {
      G.fillStyle=P.paper;G.fillRect(0,572,980,76);
      rise('Bound to one signed action.',92,620,local,11.2,46,P.green);
    }
  }
  function checkout(local,p,t) {
    background(t);
    ui('quote',local,[[0,960,540,1.02],[2.4,...wt(580,460),1.7],[5.6,...wt(610,520),2.45],[8.4,...wt(610,580),2.5],[10.7,...wt(910,680),1.72],[13.041667,960,540,1.12]]);
    band('One checkout. Exact shortfall.','Base Sepolia / test ETH',local);
    if(local>3.2 && local<7.6) {
      G.fillStyle=P.paper;G.fillRect(1115,600,805,330);
      rise('Owner contributes',1170,693,local,3.2,54);
      revealMono('0.0007 ETH',1170,803,local,3.35,77,P.green);
    } else if(local>=7.6) {
      G.fillStyle=P.paper;G.fillRect(1115,600,805,330);
      rise('Sponsor covers',1170,693,local,7.6,54);
      revealMono('0.0003 ETH',1170,803,local,7.75,77,P.green);
    }
    foot('Actual product UI. No wallet required for the public demo.',local,.4);
  }
  function signedFields(local,p,t) {
    background(t);
    if(local<6.8) {
      label('The completed run / actual signed constraints');
      rise('One payment instruction.',90,192,local,0,83);
      const rows=[['Destination',I.target],['Payment',`${I.valueETH} ETH / owner ${I.contributionETH} ETH`],['Calldata hash',I.dataHash],['Nonce',I.nonce],['Deadline',I.deadline],['Account / chain',`${I.account} / ${I.chainId}`]];
      const cam=F.camera(local,[[0,960,540,1],[2,970,548,1.01],[4.5,975,550,1.012],[6.8,960,540,1]]);
      F.withCamera(cam,()=>{
        rows.forEach(([name,value],i)=>{
          const y=312+i*114, at=.15+i*.10, u=ease(prog(local,at,at+.45));
          G.save();G.globalAlpha=u;G.translate(45*(1-u),0);
          if(i===Math.min(5,Math.floor(local/1.05))) {G.fillStyle='#e0ede1';G.fillRect(66,y-64,1788,104);}
          text(name,95,y,38,P.muted);
          if(value.length>52) {mono(value.slice(0,38),555,y-22,37);mono(value.slice(38),555,y+27,37);}
          else mono(value,555,y,40);
          line(90,y+55,1830,y+55,u,P.line,1);G.restore();
        });
      });
      text('EIP-712 / account and chain bound',90,1010,38,P.green);
    } else {
      const u=local-6.8;
      ui('executed',u,[[0,960,540,1.12],[2,...wt(1120,425),1.65],[4.4,...wt(1040,570),2.1],[6.8,...wt(1050,680),2.05],[9.912,960,600,1.22]]);
      band('The signed checkout completes.','Recorded Base Sepolia result',u);
      if(u>2.3 && u<6.8) {
        G.fillStyle=P.paper;G.fillRect(0,650,870,326);
        rise('Full checkout value',90,751,u,2.3,52);
        revealMono('0.001 ETH',90,855,u,2.4,86,P.green);
        rise('Relayer pays execution gas.',90,934,u,2.65,37,P.muted);
      }
      foot('The published beneficiary receives a non-transferable demo receipt.',u,.35);
    }
  }
  function receipts(local,p,t) {
    background(t);
    ui('executed',local,[[0,960,670,1.3],[2.2,...wt(1090,735),1.9],[4.7,...wt(1090,755),2.2],[8.15,1090,710,1.85]]);
    band('The proof is public.','Base Sepolia / chain 84532',local);
    G.fillStyle=P.paper;G.fillRect(0,753,1920,327);
    rise('Funding and execution receipts',90,823,local,.15,48);
    text('Fund',90,910,36,P.muted);fullHash(I.receiptHashes.funding,280,910);
    text('Execute',90,989,36,P.muted);fullHash(I.receiptHashes.execution,280,989);
    line(90,1048,1820,1048,ease(prog(local,.6,1.4)),P.green,3);
  }
  function expiry(local,p,t) {
    background(t);
    label('Separate expiry / refund run / mechanism illustration');
    rise('The deadline changes the outcome.',90,230,local,0,85);
    const expired=ease(prog(local,1.8,2.6));
    mono('block.timestamp',95,371,54,P.muted);mono('>= deadline',730,371,54,expired>.5?P.green:P.muted);
    G.save();
    const push=1+.09*prog(local,3,9.009125);
    G.translate(960,660);G.scale(push,push);G.translate(-960,-660);
    if(local<3) {
      amount('0.0010','Locked payment',960,686,local,.35,171);
      line(578,804,1342,804,ease(prog(local,.3,1.2)),P.green,5);
    } else {
      const q=ease(prog(local,3,4));
      amount('0.0007','Owner contribution unlocked',mix(860,520,q),670,local,3,108);
      amount('0.0003','Sponsor refund credit',mix(1060,1400,q),670,local,3.1,108);
      rise('reclaim(intentId) releases escrow',960,477,local,3,45,P.green,{align:'center'});
      if(local>5.2) {
        const q2=ease(prog(local,5.2,6.2));
        line(1180,815,1750,815,q2,P.green,5);
        F.glyph('right',1750,815,45,{color:P.green,alpha:q2});
        rise('Sponsor withdraws',1400,949,local,5.25,54,P.green,{align:'center'});
      }
    }
    G.restore();
    if(local>1.8) rise('Execution is no longer allowed.',90,1004,local,1.8,43,P.muted);
  }
  function recordedRefund(local,p,t) {
    background(t);
    const v=media[local<4.2?0:1];
    const cam=F.camera(local,[[0,1460,845,1.45],[2.3,1460,1035,1.92],[4.15,1440,1060,2.05],[4.2,1450,875,1.6],[6.5,1470,950,1.96],[8.8,1450,1070,2.15],[10.791,1440,1020,1.92]]);
    F.withCamera(cam,()=>{
      G.save();G.beginPath();G.rect(1122,0,702,1215);G.clip();
      if(v.readyState>=2) G.drawImage(v,0,0,v.videoWidth,v.videoHeight,96,0,1728,1215);
      G.restore();
    });
    band('Expiry. Reclaim. Sponsor withdrawal.','Separate expiry / refund run',local);
    G.fillStyle=P.paper;G.fillRect(0,842,1920,238);
    if(local<4.2) {
      rise('Waiting time shortened',90,918,local,.3,55);
      rise('Actual recording / original source time 70–76 seconds',90,1014,local,.5,38,P.muted);
    } else if(local<7.8) {
      rise('Reclaim releases the escrow.',90,925,local,4.2,65);
      rise('The original recording resumes at 121 seconds.',90,1014,local,4.4,38,P.muted);
    } else {
      rise('The sponsor withdraws the refund.',90,925,local,7.8,65);
      revealMono('0.0003 ETH',1410,1014,local,7.95,52,P.green);
      rise('Gas is separate.',90,1014,local,8,38,P.muted);
    }
  }
  function walletReview(local,p,t) {
    background(t);
    ui('wallet',local,[[0,960,540,1.01],[3.0,...wt(485,520),1.92],[6.0,...wt(490,570),2.15],[8.5,...wt(1130,600),1.75],[11.6,...wt(1090,745),2.6],[14.8,...wt(1100,700),2.25],[16.0747,960,570,1.15]]);
    band('Your account. Your signed request.','Wallet flow / test ETH',local);
    if(local>8.3) {
      G.fillStyle=P.paper;G.fillRect(0,590,750,388);
      rise('Inspect before funding.',90,705,local,8.3,68);
      revealMono('0.0003 ETH',90,809,local,8.5,70,P.green);
      rise('Exact value + separate gas',90,902,local,8.7,39,P.muted);
    }
    foot('This review uses the genuine completed request decoded from its public funding transaction.',local,.3);
  }
  function evidenceClose(local,p,t) {
    background(t);
    if(local<8.5) {
      ui('evidence',local,[[0,960,530,1.08],[2,...wt(665,580),1.52],[4.5,...wt(700,700),1.85],[7.2,...wt(670,785),1.58],[8.5,960,560,1.15]]);
      band('Open source. Source verified.','Base Sepolia prototype',local);
      foot('Source matching establishes reproducibility. This prototype is unaudited.',local,.3);
    } else {
      const u=local-8.5;
      ui('executed',u,[[0,1250,540,1.26],[2,1315,615,1.4],[4.387,1300,620,1.46]]);
      G.fillStyle=P.paper;G.fillRect(0,0,1030,1080);
      F.drawImage('logo',90,100,130,130);
      text('LastWei',90,360,123);
      rise('Finish the action',90,532,u,0,90);
      rise('you already chose.',90,637,u,.12,87);
      rise('Try the testnet prototype.',90,798,u,.3,45,P.green);
      text('lastwei.ajnasnb.workers.dev',90,898,43);
      text('github.com/AjnasNB/lastwei',90,951,37,P.muted);
      text('Base Sepolia / unaudited / test ETH only',90,1010,36,P.muted);
    }
  }
  const draws=[opening,checkout,signedFields,receipts,expiry,recordedRefund,walletReview,evidenceClose];
  Film.start({
    look:{base:'clean',grain:0,vignette:0,labels:false},
    palette:{bg:P.paper,ink:P.ink,accent:P.green,muted:P.muted},
    design:[1920,1080], duration:102.667, fps:30,
    fonts:[{family:'Geist',src:'assets/geist-latin-500-normal.woff2',weight:'500'},{family:'Geist',src:'assets/geist-latin-700-normal.woff2',weight:'700'},{family:'Geist Mono',src:'assets/geist-mono-latin-400-normal.woff2',weight:'400'}],
    fontFamilies:{sans:'"Geist"',mono:'"Geist Mono"'},
    images:{quote:'assets/v3-live-quote-evidence.png',executed:'assets/v3-live-executed.png',refunded:'assets/v3-live-refunded.png',wallet:'assets/v3-live-wallet-review.png',evidence:'assets/v3-live-evidence.png',protocol:'assets/v3-protocol-equation.png',logo:'assets/logo.png'},
    acts:B.slice(0,-1).map((at,i)=>[at,['The gap','Checkout','Signed constraints','Proof','Expiry','Refund','Wallet','Scope'][i]]),
    scenes(T,g,f) {G=g;F=f;F.sequence(T,draws.map((draw,i)=>({t0:B[i],t1:B[i+1],draw,in:'cut'})));},
  });
})();
