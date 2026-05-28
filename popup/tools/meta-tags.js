function collectMetaTags() {
  const priorityOrder = [
    "title",
    "description",
    "keywords",
    "robots",
    "canonical",
    "og:title",
    "og:description",
    "og:url",
    "og:type",
    "og:site_name",
    "og:locale",
    "og:image",
    "og:image:secure_url",
    "og:image:alt",
    "og:video",
    "og:video:url",
    "twitter:card",
    "twitter:site",
    "twitter:creator",
    "twitter:title",
    "twitter:description",
    "twitter:url",
    "twitter:image",
    "twitter:image:alt",
    "twitter:player",
    "twitter:player:width",
    "twitter:player:height",
  ];

  const allowedKeys = new Set(priorityOrder);
  const results = [];
  const titleText = document.title?.trim() || "";

  if (titleText) {
    results.push({
      key: "title",
      label: "title",
      content: titleText,
    });
  }

  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    const href = canonicalLink.getAttribute("href") || "";
    if (href) {
      results.push({
        key: "canonical",
        label: "link[rel=canonical]",
        content: href,
      });
    }
  }

  const metas = Array.from(document.querySelectorAll("meta"));
  metas.forEach((meta) => {
    const name = meta.getAttribute("name");
    const property = meta.getAttribute("property");
    const key = (name || property || "").trim().toLowerCase();
    if (!allowedKeys.has(key) || key === "title" || key === "canonical") {
      return;
    }

    results.push({
      key,
      label: name ? `meta[name=${name}]` : `meta[property=${property}]`,
      content: meta.getAttribute("content") || "",
    });
  });

  results.sort((a, b) => {
    return priorityOrder.indexOf(a.key) - priorityOrder.indexOf(b.key);
  });

  return results;
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
      status: `${result.length} 件の SEO 主要項目を取得しました`,
      outputType: "meta-tags",
      metaTags: result,
      output:
        result.length > 0
          ? "meta タグを取得しました。"
          : "meta タグが見つかりませんでした。",
    };
  },
};
