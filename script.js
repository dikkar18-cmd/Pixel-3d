// ---------------- SETUP ----------------
let scene, camera, renderer, group;
let pixels = [];
let PIXEL_COUNT = 15625; // dense pixels
let PIXEL_SIZE = 1.2;

let targetZoom = 400;
let currentZoom = 400;

let humanModel, eiffelModel, burjModel; // store 3D models

const loader = new THREE.GLTFLoader();

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.z = currentZoom;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  group = new THREE.Group();
  scene.add(group);

  createInitialSphere();

  // Load 3D models
  loader.load('human.glb', gltf => {
    humanModel = gltf.scene;
    humanModel.scale.set(50,50,50);
    humanModel.visible = false;
    group.add(humanModel);
  });
  loader.load('eiffel.gltf', gltf => {
    eiffelModel = gltf.scene;
    eiffelModel.scale.set(0.5,0.5,0.5);
    eiffelModel.visible = false;
    group.add(eiffelModel);
  });
  loader.load('burjkhalifa.glb', gltf => {
    burjModel = gltf.scene;
    burjModel.scale.set(0.05,0.05,0.05);
    burjModel.visible = false;
    group.add(burjModel);
  });

  setupDragTouch();
  setupZoom();

  const drawBtn = document.getElementById("drawBtn");
  const promptInput = document.getElementById("prompt");
  drawBtn.onclick = () => interpretPrompt(promptInput.value);
}

// ---------------- PIXEL CREATION ----------------
function createInitialSphere() {
  pixels = [];
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  for (let i = 0; i < PIXEL_COUNT; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / PIXEL_COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    const r = 120;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions.push(x, y, z);
    const hue = Math.random() * 360;
    const color = new THREE.Color(`hsl(${hue}, 80%, 60%)`);
    colors.push(color.r, color.g, color.b);

    pixels.push({ x, y, z, tx: x, ty: y, tz: z, color });
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: PIXEL_SIZE,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8
  });

  const points = new THREE.Points(geometry, material);
  group.add(points);
}

// ---------------- SHAPE GENERATOR ----------------
function setShape(shape) {
  const count = pixels.length;
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;

    if (shape === "sphere") {
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const r = 120;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);

    } else if (shape === "cube") {
      const grid = Math.ceil(Math.cbrt(count));
      const spacing = 200 / grid;
      const layer = Math.floor(i / (grid*grid));
      const row = Math.floor((i / grid) % grid);
      const col = i % grid;
      x = col*spacing - 100;
      y = row*spacing - 100;
      z = layer*spacing - 100;

    } else if (shape === "pyramid") {
      const layers = 25;
      const pixelsPerLayer = Math.floor(count / layers);
      const layer = Math.floor(i / pixelsPerLayer);
      const indexInLayer = i % pixelsPerLayer;
      const gridLayer = Math.ceil(Math.sqrt(pixelsPerLayer));
      const side = (layers - layer) * 10;
      const row = Math.floor(indexInLayer / gridLayer);
      const col = indexInLayer % gridLayer;
      x = col*(side/gridLayer) - side/2;
      y = row*(side/gridLayer) - side/2;
      z = layer*10 - layers*5;

    } else if (shape === "cone") {
      const layers = 20;
      const layer = Math.floor(Math.random()*layers);
      const radius = (layers-layer)*6;
      const angle = Math.random()*Math.PI*2;
      x = radius*Math.cos(angle);
      y = radius*Math.sin(angle);
      z = layer*10 - layers*5;

    } else if (shape === "cylinder") {
      const radius = 80;
      const height = 200;
      const angle = Math.random()*Math.PI*2;
      x = radius*Math.cos(angle);
      y = radius*Math.sin(angle);
      z = Math.random()*height - height/2;

    } else if (shape === "torus") {
      const R = 100, r = 30;
      const a = Math.random()*Math.PI*2;
      const b = Math.random()*Math.PI*2;
      x = (R + r*Math.cos(b))*Math.cos(a);
      y = (R + r*Math.cos(b))*Math.sin(a);
      z = r*Math.sin(b);

    } else if (shape === "heart") {
      const t = (i / count) * Math.PI * 8;
      const u = Math.random() * Math.PI;
      x = 16*Math.pow(Math.sin(t),3)*12;
      y = -(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*12;
      z = (u-0.5)*60;

    } else if (shape === "square") {
      const grid = Math.ceil(Math.sqrt(count));
      const row = Math.floor(i/grid);
      const col = i%grid;
      const side = 200;
      x = col*(side/grid) - side/2;
      y = row*(side/grid) - side/2;
      z = 0;
    }

    pixels[i].tx = x;
    pixels[i].ty = y;
    pixels[i].tz = z;
  }
}

