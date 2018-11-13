let params = {
  bgColor: '#fff',
  guideColor: '#ddd',
  showGuides: true,
  guideOpacity: 0.15,
  barWeight: 40,
  barOpacity: 0.95,
  useOrtho: false,
  barMirroring: false,
  useElement: 0, // 0..flat-bar, 1..block, 2..tube
  connections: 0, // 1..lerp-loop, 2..lerp-triangles
};

// draw a cuboid block between two points
function block(ax, ay, bx, by) {
  let d = dist(ax, ay, bx, by); // distance
  let a = atan2(by-ay, bx-ax); // angle
  let mx = ax + (bx-ax) / 2;
  let my = ay + (by-ay) / 2;

  push();
  // stroke(128); strokeWeight(1); fill(0);
  // draw endpoints (for debugging)
  // push(); translate(ax, ay); rotate(a+HALF_PI); box(10); pop();
  // push(); translate(bx, by); rotate(a+HALF_PI); box(10); pop();
  translate(mx, my);
  rotate(a+HALF_PI);
  box(params.barWeight, d, params.barWeight);
  pop();
}

// draw a cylinder between two points
function tube(ax, ay, bx, by, detail = 24) {
  let d = dist(ax, ay, bx, by); // distance
  let a = atan2(by-ay, bx-ax); // angle
  let mx = ax + (bx-ax) / 2;
  let my = ay + (by-ay) / 2;
  push();
  translate(mx, my);
  rotate(a+HALF_PI);
  cylinder(params.barWeight/2, d, detail, 1, true, true);
  pop();
}

class Shell {
  constructor(radius = 100, rpm_axis = 1, rpm_orbit1 = 5, rpm_orbit2 = 10, color = '#444') {
    this.color = color;
    this.radius = radius; // radius of the orbit
    this.radius_bpm = 6;
    this.radius_change = 0;

    this.rpm_axis = rpm_axis; // axis rotation speed [rpm]
    this.rpm_orbit1 = rpm_orbit1; // orbit1 rotation speed [rpm]
    this.rpm_orbit2 = rpm_orbit2; // orbit2 rotation speed [rpm]

    this.a_axis = 0; // axis angle
    this.a_orbit1 = 0; // orbit 1 angle
    this.a_orbit2 = 0; // orbit 2 angle

    this.lastUpdate = 0;
    this.currentRadius = radius;
  }

  update(now) {
    let dt = now - this.lastUpdate;
    this.lastUpdate = now;
    this.a_orbit1 += dt / 60000 * TWO_PI * this.rpm_orbit1;
    this.a_orbit2 += dt / 60000 * TWO_PI * this.rpm_orbit2;
    this.a_axis += dt / 60000 * TWO_PI * this.rpm_axis;

    this.currentRadius = this.radius * (1 + this.radius_change * sin(now / 60000 * TWO_PI * this.radius_bpm));
  }

  draw() {
    push();
    let c = color(params.guideColor);
    c.setAlpha(params.guideOpacity*255)
    stroke(c);
    strokeWeight(1);
    noFill();
    rotateY(this.a_axis);
    if (params.showGuides) box(10); // center
    if (params.showGuides) line (0, -this.currentRadius*1.5, 0, this.currentRadius*1.5); // y-axis

    // particle 1 (+ mirror)
    let px1 = this.currentRadius * cos(this.a_orbit1);
    let py1 = this.currentRadius * sin(this.a_orbit1);
    let mx1 = this.currentRadius * cos(this.a_orbit1 + PI);
    let my1 = this.currentRadius * sin(this.a_orbit1 + PI);
    this.px1 = px1; this.py1 = py1; this.mx1 = mx1; this.my1 = my1;
    push();
    translate( px1, py1 );
    if (params.showGuides) box(10);
    pop();

    // particle 2
    let px2 = this.currentRadius * cos(this.a_orbit2);
    let py2 = this.currentRadius * sin(this.a_orbit2);
    let mx2 = this.currentRadius * cos(this.a_orbit2 + PI);
    let my2 = this.currentRadius * sin(this.a_orbit2 + PI);
    this.px2 = px2; this.py2 = py2; this.mx2 = mx2; this.my2 = my2;
    push();
    translate( px2, py2 );
    if (params.showGuides) box(10);
    pop();

    if (params.showGuides) ellipse(0, 0, this.currentRadius*2);

    c = color(this.color);
    c.setAlpha(params.barOpacity * 255);
    if (Math.floor(params.useElement) == 1) {
      fill(c); noStroke()
      block(px1, py1, px2, py2);
      if (params.barMirroring) { block(mx1, my1, mx2, my2); }
    } else if (Math.floor(params.useElement) == 2) {
      fill(c); noStroke()
      tube(px1, py1, px2, py2);
      if (params.barMirroring) { tube(mx1, my1, mx2, my2); }
    } else {
      noFill(); stroke(c); strokeWeight(params.barWeight);
      line(px1, py1, px2, py2);
      if (params.barMirroring) { line(mx1, my1, mx2, my2); }
    }
    pop();
  }
}

