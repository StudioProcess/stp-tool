const RES_RUNTIME = 1000;
const RES_EXPORT  = 4096; // 4096 seems to be max

let globalScale = 1; // doesn't work because lineweights aren't scaled
let rotation = [0,0,0];
let translation = [0,0];

const scaleSensitivity = 1;
const rotationSensitivity = 2;
const translationSensitivity = 1;

let params = {
  bgColor: '#fff',
  guideColor: '#ddd',
  showGuides: true,
  guideOpacity: 0.15,
  barWeight: 60,
  barOpacity: 0.95,
  useOrtho: true,
  barMirroring: false,
  useElement: 0, // 0..flat-bar, 1..block, 2..tube
  connections: 0, // 1..lerp-loop, 2..lerp-triangles
  segments: 50,
  useDots: false,
  rotationSteps: 16
};

// draw a cuboid block between two points
function block(ax, ay, bx, by) {
  let d = dist(ax, ay, bx, by); // distance
  let a = atan2(by-ay, bx-ax); // angle
  let mx = ax + (bx-ax) / 2;
  let my = ay + (by-ay) / 2;

  push();
  // stroke(128); strokeWeight(1*globalScale); fill(0);
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
    strokeWeight(1*globalScale);
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
      noFill(); stroke(c); strokeWeight(params.barWeight*globalScale);
      // line(px1, py1, px2, py2);
      lerpLine(px1, py1, 0, px2, py2, 0, c, c);
      if (params.barMirroring) {
        // line(mx1, my1, mx2, my2);
        lerpLine(mx1, my1, 0, mx2, my2, 0, c, c);
      }
    }
    pop();
  }
}

let shell1, shell2, shell3;
let gui, c_guide, c_useBlocks, c_useOrtho, c_barMirroring, c_useDots, c_shell1, c_shell2, c_shell3;
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
  return folder;
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
  c_useDots = gui.add(params, 'useDots');
  gui.add(params, 'segments', 1, 100);
  gui.add(params, 'rotationSteps', 4, 32);

  c_shell1 = createShellGUI(shell1, 'shell1');
  c_shell2 = createShellGUI(shell2, 'shell2');
  c_shell3 = createShellGUI(shell3, 'shell3');

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
  if (exportUsed) {
    // BUG: once smooth() was called (for export), switching projection doesn't work, so we just make an entirely new canvas
    noCanvas();
    createCanvas(RES_RUNTIME, RES_RUNTIME, WEBGL);
    disableEventDefaults();
  }
  if (params.useOrtho) {
    // ortho();
    // ortho(-width/2, +width/2, -height/2, +height/2, 0, Math.max(width, height)); // default
    ortho(-width/2, +width/2, -height/2, +height/2, -9999, 9999);
  } else {
    perspective();
  }
}

function setup() {
  clock = new Clock();
  createCanvas(RES_RUNTIME, RES_RUNTIME, WEBGL);
  pixelDensity(1);
  setupCamera();
  // Start with implicit noSmooth()

  shell1 = new Shell(240, 0, 0, 4, '#c5f1ff');
  shell2 = new Shell(230, 0, 1, 5, '#ff9494');
  shell3 = new Shell(250, 0, 5.5, 10, '#ffea8f');

  /*
  #815d95 #c5f1ff #f9de83 #f9de83 #fff675 #ff6c6c #fc1b46 #ff6c6c #161616
  #ada39c #ff9494 #a1d078 #ff5151 #ff5151 #1b65fc #1b65fc #c1c1c1 #fc1b46
  #17a659 #ffea8f #5193ff #5193ff #5193ff #ffdf4f #e4fc1b #ffdf4f #194788
  */

  createGUI();
  disableEventDefaults();
}

function update() {
  clock.update(millis());
  let now = clock.time();
  shell1.update(now);
  shell2.update(now);
  shell3.update(now);
}

function lerpLine(ax, ay, az,   bx, by, bz,   cola, colb) {
  let segments = params.segments;
  if (!params.useDots) {
    // 0 – 1 – 2
    for (let i=0; i<segments; i++) {
      let c = lerpColor( color(cola), color(colb), (i+0.5)/segments );
      c.setAlpha(params.barOpacity * 255);
      stroke(c);
      line(
        ax+(bx-ax)/segments*i, ay+(by-ay)/segments*i, az+(bz-az)/segments*i,
        ax+(bx-ax)/segments*(i+1), ay+(by-ay)/segments*(i+1), az+(bz-az)/segments*(i+1)
      );
    }
  } else {
    noStroke();
    for (let i=0; i<=segments; i++) {
      let c = lerpColor( color(cola), color(colb), (i+0.5)/segments );
      c.setAlpha(params.barOpacity * 255);
      fill(c);
      push();
      translate(ax+(bx-ax)/segments*i, ay+(by-ay)/segments*i, az+(bz-az)/segments*i);
      sphere(params.barWeight/2);
      pop();
    }
  }
}

