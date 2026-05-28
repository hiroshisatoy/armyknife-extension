import { tools } from "./tools/index.js";

const toolListElement = document.getElementById("tool-list");
const statusElement = document.getElementById("status");
const resultElement = document.getElementById("result");

function setStatus(message) {
  statusElement.textContent = message;
}

function setResult(content) {
  resultElement.textContent = content;
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
  button.disabled = true;
  setStatus(`「${tool.title}」を実行中...`);

  try {
    const tabId = await getActiveTabId();
    const { status, output } = await tool.run(tabId);
    setStatus(status);
    setResult(output);
  } catch (error) {
    setStatus("実行に失敗しました");
    setResult(error?.message ?? String(error));
  } finally {
    button.disabled = false;
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
  button.addEventListener("click", () => {
    runTool(tool, button);
  });

  item.appendChild(body);
  item.appendChild(button);

  return item;
}

function renderTools() {
  const fragment = document.createDocumentFragment();
  tools.forEach((tool) => {
    fragment.appendChild(createToolItem(tool));
  });
  toolListElement.appendChild(fragment);
}

renderTools();
setStatus("ツールを選択してください");
setResult("ここに実行結果が表示されます。");
