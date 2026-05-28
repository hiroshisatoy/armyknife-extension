import { tools } from "./tools/index.js";

const toolListElement = document.getElementById("tool-list");
const statusElement = document.getElementById("status");
const resultElement = document.getElementById("result");
const toolSearchElement = document.getElementById("tool-search");
const copyResultButton = document.getElementById("copy-result");
const clearResultButton = document.getElementById("clear-result");

let lastResultText = "";
let lastActiveToolId = "";
let isRunning = false;

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

function renderToolResult(result) {
  if (result.outputType === "meta-tags") {
    renderMetaTags(result.metaTags || []);
    return;
  }
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
  setResult("ここに実行結果が表示されます。", { copyable: false });
  setStatus("結果をクリアしました");
});

renderTools("");
setStatus("ツールを選択してください");
setResult("ここに実行結果が表示されます。", { copyable: false });
