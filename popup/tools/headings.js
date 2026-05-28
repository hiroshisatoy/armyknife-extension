function collectHeadingOutline() {
  const headingElements = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6")
  );

  return headingElements.map((element, index) => ({
    index: index + 1,
    level: Number(element.tagName.slice(1)),
    tag: element.tagName.toLowerCase(),
    text: element.textContent.trim(),
  }));
}

function formatHeadingOutline(headings) {
  if (!headings.length) {
    return "見出しが見つかりませんでした。";
  }

  return headings
    .map((item) => {
      const indent = "  ".repeat(Math.max(item.level - 1, 0));
      const title = item.text || "(空の見出し)";
      return `${indent}- ${item.tag.toUpperCase()} ${title}`;
    })
    .join("\n");
}

export const headingOutlineTool = {
  id: "heading-outline",
  title: "見出し階層を表示",
  description: "開いているページの h1〜h6 を階層表示します",
  async run(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectHeadingOutline,
    });

    return {
      status: `${result.length} 件の見出しを取得しました`,
      output: formatHeadingOutline(result),
    };
  },
};