function connectShells(shell1, shell2, p1, p2, mirror = false) {
  if (!mirror) {
    shell1.pz1 = -shell1.px1 * sin(shell1.a_axis); shell1.new_px1 = shell1.px1 * cos(shell1.a_axis);
    shell1.pz2 = -shell1.px2 * sin(shell1.a_axis); shell1.new_px2 = shell1.px2 * cos(shell1.a_axis);
    shell2.pz1 = -shell2.px1 * sin(shell2.a_axis); shell2.new_px1 = shell2.px1 * cos(shell2.a_axis);
    shell2.pz2 = -shell2.px2 * sin(shell2.a_axis); shell2.new_px2 = shell2.px2 * cos(shell2.a_axis);
    if (p1 == 1) {
      if (p2 == 1) lerpLine(shell1.new_px1, shell1.py1, shell1.pz1,   shell2.new_px1, shell2.py1, shell2.pz1,   shell1.color, shell2.color);
      else         lerpLine(shell1.new_px1, shell1.py1, shell1.pz1,   shell2.new_px2, shell2.py2, shell2.pz2,   shell1.color, shell2.color);
    } else {
      if (p2 == 1) lerpLine(shell1.new_px2, shell1.py2, shell1.pz2,   shell2.new_px1, shell2.py1, shell2.pz1,   shell1.color, shell2.color);
      else         lerpLine(shell1.new_px2, shell1.py2, shell1.pz2,   shell2.new_px2, shell2.py2, shell2.pz2,   shell1.color, shell2.color);
    }
  } else {
    shell1.mz1 = -shell1.mx1 * sin(shell1.a_axis); shell1.new_mx1 = shell1.mx1 * cos(shell1.a_axis);
    shell1.mz2 = -shell1.mx2 * sin(shell1.a_axis); shell1.new_mx2 = shell1.mx2 * cos(shell1.a_axis);
    shell2.mz1 = -shell2.mx1 * sin(shell2.a_axis); shell2.new_mx1 = shell2.mx1 * cos(shell2.a_axis);
    shell2.mz2 = -shell2.mx2 * sin(shell2.a_axis); shell2.new_mx2 = shell2.mx2 * cos(shell2.a_axis);
    if (p1 == 1) {
      if (p2 == 1) lerpLine(shell1.new_mx1, shell1.my1, shell1.mz1,   shell2.new_mx1, shell2.my1, shell2.mz1,   shell1.color, shell2.color);
      else         lerpLine(shell1.new_mx1, shell1.my1, shell1.mz1,   shell2.new_mx2, shell2.my2, shell2.mz2,   shell1.color, shell2.color);
    } else {
      if (p2 == 1) lerpLine(shell1.new_mx2, shell1.my2, shell1.mz2,   shell2.new_mx1, shell2.my1, shell2.mz1,   shell1.color, shell2.color);
      else         lerpLine(shell1.new_mx2, shell1.my2, shell1.mz2,   shell2.new_mx2, shell2.my2, shell2.mz2,   shell1.color, shell2.color);
    }
  }
}

function draw() {
  customControl(); // instead of orbitControl()
  update();
  background(params.bgColor);

  shell1.draw();
  shell2.draw();
  shell3.draw();

  if (params.connections == 1) {
    push();
    strokeWeight(params.barWeight*globalScale);
    connectShells(shell1, shell2, 2, 1);
    connectShells(shell2, shell3, 2, 1);
    connectShells(shell3, shell1, 2, 1);
    if (params.barMirroring) {
      connectShells(shell1, shell2, 2, 1, true);
      connectShells(shell2, shell3, 2, 1, true);
      connectShells(shell3, shell1, 2, 1, true);
    }
    pop();
  } else if (params.connections == 2) {
    push();
    strokeWeight(params.barWeight*globalScale);
    connectShells(shell1, shell2, 1, 1); connectShells(shell2, shell3, 1, 1); connectShells(shell3, shell1, 1, 1);
    connectShells(shell1, shell2, 2, 2); connectShells(shell2, shell3, 2, 2); connectShells(shell3, shell1, 2, 2);
    if (params.barMirroring) {
      connectShells(shell1, shell2, 1, 1, true); connectShells(shell2, shell3, 1, 1, true); connectShells(shell3, shell1, 1, 1, true);
      connectShells(shell1, shell2, 2, 2, true); connectShells(shell2, shell3, 2, 2, true); connectShells(shell3, shell1, 2, 2, true);
    }
    pop();
  }
}

