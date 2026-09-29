(() => {
  "use strict";

  const MIN_DELAY = 15_000;
  const MAX_DELAY = 20_000;
  const FIRST_FLIGHT_DELAY = 2_500;
  const FAST_WARNING_MULTIPLIER = 2.3;
  const FAST_WARNING_DURATION = 1_500;
  const BULLSEYE_MULTIPLIER = 5;
  const SLEIGH_IMAGE_URL = chrome.runtime.getURL("assets/santa-sleigh.png");
  const SPEED_SETTINGS = [
    { multiplier: 1, probability: 0.4, points: 50 },
    { multiplier: 1.4, probability: 0.27, points: 100 },
    { multiplier: 1.8, probability: 0.18, points: 500 },
    { multiplier: 2.3, probability: 0.1, points: 1000 },
    { multiplier: 5, probability: 0.05, points: 5000 }
  ];
  let gameActive = false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function extensionContextIsValid() {
    try {
      return Boolean(chrome.runtime?.id);
    } catch {
      return false;
    }
  }

  function setFlightInteractionState(flight) {
    const canInteract = gameActive &&
      !flight.classList.contains("status-claus-flyby-exploded");
    flight.classList.toggle("status-claus-flyby-disabled", !canInteract);
    flight.setAttribute("aria-disabled", String(!canInteract));

    if (canInteract) {
      flight.setAttribute("role", "button");
      flight.setAttribute("tabindex", "0");
      flight.setAttribute("aria-label", "Make Santa's sleigh explode");
    } else {
      flight.removeAttribute("role");
      flight.removeAttribute("tabindex");
      flight.removeAttribute("aria-label");
    }
  }

  document.addEventListener("status-claus:game-state", (event) => {
    gameActive = event.detail?.active === true;

    if (!gameActive) {
      document.querySelectorAll(".status-claus-fast-warning").forEach((warning) => {
        warning.remove();
      });
    }

    document.querySelectorAll(".status-claus-flyby").forEach((flight) => {
      setFlightInteractionState(flight);
    });
  });

  function scheduleNextFlight() {
    if (!extensionContextIsValid()) {
      return;
    }

    const delay = randomBetween(MIN_DELAY, MAX_DELAY);
    window.setTimeout(launchSanta, delay);
  }

  function chooseSpeedSetting() {
    const randomValue = Math.random();
    let cumulativeProbability = 0;

    for (const setting of SPEED_SETTINGS) {
      cumulativeProbability += setting.probability;

      if (randomValue < cumulativeProbability) {
        return setting;
      }
    }

    return SPEED_SETTINGS[0];
  }

  /** Returns whether the sleigh is currently passing over the tree's target. */
  function sleighIsOnTarget(sleigh) {
    const target = document.querySelector(".status-claus-tree-target");

    if (!gameActive || !target) {
      return false;
    }

    const targetBounds = target.getBoundingClientRect();

    if (targetBounds.width === 0) {
      return false;
    }

    const targetX = targetBounds.left + targetBounds.width / 2;
    const targetY = targetBounds.top + targetBounds.height / 2;
    const sleighBounds = sleigh.getBoundingClientRect();
    const insetX = sleighBounds.width * 0.2;
    const insetY = sleighBounds.height * 0.15;

    return (
      targetX >= sleighBounds.left + insetX &&
      targetX <= sleighBounds.right - insetX &&
      targetY >= sleighBounds.top + insetY &&
      targetY <= sleighBounds.bottom - insetY
    );
  }

  function setTargetLocked(locked) {
    document
      .querySelector(".status-claus-tree-target")
      ?.classList.toggle("status-claus-tree-target-locked", locked);
  }

  /** Flashes a warning at the edge where a fast Santa is about to appear. */
  function showFastWarning(speedSetting, fliesLeftToRight, centerY) {
    if (!gameActive) {
      return;
    }

    const warning = document.createElement("div");
    const isSuperFast = speedSetting.multiplier >= 5;
    warning.classList.add("status-claus-fast-warning");
    warning.classList.add(
      fliesLeftToRight
        ? "status-claus-fast-warning-left"
        : "status-claus-fast-warning-right"
    );
    warning.setAttribute("role", "status");
    warning.style.top = `${Math.min(
      Math.max(centerY, 60),
      window.innerHeight - 60
    )}px`;

    const arrow = fliesLeftToRight ? "➜" : "⬅";
    const message = isSuperFast ? "SUPER FAST SANTA!" : "Fast Santa!";
    warning.textContent = fliesLeftToRight
      ? `⚡ ${message} ${arrow}`
      : `${arrow} ${message} ⚡`;

    if (isSuperFast) {
      warning.classList.add("status-claus-fast-warning-super");
    }

    document.body.append(warning);

    if (gameActive) {
      document.dispatchEvent(
        new CustomEvent("status-claus:fast-santa-warning")
      );
    }

    window.setTimeout(() => warning.remove(), FAST_WARNING_DURATION);
  }

  function launchSanta() {
    if (!extensionContextIsValid()) {
      return;
    }

    const fliesLeftToRight = Math.random() >= 0.5;
    const sleighWidth = Math.min(340, Math.max(180, window.innerWidth * 0.22));
    const edgePadding = 50;
    const startX = fliesLeftToRight
      ? -sleighWidth - edgePadding
      : window.innerWidth + edgePadding;
    const endX = fliesLeftToRight
      ? window.innerWidth + edgePadding
      : -sleighWidth - edgePadding;
    const fliesUpward = Math.random() >= 0.5;
    const verticalTravel = randomBetween(
      window.innerHeight * 0.22,
      window.innerHeight * 0.38
    );
    const startY = fliesUpward
      ? randomBetween(window.innerHeight * 0.48, window.innerHeight * 0.7)
      : randomBetween(window.innerHeight * 0.06, window.innerHeight * 0.28);
    const endY = startY + (fliesUpward ? -verticalTravel : verticalTravel);
    const flightAngle =
      Math.atan2(endY - startY, Math.abs(endX - startX)) * (180 / Math.PI);
    const speedSetting = chooseSpeedSetting();

    if (speedSetting.multiplier >= FAST_WARNING_MULTIPLIER) {
      showFastWarning(speedSetting, fliesLeftToRight, startY + sleighWidth / 4);
      window.setTimeout(startFlight, FAST_WARNING_DURATION);
    } else {
      startFlight();
    }

    function startFlight() {
      if (!extensionContextIsValid()) {
        return;
      }

      const flight = document.createElement("div");
      flight.classList.add("status-claus-flyby");
      flight.style.width = `${sleighWidth}px`;
      setFlightInteractionState(flight);

      const sleigh = document.createElement("img");
      sleigh.classList.add("status-claus-flyby-image");
      sleigh.src = SLEIGH_IMAGE_URL;
      sleigh.alt = "";
      sleigh.draggable = false;
      sleigh.style.setProperty("--flight-angle", `${flightAngle}deg`);

      if (!fliesLeftToRight) {
        sleigh.classList.add("status-claus-flyby-image-reversed");
      }

      flight.append(sleigh);
      document.body.append(flight);

      const flightDuration =
        randomBetween(5_000, 7_000) / speedSetting.multiplier;

      document.dispatchEvent(
        new CustomEvent("status-claus:flyby", {
          detail: { duration: flightDuration }
        })
      );

      let voiceTimer = null;

      if (Math.random() < 0.25) {
        const earliestVoiceTime = Math.min(
          1_000,
          Math.max(300, flightDuration * 0.45)
        );
        const latestVoiceTime = Math.max(
          earliestVoiceTime,
          Math.min(2_000, flightDuration - 150)
        );
        const voiceDelay = randomBetween(earliestVoiceTime, latestVoiceTime);

        voiceTimer = window.setTimeout(() => {
          document.dispatchEvent(new CustomEvent("status-claus:ho-ho-ho"));
        }, voiceDelay);
      }

      const flightAnimation = flight.animate(
        [
          { transform: `translate3d(${startX}px, ${startY}px, 0)` },
          { transform: `translate3d(${endX}px, ${endY}px, 0)` }
        ],
        {
          duration: flightDuration,
          easing: "linear",
          fill: "forwards"
        }
      );

      let hasExploded = false;

      function trackTarget() {
        if (hasExploded || !flight.isConnected) {
          setTargetLocked(false);
          return;
        }

        setTargetLocked(sleighIsOnTarget(sleigh));
        window.requestAnimationFrame(trackTarget);
      }

      window.requestAnimationFrame(trackTarget);

      function explodeSleigh() {
        if (hasExploded || !gameActive) {
          return;
        }

        const bonus = sleighIsOnTarget(sleigh)
          ? speedSetting.points * (BULLSEYE_MULTIPLIER - 1)
          : 0;
        hasExploded = true;
        setTargetLocked(false);
        window.clearTimeout(voiceTimer);

        const currentTransform = getComputedStyle(flight).transform;
        flightAnimation.cancel();
        flight.style.transform = currentTransform;
        flight.classList.add("status-claus-flyby-exploded");
        flight.removeAttribute("tabindex");
        flight.removeAttribute("role");

        const explosion = document.createElement("span");
        explosion.classList.add("status-claus-explosion");
        explosion.textContent = "💥";
        flight.append(explosion);

        const pointsLabel = document.createElement("span");
        pointsLabel.classList.add("status-claus-santa-points");
        pointsLabel.textContent = `+${speedSetting.points}`;
        flight.append(pointsLabel);

        if (bonus > 0) {
          const bonusLabel = document.createElement("span");
          bonusLabel.classList.add("status-claus-santa-bonus");
          bonusLabel.textContent = `🎯 Bullseye ×${BULLSEYE_MULTIPLIER} (+${bonus.toLocaleString()})`;
          flight.append(bonusLabel);

          const target = document.querySelector(".status-claus-tree-target");
          target?.classList.remove("status-claus-tree-target-hit");
          // Restart the hit animation if two bullseyes land close together.
          void target?.offsetWidth;
          target?.classList.add("status-claus-tree-target-hit");
        }

        for (let index = 0; index < 12; index += 1) {
          const spark = document.createElement("span");
          spark.classList.add("status-claus-explosion-spark");
          spark.textContent = "✦";
          spark.style.setProperty("--spark-angle", `${index * 30}deg`);
          spark.style.setProperty(
            "--spark-distance",
            `${45 + Math.random() * 55}px`
          );
          flight.append(spark);
        }

        document.dispatchEvent(
          new CustomEvent("status-claus:sleigh-exploded")
        );
        document.dispatchEvent(
          new CustomEvent("status-claus:santa-destroyed", {
            detail: { points: speedSetting.points + bonus, bonus }
          })
        );
        window.setTimeout(() => flight.remove(), 1_000);
      }

      flight.addEventListener("click", explodeSleigh);
      flight.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          explodeSleigh();
        }
      });

      flightAnimation.finished.then(
        () => flight.remove(),
        () => {}
      );
      scheduleNextFlight();
    }
  }

  window.setTimeout(launchSanta, FIRST_FLIGHT_DELAY);
})();
