import { tools } from "./tools/index.js";
import {
  formatHeadings,
  HEADING_DISPLAY_MODES,
  normalizeHeadings,
} from "./tools/headings-format.js";

const toolListElement = document.getElementById("tool-list");
const statusElement = document.getElementById("status");
const resultElement = document.getElementById("result");
const toolSearchElement = document.getElementById("tool-search");
const copyResultButton = document.getElementById("copy-result");
const clearResultButton = document.getElementById("clear-result");
const headingDisplayToggle = document.getElementById("heading-display-toggle");
const headingModeListButton = document.getElementById("heading-mode-list");
const headingModeTreeButton = document.getElementById("heading-mode-tree");

const HEADING_MODE_STORAGE_KEY = "headingDisplayMode";
const HEADINGS_CACHE_KEY = "lastHeadingsCache";

let lastResultText = "";
let lastActiveToolId = "";
let isRunning = false;
let lastHeadings = [];
let headingDisplayMode = HEADING_DISPLAY_MODES.list;

function setStatus(message) {
  statusElement.textContent = message;
}

function setResult(content, options = {}) {
  const { copyable = true } = options;
  lastResultText = copyable ? content : "";
  resultElement.replaceChildren();
  const text = document.createElement("pre");
  text.className = "result-text";
  text.textContent = content;
  resultElement.appendChild(text);
  copyResultButton.disabled = !lastResultText;
}

