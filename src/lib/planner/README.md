# Hifz & Muraja'ah Planner — Scheduling Rules & Architecture

The Hifz & Muraja'ah Planner is an authentic, structured Quran memorization and spaced repetition system built directly into Aayah Studio.

---

## 1. Core Concept: Three Daily Tasks

Every study day is broken down into three focused components:

1. **Sabaq (New Lesson)**:
   - The new portion to memorize today.
   - Sized in discrete Madani Mushaf lines: **3, 5, 7 (half page), 10, or 15 lines (full page)**.
   - Lessons align to page boundaries so learners always practice a clear, cohesive block of text on a single Mushaf page.
   - After Sabaq, the learner evaluates their mastery:
     - **Yes, memorized ✓**: The unit graduates to the `learning` state and enters Sabqi starting tomorrow.
     - **Partly**: The unit repeats tomorrow as the Sabaq lesson without moving forward prematurely.

2. **Sabqi (Recent Revision)**:
   - Covers the last **N days** of new lessons (default `5` days, configurable between `3` and `7` days).
   - Solidifies newly formed short-term memorization into durable memory.
   - **Weak units are automatically prioritized** first in the daily Sabqi order.

3. **Manzil (Cumulative Revision)**:
   - Daily slice of all older memorized portions rotating through a customizable **cycle** (default `30` days).
   - Slices are distributed deterministically:
     $$\text{sliceIndex} = |\text{diffDays}(\text{date}, \text{createdAt})| \pmod{\text{manzilCycleDays}}$$
   - Any overdue units ($\text{nextDue} \le \text{today}$) or units flagged as **Weak** are prioritized and reviewed immediately.

---

## 2. Spaced Repetition (SR) Algorithm

When a learner rates their recitation of a Sabqi or Manzil portion, the spaced repetition interval updates according to these rules:

| Rating | Multiplier | Minimum Interval | Maximum Interval | Next Due | Status Transition |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Weak ⚠️** | Reset to $1\text{d}$ | $1\text{ day}$ | $1\text{ day}$ | Tomorrow | `status = "weak"`, prioritized in Sabqi/Manzil |
| **Okay 👍** | $\times 1.5$ | $2\text{ days}$ | $30\text{ days}$ | $\text{today} + \text{interval}$ | `status = "memorized"`, strength = "okay" |
| **Strong ⭐** | $\times 2.5$ | $4\text{ days}$ | $60\text{ days}$ | $\text{today} + \text{interval}$ | `status = "memorized"`, strength = "strong" |

---

## 3. Missed Days & Backlog Management

- **Zero-Loss Guarantee**: Tasks from missed days are never erased or skipped silently.
- Overdue portions are flagged in the **Backlog** alert banner.
- Learners can choose to **Spread Backlog** over **3, 5, or 7 days** to catch up comfortably without overwhelming their daily routine.

---

## 4. Practice & Listening Mode

Each Sabaq, Sabqi, and Manzil card includes:
- **Mushaf View**: Jumps to the exact Madani Mushaf page with the line range highlighted.
- **Repeat Player**: Configurable repeat counts ($3\times, 5\times, 10\times, 20\times$), speed adjustments ($0.75\times, 1.0\times, 1.25\times$), and inter-repeat pauses ($1\text{s}, 2\text{s}, 3\text{s}$).
- **Self-Test Mode**: Hides the Arabic text for blind recitation, allowing line-by-line tapping to reveal and check accuracy.
- **Offline Download**: Saves the page text and audio to IndexedDB for practice without internet access.

---

## 5. Storage, Backup & Privacy

- Stored client-side in `localStorage` under `aayah_hifz_plan` and `aayah_hifz_records`.
- Complete JSON export and restoration via `/planner/settings`.
- Safe reset with "Delete my planner data".
- Strictly private and client-side by default.
