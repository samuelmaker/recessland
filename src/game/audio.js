const bgMusic = new Audio('/background.mp3');
bgMusic.loop = true;
bgMusic.volume = 0;
bgMusic.preload = 'auto';

const crashSound = new Audio('/oh.mp3');
crashSound.volume = 0.25;
crashSound.preload = 'auto';

let musicStarted = false;

export function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  bgMusic.currentTime = 0;
  bgMusic.volume = 0;
  bgMusic.play().catch(() => {});
  let vol = 0;
  const fade = setInterval(() => {
    vol += 0.02;
    if (vol >= 0.35) { bgMusic.volume = 0.35; clearInterval(fade); }
    else bgMusic.volume = vol;
  }, 50);
}

export function stopMusic() {
  musicStarted = false;
  let vol = bgMusic.volume;
  const fade = setInterval(() => {
    vol -= 0.03;
    if (vol <= 0) { bgMusic.volume = 0; bgMusic.pause(); clearInterval(fade); }
    else bgMusic.volume = vol;
  }, 50);
}

export function playCrash() {
  const s = crashSound.cloneNode();
  s.volume = 0.25;
  s.play().catch(() => {});
}
