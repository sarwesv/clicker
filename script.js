(() => {
  // Elements
  const spacebar = document.getElementById('spacebar');
  const deck = document.querySelector('.keyboard-deck');
  const counterDisplay = document.getElementById('counterDisplay');
  const resetBtn = document.getElementById('resetBtn');
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggle.querySelector('.sound-label');
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');

  let soundEnabled = true;
  let isPressed = false;
  let audioCtx = null;

  // Counter State
  let count = parseInt(localStorage.getItem('spacebar_click_count') || '0', 10);
  if (isNaN(count)) count = 0;

  // Analog Rolling Digit Display
  function updateAnalogCounter(newVal, animate = true) {
    const newDigits = newVal.toString().split('');

    // Prepend new slots on the left if number of digits increased
    while (counterDisplay.children.length < newDigits.length) {
      const slot = document.createElement('div');
      slot.className = 'digit-slot';
      counterDisplay.insertBefore(slot, counterDisplay.firstChild);
    }

    // Remove slots from the left if number of digits decreased
    while (counterDisplay.children.length > newDigits.length) {
      counterDisplay.removeChild(counterDisplay.firstChild);
    }

    const slots = counterDisplay.children;

    for (let i = 0; i < newDigits.length; i++) {
      const slot = slots[i];
      const newChar = newDigits[i];
      const currentItem = slot.querySelector('.digit-item:not(.digit-exit)');

      if (!currentItem) {
        const item = document.createElement('div');
        item.className = 'digit-item';
        item.textContent = newChar;

        if (animate) {
          item.style.transition = 'none';
          item.style.transform = 'translateY(-100%)';
          item.style.opacity = '0';
          slot.appendChild(item);
          void item.offsetWidth;
          item.style.transition = 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease';
          item.style.transform = 'translateY(0)';
          item.style.opacity = '1';
        } else {
          slot.appendChild(item);
        }
      } else if (currentItem.textContent !== newChar) {
        if (!animate) {
          currentItem.textContent = newChar;
        } else {
          // Remove any stale exiting elements in this slot immediately
          const oldExiting = slot.querySelectorAll('.digit-exit');
          oldExiting.forEach(el => el.remove());

          // Animate current element downward out of view
          currentItem.classList.add('digit-exit');
          currentItem.style.transition = 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease';
          currentItem.style.transform = 'translateY(100%)';
          currentItem.style.opacity = '0';

          // Create new element positioned above the window
          const incoming = document.createElement('div');
          incoming.className = 'digit-item';
          incoming.textContent = newChar;
          incoming.style.transition = 'none';
          incoming.style.transform = 'translateY(-100%)';
          incoming.style.opacity = '0';
          slot.appendChild(incoming);

          // Force reflow and slide down into place
          void incoming.offsetWidth;
          incoming.style.transition = 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease';
          incoming.style.transform = 'translateY(0)';
          incoming.style.opacity = '1';

          // Clean up the exited element once animation finishes
          setTimeout(() => {
            if (currentItem.parentNode === slot) {
              slot.removeChild(currentItem);
            }
          }, 180);
        }
      }
    }
  }

  // Initial display setup
  updateAnalogCounter(count, false);

  function incrementCount() {
    count++;
    localStorage.setItem('spacebar_click_count', count.toString());
    updateAnalogCounter(count, true);

    // Frame bump
    counterDisplay.classList.remove('bump');
    void counterDisplay.offsetWidth;
    counterDisplay.classList.add('bump');
  }

  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    count = 0;
    localStorage.setItem('spacebar_click_count', '0');
    updateAnalogCounter(0, false);
    counterDisplay.classList.remove('bump');
  });

  // Initialize Canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Web Audio Switch Synthesizer
  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Synthesize down-click sound (Tactile switch click + bottom-out thock)
  function playDownSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;

    // High frequency click snap
    const clickOsc = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(420, t);
    clickOsc.frequency.exponentialRampToValueAtTime(80, t + 0.035);

    clickGain.gain.setValueAtTime(0.5, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    clickOsc.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.035);

    // Deep bottom-out thock
    const thockOsc = audioCtx.createOscillator();
    const thockGain = audioCtx.createGain();
    thockOsc.type = 'sine';
    thockOsc.frequency.setValueAtTime(160, t);
    thockOsc.frequency.exponentialRampToValueAtTime(35, t + 0.07);

    thockGain.gain.setValueAtTime(0.6, t);
    thockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    thockOsc.connect(thockGain);
    thockGain.connect(audioCtx.destination);
    thockOsc.start(t);
    thockOsc.stop(t + 0.07);

    // Subtle noise transient for texture
    createNoiseBurst(t, 0.02, 0.15);
  }

  // Synthesize up-click sound (Switch reset / spring return)
  function playUpSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;

    const releaseOsc = audioCtx.createOscillator();
    const releaseGain = audioCtx.createGain();
    releaseOsc.type = 'triangle';
    releaseOsc.frequency.setValueAtTime(300, t);
    releaseOsc.frequency.exponentialRampToValueAtTime(120, t + 0.025);

    releaseGain.gain.setValueAtTime(0.25, t);
    releaseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    releaseOsc.connect(releaseGain);
    releaseGain.connect(audioCtx.destination);
    releaseOsc.start(t);
    releaseOsc.stop(t + 0.025);
  }

  // Helper for textured mechanical rattle
  function createNoiseBurst(startTime, duration, gainAmount) {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 1.5;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(gainAmount, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  // Particle & Ripple Animation System
  const particles = [];
  const ripples = [];
  const palette = ['#38bdf8', '#818cf8', '#c084fc', '#34d399', '#f472b6'];

  function spawnEffects() {
    const rect = spacebar.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    // Expanding shockwave ripple
    ripples.push({
      x: originX,
      y: originY,
      radius: rect.width * 0.25,
      maxRadius: rect.width * 0.7,
      alpha: 0.6,
      lineWidth: 3
    });

    // Particle sparks
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 4 + 2;
      const color = palette[Math.floor(Math.random() * palette.length)];

      // Scatter from along the spacebar length
      const offsetX = (Math.random() - 0.5) * (rect.width * 0.7);

      particles.push({
        x: originX + offsetX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 3 + 2,
        color: color,
        alpha: 1,
        life: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function renderAnimation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update & draw ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.12 + 1;
      r.alpha -= 0.035;

      if (r.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${r.alpha})`;
      ctx.lineWidth = r.lineWidth;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // Gravity
      p.vx *= 0.98;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(renderAnimation);
  }
  requestAnimationFrame(renderAnimation);

  // Press down action
  function press() {
    if (isPressed) return;
    isPressed = true;
    spacebar.classList.add('pressed');
    deck.classList.add('active');
    incrementCount();
    playDownSound();
    spawnEffects();
  }

  // Release action
  function release() {
    if (!isPressed) return;
    isPressed = false;
    spacebar.classList.remove('pressed');
    deck.classList.remove('active');
    counterDisplay.classList.remove('bump');
    playUpSound();
  }

  // Keyboard handlers
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) {
        press();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      release();
    }
  });

  // Mouse / Pointer handlers
  spacebar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    press();
  });

  window.addEventListener('mouseup', () => {
    if (isPressed) {
      release();
    }
  });

  // Touch handlers
  spacebar.addEventListener('touchstart', (e) => {
    e.preventDefault();
    press();
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (isPressed) {
      release();
    }
  });

  window.addEventListener('touchcancel', () => {
    if (isPressed) {
      release();
    }
  });

  // Sound toggle button
  soundToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      initAudio();
      soundIcon.textContent = '🔊';
      soundLabel.textContent = 'Sound On';
      soundToggle.classList.remove('muted');
    } else {
      soundIcon.textContent = '🔇';
      soundLabel.textContent = 'Sound Off';
      soundToggle.classList.add('muted');
    }
  });
})();
