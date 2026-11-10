(() => {
  "use strict";

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const TREE_HOST_SELECTOR = ".status-claus-tree-host";
  const MIN_SPAWN_DELAY = 700;
  const MAX_SPAWN_DELAY = 1_500;
  const FIRST_SPAWN_DELAY = 500;
  const BULLSEYE_MULTIPLIER = 5;
  const REDUCED_MOTION = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Candy canes, gingerbread, and peppermints have no emoji, so they are
  // original vector drawings built here. The rest use system emoji glyphs.
  const TREATS = [
    { id: "candy-cane", art: "candyCane", label: "Candy cane", points: 450, weight: 4 },
    { id: "gingerbread", art: "gingerbread", label: "Gingerbread cookie", points: 600, weight: 3 },
    { id: "peppermint", art: "peppermint", label: "Peppermint", points: 300, weight: 5 },
    { id: "cupcake", symbol: "🧁", label: "Cupcake", points: 900, weight: 2 },
    { id: "cookie", symbol: "🍪", label: "Cookie", points: 300, weight: 5 },
    { id: "candy", symbol: "🍬", label: "Wrapped candy", points: 300, weight: 4 },
    { id: "chocolate", symbol: "🍫", label: "Chocolate bar", points: 450, weight: 3 },
    { id: "lollipop", symbol: "🍭", label: "Lollipop", points: 300, weight: 4 },
    { id: "doughnut", symbol: "🍩", label: "Doughnut", points: 600, weight: 2 }
  ];
  const TOTAL_WEIGHT = TREATS.reduce((sum, treat) => sum + treat.weight, 0);

  let gameActive = false;
  let spawnTimer = null;
  let elf = null;
  // Clicks this close to a falling treat catch it instead of exploding the elf.
  const TREAT_PRIORITY_RADIUS = 18;
  const treatCatchers = new Map();

  function catchTreatNear(x, y) {
    for (const [element, catchTreat] of treatCatchers) {
      const bounds = element.getBoundingClientRect();
      const dx = Math.max(bounds.left - x, 0, x - bounds.right);
      const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
      if (dx * dx + dy * dy <= TREAT_PRIORITY_RADIUS ** 2) {
        catchTreat();
        return true;
      }
    }
    return false;
  }

  function updateElfState() {
    if (!elf) return;
    const enabled = gameActive && !elf.classList.contains("status-claus-elf-exploded");
    elf.setAttribute("aria-disabled", String(!enabled));
    elf.setAttribute("aria-hidden", String(!enabled));
    elf.setAttribute("tabindex", enabled ? "0" : "-1");
  }

  function attachElf() {
    const tree = document.querySelector(TREE_HOST_SELECTOR);
    if (!tree || (elf?.isConnected && elf.parentElement === tree)) return;

    elf = document.createElement("div");
    elf.classList.add("status-claus-elf");
    elf.setAttribute("role", "button");
    elf.setAttribute("aria-label", "Explode the Christmas elf and end the game");
    const art = svgElement("svg", { viewBox: "0 0 72 90", "aria-hidden": "true", focusable: "false" });
    art.classList.add("status-claus-elf-art");
    const shapes = [
      ["path", { d: "M28 62 L23 80 M43 62 L49 80", stroke: "#fef3c7", "stroke-width": 9, "stroke-linecap": "round" }],
      ["path", { d: "M24 71 L21 77 M45 71 L48 77", stroke: "#dc2626", "stroke-width": 5 }],
      ["path", { d: "M25 78 Q22 88 10 83 L17 77 Z M46 78 Q50 88 63 82 L55 77 Z", fill: "#166534" }],
      ["path", { d: "M25 38 Q35 33 46 38 L51 65 L20 65 Z", fill: "#15803d", stroke: "#14532d", "stroke-width": 2 }],
      ["path", { d: "M22 54 L49 54", stroke: "#7f1d1d", "stroke-width": 6 }],
      ["rect", { x: 32, y: 51, width: 8, height: 6, rx: 1, fill: "#facc15" }],
      ["path", { d: "M25 40 L12 49 L7 43 M45 40 L57 47 L64 37", fill: "none", stroke: "#15803d", "stroke-width": 8, "stroke-linecap": "round" }],
      ["circle", { cx: 7, cy: 42, r: 4, fill: "#fed7aa" }],
      ["circle", { cx: 64, cy: 36, r: 4, fill: "#fed7aa", class: "status-claus-elf-hand" }],
      ["path", { d: "M24 25 L14 19 L20 32 M47 25 L57 19 L51 32", fill: "#fed7aa", stroke: "#c08457", "stroke-width": 1 }],
      ["ellipse", { cx: 36, cy: 26, rx: 15, ry: 14, fill: "#fed7aa" }],
      ["path", { d: "M21 20 Q25 2 40 4 Q50 3 56 13 L44 11 L50 20 Z", fill: "#dc2626", stroke: "#991b1b", "stroke-width": 1.5 }],
      ["path", { d: "M21 20 Q36 16 50 20", fill: "none", stroke: "#fef3c7", "stroke-width": 5, "stroke-linecap": "round" }],
      ["circle", { cx: 56, cy: 13, r: 4, fill: "#facc15" }],
      ["circle", { cx: 30, cy: 26, r: 1.7, fill: "#292524" }],
      ["circle", { cx: 42, cy: 26, r: 1.7, fill: "#292524" }],
      ["path", { d: "M30 32 Q36 38 42 32", fill: "none", stroke: "#9f1239", "stroke-width": 2, "stroke-linecap": "round" }]
    ];
    shapes.forEach(([name, attributes]) => art.append(svgElement(name, attributes)));
    elf.append(art);
    const currentElf = elf;
    function explodeElf() {
      if (!gameActive || currentElf.classList.contains("status-claus-elf-exploded")) return;
      const result = { accepted: false };
      document.dispatchEvent(new CustomEvent("status-claus:elf-exploded", { detail: result }));
      if (!result.accepted) return;
      currentElf.classList.add("status-claus-elf-exploded");
      updateElfState();
      const effects = [];
      for (let i = 0; i < 13; i += 1) {
        const effect = document.createElement("span");
        effect.classList.add(i === 0 ? "status-claus-explosion" : "status-claus-explosion-spark");
        effect.textContent = i === 0 ? "💥" : "✦";
        effect.setAttribute("aria-hidden", "true");
        effect.style.setProperty("--spark-angle", `${i * 30}deg`);
        effect.style.setProperty("--spark-distance", `${45 + Math.random() * 40}px`);
        currentElf.append(effect);
        effects.push(effect);
      }
      document.dispatchEvent(new CustomEvent("status-claus:sleigh-exploded"));
      window.setTimeout(() => effects.forEach((effect) => effect.remove()), 1_000);
    }
    // Catching a treat always wins over hitting the elf it was dropped from.
    let treatCaughtAt = -Infinity;
    currentElf.addEventListener("pointerdown", (event) => {
      if (!gameActive || !event.isPrimary || event.button !== 0) return;
      if (catchTreatNear(event.clientX, event.clientY)) {
        event.preventDefault();
        treatCaughtAt = event.timeStamp;
      }
    });
    currentElf.addEventListener("click", (event) => {
      if (event.timeStamp - treatCaughtAt < 1_000) return;
      if (event.detail > 0 && catchTreatNear(event.clientX, event.clientY)) return;
      explodeElf();
    });
    currentElf.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        explodeElf();
      }
    });
    tree.append(currentElf);
    updateElfState();
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, name);

    for (const [attribute, value] of Object.entries(attributes)) {
      element.setAttribute(attribute, value);
    }

    return element;
  }

  function drawCandyCane(svg) {
    const hook = "M9 22 V9 a4 4 0 0 1 8 0 v1.5";
    svg.append(
      svgElement("path", {
        d: hook,
        fill: "none",
        stroke: "#7f1d1d",
        "stroke-width": 5,
        "stroke-linecap": "round"
      }),
      svgElement("path", {
        d: hook,
        fill: "none",
        stroke: "#fff",
        "stroke-width": 3.6,
        "stroke-linecap": "round"
      }),
      svgElement("path", {
        d: hook,
        fill: "none",
        stroke: "#dc2626",
        "stroke-width": 3.6,
        "stroke-dasharray": "2.2 2.2"
      })
    );
  }

  function drawPeppermint(svg) {
    svg.append(
      svgElement("circle", {
        cx: 12,
        cy: 12,
        r: 10,
        fill: "#fff",
        stroke: "#7f1d1d",
        "stroke-width": 1
      })
    );

    for (let index = 0; index < 6; index += 1) {
      const start = (index * 60 * Math.PI) / 180;
      const end = ((index * 60 + 30) * Math.PI) / 180;
      svg.append(
        svgElement("path", {
          d: `M12 12 L${12 + 9.3 * Math.cos(start)} ${12 + 9.3 * Math.sin(start)} A9.3 9.3 0 0 1 ${12 + 9.3 * Math.cos(end)} ${12 + 9.3 * Math.sin(end)} Z`,
          fill: "#dc2626"
        })
      );
    }

    svg.append(svgElement("circle", { cx: 12, cy: 12, r: 2, fill: "#fff" }));
  }

  function drawGingerbread(svg) {
    const dough = { fill: "#b45309", stroke: "#78350f", "stroke-width": 0.6 };
    svg.append(
      svgElement("rect", { x: 7.6, y: 14, width: 3.8, height: 8.6, rx: 1.9, ...dough }),
      svgElement("rect", { x: 12.6, y: 14, width: 3.8, height: 8.6, rx: 1.9, ...dough }),
      svgElement("rect", { x: 2.6, y: 9, width: 18.8, height: 3.6, rx: 1.8, ...dough }),
      svgElement("rect", { x: 7.4, y: 8, width: 9.2, height: 9, rx: 3, ...dough }),
      svgElement("circle", { cx: 12, cy: 5.2, r: 3.9, ...dough }),
      svgElement("circle", { cx: 10.6, cy: 4.6, r: 0.6, fill: "#fff" }),
      svgElement("circle", { cx: 13.4, cy: 4.6, r: 0.6, fill: "#fff" }),
      svgElement("path", {
        d: "M10.4 6.4 Q12 7.8 13.6 6.4",
        fill: "none",
        stroke: "#fff",
        "stroke-width": 0.6,
        "stroke-linecap": "round"
      }),
      svgElement("circle", { cx: 12, cy: 10.8, r: 0.9, fill: "#dc2626" }),
      svgElement("circle", { cx: 12, cy: 13.6, r: 0.9, fill: "#16a34a" })
    );
  }

  const ARTWORK = {
    candyCane: drawCandyCane,
    gingerbread: drawGingerbread,
    peppermint: drawPeppermint
  };

  function chooseTreat() {
    let remaining = Math.random() * TOTAL_WEIGHT;

    for (const treat of TREATS) {
      remaining -= treat.weight;

      if (remaining < 0) {
        return treat;
      }
    }

    return TREATS[0];
  }

  function createTreatVisual(treat) {
    if (treat.symbol) {
      const glyph = document.createElement("span");
      glyph.classList.add("status-claus-treat-glyph");
      glyph.textContent = treat.symbol;
      return glyph;
    }

    const svg = svgElement("svg", {
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false"
    });
    svg.classList.add("status-claus-treat-art");
    ARTWORK[treat.art](svg);
    return svg;
  }

  function treatIsOnTarget(element) {
    const target = document.querySelector(".status-claus-tree-target");
    if (!gameActive || !target) return false;

    const circle = target.getBoundingClientRect();
    if (circle.width <= 0 || circle.height <= 0) return false;
    const treat = element.getBoundingClientRect();
    const centerX = circle.left + circle.width / 2;
    const centerY = circle.top + circle.height / 2;
    const nearestX = Math.max(treat.left, Math.min(centerX, treat.right));
    const nearestY = Math.max(treat.top, Math.min(centerY, treat.bottom));
    const dx = (nearestX - centerX) / (circle.width / 2);
    const dy = (nearestY - centerY) / (circle.height / 2);
    return dx * dx + dy * dy <= 1;
  }

  function dropTreat() {
    const tree = document.querySelector(TREE_HOST_SELECTOR);

    if (!gameActive || !tree) {
      return;
    }

    attachElf();
    const treeBounds = tree.getBoundingClientRect();
    // The tree may be scaled to fit the window; convert screen pixels to tree pixels.
    const treeScale = treeBounds.width / tree.offsetWidth || 1;
    const hand = elf.querySelector(".status-claus-elf-hand").getBoundingClientRect();
    const startX = REDUCED_MOTION ? tree.clientWidth * randomBetween(0.4, 0.6)
      : (hand.left + hand.width / 2 - treeBounds.left) / treeScale;
    const startY = REDUCED_MOTION ? tree.clientHeight * randomBetween(0.2, 0.45)
      : (hand.top + hand.height / 2 - treeBounds.top) / treeScale;
    const fallDistance = tree.clientHeight * 1.04 - startY;
    const drift = tree.clientWidth * randomBetween(0.1, 0.9) - startX;
    const treat = chooseTreat();

    const element = document.createElement("span");
    element.classList.add("status-claus-treat");
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `Catch the ${treat.label.toLowerCase()}`);
    element.style.left = `${startX}px`;
    element.style.top = `${startY}px`;

    const sway = document.createElement("span");
    sway.classList.add("status-claus-treat-sway");
    sway.style.setProperty("--sway-delay", `${randomBetween(-1.6, 0)}s`);
    sway.append(createTreatVisual(treat));
    element.append(sway);
    tree.append(element);

    if (!REDUCED_MOTION) {
      elf.querySelector(".status-claus-elf-hand").animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }],
        { duration: 300 }
      );
    }
    const trajectory = Array.from({ length: 21 }, (_, index) => {
      const t = index / 20;
      const x = REDUCED_MOTION ? 0 : drift * t;
      const y = REDUCED_MOTION ? 0 : fallDistance * t * t - 100 * t * (1 - t);
      return {
        offset: t,
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        opacity: Math.min(1, t * 20, (1 - t) * 10)
      };
    });
    const fall = element.animate(
      trajectory,
      {
        duration: randomBetween(4_000, 6_000),
        easing: "linear",
        fill: "forwards"
      }
    );

    let caught = false;

    function catchTreat() {
      if (caught || !gameActive) {
        return;
      }

      const bullseye = treatIsOnTarget(sway);
      const points = treat.points * (bullseye ? BULLSEYE_MULTIPLIER : 1);
      caught = true;
      treatCatchers.delete(element);
      const currentTransform = getComputedStyle(element).transform;
      fall.cancel();
      element.style.transform = currentTransform;
      element.classList.add("status-claus-treat-caught");
      element.removeAttribute("role");
      element.removeAttribute("tabindex");

      const pointsLabel = document.createElement("span");
      pointsLabel.classList.add("status-claus-treat-points");
      pointsLabel.setAttribute("aria-hidden", "true");
      pointsLabel.textContent = bullseye
        ? `🎯 ×${BULLSEYE_MULTIPLIER} +${points.toLocaleString()}`
        : `+${points}`;
      element.append(pointsLabel);

      if (bullseye) {
        const target = document.querySelector(".status-claus-tree-target");
        target.classList.remove("status-claus-tree-target-hit");
        void target.offsetWidth;
        target.classList.add("status-claus-tree-target-hit");
      }

      document.dispatchEvent(
        new CustomEvent("status-claus:treat-caught", {
          detail: { points, bonus: points - treat.points }
        })
      );
      window.setTimeout(() => element.remove(), 1_000);
    }

    element.addEventListener("pointerdown", (event) => {
      if (!gameActive || caught || !event.isPrimary || event.button !== 0) return;
      // Catch moving targets on contact, before they can move away on release.
      event.preventDefault();
      catchTreat();
    });
    treatCatchers.set(element, catchTreat);
    element.addEventListener("click", catchTreat);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        catchTreat();
      }
    });

    fall.finished.then(
      () => {
        treatCatchers.delete(element);
        element.remove();
      },
      () => {}
    );
  }

  function scheduleNextTreat(delay) {
    window.clearTimeout(spawnTimer);
    spawnTimer = window.setTimeout(() => {
      dropTreat();

      if (gameActive) {
        scheduleNextTreat(randomBetween(MIN_SPAWN_DELAY, MAX_SPAWN_DELAY));
      }
    }, delay);
  }

  document.addEventListener("status-claus:game-state", (event) => {
    gameActive = event.detail?.active === true;
    attachElf();

    if (gameActive) {
      if (elf) {
        elf.style.animationName = "none";
        void elf.offsetWidth;
        elf.style.animationName = "";
      }
      elf?.classList.remove("status-claus-elf-exploded");
      elf?.querySelectorAll(".status-claus-explosion, .status-claus-explosion-spark")
        .forEach((effect) => effect.remove());
      scheduleNextTreat(FIRST_SPAWN_DELAY);
    } else {
      window.clearTimeout(spawnTimer);
      spawnTimer = null;
      treatCatchers.clear();
      document.querySelectorAll(".status-claus-treat").forEach((treat) => {
        treat.remove();
      });
    }
    updateElfState();
  });
  document.addEventListener("status-claus:tree-ready", attachElf);
  attachElf();
})();
