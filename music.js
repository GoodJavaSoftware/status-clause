(() => {
  "use strict";

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const MIN_REPLAY_DELAY = 20_000;
  const MAX_REPLAY_DELAY = 30_000;
  const RECORDING_URLS = Object.freeze({
    "assets/angels-we-have-heard.mp3": chrome.runtime.getURL(
      "assets/angels-we-have-heard.mp3"
    ),
    "assets/deck-the-halls.mp3": chrome.runtime.getURL(
      "assets/deck-the-halls.mp3"
    ),
    "assets/game-buzzer.ogg": chrome.runtime.getURL("assets/game-buzzer.ogg"),
    "assets/here-we-come-a-wassailing.ogg": chrome.runtime.getURL(
      "assets/here-we-come-a-wassailing.ogg"
    ),
    "assets/jingle-bells.mp3": chrome.runtime.getURL("assets/jingle-bells.mp3"),
    "assets/o-tannenbaum.mp3": chrome.runtime.getURL("assets/o-tannenbaum.mp3"),
    "assets/santa-ho-ho-ho.mp3": chrome.runtime.getURL(
      "assets/santa-ho-ho-ho.mp3"
    ),
    "assets/sleigh-bells.ogg": chrome.runtime.getURL("assets/sleigh-bells.ogg"),
    "assets/wilhelm-scream.ogg": chrome.runtime.getURL(
      "assets/wilhelm-scream.ogg"
    )
  });
  const MUSIC_TRACK_PATHS = [
    "assets/jingle-bells.mp3",
    "assets/o-tannenbaum.mp3",
    "assets/deck-the-halls.mp3",
    "assets/angels-we-have-heard.mp3",
    "assets/here-we-come-a-wassailing.ogg"
  ];
  if (!AudioContext) {
    return;
  }

  let audioContext = null;
  let masterGain = null;
  let musicSource = null;
  let musicReplayTimer = null;
  let musicBufferPromises = new Map();
  let musicShuffleBag = [];
  let lastMusicTrackPath = null;
  let sleighBellBufferPromise = null;
  let santaVoiceBufferPromise = null;
  let wilhelmScreamBufferPromise = null;
  let gameBuzzerBufferPromise = null;
  let isPlaying = false;
  let gameActive = false;
  let choirExplosionInProgress = false;
  let startPromise = null;
  let audioPausedByUser = true;
  const activeSleighBellSources = new Set();

  const musicButton = document.createElement("button");
  musicButton.classList.add("status-claus-audio-toggle");
  musicButton.type = "button";

  const choirDisplay = document.createElement("div");
  choirDisplay.classList.add("status-claus-choir");
  choirDisplay.setAttribute("aria-hidden", "true");

  const choirImage = document.createElement("img");
  choirImage.classList.add("status-claus-choir-image");
  choirImage.src = chrome.runtime.getURL("assets/carollers.svg");
  choirImage.alt = "";

  for (const note of ["♪", "♫", "♪"]) {
    const noteElement = document.createElement("span");
    noteElement.classList.add("status-claus-choir-note");
    noteElement.textContent = note;
    choirDisplay.append(noteElement);
  }

  choirDisplay.append(choirImage);

  function updateAudioToggle() {
    const label = audioPausedByUser ? "Unmute audio" : "Mute audio";
    const soundPath = audioPausedByUser
      ? '<path d="m17 9 5 6m0-6-5 6"/>'
      : '<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
    musicButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z"/>' + soundPath + '</svg>';
    musicButton.setAttribute("aria-label", label);
    musicButton.setAttribute("title", label);
    musicButton.setAttribute("aria-pressed", String(audioPausedByUser));
  }

  function attachAudioToggle() {
    const scoreboard = document.querySelector(".status-claus-scoreboard");

    const controls = scoreboard?.querySelector(".status-claus-controls");
    if (controls && musicButton.parentElement !== controls) {
      controls.insertBefore(musicButton, controls.querySelector(".status-claus-power-toggle"));
    }

    if (scoreboard && choirDisplay.parentElement !== scoreboard) {
      scoreboard.append(choirDisplay);
    }

    setChoirInteractionState();
  }

  function setChoirInteractionState() {
    const canInteract = gameActive &&
      Boolean(musicSource) &&
      choirDisplay.classList.contains("status-claus-choir-visible") &&
      !choirExplosionInProgress;

    choirDisplay.classList.toggle("status-claus-choir-interactive", canInteract);
    choirDisplay.setAttribute("aria-hidden", String(!canInteract));

    if (canInteract) {
      choirDisplay.setAttribute("role", "button");
      choirDisplay.setAttribute("tabindex", "0");
      choirDisplay.setAttribute("aria-label", "Explode the Christmas carol singers");
    } else {
      choirDisplay.removeAttribute("role");
      choirDisplay.removeAttribute("tabindex");
      choirDisplay.removeAttribute("aria-label");
    }
  }

  function setChoirVisible(isVisible) {
    choirDisplay.classList.toggle("status-claus-choir-visible", isVisible);
    setChoirInteractionState();
  }

  function explodeChoir() {
    if (
      !gameActive ||
      choirExplosionInProgress ||
      !musicSource ||
      !choirDisplay.classList.contains("status-claus-choir-visible")
    ) {
      return;
    }

    const penalty = { accepted: false, lostPoints: 0 };
    document.dispatchEvent(
      new CustomEvent("status-claus:choir-penalty", { detail: penalty })
    );

    if (!penalty.accepted) {
      return;
    }

    choirExplosionInProgress = true;
    setChoirInteractionState();
    choirDisplay.classList.add("status-claus-choir-exploded");

    const explosion = document.createElement("span");
    explosion.classList.add("status-claus-explosion");
    explosion.textContent = "💥";
    choirDisplay.append(explosion);

    const penaltyLabel = document.createElement("span");
    penaltyLabel.classList.add("status-claus-choir-penalty");
    penaltyLabel.textContent = `-${penalty.lostPoints.toLocaleString()}`;
    choirDisplay.append(penaltyLabel);

    for (let index = 0; index < 12; index += 1) {
      const spark = document.createElement("span");
      spark.classList.add("status-claus-explosion-spark");
      spark.textContent = "✦";
      spark.style.setProperty("--spark-angle", `${index * 30}deg`);
      spark.style.setProperty(
        "--spark-distance",
        `${45 + Math.random() * 55}px`
      );
      choirDisplay.append(spark);
    }

    const sourceToStop = musicSource;
    sourceToStop.stop();
    document.dispatchEvent(new CustomEvent("status-claus:sleigh-exploded"));

    window.setTimeout(() => {
      choirDisplay.querySelectorAll(
        ".status-claus-explosion, .status-claus-explosion-spark, " +
        ".status-claus-choir-penalty"
      ).forEach((element) => element.remove());
      choirDisplay.classList.remove("status-claus-choir-exploded");
      choirExplosionInProgress = false;
      setChoirVisible(false);
    }, 1_000);
  }

  updateAudioToggle();
  attachAudioToggle();
  document.addEventListener("status-claus:scoreboard-ready", attachAudioToggle);
  document.addEventListener("status-claus:game-state", (event) => {
    gameActive = event.detail?.active === true;
    setChoirInteractionState();
  });
  choirDisplay.addEventListener("click", explodeChoir);
  choirDisplay.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      explodeChoir();
    }
  });

  function loadRecording(path, description) {
    const recordingUrl = RECORDING_URLS[path];
    const decodingContext = audioContext;

    return fetch(recordingUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load the bundled ${description}.`);
        }

        return response.arrayBuffer();
      })
      .then((recording) => decodingContext.decodeAudioData(recording));
  }

  function loadMusic(path) {
    if (!musicBufferPromises.has(path)) {
      musicBufferPromises.set(
        path,
        loadRecording(path, "Christmas music")
      );
    }

    return musicBufferPromises.get(path);
  }

  function chooseNextMusicTrack() {
    if (musicShuffleBag.length === 0) {
      musicShuffleBag = [...MUSIC_TRACK_PATHS];

      for (let index = musicShuffleBag.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [musicShuffleBag[index], musicShuffleBag[randomIndex]] = [
          musicShuffleBag[randomIndex],
          musicShuffleBag[index]
        ];
      }

      if (
        musicShuffleBag.length > 1 &&
        musicShuffleBag[0] === lastMusicTrackPath
      ) {
        [musicShuffleBag[0], musicShuffleBag[1]] = [
          musicShuffleBag[1],
          musicShuffleBag[0]
        ];
      }
    }

    const nextTrackPath = musicShuffleBag.shift();
    lastMusicTrackPath = nextTrackPath;
    return nextTrackPath;
  }

  function loadSleighBells() {
    if (!sleighBellBufferPromise) {
      sleighBellBufferPromise = loadRecording(
        "assets/sleigh-bells.ogg",
        "sleigh-bell recording"
      );
    }

    return sleighBellBufferPromise;
  }

  function loadSantaVoice() {
    if (!santaVoiceBufferPromise) {
      santaVoiceBufferPromise = loadRecording(
        "assets/santa-ho-ho-ho.mp3",
        "Santa voice recording"
      );
    }

    return santaVoiceBufferPromise;
  }

  function loadWilhelmScream() {
    if (!wilhelmScreamBufferPromise) {
      wilhelmScreamBufferPromise = loadRecording(
        "assets/wilhelm-scream.ogg",
        "Wilhelm scream"
      );
    }

    return wilhelmScreamBufferPromise;
  }

  function loadGameBuzzer() {
    if (!gameBuzzerBufferPromise) {
      gameBuzzerBufferPromise = loadRecording(
        "assets/game-buzzer.ogg",
        "game-over buzzer"
      );
    }

    return gameBuzzerBufferPromise;
  }

  async function playNextMusicTrack(context) {
    if (!isPlaying || audioContext !== context || context.state !== "running") {
      return;
    }

    const trackPath = chooseNextMusicTrack();

    try {
      const recording = await loadMusic(trackPath);

      if (
        !isPlaying ||
        audioContext !== context ||
        context.state !== "running"
      ) {
        return;
      }

      playMusicOnce(context, recording);
    } catch (error) {
      console.warn("Status Claus could not play a Christmas music track.", error);
    }
  }

  function playMusicOnce(context, recording) {
    if (!isPlaying || audioContext !== context || context.state !== "running") {
      return;
    }

    const musicGain = context.createGain();
    musicGain.gain.value = 0.65;

    const source = context.createBufferSource();
    musicSource = source;
    source.buffer = recording;
    source.connect(musicGain);
    musicGain.connect(masterGain);

    source.addEventListener("ended", () => {
      if (musicSource === source) {
        musicSource = null;

        if (!choirExplosionInProgress) {
          setChoirVisible(false);
        } else {
          setChoirInteractionState();
        }
      }

      if (!isPlaying || audioContext !== context) {
        return;
      }

      const replayDelay =
        MIN_REPLAY_DELAY + Math.random() * (MAX_REPLAY_DELAY - MIN_REPLAY_DELAY);

      musicReplayTimer = window.setTimeout(() => {
        musicReplayTimer = null;
        playNextMusicTrack(context);
      }, replayDelay);
    });

    setChoirVisible(true);
    source.start();
  }

  async function playSleighBells(durationInMilliseconds) {
    if (!isPlaying || !audioContext || audioContext.state !== "running") {
      return;
    }

    const contextPlayingBells = audioContext;

    try {
      const recording = await loadSleighBells();

      if (
        !isPlaying ||
        audioContext !== contextPlayingBells ||
        contextPlayingBells.state !== "running"
      ) {
        return;
      }

      const excerptStart = 0;
      const excerptEnd = Math.min(3.25, recording.duration);
      const duration = durationInMilliseconds / 1000;
      const startsAt = contextPlayingBells.currentTime;
      const endsAt = startsAt + duration;
      const source = contextPlayingBells.createBufferSource();
      const recordingGain = contextPlayingBells.createGain();

      source.buffer = recording;
      source.loop = true;
      source.loopStart = excerptStart;
      source.loopEnd = excerptEnd;
      recordingGain.gain.setValueAtTime(0.75, startsAt);
      recordingGain.gain.setValueAtTime(0.75, Math.max(startsAt, endsAt - 0.3));
      recordingGain.gain.linearRampToValueAtTime(0, endsAt);

      source.connect(recordingGain);
      recordingGain.connect(masterGain);
      activeSleighBellSources.add(source);
      source.addEventListener("ended", () => {
        activeSleighBellSources.delete(source);
      });
      source.start(startsAt, excerptStart);
      source.stop(endsAt + 0.02);
    } catch (error) {
      console.warn("Status Claus could not play its sleigh bells.", error);
    }
  }

  function stopSleighBells() {
    for (const source of activeSleighBellSources) {
      try {
        source.stop();
      } catch {
        // A source may already have reached its scheduled stop time.
      }
    }

    activeSleighBellSources.clear();
  }

  async function playWilhelmScream() {
    stopSleighBells();

    if (audioPausedByUser) {
      return;
    }

    await startMusic();

    if (!isPlaying || !audioContext || audioContext.state !== "running") {
      return;
    }

    const contextPlayingScream = audioContext;

    try {
      const recording = await loadWilhelmScream();

      if (
        !isPlaying ||
        audioContext !== contextPlayingScream ||
        contextPlayingScream.state !== "running"
      ) {
        return;
      }

      const source = contextPlayingScream.createBufferSource();
      const screamGain = contextPlayingScream.createGain();

      source.buffer = recording;
      screamGain.gain.value = 1.3;
      source.connect(screamGain);
      screamGain.connect(masterGain);
      source.start();
    } catch (error) {
      console.warn("Status Claus could not play the Wilhelm scream.", error);
    }
  }

  async function playSantaVoice() {
    if (!isPlaying || !audioContext || audioContext.state !== "running") {
      return;
    }

    const contextPlayingVoice = audioContext;

    try {
      const recording = await loadSantaVoice();

      if (
        !isPlaying ||
        audioContext !== contextPlayingVoice ||
        contextPlayingVoice.state !== "running"
      ) {
        return;
      }

      const source = contextPlayingVoice.createBufferSource();
      const voiceGain = contextPlayingVoice.createGain();

      source.buffer = recording;
      voiceGain.gain.value = 0.9;
      source.connect(voiceGain);
      voiceGain.connect(masterGain);
      source.start();
    } catch (error) {
      console.warn("Status Claus could not play Santa's voice.", error);
    }
  }

  async function playGameBuzzer() {
    if (!isPlaying || !audioContext || audioContext.state !== "running") {
      return;
    }

    const contextPlayingBuzzer = audioContext;

    try {
      const recording = await loadGameBuzzer();

      if (
        !isPlaying ||
        audioContext !== contextPlayingBuzzer ||
        contextPlayingBuzzer.state !== "running"
      ) {
        return;
      }

      const source = contextPlayingBuzzer.createBufferSource();
      const buzzerGain = contextPlayingBuzzer.createGain();

      source.buffer = recording;
      buzzerGain.gain.value = 1.1;
      source.connect(buzzerGain);
      buzzerGain.connect(masterGain);
      source.start();
    } catch (error) {
      console.warn("Status Claus could not play its game-over buzzer.", error);
    }
  }

  const sadTromboneSources = new Set();

  function stopSadTrombone() {
    for (const source of sadTromboneSources) source.stop();
    sadTromboneSources.clear();
  }

  function playSadTrombone() {
    if (!isPlaying || !audioContext || audioContext.state !== "running") return;
    stopSadTrombone();
    // An original descending brass phrase, following the explosion's scream.
    const startsAt = audioContext.currentTime + 1.6;
    [233.08, 207.65, 185, 174.61].forEach((frequency, index) => {
      const source = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      const volume = audioContext.createGain();
      const vibrato = audioContext.createOscillator();
      const vibratoDepth = audioContext.createGain();
      const start = startsAt + index * 0.55;
      const duration = index === 3 ? 0.85 : 0.45;
      source.type = "sawtooth";
      source.frequency.setValueAtTime(frequency * 1.03, start);
      source.frequency.exponentialRampToValueAtTime(frequency, start + 0.08);
      source.frequency.exponentialRampToValueAtTime(frequency * (index === 3 ? 0.84 : 0.98), start + duration);
      filter.type = "lowpass";
      filter.Q.value = 2.5;
      filter.frequency.setValueAtTime(450, start);
      filter.frequency.exponentialRampToValueAtTime(1800, start + 0.13);
      filter.frequency.exponentialRampToValueAtTime(350, start + duration);
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(0.24, start + 0.035);
      volume.gain.setValueAtTime(0.2, start + duration - 0.1);
      volume.gain.linearRampToValueAtTime(0, start + duration);
      vibrato.frequency.value = 5.5;
      vibratoDepth.gain.value = index === 3 ? 18 : 6;
      vibrato.connect(vibratoDepth);
      vibratoDepth.connect(source.detune);
      source.connect(filter);
      filter.connect(volume);
      volume.connect(masterGain);
      for (const oscillator of [source, vibrato]) {
        sadTromboneSources.add(oscillator);
        oscillator.addEventListener("ended", () => {
          sadTromboneSources.delete(oscillator);
          oscillator.disconnect();
        }, { once: true });
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
      }
      source.addEventListener("ended", () => {
        filter.disconnect();
        volume.disconnect();
        vibratoDepth.disconnect();
      }, { once: true });
    });
  }

  function playSnowballSound(impact = false) {
    if (!isPlaying || !audioContext || audioContext.state !== "running") return;
    const startsAt = audioContext.currentTime;
    const duration = impact ? 0.3 : 0.25;
    const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const volume = audioContext.createGain();
    noise.buffer = buffer;
    filter.type = impact ? "lowpass" : "bandpass";
    filter.Q.value = impact ? 0.7 : 1.2;
    filter.frequency.setValueAtTime(impact ? 2000 : 500, startsAt);
    filter.frequency.exponentialRampToValueAtTime(impact ? 250 : 2400, startsAt + duration);
    volume.gain.setValueAtTime(0, startsAt);
    volume.gain.linearRampToValueAtTime(impact ? 0.65 : 0.4, startsAt + (impact ? 0.01 : 0.07));
    volume.gain.exponentialRampToValueAtTime(0.001, startsAt + duration);
    noise.connect(filter);
    filter.connect(volume);
    volume.connect(masterGain);
    noise.addEventListener("ended", () => {
      noise.disconnect();
      filter.disconnect();
      volume.disconnect();
    }, { once: true });
    noise.start(startsAt);
    noise.stop(startsAt + duration);

    if (impact) {
      const thump = audioContext.createOscillator();
      const thumpVolume = audioContext.createGain();
      thump.type = "sine";
      thump.frequency.setValueAtTime(150, startsAt);
      thump.frequency.exponentialRampToValueAtTime(45, startsAt + 0.18);
      thumpVolume.gain.setValueAtTime(0, startsAt);
      thumpVolume.gain.linearRampToValueAtTime(0.45, startsAt + 0.008);
      thumpVolume.gain.exponentialRampToValueAtTime(0.001, startsAt + 0.22);
      thump.connect(thumpVolume);
      thumpVolume.connect(masterGain);
      thump.addEventListener("ended", () => {
        thump.disconnect();
        thumpVolume.disconnect();
      }, { once: true });
      thump.start(startsAt);
      thump.stop(startsAt + 0.23);
    }
  }

  /** Synthesizes a short alert, so no recording is bundled for it. */
  function playFastSantaWarning() {
    if (!isPlaying || !audioContext || audioContext.state !== "running") {
      return;
    }

    const startsAt = audioContext.currentTime;

    [0, 0.2, 0.4].forEach((offset, index) => {
      const oscillator = audioContext.createOscillator();
      const beepGain = audioContext.createGain();
      const beepStart = startsAt + offset;

      oscillator.type = "triangle";
      oscillator.frequency.value = index === 2 ? 1_320 : 988;
      beepGain.gain.setValueAtTime(0, beepStart);
      beepGain.gain.linearRampToValueAtTime(0.5, beepStart + 0.02);
      beepGain.gain.exponentialRampToValueAtTime(0.001, beepStart + 0.16);
      oscillator.connect(beepGain);
      beepGain.connect(masterGain);
      oscillator.start(beepStart);
      oscillator.stop(beepStart + 0.18);
    });
  }

  function startMusic() {
    if (isPlaying) {
      return Promise.resolve();
    }

    if (startPromise) {
      return startPromise;
    }

    startPromise = (async () => {
      if (!audioContext) {
        audioContext = new AudioContext();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.38;
        masterGain.connect(audioContext.destination);
      }

      const contextBeingStarted = audioContext;

      try {
        await contextBeingStarted.resume();
        if (
          audioContext !== contextBeingStarted ||
          contextBeingStarted.state !== "running"
        ) {
          return;
        }

        isPlaying = true;
        await playNextMusicTrack(contextBeingStarted);
      } catch (error) {
        console.warn("Status Claus could not play its Christmas music.", error);
      }
    })().finally(() => {
      startPromise = null;
    });

    return startPromise;
  }

  async function stopMusic() {
    stopSadTrombone();
    isPlaying = false;
    audioPausedByUser = true;
    setChoirVisible(false);
    updateAudioToggle();
    window.clearTimeout(musicReplayTimer);
    musicReplayTimer = null;

    if (musicSource) {
      musicSource.stop();
      musicSource = null;
    }

    const contextBeingStopped = audioContext;
    audioContext = null;
    masterGain = null;
    musicBufferPromises = new Map();
    sleighBellBufferPromise = null;
    santaVoiceBufferPromise = null;
    wilhelmScreamBufferPromise = null;
    gameBuzzerBufferPromise = null;
    stopSleighBells();

    if (contextBeingStopped) {
      await contextBeingStopped.close();
    }

  }

  document.addEventListener("status-claus:power-state", (event) => {
    if (!event.detail?.enabled) stopMusic();
  });

  musicButton.addEventListener("click", () => {
    if (document.body.classList.contains("status-claus-powered-off")) return;
    if (!audioPausedByUser) {
      stopMusic();
    } else {
      audioPausedByUser = false;
      updateAudioToggle();
      startMusic();
    }
  });

  document.addEventListener("status-claus:flyby", (event) => {
    const duration = event.detail?.duration;

    if (Number.isFinite(duration)) {
      playSleighBells(duration);
    }
  });

  document.addEventListener("status-claus:ho-ho-ho", playSantaVoice);
  document.addEventListener("status-claus:sleigh-exploded", playWilhelmScream);
  document.addEventListener("status-claus:game-over", playGameBuzzer);
  document.addEventListener("status-claus:sad-ending", playSadTrombone);
  document.addEventListener("status-claus:snowball-thrown", () => playSnowballSound());
  document.addEventListener("status-claus:snowball-impact", () => playSnowballSound(true));
  document.addEventListener("status-claus:game-state", (event) => {
    if (event.detail?.active) stopSadTrombone();
  });
  document.addEventListener(
    "status-claus:fast-santa-warning",
    playFastSantaWarning
  );

})();
