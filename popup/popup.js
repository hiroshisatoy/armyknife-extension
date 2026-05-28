import { tools } from "./tools/index.js";

const toolListElement = document.getElementById("tool-list");
const statusElement = document.getElementById("status");
const resultElement = document.getElementById("result");

function setStatus(message) {
  statusElement.textContent = message;
}

function setResult(content) {
  resultElement.replaceChildren();
  const text = document.createElement("pre");
  text.className = "result-text";
  text.textContent = content;
  resultElement.appendChild(text);
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

function renderMetaTags(tags) {
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
    name.textContent = tag.name;

    const copyButton = document.createElement("button");
    copyButton.className = "meta-copy";
    copyButton.type = "button";
    copyButton.textContent = "コピー";
    copyButton.addEventListener("click", async () => {
      const content = tag.content || "(contentなし)";
      try {
        await copyText(content);
        setStatus(`「${tag.name}」の内容をコピーしました`);
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
