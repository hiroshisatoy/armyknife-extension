function collectMetaTags() {
  const metas = Array.from(document.querySelectorAll("meta"));

  return metas.map((meta, index) => ({
    index: index + 1,
    name:
      meta.getAttribute("name") ||
      meta.getAttribute("property") ||
      meta.getAttribute("http-equiv") ||
      "(name/property/http-equivなし)",
    content: meta.getAttribute("content") || "",
  }));
}

export const metaTagsTool = {
  id: "meta-tags",
  title: "メタタグ一覧",
  description: "ページ内の meta タグを一覧表示します",
  async run(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectMetaTags,
    });

    return {
      status: `${result.length} 件の meta タグを取得しました`,
      outputType: "meta-tags",
      metaTags: result,
      output:
        result.length > 0
          ? "meta タグを取得しました。"
          : "meta タグが見つかりませんでした。",
    };
  },
};
