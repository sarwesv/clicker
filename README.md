# Spacebar Clicker

A tactile, mechanical spacebar clicking game built with HTML, CSS, and vanilla JavaScript.

## Features

- **Tactile 3D Spacebar**: Realistic keycap bevels, drop shadows, and active depression physics with keyboard, mouse, and touch support.
- **Synthesized Mechanical Switch Audio**: Custom Web Audio API synthesizer modeling tactile mechanical switch click, bottom-out thock, and spring return. No external audio assets required.
- **Analog Timer Rolling Digits**: Clean counter typography where numbers smoothly slide in from the top as you click, just like an analog mechanical timer.
- **Particle & Ripple System**: Canvas-based spark bursts and expanding shockwaves on each press.
- **Persistence & Controls**: Click count automatically persists via `localStorage`, with an instant reset button and sound mute toggle.

## How to Run

Simply open `index.html` in any modern web browser, or serve it locally:

```bash
# Python 3
python3 -m http.server 8000

# Or open directly
open index.html
```

Visit [http://localhost:8000](http://localhost:8000) in your browser.