function toMetaTagsText(tags) {
  return tags
    .map((tag) => {
      const content = tag.content || "(contentなし)";
      const label = tag.label || tag.key || "(項目名なし)";
      return `${label}: ${content}`;
    })
    .join("\n");
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

function renderMetaTags(tags) {
  lastResultText = toMetaTagsText(tags);
  resultElement.replaceChildren();

  if (!tags.length) {
    setResult("meta タグが見つかりませんでした。");
    return;
  }

  const list = document.createElement("div");
  list.className = "meta-list";

  tags.forEach((tag) => {
    const item = document.createElement("article");
    item.className = "meta-item";

    const header = document.createElement("div");
    header.className = "meta-item-header";

    const name = document.createElement("h3");
    name.className = "meta-item-name";
    const label = tag.label || tag.key || "(項目名なし)";
    name.textContent = label;

    const copyButton = document.createElement("button");
    copyButton.className = "meta-copy";
    copyButton.type = "button";
    copyButton.textContent = "コピー";
    copyButton.addEventListener("click", async () => {
      const content = tag.content || "(contentなし)";
      try {
        await copyText(content);
        setStatus(`「${label}」の内容をコピーしました`);
      } catch {
        setStatus("コピーに失敗しました");
      }
    });

    const content = document.createElement("p");
    content.className = "meta-item-content";
    content.textContent = tag.content || "(contentなし)";

    header.appendChild(name);
    header.appendChild(copyButton);
    item.appendChild(header);
    item.appendChild(content);
    list.appendChild(item);
  });

  resultElement.appendChild(list);
  copyResultButton.disabled = !lastResultText;
}

function setHeadingDisplayToggleVisible(visible) {
  if (!headingDisplayToggle) {
    return;
  }
  headingDisplayToggle.hidden = !visible;
}

function updateHeadingModeButtons() {
  if (!headingDisplayToggle) {
    return;
  }
  headingDisplayToggle
    .querySelectorAll("[data-heading-mode]")
    .forEach((button) => {
      const mode = button.dataset.headingMode;
      button.classList.toggle("is-selected", mode === headingDisplayMode);
    });
}

async function loadHeadingDisplayMode() {
  try {
    const stored = await chrome.storage.local.get(HEADING_MODE_STORAGE_KEY);
    const mode = stored[HEADING_MODE_STORAGE_KEY];
    if (
      mode === HEADING_DISPLAY_MODES.list ||
      mode === HEADING_DISPLAY_MODES.tree
    ) {
      headingDisplayMode = mode;
    }
  } catch {
    headingDisplayMode = HEADING_DISPLAY_MODES.list;
  }
  updateHeadingModeButtons();
}

function persistHeadingDisplayMode(mode) {
  if (!chrome.storage?.local) {
    return;
  }
  chrome.storage.local.set({ [HEADING_MODE_STORAGE_KEY]: mode }).catch(() => {});
}

function persistHeadingsCache(headings) {
  if (!chrome.storage?.session) {
    return;
  }
  chrome.storage.session.set({ [HEADINGS_CACHE_KEY]: headings }).catch(() => {});
}

async function loadHeadingsCache() {
  if (!chrome.storage?.session) {
    return [];
  }
  try {
    const data = await chrome.storage.session.get(HEADINGS_CACHE_KEY);
    return normalizeHeadings(data[HEADINGS_CACHE_KEY] || []);
  } catch {
    return [];
  }
}

async function clearHeadingsCache() {
  if (!chrome.storage?.session) {
    return;
  }
  chrome.storage.session.remove(HEADINGS_CACHE_KEY).catch(() => {});
}

async function fetchHeadingsFromActiveTab() {
  const tool = tools.find((item) => item.id === "heading-outline");
  if (!tool) {
    throw new Error("見出しツールが見つかりません");
  }
  const tabId = await getActiveTabId();
  const result = await tool.run(tabId);
  return normalizeHeadings(result.headings || []);
}

async function resolveHeadingsForDisplay() {
  if (lastHeadings.length) {
    return lastHeadings;
  }

  const cached = await loadHeadingsCache();
  if (cached.length) {
    lastHeadings = cached;
    return cached;
  }

  setStatus("見出しを取得しています...");
  const fetched = await fetchHeadingsFromActiveTab();
  lastHeadings = fetched;
  return fetched;
}

async function switchHeadingDisplayMode(mode) {
  if (mode !== HEADING_DISPLAY_MODES.list && mode !== HEADING_DISPLAY_MODES.tree) {
    return;
  }

  try {
    const headings = await resolveHeadingsForDisplay();
    if (!headings.length) {
      setStatus("見出しが見つかりませんでした");
      setHeadingDisplayToggleVisible(false);
      return;
    }

    headingDisplayMode = mode;
    updateHeadingModeButtons();
    renderHeadingOutline(headings, mode);
    persistHeadingDisplayMode(mode);
    setStatus(
      mode === HEADING_DISPLAY_MODES.tree
        ? "罫線表示に切り替えました"
        : "リスト表示に切り替えました"
    );
  } catch (error) {
    setStatus("表示の切り替えに失敗しました");
    setResult(error?.message ?? String(error));
  }
}

function renderHeadingTreeText(headings) {
  const pre = document.createElement("pre");
  pre.className = "heading-tree-text";
  pre.textContent = formatHeadings(headings, HEADING_DISPLAY_MODES.tree);
  return pre;
}

function renderHeadingOutline(headings, mode) {
  const normalized = normalizeHeadings(headings);
  lastHeadings = normalized;
  lastResultText = formatHeadings(normalized, mode);
  resultElement.replaceChildren();

  if (!normalized.length) {
    setHeadingDisplayToggleVisible(false);
    clearHeadingsCache();
    setResult("見出しが見つかりませんでした。");
    return;
  }

  persistHeadingsCache(normalized);
  setHeadingDisplayToggleVisible(true);

  if (mode === HEADING_DISPLAY_MODES.tree) {
    resultElement.appendChild(renderHeadingTreeText(normalized));
  } else {
    const outline = document.createElement("div");
    outline.className = "heading-outline heading-outline--list";

    normalized.forEach((item) => {
      const node = document.createElement("div");
      node.className = "heading-node";
      node.style.paddingLeft = `${Math.max(item.level - 1, 0) * 14}px`;

      const bullet = document.createElement("span");
      bullet.className = "heading-bullet";
      bullet.textContent = "-";

      const tag = document.createElement("span");
      tag.className = "heading-tag";
      tag.textContent = (item.tag || "h?").toUpperCase();

      const text = document.createElement("span");
      text.className = "heading-text";
      text.textContent = item.text || "(空の見出し)";

      node.appendChild(bullet);
      node.appendChild(tag);
      node.appendChild(text);
      outline.appendChild(node);
    });

    resultElement.appendChild(outline);
  }

  copyResultButton.disabled = !lastResultText;
}

function renderToolResult(result) {
  if (result.outputType === "meta-tags") {
    setHeadingDisplayToggleVisible(false);
    renderMetaTags(result.metaTags || []);
    return;
  }
  if (result.outputType === "headings" || Array.isArray(result.headings)) {
    try {
      lastActiveToolId = "heading-outline";
      renderHeadingOutline(result.headings || [], headingDisplayMode);
    } catch (error) {
      setStatus("見出しの表示に失敗しました");
      setResult(error?.message ?? String(error));
    }
    return;
  }
  setHeadingDisplayToggleVisible(false);
  setResult(result.output ?? "");
}

async function getActiveTabId() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab || typeof activeTab.id !== "number") {
    throw new Error("アクティブなタブを取得できませんでした");
  }

  return activeTab.id;
}

