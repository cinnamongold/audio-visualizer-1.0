const canvas = document.getElementById('bg');
const gl = canvas.getContext('webgl');
let count = 0;
const particles = [];
const MAX_PARTICLES = 1200;

// webgl setup
function resize() {
  canvas.width = innerWidth; canvas.height = innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize); resize();

const vs = `attribute vec2 p; attribute float s; attribute float a; varying float v;
void main(){gl_Position=vec4(p,0,1);gl_PointSize=s;v=a;}`;
const fs = `precision mediump float; varying float v;
void main(){float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(1,0.7,0.2,smoothstep(0.5,0.0,d)*v);}`;

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog); gl.useProgram(prog);

const pLoc = gl.getAttribLocation(prog, 'p');
const sLoc = gl.getAttribLocation(prog, 's');
const aLoc = gl.getAttribLocation(prog, 'a');

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, MAX_PARTICLES * 4 * 4, gl.DYNAMIC_DRAW);

gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(sLoc); gl.vertexAttribPointer(sLoc, 1, gl.FLOAT, false, 16, 8);
gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 1, gl.FLOAT, false, 16, 12);

gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

function spawn() {
  if (particles.length > MAX_PARTICLES) return;
  const cx = 0, cy = -0.2;
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.8;
    particles.push({
      x: cx + Math.cos(angle) * 0.05, y: cy + Math.sin(angle) * 0.05,
      vx: Math.cos(angle) * speed * 0.01, vy: Math.sin(angle) * speed * 0.01 - 0.005,
      size: 4 + Math.random() * 12, life: 1.0, decay: 0.008 + Math.random() * 0.01
    });
  }
}

function loop() {
  const data = new Float32Array(particles.length * 4);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy -= 0.0003; p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const idx = i * 4;
    data[idx] = p.x; data[idx+1] = p.y; data[idx+2] = p.size; data[idx+3] = p.life;
  }
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.POINTS, 0, particles.length);
  requestAnimationFrame(loop);
}
loop();

// counter logic
const counterEl = document.getElementById('counter');
const PAD = 5;

function renderCount(val) {
  const str = val.toString().padStart(PAD, '0');
  counterEl.innerHTML = '';
  for (let char of str) {
    const wrap = document.createElement('div');
    wrap.className = 'digit';
    const track = document.createElement('div');
    track.className = 'digit-track';
    track.innerHTML = `<div class="digit-val">${char}</div><div class="digit-val">${char}</div>`;
    wrap.appendChild(track);
    counterEl.appendChild(wrap);
  }
}

function animateIncrement(newVal) {
  const oldStr = count.toString().padStart(PAD, '0');
  const newStr = newVal.toString().padStart(PAD, '0');
  const digits = counterEl.children;

  for (let i = 0; i < PAD; i++) {
    if (oldStr[i] !== newStr[i]) {
      const track = digits[i].querySelector('.digit-track');
      track.innerHTML = `<div class="digit-val">${oldStr[i]}</div><div class="digit-val">${newStr[i]}</div>`;
      requestAnimationFrame(() => track.style.transform = 'translateY(-100%)');
      setTimeout(() => track.innerHTML = `<div class="digit-val">${newStr[i]}</div><div class="digit-val">${newStr[i]}</div>`, 460);
    }
  }
  count = newVal;
}

renderCount(0);

document.getElementById('btn').addEventListener('click', () => {
  animateIncrement(count + 1);
  spawn();
});