// Level music begins only after gameplay starts. Browser autoplay rules mean
// TEST mode may stay silent until the first key press/click.
export class LevelMusic {
  constructor(path = 'assets/audio/level1_neon_rise.wav?v=cinematic3') {
    this.audio = new Audio(path);
    this.audio.loop = true;
    this.audio.volume = 0.34; // keep attacks and electrical cues in front
    this.active = false;
    this.muted = false;
    this.unlocked = false;
  }

  unlock() {
    this.unlocked = true;
    if (this.active && !this.muted) this.audio.play().catch(() => {});
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    if (!active) {
      this.audio.pause();
      this.audio.currentTime = 0;
    } else if (this.unlocked && !this.muted) {
      this.audio.play().catch(() => {});
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (this.muted) this.audio.pause();
    else if (this.active && this.unlocked) this.audio.play().catch(() => {});
    return this.muted;
  }
}