let shell1, shell2, shell3;
let gui, c_guide, c_useBlocks, c_useOrtho, c_barMirroring;
let clock;

function createShellGUI(shell, name = shell) {
  const folder = gui.addFolder(name);
  folder.open();
  folder.addColor(shell, 'color');
  folder.add(shell, 'radius', 0, 400);
  // folder.add(shell, 'radius_bpm', 0, 20, 0.1);
  // folder.add(shell, 'radius_change', 0, 1, 0.01);
  folder.add(shell, 'rpm_axis', 0, 3, 0.1);
  folder.add(shell, 'rpm_orbit1', 0, 3, 0.1);
  folder.add(shell, 'rpm_orbit2', 0, 3, 0.1);
}

function createGUI() {
  gui = new dat.GUI();
  gui.width = 350;
  gui.addColor(params, 'bgColor');
  gui.addColor(params, 'guideColor');
  gui.add(params, 'guideOpacity', 0, 1);
  c_guide = gui.add(params, 'showGuides');
  gui.add(params, 'barWeight', 1, 300);
  gui.add(params, 'barOpacity', 0, 1);
  // c_useBlocks = gui.add(params, 'useBlocks');
  // c_useElement = gui.add(params, 'useElement', 0, 2);
  c_useOrtho = gui.add(params, 'useOrtho').onFinishChange(() => { setupCamera(); });
  c_barMirroring = gui.add(params, 'barMirroring');

  createShellGUI(shell1, 'shell1');
  createShellGUI(shell2, 'shell2');
  createShellGUI(shell3, 'shell3');

  const dg = document.querySelector('.dg');
  const stopProp = (e) => e.stopPropagation();
  dg.addEventListener('mousedown', stopProp)
  dg.addEventListener('wheel', stopProp);
  dg.addEventListener('keydown', (e) => {
    if (e.key == ' ') {
      e.stopPropagation();
      e.preventDefault();
    }
  });
}

function setupCamera() {
  if (params.useOrtho) {
    // ortho(-width / 2, width / 2, height / 2, -height / 2, -100000, 100000);
    ortho();
  } else {
    perspective();
  }
}

function setup() {
  clock = new Clock();
  pixelDensity(displayDensity());
  createCanvas(1280, 800, WEBGL);
  setupCamera();

  shell1 = new Shell(240, 0, 0, 4, '#161616');
  shell2 = new Shell(230, 0, 1, 5, '#fc1b46');
  shell3 = new Shell(250, 0, 5.5, 10, '#194788');

  createGUI();
}

function update() {
  clock.update(millis());
  let now = clock.time();
  shell1.update(now);
  shell2.update(now);
  shell3.update(now);
}

function lerpLine(ax, ay, bx, by, ca, cb, segments = 50) {
  // 0 – 1 – 2
  for (let i=0; i<segments; i++) { 
    let c = lerpColor( color(ca), color(cb), (i+0.5)/segments );
    c.setAlpha(params.barOpacity * 255);
    stroke(c);
    line( ax+(bx-ax)/segments*i, ay+(by-ay)/segments*i, ax+(bx-ax)/segments*(i+1), ay+(by-ay)/segments*(i+1) );
  }
}

