// Bug report posted Nov 27, 2018
// https://github.com/processing/p5.js/issues/3348

// Testing bug with smooth() in WEBGL
// Once smooth() is called, switching projection (ortho or perspective) doesn't work anymore
// Also smooth() seems to overthrow stroke() and fill() settings
//
// Instructions: 
// * Run code as is. Rotating code is rendered with parallel projection.
// * Click on cavas.  Cube should be rendered with perspective projection but isn't. 
// * Set useSmooth to false and repeat steps to see desired behaviour.

let useSmooth = true;
let useOrtho = true;

function setup() {
  createCanvas(500,500,WEBGL);
  setupCamera();
  
  stroke(255);
  fill(0);
  if (useSmooth) smooth(); // erases stroke and fill from before
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
