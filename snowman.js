(() => {
  "use strict";

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const timers = new Set();
  const animations = new Set();
  const elements = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let gameActive = false;
  let round = 0;

  function schedule(action, delay) {
    const scheduledRound = round;
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (gameActive && round === scheduledRound) action();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function cancelTimer(timer) {
    window.clearTimeout(timer);
    timers.delete(timer);
  }

  function remove(element) {
    elements.delete(element);
    element.remove();
  }

  function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.then(
      () => animations.delete(animation),
      () => animations.delete(animation)
    );
    return animation;
  }

  function clearAttack() {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const element of elements) element.remove();
    elements.clear();
  }

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    return element;
  }

  function createSnowman() {
    const art = svgElement("svg", { viewBox: "0 0 110 145", "aria-hidden": "true", focusable: "false" });
    art.classList.add("status-claus-snowman-art");
    const shapes = [
      ["ellipse", { cx: 55, cy: 110, rx: 36, ry: 32, fill: "#dbeafe", stroke: "#64748b", "stroke-width": 2 }],
      ["ellipse", { cx: 50, cy: 104, rx: 27, ry: 26, fill: "#fff" }],
      ["path", { d: "M27 92 L11 82 L15 68 M11 82 L4 75", fill: "none", stroke: "#713f12", "stroke-width": 5, "stroke-linecap": "round" }],
      ["circle", { cx: 55, cy: 57, r: 28, fill: "#f8fafc", stroke: "#64748b", "stroke-width": 2 }],
      ["path", { d: "M30 80 Q57 87 79 77 L81 91 Q56 98 29 91 Z M66 91 L79 91 L85 115 L72 113 Z", fill: "#b91c1c" }],
      ["path", { d: "M24 35 L85 35 L85 42 L24 42 Z M35 35 L39 7 L73 7 L78 35 Z", fill: "#1e293b", stroke: "#0f172a", "stroke-width": 2 }],
      ["path", { d: "M37 27 L76 27 L77 34 L36 34 Z", fill: "#dc2626" }],
      ["ellipse", { cx: 43, cy: 53, rx: 7, ry: 5, fill: "#fef08a" }],
      ["ellipse", { cx: 67, cy: 53, rx: 7, ry: 5, fill: "#fef08a" }],
      ["circle", { cx: 45, cy: 54, r: 3, fill: "#991b1b" }],
      ["circle", { cx: 65, cy: 54, r: 3, fill: "#991b1b" }],
      ["path", { d: "M34 43 L50 49 M60 49 L76 43", fill: "none", stroke: "#0f172a", "stroke-width": 4, "stroke-linecap": "round" }],
      ["path", { d: "M53 57 L55 65 L81 65 Z", fill: "#f97316", stroke: "#c2410c", "stroke-width": 1 }],
      ["path", { d: "M40 70 Q55 84 74 68 Q58 73 40 70 Z", fill: "#1e293b", class: "status-claus-snowman-sneer" }],
      ["path", { d: "M46 72 L48 77 L51 74 M62 73 L65 77 L67 71", fill: "#fff" }],
      ["circle", { cx: 54, cy: 103, r: 3, fill: "#1e293b" }],
      ["circle", { cx: 54, cy: 117, r: 3, fill: "#1e293b" }]
    ];
    for (const [name, attributes] of shapes) art.append(svgElement(name, attributes));
    const arm = svgElement("g", { class: "status-claus-snowman-arm" });
    arm.append(
      svgElement("path", { d: "M78 92 L96 72 L95 54 M96 72 L105 65", fill: "none", stroke: "#713f12", "stroke-width": 5, "stroke-linecap": "round" }),
      svgElement("circle", { cx: 95, cy: 53, r: 8, fill: "#fff", stroke: "#93c5fd", "stroke-width": 1, class: "status-claus-snowman-hand" })
    );
    art.append(arm);
    art.append(svgElement("g", { class: "status-claus-snowman-reserve" }));
    return art;
  }

  function showImpact(x, y, lostPoints = null) {
    const effect = document.createElement("div");
    effect.classList.add("status-claus-snowball-burst");
    effect.setAttribute("aria-hidden", "true");
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    effect.textContent = lostPoints === null ? "💥 ❄" : `❄ −${lostPoints.toLocaleString()}`;
    if (lostPoints !== null) effect.classList.add("status-claus-snowball-damage");
    document.body.append(effect);
    elements.add(effect);
    schedule(() => remove(effect), 800);
  }

  function throwSnowball(actor) {
    if (!actor.isConnected) return;
    const arm = actor.querySelector(".status-claus-snowman-arm");
    if (!reducedMotion.matches) {
      animate(arm, [
        { transform: "rotate(-35deg)" },
        { transform: "rotate(35deg)", offset: 0.45 },
        { transform: "rotate(0deg)" }
      ], { duration: 350, easing: "ease-in-out" });
    }
    schedule(() => launchSnowball(actor), 150);
  }

  function launchSnowball(actor) {
    if (!actor.isConnected) return;
    const scheduledRound = round;
    const hand = actor.querySelector(".status-claus-snowman-hand").getBoundingClientRect();
    const startX = hand.left + hand.width / 2;
    const startY = hand.top + hand.height / 2;
    const targetX = window.innerWidth * (0.25 + Math.random() * 0.5);
    const endX = startX + (targetX - startX) * 0.5;
    const targetY = window.innerHeight * (0.25 + Math.random() * 0.5);
    const endY = startY + (targetY - startY) * 0.5;
    const duration = 2_000 + Math.random() * 1_000;
    const ball = document.createElement("button");
    ball.type = "button";
    ball.classList.add("status-claus-snowball");
    ball.setAttribute("aria-label", "Destroy incoming snowball");
    document.body.append(ball);
    elements.add(ball);
    document.dispatchEvent(new CustomEvent("status-claus:snowball-thrown"));
    let settled = false;

    const frames = reducedMotion.matches ? [
      { transform: `translate(${endX}px, ${endY}px) translate(-50%, -50%) scale(2)`, opacity: 0.75 },
      { transform: `translate(${endX}px, ${endY}px) translate(-50%, -50%) scale(2)`, opacity: 1 }
    ] : [
      { transform: `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(0.7)` },
      { transform: `translate(${(startX + endX) / 2}px, ${(startY + endY) / 2 - 25}px) translate(-50%, -50%) scale(1.6)`, offset: 0.5 },
      { transform: `translate(${endX}px, ${endY}px) translate(-50%, -50%) scale(4.5)` }
    ];
    const flight = animate(ball, frames, { duration, easing: "ease-in", fill: "forwards" });

    function destroy() {
      if (settled || !gameActive || round !== scheduledRound) return;
      settled = true;
      const bounds = ball.getBoundingClientRect();
      flight.cancel();
      remove(ball);
      showImpact(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    }
    ball.addEventListener("click", destroy);
    ball.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        destroy();
      }
    });
    flight.finished.then(() => {
      if (settled || !gameActive || round !== scheduledRound) return;
      settled = true;
      remove(ball);
      const result = { accepted: false, lostPoints: 0 };
      document.dispatchEvent(new CustomEvent("status-claus:snowball-hit", { detail: result }));
      if (result.accepted && gameActive) {
        showImpact(endX, endY, result.lostPoints);
        document.dispatchEvent(new CustomEvent("status-claus:snowball-impact"));
      }
    }, () => {});
  }

  function attack() {
    const tree = document.querySelector(".status-claus-tree-host");
    if (!tree) return;
    const actor = document.createElement("div");
    const left = Math.random() < 0.5;
    const height = 30 + Math.random() * 55;
    const inset = 50 - ((height - 2) / 95) * 47;
    actor.classList.add("status-claus-snowman", left ? "status-claus-snowman-left" : "status-claus-snowman-right");
    actor.style.top = `calc(var(--status-claus-tree-top, 0px) + var(--status-claus-tree-span) * ${height / 100})`;
    actor.style[left ? "left" : "right"] = `${inset}%`;
    actor.setAttribute("role", "button");
    actor.setAttribute("tabindex", "0");
    const facing = document.createElement("div");
    facing.classList.add("status-claus-snowman-facing");
    facing.append(createSnowman());
    actor.append(facing);
    const reserveCount = document.createElement("span");
    reserveCount.classList.add("status-claus-snowman-reserve-count");
    reserveCount.setAttribute("aria-hidden", "true");
    actor.append(reserveCount);
    tree.append(actor);
    elements.add(actor);
    if (!reducedMotion.matches) {
      animate(facing, [
        { translate: `${left ? 100 : -100}% 0` },
        { translate: "0 0" }
      ], { duration: 350, easing: "ease-out" });
    }
    const attackRound = round;
    let queued = 1;
    let firstThrowPending = true;
    let lastThrowAt = -Infinity;
    let throwTimer = null;
    let departureTimer = null;

    function showReserve() {
      const extras = queued - (firstThrowPending ? 1 : 0);
      const reserve = actor.querySelector(".status-claus-snowman-reserve");
      reserve.replaceChildren();
      const positions = [[7, 70], [18, 70], [29, 70], [12, 60], [24, 60], [18, 50]];
      for (const [cx, cy] of positions.slice(0, extras)) {
        reserve.append(svgElement("circle", { cx, cy, r: 6, fill: "#fff", stroke: "#93c5fd", "stroke-width": 1 }));
      }
      reserveCount.hidden = extras <= 6;
      reserveCount.textContent = extras > 6 ? `×${extras}` : "";
      actor.setAttribute("aria-label", `Give the snowman an extra snowball (${extras} extra queued)`);
    }

    function throwNext() {
      throwTimer = null;
      if (!actor.isConnected || !gameActive || round !== attackRound) return;
      queued -= 1;
      firstThrowPending = false;
      lastThrowAt = Date.now();
      showReserve();
      throwSnowball(actor);
      if (queued > 0) {
        throwTimer = schedule(throwNext, 500);
      } else {
        departureTimer = schedule(() => remove(actor), 800);
      }
    }

    function empower() {
      if (!actor.isConnected || !gameActive || round !== attackRound) return;
      queued += 1;
      cancelTimer(departureTimer);
      departureTimer = null;
      showReserve();
      if (throwTimer === null) {
        throwTimer = schedule(throwNext, Math.max(150, 500 - (Date.now() - lastThrowAt)));
      }
    }

    actor.addEventListener("click", empower);
    actor.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) empower();
      }
    });
    showReserve();
    throwTimer = schedule(throwNext, 500);
  }

  function scheduleNextAttack() {
    schedule(() => {
      attack();
      scheduleNextAttack();
    }, 5_000);
  }

  document.addEventListener("status-claus:game-state", (event) => {
    round += 1;
    gameActive = event.detail?.active === true;
    clearAttack();
    if (gameActive) {
      scheduleNextAttack();
    }
  });
})();
