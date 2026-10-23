document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-wiki-graph]");
  const dataElement = document.getElementById("home-wiki-graph-data");
  if (!root || !dataElement) return;

  const stage = root.querySelector("[data-graph-stage]");
  const canvas = root.querySelector("[data-graph-canvas]");
  const context = canvas.getContext("2d");
  if (!context) return;

  let data;
  try {
    data = JSON.parse(dataElement.textContent);
  } catch (error) {
    return;
  }

  const search = root.querySelector("[data-graph-search]");
  const categoryTrigger = root.querySelector("[data-graph-category-trigger]");
  const categoryValue = root.querySelector("[data-graph-category-value]");
  const categoryOptions = root.querySelector("[data-graph-category-options]");
  const categoryButtons = [...root.querySelectorAll("[data-graph-category-option]")];
  const plannedToggle = root.querySelector("[data-graph-planned]");
  const expandButton = root.querySelector("[data-graph-expand]");
  const detail = root.querySelector("[data-graph-detail]");
  const results = root.querySelector("[data-graph-results]");
  const tooltip = root.querySelector("[data-graph-tooltip]");
  const legend = root.querySelector(".home-wiki__legend");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const palette = {
    violet: "#1c8c9b",
    green: "#35a86e",
    yellow: "#ff9700",
    pink: "#ef6a7e",
    cyan: "#d89364",
    blue: "#a3645d",
    orange: "#d10050",
    mint: "#f27957",
    lilac: "#b54385",
  };
  const nodeById = new Map();
  const categories = data.nodes.filter((node) => node.kind === "category");
  const topicsByCategory = new Map(categories.map((node) => [node.category, []]));
  const nodes = data.nodes.map((node) => {
    const graphNode = { ...node, x: 0, y: 0, homeX: 0, homeY: 0, vx: 0, vy: 0 };
    nodeById.set(node.id, graphNode);
    if (node.kind === "topic") topicsByCategory.get(node.category)?.push(graphNode);
    return graphNode;
  });

  categories.forEach((category, index) => {
    const angle = (index / categories.length) * Math.PI * 2 - Math.PI / 2;
    const categoryNode = nodeById.get(category.id);
    categoryNode.x = categoryNode.homeX = Math.cos(angle) * 265;
    categoryNode.y = categoryNode.homeY = Math.sin(angle) * 240;
    const topics = topicsByCategory.get(category.category) || [];
    topics.forEach((topic, topicIndex) => {
      const spread = (topicIndex / Math.max(topics.length, 1)) * Math.PI * 1.65 - Math.PI * 0.825;
      const orbit = angle + spread;
      const radius = 84 + (topicIndex % 3) * 20;
      topic.x = topic.homeX = categoryNode.x + Math.cos(orbit) * radius;
      topic.y = topic.homeY = categoryNode.y + Math.sin(orbit) * radius;
    });
  });

  const edgeKeys = new Set();
  const edges = data.edges.filter((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return false;
    const key = [edge.source, edge.target].sort().join("|");
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    return true;
  });

  const state = {
    category: "all",
    query: "",
    showPlanned: false,
    visibleNodes: [],
    visibleEdges: [],
    neighbors: new Map(),
    selected: null,
    hovered: null,
    pinned: false,
    width: 0,
    height: 0,
    pixelRatio: 1,
    scale: 1,
    panX: 0,
    panY: 0,
    pointer: null,
    expanded: false,
    visible: true,
    animationFrame: null,
    physicsFrames: 180,
  };

  const colorOf = (node) => node.kind === "hub" ? "#d4ffce" : palette[node.accent] || "#7355ff";
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const screenPoint = (node) => ({ x: node.x * state.scale + state.panX, y: node.y * state.scale + state.panY });
  const worldPoint = (x, y) => ({ x: (x - state.panX) / state.scale, y: (y - state.panY) / state.scale });

  const matchedNodes = () => state.query
    ? state.visibleNodes.filter((node) => node.kind !== "hub" && node.title.toLowerCase().includes(state.query))
    : [];
  const focusNode = () => state.pinned ? state.selected : state.hovered || state.selected;

  const makeText = (tag, className, content) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = content;
    return element;
  };

  const showDetail = (node) => {
    const legendNode = node?.kind === "hub" ? null : node || categories.find((category) => category.category === state.category);
    legend.classList.toggle("has-discipline", Boolean(legendNode));
    legend.style.setProperty("--home-wiki-legend-accent", legendNode ? colorOf(legendNode) : "#7355ff");
    if (!node) {
      const kicker = makeText("p", "home-wiki__detail-kicker", "Start anywhere");
      const title = makeText("h3", "", "A map made for wandering.");
      const description = makeText("p", "", "Hover to preview a connection. Select a node to pin its details, then open its page from here.");
      const link = makeText("a", "", "Browse the full index →");
      link.href = "/wiki/";
      detail.replaceChildren(kicker, title, description, link);
      return;
    }

    const label = node.kind === "hub" ? "Complete knowledge base"
      : node.kind === "category" ? `Discipline ${node.number}`
        : node.published ? "Published reference guide" : "Mapped for the future";
    const kicker = makeText("p", "home-wiki__detail-kicker", label);
    const title = makeText("h3", "", node.title);
    const connected = state.neighbors.get(node.id)?.size || 0;
    const description = node.kind === "category" ? node.description
      : node.kind === "hub" ? `${data.categoryCount} disciplines · ${data.guideCount} guides · ${data.mappedCount} mapped topics.`
        : node.published ? `${node.categoryTitle} · ${connected} visible connection${connected === 1 ? "" : "s"} in the map.`
          : `This topic belongs to ${node.categoryTitle}. Its reference guide is planned.`;
    const copy = makeText("p", "", description);
    const link = makeText("a", "", node.url ? "Open page →" : `Explore ${node.categoryTitle} →`);
    link.href = node.url || node.categoryURL;
    detail.replaceChildren(kicker, title, copy, link);
  };

  const renderResults = () => {
    if (!state.query) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }
    const matches = matchedNodes();
    results.hidden = false;
    const title = makeText("p", "home-wiki__results-title", `${matches.length} result${matches.length === 1 ? "" : "s"} in this view`);
    if (!matches.length) {
      results.replaceChildren(title, makeText("p", "home-wiki__results-empty", state.showPlanned ? "Try another term or discipline." : "No published guide matches. Try showing planned topics."));
      return;
    }
    const list = document.createElement("ul");
    matches.slice(0, 8).forEach((node) => {
      const item = document.createElement("li");
      const action = document.createElement(node.url ? "a" : "button");
      if (node.url) action.href = node.url;
      else action.type = "button";
      action.append(makeText("span", "", node.title));
      action.append(makeText("small", "", node.kind === "category" ? "Domain" : node.published ? "Guide" : "Planned"));
      action.addEventListener("pointerenter", () => {
        state.hovered = node;
        if (!state.pinned) {
          state.selected = node;
          showDetail(node);
        }
        wake(0);
      });
      action.addEventListener("focus", () => {
        state.hovered = node;
        if (!state.pinned) {
          state.selected = node;
          showDetail(node);
        }
        wake(0);
      });
      if (!node.url) action.addEventListener("click", () => {
        state.selected = node;
        state.pinned = true;
        centerOn(node);
        showDetail(node);
      });
      item.append(action);
      list.append(item);
    });
    results.replaceChildren(title, list);
  };

  const refreshGraph = (fit = true) => {
    state.visibleNodes = nodes.filter((node) => {
      if (node.kind === "hub") return true;
      if (state.category !== "all" && node.category !== state.category) return false;
      return node.kind !== "topic" || node.published || state.showPlanned;
    });
    const visibleIds = new Set(state.visibleNodes.map((node) => node.id));
    state.visibleEdges = edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
    state.neighbors = new Map(state.visibleNodes.map((node) => [node.id, new Set()]));
    state.visibleEdges.forEach((edge) => {
      state.neighbors.get(edge.source).add(edge.target);
      state.neighbors.get(edge.target).add(edge.source);
    });
    if (state.selected && !visibleIds.has(state.selected.id)) {
      state.selected = null;
      state.pinned = false;
    }
    if (state.hovered && !visibleIds.has(state.hovered.id)) state.hovered = null;
    if (fit) fitView();
    renderResults();
    showDetail(focusNode());
    wake(180);
  };

  const fitView = () => {
    if (!state.width || !state.height || !state.visibleNodes.length) return;
    const xs = state.visibleNodes.map((node) => node.x);
    const ys = state.visibleNodes.map((node) => node.y);
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 180;
    const minY = Math.min(...ys) - 105;
    const maxY = Math.max(...ys) + 105;
    state.scale = clamp(Math.min((state.width - 30) / (maxX - minX), (state.height - 30) / (maxY - minY)), 0.35, 2.5);
    state.panX = state.width / 2 - ((minX + maxX) / 2) * state.scale;
    state.panY = state.height / 2 - ((minY + maxY) / 2) * state.scale;
    wake(0);
  };

  const centerOn = (node) => {
    state.scale = Math.max(state.scale, 0.95);
    state.panX = state.width / 2 - node.x * state.scale;
    state.panY = state.height / 2 - node.y * state.scale;
    wake(0);
  };

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    if (!width || !height) return;
    state.width = width;
    state.height = height;
    state.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * state.pixelRatio);
    canvas.height = Math.round(height * state.pixelRatio);
    fitView();
  };

  const simulate = () => {
    const active = state.visibleNodes;
    for (let i = 0; i < active.length; i += 1) {
      const a = active[i];
      if (a.kind === "hub" || a === state.pointer?.node) continue;
      a.vx += (a.homeX - a.x) * 0.0025;
      a.vy += (a.homeY - a.y) * 0.0025;
      for (let j = i + 1; j < active.length; j += 1) {
        const b = active[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = Math.max(dx * dx + dy * dy, 1);
        const minDistance = a.kind === "category" || b.kind === "category" ? 92 : 38;
        if (distanceSquared > minDistance * minDistance) continue;
        const distance = Math.sqrt(distanceSquared);
        const push = (minDistance - distance) * 0.014;
        const fx = (dx / distance) * push;
        const fy = (dy / distance) * push;
        a.vx += fx;
        a.vy += fy;
        if (b.kind !== "hub" && b !== state.pointer?.node) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }
    for (const node of active) {
      if (node.kind === "hub" || node === state.pointer?.node) continue;
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x += node.vx;
      node.y += node.vy;
    }
  };

  const drawLabel = (node, active) => {
    if (node.kind === "topic" && !active && state.scale < 1.05) return;
    const point = screenPoint(node);
    const startX = point.x + (node.kind === "hub" ? 24 : node.kind === "category" ? 20 : 11);
    const startY = point.y + 4;
    context.font = node.kind === "topic" ? "500 11px Satoshi, sans-serif" : "500 13px Satoshi, sans-serif";
    context.fillStyle = active ? "#ffffff" : node.kind === "topic" ? "#d4cce0" : "#ffffff";
    context.shadowColor = "#241a3d";
    context.shadowBlur = 7;
    const words = node.title.split(" ");
    const lines = [""];
    const maxWidth = node.kind === "topic" ? 135 : 155;
    for (const word of words) {
      const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
      if (context.measureText(next).width > maxWidth && lines[lines.length - 1] && lines.length < 2) lines.push(word);
      else lines[lines.length - 1] = next;
    }
    if (lines.length === 2 && context.measureText(lines[1]).width > maxWidth) {
      while (lines[1].length > 1 && context.measureText(`${lines[1]}…`).width > maxWidth) lines[1] = lines[1].slice(0, -1);
      lines[1] += "…";
    }
    lines.forEach((line, index) => context.fillText(line, startX, startY + index * 15));
    context.shadowBlur = 0;
  };

  const draw = (now) => {
    context.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
    context.clearRect(0, 0, state.width, state.height);
    const focus = focusNode();
    const matches = new Set(matchedNodes().map((node) => node.id));
    const neighbors = focus ? state.neighbors.get(focus.id) || new Set() : null;
    context.save();
    context.translate(state.panX, state.panY);
    context.scale(state.scale, state.scale);
    context.lineWidth = Math.max(0.8, 1.3 / state.scale);
    for (const edge of state.visibleEdges) {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      const highlighted = focus && (edge.source === focus.id || edge.target === focus.id);
      context.globalAlpha = focus ? highlighted ? 0.85 : 0.08 : edge.kind === "reference" ? 0.24 : 0.35;
      context.strokeStyle = edge.kind === "reference" ? "#d4ffce" : colorOf(target);
      context.setLineDash(edge.kind === "reference" ? [4 / state.scale, 5 / state.scale] : []);
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
      context.stroke();
    }
    context.setLineDash([]);
    for (const node of state.visibleNodes) {
      const active = node === focus || neighbors?.has(node.id) || matches.has(node.id);
      const radius = node.kind === "hub" ? 14 : node.kind === "category" ? 10 : node.published ? 4.8 : 4;
      context.globalAlpha = focus && !active ? 0.22 : state.query && !matches.has(node.id) && node.kind === "topic" ? 0.27 : 1;
      if (node.kind === "category" || node.kind === "hub") {
        context.shadowColor = colorOf(node);
        context.shadowBlur = 16 / state.scale;
      }
      context.beginPath();
      if (node.kind === "topic" && node.published) {
        context.moveTo(node.x, node.y - radius * 1.2);
        context.lineTo(node.x + radius, node.y + radius * 0.75);
        context.lineTo(node.x - radius, node.y + radius * 0.75);
        context.closePath();
      } else {
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      }
      if (node.kind === "topic" && !node.published) {
        context.strokeStyle = colorOf(node);
        context.lineWidth = 1.8 / state.scale;
        context.stroke();
      } else {
        context.fillStyle = colorOf(node);
        context.fill();
      }
      context.shadowBlur = 0;
      if (active || node.kind === "hub") {
        const pulse = reducedMotion.matches ? 0 : Math.sin(now / 620 + node.x / 55) * 1.3;
        context.beginPath();
        context.arc(node.x, node.y, radius + 6 + pulse, 0, Math.PI * 2);
        context.lineWidth = 1.2 / state.scale;
        context.strokeStyle = node.kind === "hub" ? "#d4ffce" : colorOf(node);
        context.globalAlpha *= 0.55;
        context.stroke();
      }
    }
    context.restore();
    context.globalAlpha = 1;
    for (const node of state.visibleNodes) {
      if (state.width < 600 && node.kind === "category" && node !== focus && !matches.has(node.id)) continue;
      if (node.kind === "topic" && node !== focus && !matches.has(node.id) && state.scale < 1.05) continue;
      if (focus && node.kind !== "hub" && node !== focus && !neighbors?.has(node.id) && !matches.has(node.id)) continue;
      drawLabel(node, node === focus || matches.has(node.id));
    }
  };

  const frame = (now) => {
    state.animationFrame = null;
    if (!state.visible || !state.width || !state.height || document.hidden) return;
    if (state.physicsFrames > 0) {
      simulate();
      state.physicsFrames -= 1;
    }
    draw(now);
    if (state.physicsFrames > 0 || !reducedMotion.matches || state.pointer) {
      state.animationFrame = requestAnimationFrame(frame);
    }
  };

  const wake = (physicsFrames = 0) => {
    state.physicsFrames = Math.max(state.physicsFrames, physicsFrames);
    if (state.animationFrame === null && state.visible && !document.hidden) state.animationFrame = requestAnimationFrame(frame);
  };

  const hitTest = (x, y) => {
    let closest = null;
    let closestDistance = Infinity;
    for (const node of state.visibleNodes) {
      const point = screenPoint(node);
      const distance = Math.hypot(x - point.x, y - point.y);
      const hitRadius = node.kind === "topic" ? 14 : 19;
      if (distance < hitRadius && distance < closestDistance) {
        closest = node;
        closestDistance = distance;
      }
    }
    return closest;
  };

  const pointerPosition = (event) => {
    const bounds = stage.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const showTooltip = (node, x, y) => {
    if (!node) {
      tooltip.hidden = true;
      return;
    }
    tooltip.textContent = `${node.title} · ${node.kind === "category" ? "discipline" : node.kind === "hub" ? "complete Wiki" : node.published ? "published guide" : "planned topic"}`;
    tooltip.hidden = false;
    tooltip.style.left = `${clamp(x + 16, 8, Math.max(8, state.width - 245))}px`;
    tooltip.style.top = `${clamp(y - 42, 8, Math.max(8, state.height - 65))}px`;
  };

  const zoomAt = (factor, x, y) => {
    const point = worldPoint(x, y);
    state.scale = clamp(state.scale * factor, 0.35, 3.5);
    state.panX = x - point.x * state.scale;
    state.panY = y - point.y * state.scale;
    wake(0);
  };

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || (event.pointerType === "mouse" && event.button !== 0)) return;
    const position = pointerPosition(event);
    state.pointer = { id: event.pointerId, startX: position.x, startY: position.y, lastX: position.x, lastY: position.y, node: hitTest(position.x, position.y), moved: false };
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    const position = pointerPosition(event);
    const pointer = state.pointer;
    if (pointer && pointer.id === event.pointerId) {
      if (Math.hypot(position.x - pointer.startX, position.y - pointer.startY) > 5) pointer.moved = true;
      if (pointer.moved) {
        stage.classList.add("is-dragging");
        if (pointer.node && pointer.node.kind !== "hub") {
          const world = worldPoint(position.x, position.y);
          pointer.node.x = world.x;
          pointer.node.y = world.y;
          pointer.node.vx = 0;
          pointer.node.vy = 0;
        } else {
          state.panX += position.x - pointer.lastX;
          state.panY += position.y - pointer.lastY;
        }
        pointer.lastX = position.x;
        pointer.lastY = position.y;
        tooltip.hidden = true;
        wake(0);
      }
      return;
    }
    const node = hitTest(position.x, position.y);
    if (node !== state.hovered) {
      state.hovered = node;
      if (!state.pinned) {
        if (node) state.selected = node;
        showDetail(focusNode());
      }
      stage.style.cursor = node ? "pointer" : "grab";
      wake(0);
    }
    showTooltip(node, position.x, position.y);
  });

  const finishPointer = (event) => {
    const pointer = state.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    stage.classList.remove("is-dragging");
    state.pointer = null;
    if (pointer.moved && pointer.node && pointer.node.kind !== "hub") {
      pointer.node.homeX = pointer.node.x;
      pointer.node.homeY = pointer.node.y;
      wake(140);
    } else if (!pointer.moved && pointer.node) {
      state.selected = pointer.node;
      state.pinned = true;
      showDetail(pointer.node);
      wake(0);
    } else if (!pointer.moved) {
      state.selected = null;
      state.pinned = false;
      showDetail(null);
      wake(0);
    }
  };
  stage.addEventListener("pointerup", finishPointer);
  stage.addEventListener("pointercancel", finishPointer);
  stage.addEventListener("pointerleave", () => {
    if (state.pointer) return;
    if (!state.pinned && state.hovered) state.selected = state.hovered;
    state.hovered = null;
    tooltip.hidden = true;
    showDetail(focusNode());
    wake(0);
  });
  stage.addEventListener("wheel", (event) => {
    if (!event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    const position = pointerPosition(event);
    zoomAt(Math.exp(-event.deltaY * 0.0013), position.x, position.y);
  }, { passive: false });

  root.querySelector("[data-graph-zoom-in]").addEventListener("click", () => zoomAt(1.25, state.width / 2, state.height / 2));
  root.querySelector("[data-graph-zoom-out]").addEventListener("click", () => zoomAt(0.8, state.width / 2, state.height / 2));
  root.querySelector("[data-graph-fit]").addEventListener("click", fitView);

  search.addEventListener("input", () => {
    state.query = search.value.trim().toLowerCase();
    state.pinned = false;
    state.hovered = null;
    state.selected = matchedNodes()[0] || null;
    renderResults();
    showDetail(state.selected);
    wake(0);
  });
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const first = matchedNodes()[0];
    if (!first) return;
    event.preventDefault();
    if (first.url) window.location.assign(first.url);
    else {
      state.selected = first;
      centerOn(first);
      showDetail(first);
    }
  });
  const closeCategoryOptions = (restoreFocus = false) => {
    categoryOptions.hidden = true;
    categoryTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) categoryTrigger.focus();
  };
  const openCategoryOptions = (focusIndex = null) => {
    categoryOptions.hidden = false;
    categoryTrigger.setAttribute("aria-expanded", "true");
    if (focusIndex !== null) categoryButtons[focusIndex].focus();
  };
  categoryTrigger.addEventListener("click", () => {
    if (categoryOptions.hidden) openCategoryOptions();
    else closeCategoryOptions();
  });
  categoryTrigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openCategoryOptions(event.key === "ArrowDown" ? 0 : categoryButtons.length - 1);
  });
  categoryOptions.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCategoryOptions(true);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const index = categoryButtons.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? categoryButtons.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + categoryButtons.length) % categoryButtons.length;
      categoryButtons[next].focus();
    }
  });
  categoryButtons.forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.graphCategoryOption;
    state.selected = null;
    state.hovered = null;
    state.pinned = false;
    categoryValue.textContent = button.textContent.trim();
    categoryButtons.forEach((option) => {
      option.classList.toggle("is-current", option === button);
      if (option === button) option.setAttribute("aria-current", "true");
      else option.removeAttribute("aria-current");
    });
    closeCategoryOptions(true);
    refreshGraph();
  }));
  document.addEventListener("pointerdown", (event) => {
    if (!categoryOptions.hidden && !event.target.closest(".home-wiki__select")) closeCategoryOptions();
  });
  plannedToggle.addEventListener("change", () => {
    state.showPlanned = plannedToggle.checked;
    refreshGraph();
  });

  const setExpanded = (expanded) => {
    state.expanded = expanded;
    root.classList.toggle("is-expanded", expanded);
    root.closest(".home-wiki").classList.toggle("is-map-expanded", expanded);
    document.body.classList.toggle("home-wiki-map-open", expanded);
    expandButton.setAttribute("aria-pressed", String(expanded));
    expandButton.innerHTML = expanded ? 'Close full view <span aria-hidden="true">↙</span>' : 'Expand map <span aria-hidden="true">↗</span>';
    if (expanded && !state.showPlanned) {
      plannedToggle.checked = true;
      state.showPlanned = true;
      refreshGraph(false);
    }
    requestAnimationFrame(resize);
    expandButton.focus();
  };
  expandButton.addEventListener("click", () => setExpanded(!state.expanded));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!categoryOptions.hidden) closeCategoryOptions(true);
    else if (state.expanded) setExpanded(false);
  });

  new ResizeObserver(resize).observe(stage);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.visible) wake(0);
    }, { rootMargin: "200px" }).observe(root);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) wake(0);
  });
  resize();
  refreshGraph();
});
