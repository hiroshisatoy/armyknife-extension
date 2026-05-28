function collectJsonLdScripts() {
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  );

  return scripts.map((script, index) => ({
    index: index + 1,
    text: script.textContent.trim(),
  }));
}

function formatJsonLdResult(items) {
  if (!items.length) {
    return "JSON-LD は見つかりませんでした。";
  }

  return items
    .map((item) => {
      try {
        const parsed = JSON.parse(item.text);
        return `#${item.index}\n${JSON.stringify(parsed, null, 2)}`;
      } catch {
        return `#${item.index}\n(不正なJSONのため生テキストを表示)\n${item.text}`;
      }
    })
    .join("\n\n");
}

export const jsonLdTool = {
  id: "json-ld",
  title: "JSON-LD 抽出",
  description: "ページ内の application/ld+json を抽出して表示します",
  async run(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectJsonLdScripts,
    });

    return {
      status: `${result.length} 件の JSON-LD を取得しました`,
      output: formatJsonLdResult(result),
    };
  },
};
