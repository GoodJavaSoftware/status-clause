# Status Claus

Status Claus is a tiny Chrome extension that outlines the component-status grid
on [Claude Status](https://status.claude.com/), [OpenAI Status](https://status.openai.com/),
and [Cursor Status](https://status.cursor.com/) (which redirects to
[status.x.ai](https://status.x.ai/)) as a Christmas tree.

Created by [GoodJava Software Solutions](https://goodjava.org) for fun.

Status Claus is an independent project and is not affiliated with, endorsed by,
sponsored by, or supported by Anthropic, OpenAI, xAI, or Cursor. Product and
company names are trademarks of their respective owners. References to those
names identify the compatible websites only and do not imply endorsement.

For entertainment only. The decorations and game are not official service-status
information. Provided as is, without warranty, under the MIT License.
Third-party media retain their respective licenses.

The extension is intentionally small and easy to audit:

- It activates only at `https://status.claude.com/`, `https://status.openai.com/`,
  and `https://status.x.ai/`.
- It requests only Chrome's `storage` permission, used for one local high score.
- It makes no network requests.
- It stores only the highest score value and transmits no data.
- It has no dependencies, build step, background worker, or minified code.

## Install in Chrome

A Chrome Web Store release is planned. In the meantime, you can install it manually:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** in the upper-right corner.
4. Click **Load unpacked**.
5. Select this repository's folder (the folder containing `manifest.json`).
6. Visit or refresh [status.claude.com](https://status.claude.com/),
   [status.openai.com](https://status.openai.com/), or
   [status.x.ai](https://status.x.ai/).

After changing the extension's files, return to `chrome://extensions`, click the
reload button on the Status Claus card, and refresh the status page.

## How it works

The status grid becomes a Christmas tree with snow and twinkling status bars.
A spinning wreath appears while uptime data loads; **Start Game** enables when
it is ready. Games last one minute, and your high score is saved locally.

- Open presents (100–500 points), spin the star (50 per rotation), and catch
  the elf's treats (300–900 points).
- Hit flying Santas for 50–5,000 points. Fast ones announce their arrival.
  The moving bullseye awards **5× points** for overlapping Santas and treats.
- Destroy incoming snowballs before they hit: each hit costs up to 1,000 points.
  Snowmen appear every five seconds; clicking one gives it extra ammunition.
- Clicking the elf ends the game and keeps your score. Clicking the carolers
  ends it and resets your score to zero.

Audio starts muted; use the speaker button for Christmas music and sound effects.
Controls support keyboard input, and animations respect reduced-motion settings.
The circled **i** opens project credits and legal information.

## Project files

- `manifest.json` — Chrome extension metadata and the single allowed URL.
- `content.js` — finds the status grid and adds the tree outline.
- `music.js` — plays the bundled music and sleigh bells.
- `flyby.js` — schedules and animates Santa's randomized flights, fast-Santa
  warnings, and the bullseye target check.
- `treats.js` — draws the dancing elf and launches catchable Christmas treats.
- `snowman.js` — schedules snowman attacks and incoming, destructible snowballs.
- `styles.css` — positions and styles the non-interactive overlay.
- `assets/santa-sleigh.png` — original transparent fly-by illustration.
- `assets/carollers.svg` — CC0 Christmas carolers illustration.
- `assets/jingle-bells.mp3` — Wikimedia's public-domain MIDI transcode.
- `assets/o-tannenbaum.mp3` — public-domain U.S. Army Band performance.
- `assets/deck-the-halls.mp3` — public-domain U.S. Air Force Band performance.
- `assets/angels-we-have-heard.mp3` — public-domain U.S. Army Band performance.
- `assets/here-we-come-a-wassailing.ogg` — public-domain U.S. Army Band performance.
- `assets/game-buzzer.ogg` — bundled public-domain game-over buzzer.
- `assets/santa-ho-ho-ho.mp3` — bundled CC0 Santa voice clip.
- `assets/sleigh-bells.ogg` — bundled CC0 sleigh-bell recording.
- `assets/wilhelm-scream.ogg` — bundled CC0 Wilhelm scream.

## Media credits

Every bundled media file is public domain, CC0, or original to this project.
Full provenance for each file is in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

| File | Work | Creator | License |
| --- | --- | --- | --- |
| `assets/jingle-bells.mp3` | Jingle Bells refrain vector (Wikimedia MP3 transcode) | James Lord Pierpont (composer) | Public domain |
| `assets/o-tannenbaum.mp3` | O Tannenbaum | U.S. Army Band "Pershing's Own" | Public domain (U.S. government work) |
| `assets/deck-the-halls.mp3` | Deck the Halls | U.S. Air Force Band and Singing Sergeants | Public domain (U.S. government work) |
| `assets/angels-we-have-heard.mp3` | Angels We Have Heard on High | Chorus of the U.S. Army Band | Public domain (U.S. government work) |
| `assets/here-we-come-a-wassailing.ogg` | Here We Come A-wassailing | Chorus of the U.S. Army Band "Pershing's Own" | Public domain (U.S. government work) |
| `assets/sleigh-bells.ogg` | Grelottière #1 (sound no. 585), LaSonotheque | Joseph Sardin | CC0 |
| `assets/santa-ho-ho-ho.mp3` | Santa Claus, Oh Oh Oh #1 (sound no. 2074), BigSoundBank | Joseph Sardin | CC0 |
| `assets/game-buzzer.ogg` | Buzzer.ogg, Wikimedia Commons | BlastOButter42 | Public domain |
| `assets/wilhelm-scream.ogg` | Wilhelm Scream, Wikimedia Commons | USC Optical Sound Effects Library session | CC0 |
| `assets/santa-sleigh.png` | Santa-and-reindeer fly-by illustration | Status Claus project | MIT (original) |

Non-file media:

- **The elf, candy cane, gingerbread cookie, and peppermint treats** are original
  vector drawings generated by code in `treats.js` (MIT).
- **The evil snowman** is an original vector drawing in `snowman.js`, with
  snowballs drawn using CSS (MIT).
- **The fast-Santa alert beep** is synthesized at runtime with the Web Audio
  API in `music.js`; no recording is bundled (MIT).
- **Snowball throw and impact sounds** are synthesized from filtered noise and
  a low tone in `music.js`; no recordings are bundled (MIT).
- **The sad-trombone ending** is an original descending phrase synthesized in
  `music.js` with oscillators and a moving filter; no recording is bundled (MIT).
- **Toy and treat emoji** (for example 🧁, 🍪, 🍬, 🚂) are ordinary Unicode
  characters drawn by the visitor's own system font. No emoji images are
  bundled.

`assets/carollers.svg` is **Carollers** by Openclipart contributor
Warszawianka, released under CC0. Its provenance is recorded in the third-party
notices.

## Privacy

Status Claus does not collect or transmit any data. It stores only the highest
numeric game score in Chrome's extension-local storage. The source code
in this repository is the complete extension; there are no generated or hidden
runtime files.

## License

MIT