function getController(property, gui = gui) {
  return gui.__controllers.filter(c => c.property == property)[0];
}

// Set rpm_orbit1 = 2 and pretty slow
function slowDown() {
  getController('rpm_orbit1', c_shell1).setValue(0.5);
  getController('rpm_orbit2', c_shell1).setValue(0.5);
  getController('rpm_orbit1', c_shell2).setValue(0.7);
  getController('rpm_orbit2', c_shell2).setValue(0.7);
  getController('rpm_orbit1', c_shell3).setValue(0.9);
  getController('rpm_orbit2', c_shell3).setValue(0.9);

  getController('rpm_axis', c_shell1).setValue(1.5);
  getController('rpm_axis', c_shell2).setValue(1.0);
  getController('rpm_axis', c_shell3).setValue(0.5);
}

let exportUsed = false;

function exportFrame() {
  let wasRunning = clock.running;
  if (wasRunning) clock.stop();
  smooth(); // needs to be before resizeCanvas() otherwise the export is empty
  resizeCanvas(RES_EXPORT, RES_EXPORT);
  // call to draw() not necessessary
  saveCanvas(new Date().toISOString(), 'png');

  noSmooth();
  resizeCanvas(RES_RUNTIME, RES_RUNTIME);
  if (wasRunning) clock.start();
  exportUsed = true;
  disableEventDefaults();
}

function keyPressed() {
  // console.log(key, keyCode);
  if (key == 'f') {
    toggleFullscreen();
  } else if (key == 's') {
    exportFrame();
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
  } else if (key == 'd') {
    params.useDots = !params.useDots;
    c_useDots.updateDisplay();
  } else if (key == '0') {
    slowDown();
  } else if (key == 'ArrowLeft') {
    rotation[0] -= TWO_PI/params.rotationSteps;
  } else if (key == 'ArrowRight') {
    rotation[0] += TWO_PI/params.rotationSteps;
  } else if (key == 'ArrowDown') {
    rotation[1] -= TWO_PI/params.rotationSteps;
  } else if (key == 'ArrowUp') {
    rotation[1] += TWO_PI/params.rotationSteps;
  } else if (key == ',') {
    rotation[2] -= TWO_PI/params.rotationSteps;
  } else if (key == '.') {
    rotation[2] += TWO_PI/params.rotationSteps;
  } else if (key == 'Backspace') {
    // reset transformations
    globalScale = 1; translation = [0,0]; rotation = [0,0,0];
  }
}

function disableEventDefaults() {
  function x(e) { e.preventDefault(); }
  this.canvas.oncontextmenu = x;
  this.canvas.onwheel = x;
}

function customControl() {
  var cam = this._renderer._curCamera;
  var scaleFactor = this.height < this.width ? this.height : this.width;
  
  if (this.mouseIsPressed) {
    // LMB: object rotation
    if (this.mouseButton === this.LEFT) {
      var deltaTheta = rotationSensitivity * (this.mouseX - this.pmouseX) / scaleFactor;
      var deltaPhi = -rotationSensitivity * (this.mouseY - this.pmouseY) / scaleFactor;
      // this._renderer._curCamera._orbit(deltaTheta, deltaPhi, 0);
      rotation[0] += deltaTheta;
      rotation[1] += deltaPhi;
    }
    // RMB: object translation
    else if (this.mouseButton === this.RIGHT) {
      var dx = translationSensitivity * (this.mouseX - this.pmouseX);
      var dy = translationSensitivity * (this.mouseY - this.pmouseY);
      translation[0] += dx;
      translation[1] += dy;
    }
  }
  
  // WHEEL: object scale
  if (this._mouseWheelDeltaY !== this._pmouseWheelDeltaY) {
    globalScale *= 1 - scaleSensitivity/1000*this._mouseWheelDeltaY;
  }
  
  translate(translation[0], translation[1]);
  rotateY(rotation[0]); rotateX(rotation[1]); rotateZ(rotation[2]);
  scale(globalScale);
}