async function runTool(tool, button) {
  isRunning = true;
  updateRunButtonsState();
  lastActiveToolId = tool.id;
  updateActiveToolHighlight();
  button.disabled = true;
  setStatus(`「${tool.title}」を実行中...`);

  try {
    const tabId = await getActiveTabId();
    const result = await tool.run(tabId);
    setStatus(result.status);
    renderToolResult(result);
  } catch (error) {
    setStatus("実行に失敗しました");
    setResult(error?.message ?? String(error));
  } finally {
    isRunning = false;
    updateRunButtonsState();
  }
}

function createToolItem(tool) {
  const item = document.createElement("article");
  item.className = "tool-item";

  const body = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "tool-title";
  title.textContent = tool.title;

  const description = document.createElement("p");
  description.className = "tool-description";
  description.textContent = tool.description;

  body.appendChild(title);
  body.appendChild(description);

  const button = document.createElement("button");
  button.className = "tool-run";
  button.type = "button";
  button.textContent = "実行";
  button.dataset.toolRun = "true";
  button.dataset.toolId = tool.id;
  button.addEventListener("click", () => {
    runTool(tool, button);
  });

  item.appendChild(body);
  item.appendChild(button);

  return item;
}

function renderTools(filter = "") {
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredTools = tools.filter((tool) => {
    if (!normalizedFilter) {
      return true;
    }
    const haystack = `${tool.title} ${tool.description}`.toLowerCase();
    return haystack.includes(normalizedFilter);
  });

  toolListElement.replaceChildren();
  const fragment = document.createDocumentFragment();

  filteredTools.forEach((tool) => {
    fragment.appendChild(createToolItem(tool));
  });

  if (filteredTools.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-tools";
    empty.textContent = "一致するツールがありません。";
    fragment.appendChild(empty);
  }

  toolListElement.appendChild(fragment);
  updateActiveToolHighlight();
  updateRunButtonsState();
}

function updateActiveToolHighlight() {
  const items = toolListElement.querySelectorAll(".tool-item");
  items.forEach((item) => {
    const runButton = item.querySelector('[data-tool-run="true"]');
    const toolId = runButton?.dataset.toolId || "";
    item.classList.toggle("is-active", toolId === lastActiveToolId);
  });
}

function updateRunButtonsState() {
  const runButtons = toolListElement.querySelectorAll('[data-tool-run="true"]');
  runButtons.forEach((button) => {
    button.disabled = isRunning;
  });
}

toolSearchElement.addEventListener("input", (event) => {
  renderTools(event.target.value);
});

copyResultButton.addEventListener("click", async () => {
  if (!lastResultText) {
    return;
  }
  try {
    await copyText(lastResultText);
    setStatus("結果をコピーしました");
  } catch {
    setStatus("結果のコピーに失敗しました");
  }
});

clearResultButton.addEventListener("click", () => {
  lastHeadings = [];
  clearHeadingsCache();
  setHeadingDisplayToggleVisible(false);
  setResult("ここに実行結果が表示されます。", { copyable: false });
  setStatus("結果をクリアしました");
});

function initHeadingModeButtons() {
  if (!headingModeListButton || !headingModeTreeButton) {
    return;
  }

  headingModeListButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await switchHeadingDisplayMode(HEADING_DISPLAY_MODES.list);
  });

  headingModeTreeButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await switchHeadingDisplayMode(HEADING_DISPLAY_MODES.tree);
  });
}

async function restoreHeadingsFromCache() {
  const cached = await loadHeadingsCache();
  if (cached.length) {
    lastHeadings = cached;
  }
}

initHeadingModeButtons();
loadHeadingDisplayMode();
restoreHeadingsFromCache();
renderTools("");
setStatus("ツールを選択してください");
setResult("ここに実行結果が表示されます。", { copyable: false });
