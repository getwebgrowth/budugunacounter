# Budu Guna & Mantra Tally Counter (බුදු ගුණ සහ මන්ත්‍ර ගණකය)

A tranquil, high-precision tally counter designed for Buddhist Budu Guna (Navaguna / 9 Virtues of the Buddha) and mantra chanters. 

It combines the distraction-free, tactile minimalism of [Tasbih.org](https://tasbih.org/) with the multi-counter dashboard capability of [Tallycount.app](https://tallycount.app/).

---

## Key Features

1. **Tasbih.org-Style Single Zen Mode (Default)**
   - Massive circular increment button with tactile ripple animation.
   - Circular SVG goal progress track (supports 108 malas, laps, and custom targets).
   - Fluid tabular typography that never jiggles as counts increase.
   - Increment step selector (+1, +2, +3, +5, +9, +10, +21, +108, custom).
   - Decrement button with safe 0 boundary.
   - Quick reset button with confirmation.
   - Direct count value edit.
   - Blind Chanting Mode: hides all controls for meditating with eyes closed; tap anywhere to count.

2. **Tallycount.app-Style Advance Mode (Multi-Counter)**
   - Toggle switch in top header: **Single** vs **Advance (Multi)**.
   - Individual counter cards with names, Pali/Sinhala subtitles, progress bars, and dedicated `+` / `-` buttons.
   - **Load 9 Budu Guna** one-click preset:
     1. *Araham* (අරහං - The Worthy One)
     2. *Sammā-Sambuddho* (සම්මා සම්බුද්ධෝ - Fully Self-Enlightened)
     3. *Vijjā-Caraṇa-Sampanno* (විජ්ජාචරණ සම්පන්නෝ - Wisdom & Virtue)
     4. *Sugato* (සුගතෝ - The Well-Gone Guide)
     5. *Lokavidū* (ලෝකවිදූ - Knower of Worlds)
     6. *Anuttaro Purisa-Damma-Sārathi* (අනුත්තරෝ පුරිසදම්මසාරථී - Incomparable Leader)
     7. *Satthā Deva-Manussānam* (සත්ථා දේවමනුස්සානං - Teacher of Gods & Humans)
     8. *Buddho* (බුද්ධෝ - The Awakened One)
     9. *Bhagavā* (භගවා - The Blessed Lord)
   - "Focus" button on any card to zoom that counter into Single Zen mode.
   - Real-time aggregate tally count across all counters.

3. **Buddhist 6-Color Palette Themes (User Palette)**
   - **Tasbih Emerald** (`#06fd91`) — Serene obsidian dark mode with radiant mint
   - **Bodhi Golden Yellow** (`#FFD631`)
   - **Saffron Orange** (`#FF7C20`)
   - **Lotus Ruby Crimson** (`#B31840`)
   - **Lotus Magenta** (`#E63085`)
   - **Dharma Sapphire Blue** (`#1860A0`)

4. **Organic Audio & Haptics (Zero External Assets)**
   - Built with native **Web Audio API**:
     - *Wooden Mala Bead Click*: authentic resonant acoustic woodblock strike.
     - *Temple Singing Bowl Chime*: 528Hz harmonic resonance on goal milestone.
   - Vibration haptic feedback via `navigator.vibrate` on mobile devices.

5. **Local Memory (localStorage) & Future-Proof for Next.js / Supabase**
   - Automatically saves all counts and settings in real time.
   - One-click **Export Backup (JSON)** and **Import Backup** so chant history is never lost when clearing browser cache.
   - Data schema maps 1:1 to standard relational tables for Supabase migration.

---

## Data Schema (Ready for Next.js + Supabase)

```json
{
  "activeCounterId": "counter-guna-1",
  "mode": "single",
  "theme": "tasbih",
  "soundEnabled": true,
  "bellEnabled": true,
  "hapticEnabled": true,
  "counters": [
    {
      "id": "counter-guna-1",
      "name": "1. Araham",
      "pali": "අරහං • The Worthy One",
      "count": 108,
      "goal": 108,
      "step": 1
    }
  ]
}
```

---

## How to Run Locally

You can open `index.html` directly in any web browser or run a static server:

```bash
# Using Python
python3 -m http.server 3000

# Or using Node.js / npx
npx serve .
```

Open `http://localhost:3000` in your browser.
