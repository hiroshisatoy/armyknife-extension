export const HEADING_DISPLAY_MODES = {
  list: "list",
  tree: "tree",
};

export function normalizeHeading(item) {
  const level = Number(item?.level);
  return {
    level: Number.isFinite(level) && level >= 1 && level <= 6 ? level : 1,
    tag: String(item?.tag || "h?").toLowerCase(),
    text: String(item?.text ?? "").trim(),
  };
}

export function normalizeHeadings(headings) {
  if (!Array.isArray(headings)) {
    return [];
  }
  return headings.map(normalizeHeading);
}

export function formatHeadingList(headings) {
  if (!headings.length) {
    return "見出しが見つかりませんでした。";
  }

  return headings
    .map((item) => {
      const indentLevel = Math.max(item.level - 1, 0);
      const indent = "  ".repeat(indentLevel);
      const title = item.text || "(空の見出し)";
      return `${indent}- ${item.tag.toUpperCase()} ${title}`;
    })
    .join("\n");
}

export function getHeadingTreePrefix(headings, index) {
  const item = headings[index];
  if (!item || item.level <= 1) {
    return "";
  }

  const level = item.level;

  let isLastSibling = true;
  for (let j = index + 1; j < headings.length; j += 1) {
    if (headings[j].level === level) {
      isLastSibling = false;
      break;
    }
    if (headings[j].level < level) {
      break;
    }
  }

  const parts = [];
  for (let depth = 1; depth < level; depth += 1) {
    let ancestorHasNextSibling = false;
    for (let j = index + 1; j < headings.length; j += 1) {
      const nextLevel = headings[j].level;
      if (nextLevel === depth) {
        ancestorHasNextSibling = true;
        break;
      }
      if (nextLevel < depth) {
        break;
      }
    }
    parts.push(ancestorHasNextSibling ? "│" : "");
  }

  parts.push(isLastSibling ? "└─" : "├─");
  return parts.join("");
}

export function formatHeadingTreeLine(headings, index) {
  const item = headings[index];
  const title = item.text || "(空の見出し)";
  const label = `${(item.tag || "h?").toUpperCase()} ${title}`;
  const prefix = getHeadingTreePrefix(headings, index);
  return prefix ? `${prefix} ${label}` : label;
}

export function formatHeadingTree(headings) {
  if (!headings.length) {
    return "見出しが見つかりませんでした。";
  }

  return headings
    .map((item, index) => formatHeadingTreeLine(headings, index))
    .join("\n");
}

export function formatHeadings(headings, mode) {
  if (mode === HEADING_DISPLAY_MODES.tree) {
    return formatHeadingTree(headings);
  }
  return formatHeadingList(headings);
}