function draw() {
  update();
  background(params.bgColor);
  orbitControl();

  shell1.draw();
  shell2.draw();
  shell3.draw();
  
  if (params.connections == 1) {
    push();
    strokeWeight(params.barWeight);
    lerpLine(shell1.px2, shell1.py2, shell2.px1, shell2.py1, shell1.color, shell2.color);
    lerpLine(shell2.px2, shell2.py2, shell3.px1, shell3.py1, shell2.color, shell3.color);
    lerpLine(shell3.px2, shell3.py2, shell1.px1, shell1.py1, shell3.color, shell1.color);
    if (params.barMirroring) {
      lerpLine(shell1.mx2, shell1.my2, shell2.mx1, shell2.my1, shell1.color, shell2.color);
      lerpLine(shell2.mx2, shell2.my2, shell3.mx1, shell3.my1, shell2.color, shell3.color);
      lerpLine(shell3.mx2, shell3.my2, shell1.mx1, shell1.my1, shell3.color, shell1.color);
    }
    pop();
  } else if (params.connections == 2) {
    push();
    strokeWeight(params.barWeight);
    lerpLine(shell1.px1, shell1.py1, shell2.px1, shell2.py1, shell1.color, shell2.color);
    lerpLine(shell2.px1, shell2.py1, shell3.px1, shell3.py1, shell2.color, shell3.color);
    lerpLine(shell3.px1, shell3.py1, shell1.px1, shell1.py1, shell3.color, shell1.color);
    lerpLine(shell1.px2, shell1.py2, shell2.px2, shell2.py2, shell1.color, shell2.color);
    lerpLine(shell2.px2, shell2.py2, shell3.px2, shell3.py2, shell2.color, shell3.color);
    lerpLine(shell3.px2, shell3.py2, shell1.px2, shell1.py2, shell3.color, shell1.color);
    if (params.barMirroring) {
      lerpLine(shell1.mx1, shell1.my1, shell2.mx1, shell2.my1, shell1.color, shell2.color);
      lerpLine(shell2.mx1, shell2.my1, shell3.mx1, shell3.my1, shell2.color, shell3.color);
      lerpLine(shell3.mx1, shell3.my1, shell1.mx1, shell1.my1, shell3.color, shell1.color);
      lerpLine(shell1.mx2, shell1.my2, shell2.mx2, shell2.my2, shell1.color, shell2.color);
      lerpLine(shell2.mx2, shell2.my2, shell3.mx2, shell3.my2, shell2.color, shell3.color);
      lerpLine(shell3.mx2, shell3.my2, shell1.mx2, shell1.my2, shell3.color, shell1.color);
    }
    pop();
  }
}

function keyPressed() {
  // console.log(key, keyCode);
  if (key == 'f') {
    toggleFullscreen();
  } else if (key == 's') {
    saveCanvas(new Date().toISOString(), 'png');
  } else if (key == ' ') {
    clock.toggle();
  } else if (key == 'g') {
    params.showGuides = !params.showGuides;
    c_guide.updateDisplay();
  } else if (key == 'o') {
    params.useOrtho = !params.useOrtho;
    c_useOrtho.updateDisplay();
    setupCamera();
  } else if (key == 'b') {
    params.useBlocks = !params.useBlocks;
    c_useBlocks.updateDisplay();
  } else if (key == 'm') {
    params.barMirroring = !params.barMirroring;
    c_barMirroring.updateDisplay();
  } else if (key == '1') {
    params.useElement = 0;
  } else if (key == '2') {
    params.useElement = 1;
  } else if (key == '3') {
    params.useElement = 2;
  } else if (key == 'q') {
    params.connections = 0;
  } else if (key == 'w') {
    params.connections = 1;
  } else if (key == 'e') {
    params.connections = 2;
  }
}
