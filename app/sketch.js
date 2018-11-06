
let params = {
  bgColor: '#fff',
  guideColor: '#ddd',
  showGuides: true,
  guideOpacity: 0.15,
  barWeight: 40,
  barOpacity: 0.95,
};

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

    // particle 1
    let px1 = this.currentRadius * cos(this.a_orbit1);
    let py1 = this.currentRadius * sin(this.a_orbit1);
    push();
    translate( px1, py1 );
    if (params.showGuides) box(10);
    pop();

    // particle 2
    let px2 = this.currentRadius * cos(this.a_orbit2);
    let py2 = this.currentRadius * sin(this.a_orbit2);
    push();
    translate( px2, py2 );
    if (params.showGuides) box(10);
    pop();

    if (params.showGuides) ellipse(0, 0, this.currentRadius*2);

    c = color(this.color);
    c.setAlpha(params.barOpacity * 255);
    stroke(c);
    strokeWeight(params.barWeight);
    line(px1, py1, px2, py2);
    pop();
  }
}

let shell1, shell2, shell3;
let gui;
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
  gui.add(params, 'barWeight', 1, 300);
  gui.add(params, 'barOpacity', 0, 1);

  createShellGUI(shell1, 'shell1');
  createShellGUI(shell2, 'shell2');
  createShellGUI(shell3, 'shell3');

  const dg = document.querySelector('.dg');
  const stopProp = (e) => e.stopPropagation();
  dg.addEventListener('mousedown', stopProp)
  dg.addEventListener('wheel', stopProp);
}

function setup() {
  clock = new Clock();
  pixelDensity(displayDensity());
  createCanvas(1280, 800, WEBGL);

  // ortho(-width / 2, width / 2, height / 2, -height / 2, -1000, 1000);
  shell1 = new Shell(240, 0, 0, 4, '#1a419d');
  shell2 = new Shell(230, 0, 1, 5, '#cdcdcd');
  shell3 = new Shell(250, 0, 5.5, 10, '#ffd100');

  createGUI();
}

function update() {
  clock.update(millis());
  let now = clock.time();
  shell1.update(now);
  shell2.update(now);
  shell3.update(now);
}

function draw() {
  update();
  background(params.bgColor);
  orbitControl();

  shell1.draw();
  shell2.draw();
  shell3.draw();
}

function keyPressed() {
  // console.log(key, keyCode);
  if (key == 'g') {
    params.showGuides = !params.showGuides;
  } else if (key == 'f') {
    toggleFullscreen();
  } else if (key == 's') {
    saveCanvas(new Date().toISOString()+".png");
  } else if (key == ' ') {
    clock.toggle();
  }
}

// console.log(document.querySelector('.dg'));
// document.addEventListener('DOMContentLoaded')
//
