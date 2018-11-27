// Testing bug with smooth() in WEBGL
// Once smooth() is called, switching projection (ortho or perspective) doesn't work anymore
// Also smooth() seems to overthrow stroke() and fill() settings

let useSmooth = true;
let useOrtho = true;

function setup() {
  createCanvas(500,500,WEBGL);
  setupCamera();
  
  stroke(255);
  fill(0);
  if (useSmooth) smooth(); // erases stroke and fill from before, 
}

function draw() {
  background(0);
  rotateY(TWO_PI / 1000 * frameCount);
  box(250);
}

function setupCamera() {
  if (useOrtho) ortho(); else perspective();
}

function mouseClicked() {
  useOrtho = !useOrtho;
  setupCamera();
}