// ---------------- PROMPT ----------------
function interpretPrompt(text){
  text = text.toLowerCase();

  // Hide all 3D models by default
  if(humanModel) humanModel.visible = false;
  if(eiffelModel) eiffelModel.visible = false;
  if(burjModel) burjModel.visible = false;

  let shape = "sphere";
  let useModel = false;

  if(text.includes("cube")) shape="cube";
  if(text.includes("sphere")) shape="sphere";
  if(text.includes("cone")) shape="cone";
  if(text.includes("cylinder")) shape="cylinder";
  if(text.includes("pyramid")) shape="pyramid";
  if(text.includes("torus")) shape="torus";
  if(text.includes("heart")) shape="heart";
  if(text.includes("square")) shape="square";
  if(text.includes("human")) { useModel=true; humanModel.visible=true; }
  if(text.includes("eiffel")) { useModel=true; eiffelModel.visible=true; }
  if(text.includes("burj")) { useModel=true; burjModel.visible=true; }

  group.children[0].visible = !useModel; // hide pixels if model is visible

  if(!useModel) setShape(shape);
}

// ---------------- ANIMATE ----------------
function animate(){
  requestAnimationFrame(animate);

  const positions = group.children[0].geometry.attributes.position.array;

  for(let i=0;i<pixels.length;i++){
    const p = pixels[i];
    p.x += (p.tx - p.x)*0.02;
    p.y += (p.ty - p.y)*0.02;
    p.z += (p.tz - p.z)*0.02;

    positions[i*3] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;
  }

  group.children[0].geometry.attributes.position.needsUpdate = true;

  group.rotation.y += 0.002;
  group.rotation.x += 0.001;

  camera.position.z += (targetZoom - camera.position.z)*0.05;

  renderer.render(scene,camera);
}

// ---------------- DRAG & TOUCH ----------------
function setupDragTouch(){
  let isDragging=false;
  let prev={x:0,y:0};

  function start(x,y){ isDragging=true; prev={x,y}; }
  function move(x,y){
    if(!isDragging) return;
    const dx=x-prev.x;
    const dy=y-prev.y;
    group.rotation.y += dx*0.01;
    group.rotation.x += dy*0.01;
    prev={x,y};
  }
  function end(){ isDragging=false; }

  renderer.domElement.addEventListener("mousedown", e=>start(e.clientX,e.clientY));
  renderer.domElement.addEventListener("mousemove", e=>move(e.clientX,e.clientY));
  renderer.domElement.addEventListener("mouseup", end);
  renderer.domElement.addEventListener("mouseleave", end);

  renderer.domElement.addEventListener("touchstart", e=>start(e.touches[0].clientX,e.touches[0].clientY));
  renderer.domElement.addEventListener("touchmove", e=>{ move(e.touches[0].clientX,e.touches[0].clientY); e.preventDefault(); });
  renderer.domElement.addEventListener("touchend", end);
  renderer.domElement.addEventListener("touchcancel", end);
}

// ---------------- ZOOM CONTROL ----------------
function setupZoom(){
  renderer.domElement.addEventListener("dblclick", ()=>{
    if(targetZoom===400) targetZoom=200;
    else targetZoom=400;
  });

  let lastDistance=0;
  renderer.domElement.addEventListener("touchmove", e=>{
    if(e.touches.length===2){
      e.preventDefault();
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const distance=Math.sqrt(dx*dx+dy*dy);
      if(lastDistance){
        const diff=distance-lastDistance;
        targetZoom -= diff;
        if(targetZoom<50) targetZoom=50;
        if(targetZoom>1000) targetZoom=1000;
      }
      lastDistance=distance;
    }
  });
  renderer.domElement.addEventListener("touchend", e=>{
    if(e.touches.length<2) lastDistance=0;
  });
}