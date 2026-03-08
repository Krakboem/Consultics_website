/* WordPress equivalent: assets/js/main.js
   Enqueue via: wp_enqueue_script() in functions.php */

// ── HERO CANVAS + HAMBURGER ──
    // Hamburger
    const btn = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      menu.classList.toggle('open');
    });

    // ── Network canvas ──
    const canvas = document.getElementById('networkCanvas');
    const ctx    = canvas.getContext('2d');
    let W, H, nodes, stars;

    const NODE_COUNT  = 110;
    const STAR_COUNT  = 60;
    const MAX_DIST    = 250;
    const SPEED       = 0.22;

    // ── New-connection flash state ──
    let sparkEvent   = null;   // { nodeA, nodeB, flashNode, progress: 0..1 }
    let sparkTimer   = null;
    let persistedEdges = [];   // [{ nodeA, nodeB }] — connections that "stay" after a spark

    // Max distance for a spark connection — slightly above normal edge dist
    const SPARK_MAX_DIST = MAX_DIST * 1.4;

    function triggerSpark() {
      // Find two nodes that are close enough to feel like a real new connection
      let a, b, attempts = 0;
      do {
        a = Math.floor(Math.random() * nodes.length);
        b = Math.floor(Math.random() * nodes.length);
        if (a === b) continue;
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < SPARK_MAX_DIST) break;
        attempts++;
      } while (attempts < 200);

      if (attempts >= 200) {
        // Fallback: just pick any two different nodes
        a = 0; b = 1;
      }

      const flashIdx = Math.random() < 0.5 ? a : b;
      sparkEvent = {
        nodeA:     nodes[a],
        nodeB:     nodes[b],
        flashNode: nodes[flashIdx],
        progress:  0          // 0 → 1 over ~90 frames (~1.5 s at 60 fps)
      };
      // Schedule next spark: 6–10 seconds from now
      const delay = 6000 + Math.random() * 4000;
      sparkTimer = setTimeout(triggerSpark, delay);
    }

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function mkNode() {
      return {
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r:  Math.random() * 2.2 + 1.0
      };
    }

    function mkStar() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.8 + 0.2,
        a: Math.random() * 0.5 + 0.1
      };
    }

    function init() {
      resize();
      nodes = Array.from({length: NODE_COUNT}, mkNode);
      stars = Array.from({length: STAR_COUNT},  mkStar);
      // First spark fires after 8 s
      sparkTimer = setTimeout(triggerSpark, 8000);
    }

    function drawSpark() {
      if (!sparkEvent) return;
      const sp = sparkEvent;
      const p  = sp.progress;   // 0 → 1

      // Compute the "normal edge" style for these two nodes at their current distance
      const dx0  = sp.nodeA.x - sp.nodeB.x;
      const dy0  = sp.nodeA.y - sp.nodeB.y;
      const dist0 = Math.sqrt(dx0*dx0 + dy0*dy0);
      // Use the dist at the moment of the spark for a stable reference t
      const edgeT = Math.max(0, 1 - dist0 / MAX_DIST);

      // ── Phase 1 (p 0→0.45): bright spark line draws from nodeA toward nodeB ──
      if (p <= 0.45) {
        const t = p / 0.45;   // 0→1 within phase
        const ex = sp.nodeA.x + (sp.nodeB.x - sp.nodeA.x) * t;
        const ey = sp.nodeA.y + (sp.nodeB.y - sp.nodeA.y) * t;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sp.nodeA.x, sp.nodeA.y);
        ctx.lineTo(ex, ey);
        const alpha = Math.sin(t * Math.PI) * 0.9 + 0.1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth   = 1.8;
        ctx.shadowColor = 'rgba(180, 230, 255, 0.9)';
        ctx.shadowBlur  = 12;
        ctx.stroke();
        ctx.restore();
      }

      // ── Phase 2 (p 0.45→0.75): full bright line + white burst on flashNode ──
      // ── Phase 3 (p 0.75→1.0):  line cross-fades from bright → normal edge colour ──
      if (p > 0.45) {
        const phase2end = 0.75;

        // Line: bright white until 0.75, then cross-fade to normal edge colour
        let lineR, lineG, lineB, lineA;
        if (p <= phase2end) {
          // Bright white
          lineR = 255; lineG = 255; lineB = 255;
          lineA = 0.85;
        } else {
          // Lerp from bright white → normal edge rgba
          const fade = (p - phase2end) / (1 - phase2end);   // 0→1
          const normalA = edgeT * edgeT * 0.7;
          const normalR = 40  + edgeT * 180;
          const normalG = 160 + edgeT * 80;
          lineR = Math.round(255 + (normalR - 255) * fade);
          lineG = Math.round(255 + (normalG - 255) * fade);
          lineB = Math.round(255 + (255      - 255) * fade);
          lineA = 0.85 + (normalA - 0.85) * fade;
          lineA = Math.max(0, lineA);
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sp.nodeA.x, sp.nodeA.y);
        ctx.lineTo(sp.nodeB.x, sp.nodeB.y);
        ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},${lineA.toFixed(3)})`;
        ctx.lineWidth   = p <= phase2end ? 1.6 : (1.6 + (edgeT * 1.2 - 1.6) * ((p - phase2end) / (1 - phase2end)));
        ctx.stroke();
        ctx.restore();

        // White radial burst on flashNode (phase 2 only, fades by 0.75)
        const burstT = p <= phase2end
          ? (p - 0.45) / (phase2end - 0.45)   // 0→1
          : 1;
        const burstR     = sp.flashNode.r * (4 + burstT * 26);
        const burstAlpha = (1 - burstT) * (1 - burstT) * 0.85;
        if (burstAlpha > 0.01) {
          const burst = ctx.createRadialGradient(
            sp.flashNode.x, sp.flashNode.y, 0,
            sp.flashNode.x, sp.flashNode.y, burstR
          );
          burst.addColorStop(0,   `rgba(255, 255, 255, ${burstAlpha.toFixed(3)})`);
          burst.addColorStop(0.3, `rgba(200, 240, 255, ${(burstAlpha * 0.6).toFixed(3)})`);
          burst.addColorStop(1,   'rgba(0, 80, 200, 0)');
          ctx.save();
          ctx.beginPath();
          ctx.arc(sp.flashNode.x, sp.flashNode.y, burstR, 0, Math.PI * 2);
          ctx.fillStyle = burst;
          ctx.fill();
          ctx.restore();
        }
      }

      // Advance — full animation ~90 frames ≈ 1.5 s
      sp.progress += 1 / 90;
      if (sp.progress >= 1) {
        // Persist the connection as a permanent extra edge
        persistedEdges.push({ nodeA: sp.nodeA, nodeB: sp.nodeB });
        sparkEvent = null;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background — flat dark matching site palette
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, W, H);

      // Subtle radial vignette to give text area depth (same feel as before)
      const bg = ctx.createRadialGradient(W*0.3, H*0.75, 0, W*0.5, H*0.6, W*0.85);
      bg.addColorStop(0,   'rgba(0,0,0,0)');
      bg.addColorStop(1,   'rgba(0,0,0,0.45)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Static tiny star-dots scattered everywhere
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(180,220,255,${s.a})`;
        ctx.fill();
      }

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      // ── Edges ──
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < MAX_DIST) {
            const t = 1 - dist / MAX_DIST;
            // Bright cyan-white core line
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${Math.round(40 + t*180)}, ${Math.round(160 + t*80)}, 255, ${(t*t*0.7).toFixed(3)})`;
            ctx.lineWidth = t * 1.2;
            ctx.stroke();
          }
        }
      }

      // ── Persisted spark edges (follow their nodes as they move) ──
      for (const e of persistedEdges) {
        const dx   = e.nodeA.x - e.nodeB.x;
        const dy   = e.nodeA.y - e.nodeB.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Use a fixed "close-distance" t so the line stays visible even if nodes drift apart
        const t = Math.max(0.25, 1 - dist / (MAX_DIST * 1.4));
        ctx.beginPath();
        ctx.moveTo(e.nodeA.x, e.nodeA.y);
        ctx.lineTo(e.nodeB.x, e.nodeB.y);
        ctx.strokeStyle = `rgba(${Math.round(40 + t*180)}, ${Math.round(160 + t*80)}, 255, ${(t*t*0.7).toFixed(3)})`;
        ctx.lineWidth = t * 1.2;
        ctx.stroke();
      }

      // ── Spark overlay (drawn above edges, below nodes) ──
      drawSpark();

      // ── Nodes ──
      for (const n of nodes) {
        // Large soft glow
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 10);
        halo.addColorStop(0,   'rgba(40, 180, 255, 0.20)');
        halo.addColorStop(0.4, 'rgba(20, 100, 220, 0.08)');
        halo.addColorStop(1,   'rgba(0,  50, 160, 0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 10, 0, Math.PI*2);
        ctx.fillStyle = halo;
        ctx.fill();

        // If this is the flash node in phase 2 — boost its core brightness
        const isFlash = sparkEvent && sparkEvent.flashNode === n && sparkEvent.progress > 0.45;
        const flashBoost = isFlash
          ? (1 - (sparkEvent.progress - 0.45) / 0.55)
          : 0;

        // Bright core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1 + flashBoost * 1.8), 0, Math.PI*2);
        ctx.fillStyle = flashBoost > 0.05
          ? `rgba(255, 255, 255, ${(0.95 + flashBoost * 0.05).toFixed(2)})`
          : 'rgba(180, 235, 255, 0.95)';
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();



// ── ABOUT CANVAS ──
(function initAbout() {
  var ac = document.getElementById('aboutCanvas');
  if (!ac) { setTimeout(initAbout, 100); return; }
  var parent = ac.parentElement;
  var W, H, ctx;
  function resize() {
    W = parent.offsetWidth || 560;
    H = parent.offsetHeight || 460;
    ac.width = W; ac.height = H;
    ctx = ac.getContext('2d');
  }
  resize();

  var ROT = 0;
  var ROT_SPEED = 0.0014;
  var TILT = 0.30;

  // ── Continent outline points [lat, lon] ───────────────────────────
  // Dense point clouds tracing real coastlines
  var landPts = [
    // Western Europe
    [36,-5],[37,-2],[38,0],[39,0],[40,-1],[41,1],[42,2],[43,3],[44,2],[45,1],
    [46,2],[47,1],[48,0],[49,-1],[50,-2],[51,-3],[51,0],[52,1],[53,1],[54,0],
    [55,-2],[56,-3],[57,-4],[58,-4],[59,-3],[60,-2],[58,6],[57,8],[56,9],[55,10],
    [54,10],[54,12],[55,13],[56,14],[57,16],[58,16],[59,18],[60,18],[60,22],
    [61,24],[62,26],[63,26],[64,26],[65,25],[66,24],[67,26],[68,28],[69,28],
    [70,25],[71,25],[70,22],[69,18],[68,14],[67,14],[66,14],[65,14],[64,14],
    [63,14],[62,14],[61,12],[60,10],[59,10],[58,12],[57,12],[56,12],[55,12],
    // Southern Europe / Med
    [37,14],[38,15],[38,16],[37,15],[36,14],[36,12],[37,11],[38,10],[39,9],
    [40,8],[41,8],[42,9],[43,8],[44,8],[45,13],[46,14],[47,12],[46,16],[45,15],
    [44,14],[43,16],[42,18],[41,20],[40,20],[39,20],[38,22],[37,22],[36,24],
    [36,26],[37,28],[38,28],[39,28],[40,26],[41,28],[42,28],[40,30],[40,32],
    // North Africa
    [37,10],[36,8],[35,6],[34,4],[33,2],[32,-2],[31,-4],[30,-6],[29,-8],
    [28,-10],[27,-12],[26,-14],[25,-14],[24,-16],[23,-16],[22,-18],[21,-16],
    [20,-16],[18,-16],[16,-16],[15,-14],[14,-12],[13,-10],[12,-10],[11,-12],
    [10,-14],[9,-14],[8,-12],[6,-10],[5,-8],[4,-6],[4,-2],[4,2],[5,4],
    [4,6],[4,8],[6,10],[8,12],[10,14],[12,14],[14,14],[16,12],[18,14],
    [20,14],[22,14],[24,12],[26,12],[28,12],[30,12],[32,12],[30,14],[28,16],
    [26,16],[24,18],[22,18],[20,18],[18,18],[16,20],[14,22],[12,22],[10,22],
    [8,22],[6,24],[4,24],[2,20],[0,18],[-2,16],[-4,14],[-6,12],[-8,10],
    [-10,14],[-12,14],[-14,14],[-16,12],[-18,12],[-20,14],[-22,16],[-24,18],
    [-26,18],[-28,18],[-30,18],[-32,18],[-34,20],[-34,22],[-32,24],[-30,26],
    [-28,28],[-26,30],[-24,32],[-22,34],[-20,36],[-18,36],[-16,36],[-14,36],
    [-12,34],[-10,34],[-8,32],[-6,32],[-4,32],[-2,34],[0,36],[2,38],[4,40],
    [-26,32],[-28,30],[-30,28],[-32,26],[-34,26],[-26,28],
    // Arabian Peninsula / Middle East
    [12,44],[14,44],[16,42],[18,40],[20,38],[22,36],[24,36],[26,36],[28,34],
    [30,32],[32,34],[34,36],[36,36],[38,36],[36,38],[34,38],[32,38],
    [22,58],[20,58],[18,56],[16,54],[14,50],[12,48],[14,44],
    // South Asia
    [8,76],[8,78],[10,80],[12,80],[14,80],[16,82],[18,84],[20,86],[22,88],
    [24,88],[22,86],[20,86],[18,84],[16,82],[14,80],[22,70],[20,70],[18,72],
    [20,74],[22,72],[24,72],[26,70],[28,70],[30,70],[32,72],[34,74],[36,74],
    [34,76],[32,78],[30,78],[28,76],[26,74],[24,74],[8,78],[10,80],[12,80],
    // Southeast Asia / East Asia coastline
    [22,114],[22,120],[22,122],[24,122],[26,120],[28,118],[26,116],[24,116],
    [20,110],[18,108],[16,108],[14,108],[12,106],[10,104],[8,98],[6,100],
    [4,102],[2,104],[0,104],[-2,106],[-4,108],[-6,108],[-8,114],[-8,116],
    [-6,106],[-4,104],[-2,102],[0,108],[-2,110],[-4,112],[-6,114],
    [18,120],[20,122],[22,122],[24,122],[26,122],[28,122],[30,122],[32,122],
    [34,120],[36,120],[38,120],[38,118],[36,118],[34,118],[32,116],[30,114],
    [28,112],[38,122],[40,124],[42,130],[44,134],[46,136],[48,140],[50,140],
    [52,142],[54,142],[56,140],[58,140],[60,140],[62,138],[64,140],[66,140],
    // Japan
    [30,130],[32,130],[34,130],[36,136],[36,138],[38,140],[40,140],[42,142],
    [44,144],[34,132],[32,132],[30,132],
    // Russian Far East / Siberia coast
    [68,180],[66,178],[64,176],[62,174],[60,162],[58,160],[56,162],[54,158],
    [52,156],[50,152],[60,150],[62,148],[64,144],[66,142],[68,140],[70,136],
    [72,132],[70,130],[68,128],[66,126],[68,120],[70,114],[72,106],[70,100],
    [68,90],[70,80],[72,72],[70,62],[68,58],[66,52],[68,46],[70,44],[72,52],
    [74,60],[74,70],[74,80],[74,90],[74,100],[74,110],[74,120],[74,130],
    // North America - East Coast
    [25,-80],[26,-80],[28,-80],[30,-82],[30,-84],[32,-80],[34,-78],[36,-76],
    [38,-76],[40,-74],[42,-70],[44,-68],[46,-64],[48,-64],[50,-66],[52,-56],
    [54,-58],[56,-60],[58,-62],[60,-64],[62,-66],[64,-64],[64,-62],[62,-64],
    [60,-66],[58,-68],[56,-60],[54,-56],[52,-56],[60,-64],[62,-68],[64,-66],
    [66,-62],[68,-56],[70,-52],[72,-54],[74,-58],[76,-64],[78,-72],[76,-80],
    [74,-84],[72,-88],[70,-84],[68,-80],[66,-76],[64,-72],[62,-70],
    // North America - West Coast
    [20,-106],[22,-106],[24,-110],[26,-112],[28,-114],[30,-116],[32,-118],
    [34,-120],[36,-122],[38,-124],[40,-124],[42,-124],[44,-124],[46,-124],
    [48,-124],[50,-126],[52,-128],[54,-130],[56,-130],[58,-134],[60,-146],
    [58,-136],[56,-132],[54,-128],[52,-128],[62,-150],[64,-162],[66,-168],
    [68,-166],[70,-162],[72,-156],[70,-148],[68,-140],[66,-136],[64,-132],
    // Gulf of Mexico / Caribbean
    [25,-90],[24,-88],[22,-90],[20,-88],[18,-88],[16,-88],[14,-88],[12,-84],
    [10,-84],[12,-82],[14,-80],[16,-78],[18,-76],[20,-74],[22,-76],[24,-78],
    [26,-78],[28,-82],[30,-86],[30,-88],[28,-90],[26,-90],
    // South America - East
    [12,-70],[10,-62],[8,-60],[6,-52],[4,-52],[2,-50],[0,-50],[-2,-50],
    [-4,-36],[-6,-34],[-8,-34],[-10,-36],[-12,-38],[-14,-38],[-16,-40],
    [-18,-40],[-20,-40],[-22,-42],[-24,-44],[- 26,-48],[-28,-48],[-30,-50],
    [-32,-52],[-34,-54],[-36,-56],[-38,-58],[-40,-62],[-42,-64],[-44,-66],
    [-46,-66],[-48,-68],[-50,-68],[-52,-68],[-54,-68],[-56,-68],
    // South America - West
    [-54,-70],[-52,-72],[-50,-74],[-48,-72],[-46,-74],[-44,-74],[-42,-72],
    [-40,-72],[-38,-72],[-36,-72],[-34,-72],[-32,-72],[-30,-72],[-28,-70],
    [-26,-70],[-24,-70],[-22,-70],[-20,-70],[-18,-70],[-16,-74],[-14,-76],
    [-12,-78],[-10,-78],[-8,-78],[-6,-78],[-4,-78],[-2,-80],[0,-80],
    [2,-76],[4,-76],[6,-76],[8,-76],[10,-74],[12,-72],
    // Australia
    [-14,126],[-14,128],[-14,132],[-14,136],[-14,140],[-14,142],
    [-16,146],[-18,148],[-20,148],[-22,150],[-24,152],[-26,152],[-28,154],
    [-30,154],[-32,152],[-34,152],[-36,150],[-38,148],[-38,146],[-36,138],
    [-34,136],[-32,134],[-32,130],[-30,116],[-28,114],[-26,114],[-24,114],
    [-22,114],[-20,118],[-18,122],[-16,124],[-14,126],
    [-34,138],[-36,140],[-38,142],[-38,144],[-36,144],[-34,142],[-32,140],
    // New Zealand
    [-36,174],[-38,176],[-40,176],[-42,172],[-44,170],[-46,168],[-44,172],
    [-42,174],[-40,174],
    // Greenland
    [76,-26],[76,-22],[76,-18],[74,-18],[72,-22],[70,-24],[68,-26],[68,-28],
    [70,-28],[72,-28],[74,-28],[76,-28],[78,-26],[80,-20],[82,-18],[84,-26],
    [82,-30],[80,-32],[78,-30],
    // Iceland
    [64,-22],[64,-20],[64,-18],[64,-14],[64,-12],[66,-14],[66,-18],[66,-22],
    [66,-24],[64,-24],
  ];

  // City nodes [lat, lon]
  var cities = [
    [51.5,-0.1],[48.8,2.3],[52.5,13.4],[41.9,12.5],[40.4,-3.7],[55.7,37.6],
    [40.7,-74.0],[34.0,-118.2],[41.8,-87.6],[19.4,-99.1],
    [35.6,139.7],[31.2,121.5],[39.9,116.4],[1.35,103.8],[28.6,77.2],
    [30.0,31.2],[-26.2,28.0],[25.2,55.3],[-23.5,-46.6],[-33.9,151.2],
    [59.9,10.7],[47.5,19.0],[37.5,127.0],[6.5,3.4],[19.1,72.9],
  ];

  var connections = [
    [0,1],[0,5],[1,2],[1,3],[0,4],[0,20],[2,21],
    [6,7],[6,8],[6,9],[6,18],
    [10,11],[10,12],[11,12],[11,13],[14,15],
    [15,16],[16,17],[17,14],
    [0,6],[0,10],[6,10],[1,15],[5,12],[14,17],[18,19],
    [22,10],[23,15],[24,14],[20,2],[21,2],
  ];

  function latLonTo3D(lat, lon) {
    var phi   = (90-lat)*Math.PI/180;
    var theta = lon*Math.PI/180;
    return {
      x: Math.sin(phi)*Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi)*Math.sin(theta)
    };
  }

  function project(p3, cx, cy, R) {
    var cosR=Math.cos(ROT), sinR=Math.sin(ROT);
    var x1= p3.x*cosR + p3.z*sinR;
    var z1=-p3.x*sinR + p3.z*cosR;
    var y1= p3.y;
    var cosT=Math.cos(TILT), sinT=Math.sin(TILT);
    var y2= y1*cosT - z1*sinT;
    var z2= y1*sinT + z1*cosT;
    var fov=3.2, sc=fov/(fov+z2);
    return { sx: cx+x1*sc*R, sy: cy-y2*sc*R, z: z2, vis: z2>-0.10 };
  }

  function drawArc(pa, pb, cx, cy, R, alpha) {
    var STEPS=36, points=[];
    for (var i=0;i<=STEPS;i++) {
      var t=i/STEPS;
      var ix=pa.x*(1-t)+pb.x*t, iy=pa.y*(1-t)+pb.y*t, iz=pa.z*(1-t)+pb.z*t;
      var l=Math.sqrt(ix*ix+iy*iy+iz*iz);
      points.push(project({x:ix/l,y:iy/l,z:iz/l},cx,cy,R));
    }
    if (points.filter(function(p){return p.vis;}).length < STEPS*0.3) return;
    ctx.beginPath(); var s=false;
    points.forEach(function(p){
      if(!p.vis){s=false;return;}
      if(!s){ctx.moveTo(p.sx,p.sy);s=true;}else ctx.lineTo(p.sx,p.sy);
    });
    ctx.strokeStyle='rgba(100,200,255,'+alpha.toFixed(3)+')';
    ctx.lineWidth=0.9; ctx.stroke();
  }

  var packets = connections.map(function(){
    return {t:Math.random(), speed:0.0025+Math.random()*0.003};
  });

  function aDraw() {
    ctx.clearRect(0,0,W,H);
    ROT += ROT_SPEED;
    var cx=W*0.50, cy=H*0.50;
    var R=Math.min(W,H)*0.43;

    // Clip to sphere
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();

    // Very subtle sphere fill — almost transparent, just a hint of depth
    var sph=ctx.createRadialGradient(cx-R*0.3,cy-R*0.3,0,cx,cy,R);
    sph.addColorStop(0,'rgba(30,80,180,0.10)');
    sph.addColorStop(1,'rgba(5,20,60,0.22)');
    ctx.fillStyle=sph; ctx.fillRect(0,0,W,H);

    // ── Lat/lon grid — clean white-blue lines ─────────────────────
    ctx.lineWidth=0.5;
    for (var lat=-80;lat<=80;lat+=20) {
      var pts=[];
      for (var lon=-180;lon<=180;lon+=3)
        pts.push(project(latLonTo3D(lat,lon),cx,cy,R));
      ctx.beginPath(); var s=false;
      pts.forEach(function(p){if(!p.vis){s=false;return;}if(!s){ctx.moveTo(p.sx,p.sy);s=true;}else ctx.lineTo(p.sx,p.sy);});
      ctx.strokeStyle='rgba(80,160,255,0.22)'; ctx.stroke();
    }
    for (var lo2=-180;lo2<180;lo2+=20) {
      var pts2=[];
      for (var la2=-85;la2<=85;la2+=3)
        pts2.push(project(latLonTo3D(la2,lo2),cx,cy,R));
      ctx.beginPath(); var s2=false;
      pts2.forEach(function(p){if(!p.vis){s2=false;return;}if(!s2){ctx.moveTo(p.sx,p.sy);s2=true;}else ctx.lineTo(p.sx,p.sy);});
      ctx.strokeStyle='rgba(80,160,255,0.22)'; ctx.stroke();
    }

    // ── Continent dots ────────────────────────────────────────────
    landPts.forEach(function(c) {
      var pp=project(latLonTo3D(c[0],c[1]),cx,cy,R);
      if (!pp.vis) return;
      var vis=Math.max(0, Math.min(1, (pp.z+0.15)/1.15));
      ctx.beginPath(); ctx.arc(pp.sx,pp.sy, 1.6+vis*0.8, 0,Math.PI*2);
      ctx.fillStyle='rgba(140,210,255,'+(0.25+vis*0.60).toFixed(3)+')';
      ctx.fill();
    });

    // ── Network arcs ─────────────────────────────────────────────
    connections.forEach(function(c,i) {
      var pa=latLonTo3D(cities[c[0]][0],cities[c[0]][1]);
      var pb=latLonTo3D(cities[c[1]][0],cities[c[1]][1]);
      var ppa=project(pa,cx,cy,R), ppb=project(pb,cx,cy,R);
      if (!ppa.vis&&!ppb.vis) return;
      var vis=Math.max(0,((ppa.z+ppb.z)*0.5+0.3)/1.3);
      drawArc(pa,pb,cx,cy,R, 0.15+vis*0.55);
    });

    // ── Data packets ──────────────────────────────────────────────
    connections.forEach(function(c,i) {
      packets[i].t=(packets[i].t+packets[i].speed)%1;
      var t=packets[i].t;
      var pa=latLonTo3D(cities[c[0]][0],cities[c[0]][1]);
      var pb=latLonTo3D(cities[c[1]][0],cities[c[1]][1]);
      var ix=pa.x*(1-t)+pb.x*t, iy=pa.y*(1-t)+pb.y*t, iz=pa.z*(1-t)+pb.z*t;
      var l=Math.sqrt(ix*ix+iy*iy+iz*iz);
      var pp=project({x:ix/l,y:iy/l,z:iz/l},cx,cy,R);
      if (!pp.vis) return;
      var vis=Math.max(0,(pp.z+0.2)/1.2);
      ctx.beginPath(); ctx.arc(pp.sx,pp.sy,2.5,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,'+(vis*0.9).toFixed(2)+')'; ctx.fill();
      var g=ctx.createRadialGradient(pp.sx,pp.sy,0,pp.sx,pp.sy,7);
      g.addColorStop(0,'rgba(180,230,255,'+(vis*0.6).toFixed(2)+')');
      g.addColorStop(1,'rgba(80,180,255,0)');
      ctx.beginPath(); ctx.arc(pp.sx,pp.sy,7,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    });

    // ── City dots — bright white with blue glow ───────────────────
    cities.forEach(function(c) {
      var pp=project(latLonTo3D(c[0],c[1]),cx,cy,R);
      if (!pp.vis) return;
      var vis=Math.max(0,(pp.z+0.2)/1.2);
      // Glow
      var g=ctx.createRadialGradient(pp.sx,pp.sy,0,pp.sx,pp.sy,10);
      g.addColorStop(0,'rgba(180,230,255,'+(vis*0.50).toFixed(2)+')');
      g.addColorStop(1,'rgba(60,160,255,0)');
      ctx.beginPath(); ctx.arc(pp.sx,pp.sy,10,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
      // Core
      ctx.beginPath(); ctx.arc(pp.sx,pp.sy,2.8,0,Math.PI*2);
      ctx.fillStyle='rgba(230,248,255,'+(vis*0.95).toFixed(2)+')'; ctx.fill();
    });

    ctx.restore();

    // Atmosphere rim
    var atmo=ctx.createRadialGradient(cx,cy,R*0.86,cx,cy,R*1.12);
    atmo.addColorStop(0,'rgba(60,140,255,0.00)');
    atmo.addColorStop(0.5,'rgba(80,170,255,0.22)');
    atmo.addColorStop(1,'rgba(30,100,220,0.00)');
    ctx.beginPath(); ctx.arc(cx,cy,R*1.12,0,Math.PI*2);
    ctx.fillStyle=atmo; ctx.fill();

    requestAnimationFrame(aDraw);
  }

  aDraw();
  window.addEventListener('resize', function(){ resize(); });
})();


// ── SCROLL-TO-TOP BUTTON ──
// Show/hide scroll-to-top button
var scrollBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', function() {
  if (window.scrollY > 300) {
    scrollBtn.style.opacity = '0.7';
    scrollBtn.style.transform = 'scale(1)';
  } else {
    scrollBtn.style.opacity = '0';
    scrollBtn.style.transform = 'scale(0.8)';
  }
});
scrollBtn.addEventListener('mouseenter', function() { this.style.opacity = '1'; });
scrollBtn.addEventListener('mouseleave', function() { this.style.opacity = window.scrollY > 300 ? '0.7' : '0'; });


// ── NAV HIDE ON SCROLL ──
// Hide nav on scroll down, show on scroll up
(function() {
  var nav = document.querySelector('nav');
  var lastY = 0;
  var ticking = false;

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var currentY = window.scrollY;
        var delta = currentY - lastY;
        if (delta > 4 && currentY > 80) {
          // Scrolling down — hide
          nav.style.transform = 'translateY(-100%)';
        } else if (delta < -4 || currentY <= 80) {
          // Scrolling up — show
          nav.style.transform = 'translateY(0)';
        }
        lastY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  });
})();


// ── ABOUT BACKGROUND CANVAS ──
// Subtle background network inside About section
window.addEventListener('load', function() {
  var bc = document.getElementById('bgCanvas');
  if (!bc) return;
  var bx = bc.getContext('2d');
  var BW, BH, bnodes = [];

  function bResize() {
    BW = bc.width  = bc.parentElement.offsetWidth;
    BH = bc.height = bc.parentElement.offsetHeight;
  }

  bResize();

  // Fewer nodes but clustered into 3-4 groups so they form rich networks
  var clusters = [
    { cx: BW*0.20, cy: BH*0.30 },
    { cx: BW*0.55, cy: BH*0.55 },
    { cx: BW*0.80, cy: BH*0.25 },
    { cx: BW*0.40, cy: BH*0.75 }
  ];

  for (var c = 0; c < clusters.length; c++) {
    for (var i = 0; i < 18; i++) {
      var angle = Math.random() * Math.PI * 2;
      var radius = Math.random() * 160;
      bnodes.push({
        x: clusters[c].cx + Math.cos(angle)*radius,
        y: clusters[c].cy + Math.sin(angle)*radius,
        vx: (Math.random()-.5)*0.15,
        vy: (Math.random()-.5)*0.15,
        r: Math.random()*1.2+0.5
      });
    }
  }

  function bDraw() {
    bx.clearRect(0, 0, BW, BH);
    for (var i = 0; i < bnodes.length; i++) {
      var n = bnodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > BW) n.vx *= -1;
      if (n.y < 0 || n.y > BH) n.vy *= -1;
    }
    // Longer connection distance = bigger denser networks
    for (var i = 0; i < bnodes.length; i++) {
      for (var j = i+1; j < bnodes.length; j++) {
        var dx = bnodes[i].x-bnodes[j].x, dy = bnodes[i].y-bnodes[j].y;
        var d = Math.sqrt(dx*dx+dy*dy);
        if (d < 220) {
          var t = 1-d/220;
          bx.beginPath();
          bx.moveTo(bnodes[i].x, bnodes[i].y);
          bx.lineTo(bnodes[j].x, bnodes[j].y);
          bx.strokeStyle = 'rgba(255,255,255,'+(t*t*0.18).toFixed(3)+')';
          bx.lineWidth = 0.6;
          bx.stroke();
        }
      }
    }
    for (var i = 0; i < bnodes.length; i++) {
      bx.beginPath();
      bx.arc(bnodes[i].x, bnodes[i].y, bnodes[i].r, 0, Math.PI*2);
      bx.fillStyle = 'rgba(255,255,255,0.28)';
      bx.fill();
    }
    requestAnimationFrame(bDraw);
  }
  bDraw();
  window.addEventListener('resize', function() { bResize(); });
});


// ── SERVICES CANVAS ──
// ── Services canvas: subtle network, same DNA as hero (cyan-blue nodes + gradient lines) ──
(function() {
  function initSvc() {
    var sc = document.getElementById('servicesCanvas');
    if (!sc) { setTimeout(initSvc, 100); return; }
    var sx = sc.getContext('2d');
    var SW, SH, snodes = [];
    var S_COUNT = 80, S_DIST = 240, S_SPEED = 0.18;

    function sResize() {
      SW = sc.width = sc.offsetWidth;
      SH = sc.height = sc.offsetHeight;
      snodes = [];
      for (var i = 0; i < S_COUNT; i++) {
        snodes.push({
          x: Math.random() * SW,
          y: Math.random() * SH,
          vx: (Math.random() - 0.5) * S_SPEED,
          vy: (Math.random() - 0.5) * S_SPEED,
          r: Math.random() * 1.5 + 0.5
        });
      }
    }

    function sDraw() {
      sx.clearRect(0, 0, SW, SH);
      for (var i = 0; i < snodes.length; i++) {
        snodes[i].x += snodes[i].vx;
        snodes[i].y += snodes[i].vy;
        if (snodes[i].x < 0 || snodes[i].x > SW) snodes[i].vx *= -1;
        if (snodes[i].y < 0 || snodes[i].y > SH) snodes[i].vy *= -1;
      }
      // Gradient lines — exact same palette as hero
      for (var i = 0; i < snodes.length; i++) {
        for (var j = i + 1; j < snodes.length; j++) {
          var dx = snodes[i].x - snodes[j].x;
          var dy = snodes[i].y - snodes[j].y;
          var d = Math.sqrt(dx*dx + dy*dy);
          if (d < S_DIST) {
            var fade = (1 - d / S_DIST);
            var g = sx.createLinearGradient(snodes[i].x, snodes[i].y, snodes[j].x, snodes[j].y);
            g.addColorStop(0, 'rgba(120,210,255,' + (fade * 0.6).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(70,130,255,' + (fade * 0.3).toFixed(3) + ')');
            sx.beginPath();
            sx.moveTo(snodes[i].x, snodes[i].y);
            sx.lineTo(snodes[j].x, snodes[j].y);
            sx.strokeStyle = g;
            sx.lineWidth = 0.9;
            sx.stroke();
          }
        }
      }
      // Nodes — same white-blue dots as hero
      for (var i = 0; i < snodes.length; i++) {
        sx.beginPath();
        sx.arc(snodes[i].x, snodes[i].y, snodes[i].r, 0, Math.PI*2);
        sx.fillStyle = 'rgba(200,230,255,0.75)';
        sx.fill();
      }
      requestAnimationFrame(sDraw);
    }

    sResize();
    sDraw();
    window.addEventListener('resize', sResize);
  }
  initSvc();
})();


// ── JOIN US CANVAS ──
// ── Join Us canvas: hero-style network — same node count, speed, colors, gradient lines ──
// No background fill: section bg is #1a1a1a, same as rest of site
(function() {
  function initJoin() {
    var jc = document.getElementById('joinCanvas');
    if (!jc) { setTimeout(initJoin, 100); return; }
    var jx = jc.getContext('2d');
    var JW, JH, jnodes = [];
    var J_COUNT = 110, J_DIST = 250, J_SPEED = 0.22;

    function jResize() {
      JW = jc.width = jc.offsetWidth;
      JH = jc.height = jc.offsetHeight;
      jnodes = [];
      for (var i = 0; i < J_COUNT; i++) {
        jnodes.push({
          x: Math.random() * JW,
          y: Math.random() * JH,
          vx: (Math.random() - 0.5) * J_SPEED,
          vy: (Math.random() - 0.5) * J_SPEED,
          r: Math.random() * 1.8 + 0.6
        });
      }
    }

    function jDraw() {
      jx.clearRect(0, 0, JW, JH);

      // Subtle radial vignette — same as hero, stays on #1a1a1a
      var vgn = jx.createRadialGradient(JW*0.5, JH*0.5, 0, JW*0.5, JH*0.5, Math.max(JW,JH)*0.7);
      vgn.addColorStop(0, 'rgba(20,22,32,0.0)');
      vgn.addColorStop(1, 'rgba(10,10,18,0.55)');
      jx.fillStyle = vgn;
      jx.fillRect(0, 0, JW, JH);

      for (var i = 0; i < jnodes.length; i++) {
        jnodes[i].x += jnodes[i].vx;
        jnodes[i].y += jnodes[i].vy;
        if (jnodes[i].x < 0 || jnodes[i].x > JW) jnodes[i].vx *= -1;
        if (jnodes[i].y < 0 || jnodes[i].y > JH) jnodes[i].vy *= -1;
      }

      // Gradient lines — identical palette to hero
      for (var i = 0; i < jnodes.length; i++) {
        for (var k = i + 1; k < jnodes.length; k++) {
          var dx = jnodes[i].x - jnodes[k].x;
          var dy = jnodes[i].y - jnodes[k].y;
          var d = Math.sqrt(dx*dx + dy*dy);
          if (d < J_DIST) {
            var fade = (1 - d / J_DIST);
            var g = jx.createLinearGradient(jnodes[i].x, jnodes[i].y, jnodes[k].x, jnodes[k].y);
            g.addColorStop(0, 'rgba(120,210,255,' + (fade * 0.65).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(70,130,255,' + (fade * 0.35).toFixed(3) + ')');
            jx.beginPath();
            jx.moveTo(jnodes[i].x, jnodes[i].y);
            jx.lineTo(jnodes[k].x, jnodes[k].y);
            jx.strokeStyle = g;
            jx.lineWidth = 0.9;
            jx.stroke();
          }
        }
      }

      // Nodes — same white-blue dots as hero
      for (var i = 0; i < jnodes.length; i++) {
        jx.beginPath();
        jx.arc(jnodes[i].x, jnodes[i].y, jnodes[i].r, 0, Math.PI*2);
        jx.fillStyle = 'rgba(200,230,255,0.75)';
        jx.fill();
      }
      requestAnimationFrame(jDraw);
    }

    jResize();
    jDraw();
    window.addEventListener('resize', jResize);
  }
  initJoin();
})();
