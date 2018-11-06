class Clock {
  constructor() {
    this.globalTime = 0;
    this.offset = 0;

    this.running = true;
    this.lastStoppedTime = 0;
    this.pauseDuration = 0;
  }
  
  update(time) {
    this.globalTime = time;
    if (!this.running) {
      this.pauseDuration = this.globalTime - this.lastStoppedTime;
    }
  }

  start() {
    if (this.running) return;
    this.offset += this.pauseDuration;
    this.pauseDuration = 0;
    this.running = true;
  }

  stop() { 
    if (!this.running) return;
    this.lastStoppedTime = this.globalTime;
    this.running = false;
  }

  toggle() {
    if (this.running) { this.stop(); }
    else { this.start(); }
  }

  time() {
    return this.globalTime - this.offset - this.pauseDuration;
  }

  // aliases
  play()  { this.start(); }
  pause() { this.stop();  }
}
