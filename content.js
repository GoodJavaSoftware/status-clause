(() => {
  "use strict";

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const COMPONENTS_SELECTOR = ".components-container.one-column";
  const OVERLAY_CLASS = "status-claus-tree-overlay";
  const HOST_CLASS = "status-claus-tree-host";
  const STAR_CLASS = "status-claus-tree-star";
  const TARGET_CLASS = "status-claus-tree-target";
  const LOADING_CLASS = "status-claus-tree-loading";
  const SNOW_CLASS = "status-claus-snow";
  const SCOREBOARD_CLASS = "status-claus-scoreboard";
  // One silhouette keeps the status-grid cutout and green outline aligned.
  const TREE_PATH = [
    "M50,2",
    "Q54,17 63,27 Q62,28 60,25",
    "Q65,38 73,45 Q71,47 68,43",
    "Q75,58 83,65 Q81,67 78,63",
    "Q83,74 90,81 Q88,83 85,79",
    "Q90,90 97,97 Q75,95 50,98",
    "Q25,95 3,97 Q10,90 15,79",
    "Q12,83 10,81 Q17,74 22,63",
    "Q19,67 17,65 Q25,58 32,43",
    "Q29,47 27,45 Q35,38 40,25",
    "Q38,28 37,27 Q46,17 50,2 Z"
  ].join(" ");
  const SNOWFLAKE_COUNT = 55;
  const GAME_DURATION_MILLISECONDS = 60 * 1_000;
  const HIGH_SCORE_KEY = "statusClausHighScores";
  // Read the previous storage key so existing players retain their high scores.
  const LEGACY_HIGH_SCORE_KEY = "santaClaudeHighScores";
  const STAR_SPIN_BOOST = 300;
  const STAR_MAX_SPIN_SPEED = 3_600;
  const STAR_COAST_DURATION_SECONDS = 5;
  const STAR_POINTS_PER_ROTATION = 50;
  const TOYS = [
    { id: "train", symbol: "🚂", label: "Toy train", points: 200 },
    { id: "bear", symbol: "🧸", label: "Teddy bear", points: 300 },
    { id: "car", symbol: "🚗", label: "Toy car", points: 200 },
    { id: "soccer-ball", symbol: "⚽", label: "Soccer ball", points: 100 },
    { id: "kite", symbol: "🪁", label: "Toy kite", points: 100 },
    { id: "drum", symbol: "🥁", label: "Toy drum", points: 100 },
    { id: "bicycle", symbol: "🚲", label: "Bicycle", points: 400 },
    { id: "rocket", symbol: "🚀", label: "Toy rocket", points: 500 },
    { id: "robot", symbol: "🤖", label: "Toy robot", points: 300 },
    { id: "puzzle", symbol: "🧩", label: "Puzzle", points: 100 },
    { id: "game", symbol: "🎮", label: "Video game", points: 400 },
    { id: "skateboard", symbol: "🛹", label: "Skateboard", points: 300 },
    { id: "yoyo", symbol: "🪀", label: "Yo-yo", points: 100 },
    { id: "guitar", symbol: "🎸", label: "Toy guitar", points: 300 },
    { id: "basketball", symbol: "🏀", label: "Basketball", points: 200 },
    { id: "baseball", symbol: "⚾", label: "Baseball", points: 100 },
    { id: "football", symbol: "🏈", label: "Football", points: 100 },
    { id: "unicorn", symbol: "🦄", label: "Toy unicorn", points: 200 },
    { id: "dinosaur", symbol: "🦖", label: "Toy dinosaur", points: 200 },
    { id: "airplane", symbol: "✈️", label: "Toy airplane", points: 200 },
    { id: "sailboat", symbol: "⛵", label: "Toy sailboat", points: 200 },
    { id: "sled", symbol: "🛷", label: "Sled", points: 100 },
    { id: "scooter", symbol: "🛴", label: "Scooter", points: 100 },
    { id: "roller-skate", symbol: "🛼", label: "Roller skate", points: 100 },
    { id: "art-set", symbol: "🎨", label: "Art set", points: 100 },
    { id: "magic-wand", symbol: "🪄", label: "Magic wand", points: 500 },
    { id: "books", symbol: "📚", label: "Books", points: 100 },
    { id: "microscope", symbol: "🔬", label: "Toy microscope", points: 100 },
    { id: "telescope", symbol: "🔭", label: "Toy telescope", points: 100 },
    { id: "rubber-duck", symbol: "🐤", label: "Rubber duck", points: 100 }
  ];
  let totalScore = 0;
  let presentsPlundered = 0;
  let starSpins = 0;
  let santasSploded = 0;
  let treatsCaught = 0;
  let gameActive = false;
  let poweredOn = true;
  let powerButton = null;
  let spaceKeyOwner = null;

  document.addEventListener("keydown", (event) => {
    if (event.key !== " " || !spaceKeyOwner) {
      return;
    }

    if (event.target.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) {
      spaceKeyOwner = null;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (gameIsActive() && spaceKeyOwner.element.isConnected) {
      spaceKeyOwner.activate();
    }
  }, true);

  document.addEventListener("keyup", (event) => {
    if (event.key === " " && spaceKeyOwner) {
      event.preventDefault();
      spaceKeyOwner = null;
    }
  }, true);

  window.addEventListener("blur", () => { spaceKeyOwner = null; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      spaceKeyOwner = null;
    }
  });
  let gameEndsAt = 0;
  let gameTimer = null;
  let gameNumber = 0;
  let highScore = 0;
  let sessionHighScore = 0;
  let highScoreLoaded = false;
  let scoreboard = null;
  let startGameButton = null;
  let treeReady = false;
  let infoDialog = null;
  let infoReturnFocus = null;
  let gameStats = null;
  let timerValue = null;
  let scoreValue = null;
  let presentsPlunderedValue = null;
  let starSpinsValue = null;
  let santasSplodedValue = null;
  let treatsCaughtValue = null;
  let highScoreValue = null;
  let gameOverOverlay = null;
  let gameOverTimer = null;

  function hideGameOver() {
    window.clearTimeout(gameOverTimer);
    gameOverTimer = null;
    gameOverOverlay?.remove();
    gameOverOverlay = null;
  }

  const GAME_OVER_REASONS = {
    time: {
      title: "GAME OVER",
      icon: "⏰",
      message: "Time's up!"
    },
    elf: {
      title: "ELF-SPLODED!",
      icon: "🧝",
      message: "You blew up the treat-tossing elf. Clicking the elf ends the game!"
    },
    carolers: {
      title: "SILENT NIGHT",
      icon: "🎶",
      message: "You blew up the carolers and lost every point. Clicking the carolers ends the game!"
    }
  };

  function showGameOver(reason = "time") {
    hideGameOver();
    const { title: titleText, icon, message } =
      GAME_OVER_REASONS[reason] ?? GAME_OVER_REASONS.time;
    gameOverOverlay = document.createElement("div");
    gameOverOverlay.classList.add("status-claus-game-over", `status-claus-game-over-${reason}`);
    gameOverOverlay.setAttribute("role", "alert");
    gameOverOverlay.setAttribute("aria-atomic", "true");
    const panel = document.createElement("div");
    panel.classList.add("status-claus-game-over-panel");
    const title = document.createElement("span");
    title.classList.add("status-claus-game-over-title");
    title.textContent = titleText;
    const cause = document.createElement("p");
    cause.classList.add("status-claus-game-over-reason");
    const causeIcon = document.createElement("span");
    causeIcon.classList.add("status-claus-game-over-reason-icon");
    causeIcon.setAttribute("aria-hidden", "true");
    causeIcon.textContent = icon;
    cause.append(causeIcon, message);
    const scores = document.createElement("div");
    scores.classList.add("status-claus-game-over-scores");
    for (const [label, value, className] of [
      ["Final Score", totalScore, "status-claus-final-score"],
      ["High Score", highScore, "status-claus-final-high-score"]
    ]) {
      const row = document.createElement("div");
      const number = document.createElement("strong");
      number.classList.add(className);
      number.textContent = value.toLocaleString();
      row.append(`${label}: `, number);
      scores.append(row);
    }
    panel.append(title, cause, scores);
    gameOverOverlay.append(panel);
    document.body.append(gameOverOverlay);

    const entranceDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0 : 650;
    // Character endings stay up longer so there is time to read why.
    const readingTime = reason === "time" ? 3_000 : 5_000;
    gameOverTimer = window.setTimeout(hideGameOver, entranceDuration + readingTime);
  }

  function updateScoreboard() {
    scoreValue.textContent = totalScore.toLocaleString();
    presentsPlunderedValue.textContent = presentsPlundered.toLocaleString();
    starSpinsValue.textContent = starSpins.toLocaleString();
    santasSplodedValue.textContent = santasSploded.toLocaleString();
    treatsCaughtValue.textContent = treatsCaught.toLocaleString();
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function renderHighScore() {
    if (!highScoreValue) {
      return;
    }

    highScoreValue.textContent = highScore.toLocaleString();
    const finalHighScore = gameOverOverlay?.querySelector(".status-claus-final-high-score");
    if (finalHighScore) finalHighScore.textContent = highScore.toLocaleString();
  }

  function extensionStorageIsAvailable() {
    try {
      return Boolean(chrome.runtime?.id && chrome.storage?.local);
    } catch {
      return false;
    }
  }

  function loadHighScore() {
    if (highScoreLoaded) {
      return;
    }

    highScoreLoaded = true;
    if (!extensionStorageIsAvailable()) {
      return;
    }

    chrome.storage.local.get({ [HIGH_SCORE_KEY]: 0, [LEGACY_HIGH_SCORE_KEY]: 0 }, (storedValues) => {
      if (!extensionStorageIsAvailable()) {
        return;
      }

      const storageError = chrome.runtime.lastError;

      if (storageError) {
        console.warn(
          "Status Claus could not load its high scores.",
          storageError
        );
        return;
      }

      const storedValue = storedValues[HIGH_SCORE_KEY];
      const storedScores = [storedValue, storedValues[LEGACY_HIGH_SCORE_KEY]].flat();
      const validStoredScores = storedScores
        .filter((score) => Number.isFinite(score) && score >= 0)
        .map((score) => Math.floor(score));

      highScore = Math.max(0, sessionHighScore, ...validStoredScores);
      renderHighScore();

      if (sessionHighScore > 0 || Array.isArray(storedValue) || highScore !== storedValue) {
        saveHighScore();
      }
    });
  }

  function saveHighScore() {
    if (!extensionStorageIsAvailable()) {
      return;
    }

    chrome.storage.local.set({ [HIGH_SCORE_KEY]: highScore }, () => {
      if (!extensionStorageIsAvailable()) {
        return;
      }

      const storageError = chrome.runtime.lastError;

      if (storageError) {
        console.warn(
          "Status Claus could not save its high scores.",
          storageError
        );
      }
    });
  }

  function setGameInteractionState() {
    document.body.classList.toggle("status-claus-game-active", gameActive);

    for (const interactiveElement of document.querySelectorAll(
      `.${STAR_CLASS}, .status-claus-present`
    )) {
      interactiveElement.setAttribute("aria-disabled", String(!gameActive));
      interactiveElement.setAttribute("tabindex", gameActive ? "0" : "-1");
    }
  }

  function closeAllPresents() {
    document.querySelectorAll(".status-claus-present").forEach((present) => {
      present.classList.remove("status-claus-present-open");
      present.setAttribute("aria-label", "Open Christmas present");
      present.setAttribute("aria-pressed", "false");
    });
  }

  function finishGame({ playBuzzer = true, sadEnding = false, reason = "time", showOverlay = true } = {}) {
    if (!gameActive) {
      return;
    }

    gameActive = false;
    gameEndsAt = 0;
    window.clearInterval(gameTimer);
    gameTimer = null;
    timerValue.textContent = "0:00";
    startGameButton.hidden = false;
    closeAllPresents();
    document.querySelectorAll(".status-claus-points, .status-claus-star-points")
      .forEach((label) => label.remove());
    setGameInteractionState();
    document.dispatchEvent(
      new CustomEvent("status-claus:game-state", {
        detail: { active: false }
      })
    );
    if (playBuzzer) {
      document.dispatchEvent(new CustomEvent("status-claus:game-over"));
    }

    sessionHighScore = Math.max(sessionHighScore, totalScore);
    highScore = Math.max(highScore, totalScore);
    renderHighScore();
    saveHighScore();
    if (showOverlay) showGameOver(reason);
    if (sadEnding) {
      document.dispatchEvent(new CustomEvent("status-claus:sad-ending"));
    }
  }

  function gameIsActive() {
    if (gameActive && Date.now() >= gameEndsAt) {
      finishGame();
    }

    return gameActive;
  }

  function updateTimer() {
    if (!gameActive) {
      return;
    }

    const remainingTime = gameEndsAt - Date.now();

    if (remainingTime <= 0) {
      finishGame();
      return;
    }

    timerValue.textContent = formatTime(remainingTime);
  }

  function startGame() {
    if (!poweredOn || gameActive) {
      return;
    }

    const components = document.querySelector(COMPONENTS_SELECTOR);
    if (components) updateTreeLoadingState(components);
    else setTreeReady(false);
    if (!treeReady) return;

    hideGameOver();
    totalScore = 0;
    presentsPlundered = 0;
    starSpins = 0;
    santasSploded = 0;
    treatsCaught = 0;
    gameActive = true;
    gameNumber += 1;
    gameEndsAt = Date.now() + GAME_DURATION_MILLISECONDS;
    startGameButton.hidden = true;
    gameStats.hidden = false;
    timerValue.textContent = formatTime(GAME_DURATION_MILLISECONDS);
    closeAllPresents();
    document.querySelectorAll(".status-claus-points, .status-claus-star-points")
      .forEach((label) => label.remove());
    updateScoreboard();
    setGameInteractionState();
    document.dispatchEvent(
      new CustomEvent("status-claus:game-state", {
        detail: { active: true }
      })
    );
    gameTimer = window.setInterval(updateTimer, 100);
  }

  function showProjectInfo(trigger) {
    if (infoDialog?.open) return;
    spaceKeyOwner = null;
    infoReturnFocus = trigger;
    if (!infoDialog?.isConnected) {
      infoDialog = document.createElement("dialog");
      infoDialog.classList.add("status-claus-info-dialog");
      infoDialog.setAttribute("aria-labelledby", "status-claus-info-title");
      const panel = document.createElement("section");
      panel.classList.add("status-claus-info-content");
      const title = document.createElement("h2");
      title.id = "status-claus-info-title";
      title.tabIndex = -1;
      title.textContent = "About Status Claus";
      const credit = document.createElement("p");
      const link = document.createElement("a");
      link.href = "https://goodjava.org";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "GoodJava Software Solutions";
      credit.append("Created by ", link, " for fun.");
      panel.append(title, credit);
      for (const text of [
        "Status Claus is an independent project and is not affiliated with, endorsed by, sponsored by, or supported by Anthropic.",
        "Anthropic and Claude are trademarks of Anthropic, PBC. References to those names identify the compatible website only and do not imply endorsement.",
        "For entertainment only. The decorations and game are not official service-status information.",
        "Provided as is, without warranty, under the MIT License. Third-party media retain their respective licenses."
      ]) {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        panel.append(paragraph);
      }
      const close = document.createElement("button");
      close.type = "button";
      close.classList.add("status-claus-info-close");
      close.textContent = "Close";
      close.addEventListener("click", () => infoDialog.close());
      panel.append(close);
      infoDialog.append(panel);
      infoDialog.addEventListener("click", (event) => {
        if (event.target === infoDialog) infoDialog.close();
      });
      infoDialog.addEventListener("close", () => {
        if (infoReturnFocus?.isConnected) infoReturnFocus.focus({ preventScroll: true });
      });
      document.body.append(infoDialog);
    }
    infoDialog.showModal();
    infoDialog.querySelector("h2").focus({ preventScroll: true });
  }

  function togglePower() {
    poweredOn = !poweredOn;
    document.body.classList.toggle("status-claus-powered-off", !poweredOn);
    powerButton.setAttribute("aria-pressed", String(poweredOn));
    powerButton.setAttribute("aria-label", poweredOn ? "Turn Status Claus off" : "Turn Status Claus on");
    powerButton.title = poweredOn ? "Turn Status Claus off" : "Turn Status Claus on";
    document.dispatchEvent(new CustomEvent("status-claus:power-state", {
      detail: { enabled: poweredOn }
    }));

    if (!poweredOn) {
      spaceKeyOwner = null;
      finishGame({ playBuzzer: false, showOverlay: false });
      hideGameOver();
      infoDialog?.close();
      gameStats.hidden = true;
      document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) => {
        host.classList.remove(HOST_CLASS);
        for (const element of Array.from(host.children)) {
          if (Array.from(element.classList).some((name) => name.startsWith("status-claus-"))) {
            element.remove();
          }
        }
      });
      document.querySelectorAll(`.${SNOW_CLASS}, .status-claus-star-points, .status-claus-points`).forEach((element) => element.remove());
      document.querySelectorAll(".status-claus-status-twinkle").forEach((bar) => {
        bar.classList.remove("status-claus-status-twinkle");
        bar.style.removeProperty("--twinkle-delay");
        bar.style.removeProperty("--twinkle-duration");
      });
    } else {
      addTreeOverlay();
    }
    powerButton.focus({ preventScroll: true });
  }

  function addScoreboard() {
    if (scoreboard?.isConnected) {
      return;
    }

    scoreboard = document.createElement("div");
    scoreboard.classList.add(SCOREBOARD_CLASS);
    scoreboard.setAttribute("role", "region");
    scoreboard.setAttribute("aria-label", "Status Claus game scoreboard");

    const scoreboardTitle = document.createElement("div");
    scoreboardTitle.classList.add("status-claus-scoreboard-title");
    scoreboardTitle.textContent = "Status Claus";
    const infoButton = document.createElement("button");
    infoButton.classList.add("status-claus-info-button");
    infoButton.type = "button";
    infoButton.textContent = "i";
    infoButton.setAttribute("aria-label", "About Status Claus");
    infoButton.setAttribute("aria-haspopup", "dialog");
    infoButton.title = "About Status Claus";
    infoButton.addEventListener("click", () => showProjectInfo(infoButton));

    startGameButton = document.createElement("button");
    startGameButton.classList.add("status-claus-start-game");
    startGameButton.type = "button";
    startGameButton.textContent = "Start Game";
    startGameButton.disabled = !treeReady;
    startGameButton.addEventListener("click", startGame);

    gameStats = document.createElement("div");
    gameStats.classList.add("status-claus-game-stats");
    gameStats.hidden = true;

    const timerLine = document.createElement("div");
    timerLine.classList.add("status-claus-timer-line");
    timerLine.append("Time: ");
    timerValue = document.createElement("span");
    timerValue.textContent = formatTime(GAME_DURATION_MILLISECONDS);
    timerLine.append(timerValue);

    const scoreLine = document.createElement("div");
    scoreLine.classList.add("status-claus-score-line");
    scoreLine.append("Score: ");
    scoreValue = document.createElement("span");
    scoreLine.append(scoreValue);

    const counters = document.createElement("div");
    counters.classList.add("status-claus-score-counters");

    const toysLine = document.createElement("div");
    toysLine.append("Presents Plundered: ");
    presentsPlunderedValue = document.createElement("span");
    toysLine.append(presentsPlunderedValue);

    const starSpinsLine = document.createElement("div");
    starSpinsLine.append("Star Spins: ");
    starSpinsValue = document.createElement("span");
    starSpinsLine.append(starSpinsValue);

    const santasLine = document.createElement("div");
    santasLine.append("Santas 'Sploded: ");
    santasSplodedValue = document.createElement("span");
    santasLine.append(santasSplodedValue);

    const treatsLine = document.createElement("div");
    treatsLine.append("Treats Tapped: ");
    treatsCaughtValue = document.createElement("span");
    treatsLine.append(treatsCaughtValue);

    counters.append(toysLine, starSpinsLine, santasLine, treatsLine);
    gameStats.append(timerLine, scoreLine, counters);

    const highScorePanel = document.createElement("div");
    highScorePanel.classList.add("status-claus-high-score");
    const highScoreHeading = document.createElement("div");
    highScoreHeading.classList.add("status-claus-high-score-heading");
    highScoreHeading.textContent = "High Score";
    highScoreValue = document.createElement("div");
    highScoreValue.classList.add("status-claus-high-score-value");
    highScorePanel.append(highScoreHeading, highScoreValue);

    powerButton = document.createElement("button");
    powerButton.type = "button";
    powerButton.classList.add("status-claus-power-toggle");
    powerButton.setAttribute("aria-pressed", "true");
    powerButton.setAttribute("aria-label", "Turn Status Claus off");
    powerButton.title = "Turn Status Claus off";
    powerButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.3 5.8a9 9 0 1 0 11.4 0"/></svg>';
    powerButton.addEventListener("click", togglePower);

    const controls = document.createElement("div");
    controls.classList.add("status-claus-controls");
    controls.append(powerButton);

    scoreboard.append(
      scoreboardTitle,
      infoButton,
      startGameButton,
      gameStats,
      highScorePanel,
      controls
    );
    document.body.append(scoreboard);
    document.dispatchEvent(new CustomEvent("status-claus:scoreboard-ready"));
    updateScoreboard();
    renderHighScore();
    loadHighScore();
  }

  function awardPoints(present, x, y, points) {
    if (!gameIsActive()) {
      return;
    }

    totalScore += points;
    presentsPlundered += 1;
    updateScoreboard();

    const pointsLabel = createSvgElement("text", "status-claus-points", {
      x,
      y,
      "text-anchor": "middle",
      "dominant-baseline": "central"
    });
    pointsLabel.textContent = `+${points}`;
    pointsLabel.addEventListener("animationend", () => pointsLabel.remove());
    present.append(pointsLabel);
  }

  document.addEventListener("status-claus:santa-destroyed", (event) => {
    const points = event.detail?.points;

    if (!gameIsActive() || !Number.isFinite(points) || points <= 0) {
      return;
    }

    addScoreboard();
    totalScore += points;
    santasSploded += 1;
    updateScoreboard();
  });

  document.addEventListener("status-claus:choir-penalty", (event) => {
    if (!gameIsActive() || !event.detail) {
      return;
    }

    const lostPoints = totalScore;
    totalScore = 0;
    updateScoreboard();
    event.detail.lostPoints = lostPoints;
    event.detail.accepted = true;
    finishGame({ playBuzzer: false, sadEnding: true, reason: "carolers" });
  });

  document.addEventListener("status-claus:elf-exploded", (event) => {
    if (!gameIsActive() || !event.detail) {
      return;
    }

    event.detail.accepted = true;
    finishGame({ playBuzzer: false, sadEnding: true, reason: "elf" });
  });

  document.addEventListener("status-claus:snowball-hit", (event) => {
    if (!gameIsActive() || !event.detail) return;
    const lostPoints = Math.min(totalScore, 1_000);
    totalScore -= lostPoints;
    updateScoreboard();
    event.detail.accepted = true;
    event.detail.lostPoints = lostPoints;
  });

  document.addEventListener("status-claus:treat-caught", (event) => {
    const points = event.detail?.points;

    if (!gameIsActive() || !Number.isFinite(points) || points <= 0) {
      return;
    }

    addScoreboard();
    totalScore += points;
    treatsCaught += 1;
    updateScoreboard();
  });

  document.addEventListener("status-claus:star-points", (event) => {
    const points = event.detail?.points;
    const rotations = event.detail?.rotations;

    if (
      !gameIsActive() ||
      !Number.isFinite(points) ||
      points <= 0 ||
      !Number.isInteger(rotations) ||
      rotations <= 0
    ) {
      return;
    }

    addScoreboard();
    totalScore += points;
    starSpins += rotations;
    updateScoreboard();
  });

  function shuffledToys() {
    const toys = [...TOYS];

    for (let index = toys.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [toys[index], toys[randomIndex]] = [toys[randomIndex], toys[index]];
    }

    return toys;
  }

  function createSvgElement(name, className, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    element.classList.add(className);

    for (const [attribute, value] of Object.entries(attributes)) {
      element.setAttribute(attribute, value);
    }

    return element;
  }

  /** Gives the star clockwise momentum that builds with each activation. */
  function makeStarInteractive(star) {
    let angle = 0;
    let angularVelocity = 0;
    let deceleration = 0;
    let unscoredRotationDegrees = 0;
    let pointsSinceLastDisplay = 0;
    let displayWindowSeconds = 0;
    let animationFrame = null;
    let previousTime = 0;
    let scoringGameNumber = 0;

    function showStarPoints() {
      if (pointsSinceLastDisplay <= 0 || !star.isConnected) {
        pointsSinceLastDisplay = 0;
        return;
      }

      const starBounds = star.getBoundingClientRect();
      const pointsLabel = document.createElement("span");
      pointsLabel.classList.add("status-claus-star-points");
      pointsLabel.setAttribute("aria-hidden", "true");
      pointsLabel.textContent = `+${pointsSinceLastDisplay}`;
      pointsLabel.style.left = `${starBounds.left + starBounds.width / 2}px`;
      pointsLabel.style.top = `${starBounds.top + starBounds.height / 2}px`;
      pointsLabel.addEventListener("animationend", () => pointsLabel.remove());
      document.body.append(pointsLabel);
      pointsSinceLastDisplay = 0;
    }

    function animate(currentTime) {
      if (!gameIsActive()) {
        angularVelocity = 0;
        pointsSinceLastDisplay = 0;
        displayWindowSeconds = 0;
        animationFrame = null;
        return;
      }

      const elapsedSeconds = Math.min((currentTime - previousTime) / 1_000, 0.05);
      previousTime = currentTime;
      displayWindowSeconds += elapsedSeconds;
      const spinningSeconds = Math.min(
        elapsedSeconds,
        angularVelocity / deceleration
      );
      const nextAngularVelocity = Math.max(
        0,
        angularVelocity - deceleration * spinningSeconds
      );
      const degreesSpun =
        ((angularVelocity + nextAngularVelocity) / 2) * spinningSeconds;
      angle = (angle + degreesSpun) % 360;
      unscoredRotationDegrees += degreesSpun;

      const completedRotations = Math.floor(unscoredRotationDegrees / 360);

      if (completedRotations > 0) {
        unscoredRotationDegrees %= 360;
        const points = completedRotations * STAR_POINTS_PER_ROTATION;
        pointsSinceLastDisplay += points;
        document.dispatchEvent(
          new CustomEvent("status-claus:star-points", {
            detail: { points, rotations: completedRotations }
          })
        );
      }

      if (displayWindowSeconds >= 1) {
        showStarPoints();
        displayWindowSeconds %= 1;
      }

      angularVelocity = nextAngularVelocity;
      star.style.setProperty("--star-rotation", `${angle}deg`);

      if (angularVelocity > 0) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        showStarPoints();
        displayWindowSeconds = 0;
        animationFrame = null;
      }
    }

    function boostSpin() {
      if (!gameIsActive()) {
        return;
      }

      if (scoringGameNumber !== gameNumber) {
        scoringGameNumber = gameNumber;
        unscoredRotationDegrees = 0;
        pointsSinceLastDisplay = 0;
        displayWindowSeconds = 0;
      }

      angularVelocity = Math.min(
        angularVelocity + STAR_SPIN_BOOST,
        STAR_MAX_SPIN_SPEED
      );
      deceleration = angularVelocity / STAR_COAST_DURATION_SECONDS;

      if (animationFrame === null) {
        previousTime = performance.now();
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    star.addEventListener("click", boostSpin);
    star.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (event.key === " " && gameIsActive()) {
          spaceKeyOwner = { element: star, activate: boostSpin };
        }
        boostSpin();
      }
    });
  }

  function createPresent({
    x,
    y,
    width,
    height,
    colorClass,
    initialToy
  }) {
    const present = createSvgElement("g", "status-claus-present", {});
    const ribbonWidth = width * 0.2;
    const ribbonHeight = height * 0.2;
    const centerX = x + width / 2;
    const bodyY = y + height * 0.18;

    const box = createSvgElement("rect", colorClass, {
      x,
      y: bodyY,
      width,
      height: height * 0.82,
      rx: 0.8
    });
    const verticalRibbon = createSvgElement("rect", "status-claus-present-ribbon", {
      x: centerX - ribbonWidth / 2,
      y: bodyY,
      width: ribbonWidth,
      height: height * 0.82
    });
    const horizontalRibbon = createSvgElement("rect", "status-claus-present-ribbon", {
      x,
      y: y + height * 0.46,
      width,
      height: ribbonHeight
    });
    const lid = createSvgElement("g", "status-claus-present-lid", {});
    const lidBox = createSvgElement("rect", colorClass, {
      x: x - 0.4,
      y,
      width: width + 0.8,
      height: height * 0.25,
      rx: 0.6
    });
    const lidRibbon = createSvgElement("rect", "status-claus-present-ribbon", {
      x: centerX - ribbonWidth / 2,
      y,
      width: ribbonWidth,
      height: height * 0.25
    });
    const bow = createSvgElement("path", "status-claus-present-bow", {
      d: `M${centerX},${y} C${centerX - width * 0.42},${y - height * 0.5} ${centerX - width * 0.45},${y + height * 0.08} ${centerX},${y} C${centerX + width * 0.42},${y - height * 0.5} ${centerX + width * 0.45},${y + height * 0.08} ${centerX},${y}`
    });
    const revealedPresent = createSvgElement("text", "status-claus-present-surprise", {
      x: centerX,
      y: y + height * 0.58,
      "font-size": Math.max(width, height) * 0.8,
      "text-anchor": "middle",
      "dominant-baseline": "central"
    });

    lid.append(lidBox, lidRibbon, bow);
    present.append(box, verticalRibbon, horizontalRibbon, revealedPresent, lid);

    present.setAttribute("role", "button");
    present.setAttribute("tabindex", "0");
    present.setAttribute("aria-label", "Open Christmas present");
    present.setAttribute("aria-pressed", "false");

    let assignedToy = initialToy;

    function displayAssignedToy() {
      present.dataset.toyId = assignedToy.id;
      revealedPresent.textContent = assignedToy.symbol;
    }

    function assignNewUniqueToy() {
      const toyIdsInOtherBoxes = new Set(
        Array.from(document.querySelectorAll(".status-claus-present"))
          .filter((otherPresent) => otherPresent !== present)
          .map((otherPresent) => otherPresent.dataset.toyId)
      );
      const availableToys = TOYS.filter(
        (toy) => toy.id !== assignedToy.id && !toyIdsInOtherBoxes.has(toy.id)
      );

      assignedToy =
        availableToys[Math.floor(Math.random() * availableToys.length)];
      displayAssignedToy();
    }

    displayAssignedToy();

    function openPresent() {
      if (
        !gameIsActive() ||
        present.classList.contains("status-claus-present-open")
      ) {
        return;
      }

      present.classList.add("status-claus-present-open");
      present.setAttribute("aria-label", `${assignedToy.label} revealed`);
      present.setAttribute("aria-pressed", "true");
      awardPoints(
        present,
        centerX,
        y + height * 0.35,
        assignedToy.points
      );

      const resetDelay = 700 + Math.random() * 2_300;
      window.setTimeout(() => {
        present.classList.remove("status-claus-present-open");
        present.setAttribute("aria-label", "Open Christmas present");
        present.setAttribute("aria-pressed", "false");
        assignNewUniqueToy();
      }, resetDelay);
    }

    present.addEventListener("click", openPresent);
    present.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPresent();
      }
    });

    return present;
  }

  /** Adds a decorative snowfall layer across the full browser viewport. */
  function addSnowfall() {
    if (document.querySelector(`.${SNOW_CLASS}`)) {
      return;
    }

    const snowfall = document.createElement("div");
    snowfall.classList.add(SNOW_CLASS);
    snowfall.setAttribute("aria-hidden", "true");

    const flakes = document.createDocumentFragment();

    for (let index = 0; index < SNOWFLAKE_COUNT; index += 1) {
      const flake = document.createElement("span");
      flake.classList.add("status-claus-snowflake");
      flake.textContent = "❄";
      flake.style.setProperty("--left", `${Math.random() * 100}%`);
      flake.style.setProperty("--size", `${0.55 + Math.random() * 1.05}rem`);
      flake.style.setProperty("--duration", `${7 + Math.random() * 10}s`);
      flake.style.setProperty("--delay", `${Math.random() * -17}s`);
      flake.style.setProperty("--drift", `${-60 + Math.random() * 120}px`);
      flake.style.setProperty("--opacity", `${0.35 + Math.random() * 0.55}`);
      flakes.append(flake);
    }

    snowfall.append(flakes);
    document.body.append(snowfall);
  }

  function statusBarShouldTwinkle(fill) {
    const color = (fill || "").trim().toLowerCase();
    let channels;
    if (/^#[0-9a-f]{6}$/.test(color)) {
      channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
    } else if (/^#[0-9a-f]{3}$/.test(color)) {
      channels = color.slice(1).split("").map((digit) => Number.parseInt(digit + digit, 16));
    } else if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color)) {
      channels = color.match(/\d+/g).map(Number);
    } else {
      return false;
    }
    const [red, green, blue] = channels;
    // Keep healthy green bars and neutral loading placeholders steady.
    return Math.max(...channels) - Math.min(...channels) >= 20 &&
      !(green > red && green > blue);
  }

  function updateStatusTwinkles(components) {
    const bars = components.querySelectorAll(
      ".uptime-90-days-wrapper svg.availability-time-line-graphic rect.uptime-day"
    );
    bars.forEach((bar, index) => {
      const twinkles = statusBarShouldTwinkle(bar.getAttribute("fill"));
      const className = "status-claus-status-twinkle";
      if (twinkles && !bar.classList.contains(className)) {
        bar.style.setProperty("--twinkle-delay", `${-(index * 0.37) % 4}s`);
        bar.style.setProperty("--twinkle-duration", `${2.8 + (index % 7) * 0.3}s`);
      }
      bar.classList.toggle(className, twinkles);
    });
  }

  function uptimeChartsAreReady(components) {
    const wrappers = components.querySelectorAll(".uptime-90-days-wrapper");

    return wrappers.length > 0 && Array.from(wrappers).every((wrapper) => {
      const chart = wrapper.querySelector("svg.availability-time-line-graphic");
      const daysText = wrapper.querySelector(".availability-time-line-legend-day-count")?.textContent;
      const expectedDays = Number.parseInt(daysText, 10) || 90;
      const percentText = wrapper.querySelector('[id^="uptime-percent-"]')?.textContent.trim();
      const percent = Number(percentText);

      return Boolean(chart) &&
        chart.querySelectorAll("rect.uptime-day").length >= expectedDays &&
        Boolean(percentText) && Number.isFinite(percent) && percent >= 0 && percent <= 100;
    });
  }

  function setTreeReady(ready) {
    treeReady = ready;
    if (startGameButton) startGameButton.disabled = !ready;
  }

  function updateTreeLoadingState(components) {
    let loading = components.querySelector(`:scope > .${LOADING_CLASS}`);

    if (!loading) {
      loading = document.createElement("div");
      loading.classList.add(LOADING_CLASS);
      loading.setAttribute("role", "status");
      loading.setAttribute("aria-live", "polite");
      const wreath = createSvgElement("svg", "status-claus-loading-wreath", {
        viewBox: "0 0 200 200", "aria-hidden": "true", focusable: "false"
      });
      wreath.append(createSvgElement("circle", "status-claus-wreath-ring", {
        cx: 100, cy: 100, r: 73, fill: "none", stroke: "#14532d", "stroke-width": 18
      }));
      for (let index = 0; index < 24; index += 1) {
        const branch = createSvgElement("g", "status-claus-wreath-branch", {
          transform: `rotate(${index * 15} 100 100)`
        });
        branch.append(
          createSvgElement("path", "status-claus-wreath-leaf", {
            d: "M98 9 Q116 19 103 42 Q87 32 98 9 Z",
            fill: index % 2 ? "#15803d" : "#22c55e", stroke: "#14532d", "stroke-width": 1
          }),
          createSvgElement("path", "status-claus-wreath-leaf", {
            d: "M104 25 Q122 22 124 38 Q110 45 104 25 Z", fill: "#166534"
          })
        );
        if (index % 4 === 0) {
          for (const [cx, cy, r] of [[100, 24, 4.5], [94, 30, 3.5], [103, 33, 3.5]]) {
            branch.append(createSvgElement("circle", "status-claus-wreath-berry", {
              cx, cy, r, fill: "#ef4444", stroke: "#991b1b", "stroke-width": 1
            }));
          }
        }
        wreath.append(branch);
      }
      wreath.append(createSvgElement("path", "status-claus-wreath-bow", {
        d: "M100 173 Q68 147 70 174 Q74 193 100 178 Q126 193 130 174 Q132 147 100 173 M94 178 L83 197 L97 192 L100 180 L106 197 L117 196 L107 178",
        fill: "#dc2626", stroke: "#991b1b", "stroke-width": 2, "stroke-linejoin": "round"
      }));
      wreath.append(createSvgElement("circle", "status-claus-wreath-knot", {
        cx: 100, cy: 176, r: 6, fill: "#facc15", stroke: "#b45309", "stroke-width": 1
      }));
      const label = document.createElement("span");
      label.classList.add("status-claus-loading-label");
      label.textContent = "xmas initializing";
      loading.append(wreath, label);
      components.append(loading);
    }

    const ready = uptimeChartsAreReady(components);
    setTreeReady(ready);
    const hidden = ready;
    if (loading.hidden !== hidden) {
      loading.hidden = hidden;
    }
  }

  /**
   * Adds a decorative, non-interactive SVG to the status component grid.
   * The function is idempotent because Statuspage may replace parts of the DOM.
   */
  function addTreeOverlay() {
    if (!poweredOn) return;
    const components = document.querySelector(COMPONENTS_SELECTOR);

    if (!components) {
      setTreeReady(false);
      return;
    }

    components.classList.add(HOST_CLASS);
    updateTreeLoadingState(components);
    updateStatusTwinkles(components);
    addSnowfall();
    addScoreboard();

    if (!components.querySelector(`:scope > .${STAR_CLASS}`)) {
      const star = document.createElement("span");
      star.classList.add(STAR_CLASS);
      star.setAttribute("role", "button");
      star.setAttribute("tabindex", "0");
      star.setAttribute("aria-label", "Spin the Christmas tree star");
      star.textContent = "★";
      makeStarInteractive(star);
      components.append(star);
    }

    if (!components.querySelector(`:scope > .${TARGET_CLASS}`)) {
      const target = document.createElement("span");
      target.classList.add(TARGET_CLASS);
      target.setAttribute("aria-hidden", "true");
      components.append(target);
    }

    setGameInteractionState();

    if (components.querySelector(`:scope > .${OVERLAY_CLASS}`)) {
      return;
    }

    const overlay = document.createElementNS(SVG_NAMESPACE, "svg");
    overlay.classList.add(OVERLAY_CLASS);
    overlay.setAttribute("viewBox", "0 0 100 109");
    overlay.setAttribute("preserveAspectRatio", "none");
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("focusable", "false");

    const dimmer = document.createElementNS(SVG_NAMESPACE, "path");
    dimmer.classList.add("status-claus-tree-dimmer");
    dimmer.setAttribute(
      "d",
      `M0,0 H100 V100 H0 Z ${TREE_PATH}`
    );
    dimmer.setAttribute("fill-rule", "evenodd");

    const trunk = document.createElementNS(SVG_NAMESPACE, "rect");
    trunk.classList.add("status-claus-tree-trunk");
    trunk.setAttribute("x", "46");
    trunk.setAttribute("y", "97");
    trunk.setAttribute("width", "8");
    trunk.setAttribute("height", "12");

    const presents = document.createElementNS(SVG_NAMESPACE, "g");
    const initialToys = shuffledToys();
    presents.classList.add("status-claus-presents");
    presents.append(
      createPresent({
        x: 8,
        y: 101.5,
        width: 7,
        height: 7.5,
        colorClass: "status-claus-present-pink",
        initialToy: initialToys[0]
      }),
      createPresent({
        x: 18,
        y: 102.5,
        width: 7,
        height: 6.5,
        colorClass: "status-claus-present-green",
        initialToy: initialToys[1]
      }),
      createPresent({
        x: 28,
        y: 103.5,
        width: 7.5,
        height: 5.5,
        colorClass: "status-claus-present-red",
        initialToy: initialToys[2]
      }),
      createPresent({
        x: 38,
        y: 102,
        width: 7,
        height: 7,
        colorClass: "status-claus-present-blue",
        initialToy: initialToys[3]
      }),
      createPresent({
        x: 56,
        y: 104,
        width: 7,
        height: 5,
        colorClass: "status-claus-present-purple",
        initialToy: initialToys[4]
      }),
      createPresent({
        x: 66,
        y: 101.5,
        width: 7.5,
        height: 7.5,
        colorClass: "status-claus-present-teal",
        initialToy: initialToys[5]
      }),
      createPresent({
        x: 76,
        y: 103,
        width: 8,
        height: 6,
        colorClass: "status-claus-present-orange",
        initialToy: initialToys[6]
      }),
      createPresent({
        x: 87,
        y: 102,
        width: 7.5,
        height: 7,
        colorClass: "status-claus-present-cyan",
        initialToy: initialToys[7]
      })
    );

    const tree = document.createElementNS(SVG_NAMESPACE, "path");
    tree.classList.add("status-claus-tree-outline");
    tree.setAttribute("d", TREE_PATH);

    overlay.append(dimmer, trunk, presents, tree);
    components.append(overlay);
    setGameInteractionState();
    document.dispatchEvent(new CustomEvent("status-claus:tree-ready"));
  }

  addTreeOverlay();

  // Statuspage content can arrive or be replaced after the initial page load.
  const pageObserver = new MutationObserver(addTreeOverlay);
  pageObserver.observe(document.documentElement, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["fill"],
    subtree: true
  });
})();
