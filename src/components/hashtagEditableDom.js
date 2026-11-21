const HASHTAG_TOKEN = /#[\p{L}\d_]+/gu;

/** Treat lone BR / newlines from empty contenteditable as empty. */
export function normalizeEditableText(text) {
  if (!text) return "";
  return text.replace(/\u200B/g, "").replace(/^\n+|\n+$/g, "").trim() === ""
    ? ""
    : text.replace(/\u200B/g, "");
}

export function isEditableTextEmpty(text) {
  return normalizeEditableText(text) === "";
}

/** Value for React state from contenteditable serialization. */
export function valueFromEditableRaw(raw) {
  if (!raw) return "";
  const t = raw.replace(/\u200B/g, "");
  if (t.replace(/^\n+|\n+$/g, "").trim() === "") return "";
  return t;
}

/** RU keyboard may insert № where user expects a hashtag. */
export function normalizeHashAlias(text) {
  if (!text) return "";
  return text.replace(/№(?=[\p{L}\d_]|$|\s)/gu, "#");
}

export function hashFragmentAt(text, cursor) {
  const normalized = normalizeHashAlias(text);
  const tryAt = (c) => {
    const clamped = Math.min(Math.max(0, c), normalized.length);
    const textBefore = normalized.slice(0, clamped);
    const hashIndex = textBefore.lastIndexOf("#");
    if (hashIndex === -1) return null;
    if (hashIndex > 0 && !/\s/.test(textBefore[hashIndex - 1])) return null;
    const fragment = textBefore.slice(hashIndex);
    if (/\s/.test(fragment.slice(1))) return null;
    if (!/^#[\p{L}\d_]*$/u.test(fragment)) return null;
    return fragment;
  };

  const atCursor = tryAt(cursor);
  if (atCursor) return atCursor;
  if (normalized.includes("#")) {
    const atEnd = tryAt(normalized.length);
    if (atEnd) return atEnd;
  }
  return null;
}

/** Range of the hashtag token being composed (for replace on pick). */
export function hashReplaceRange(text, cursor) {
  const normalized = normalizeHashAlias(text);
  const fragment = hashFragmentAt(normalized, cursor);
  if (!fragment) return null;

  const cursorCandidates = [
    Math.min(Math.max(0, cursor), normalized.length),
    normalized.length,
  ];
  for (const end of cursorCandidates) {
    if (hashFragmentAt(normalized, end) !== fragment) continue;
    const before = normalized.slice(0, end);
    const hashIndex = before.lastIndexOf("#");
    if (hashIndex === -1) continue;
    return { start: hashIndex, end, fragment };
  }
  return null;
}

function isTagCommitted(value, start, end) {
  const after = value[end];
  return (
    after === " " || after === "\n" || after === "\t" || after === "\u00a0"
  );
}

export function serializeEditableRoot(root) {
  if (!root) return "";
  let out = "";
  const walk = (node, isBlockStart) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    if (el.dataset?.tag) {
      out += el.dataset.tag;
      return;
    }
    if (el.tagName === "BR") {
      out += "\n";
      return;
    }
    if (el.tagName === "DIV") {
      if (!isBlockStart && out.length > 0 && !out.endsWith("\n")) {
        out += "\n";
      }
      let first = true;
      for (const child of el.childNodes) {
        walk(child, first);
        first = false;
      }
      return;
    }
    for (const child of el.childNodes) {
      walk(child, false);
    }
  };
  let first = true;
  for (const child of root.childNodes) {
    walk(child, first);
    first = false;
  }
  return out;
}

export function getCaretTextOffset(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.endContainer)) return 0;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.endContainer, range.endOffset);
  const holder = document.createElement("div");
  holder.appendChild(pre.cloneContents());
  return serializeEditableRoot(holder);
}

export function getCaretRectWithin(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { top: 0, left: 0 };
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  const box = root.getBoundingClientRect();
  return {
    top: rect.top - box.top + root.scrollTop,
    left: rect.left - box.left + root.scrollLeft,
  };
}

/** Viewport coordinates for portaled popovers */
export function getCaretClientRect() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { top: 0, left: 0, bottom: 0 };
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
  };
}

function splitForDom(value, cursor, tagMenuOpen) {
  const segments = [];
  const re = new RegExp(HASHTAG_TOKEN.source, HASHTAG_TOKEN.flags);
  let last = 0;
  let match = re.exec(value);
  while (match) {
    const start = match.index;
    const tag = match[0];
    const end = start + tag.length;
    if (start > last) {
      segments.push({ kind: "text", text: value.slice(last, start) });
    }
    const composingAtCursor =
      (cursor > start && cursor < end) ||
      (tagMenuOpen && cursor >= start && cursor <= end);
    const committed = isTagCommitted(value, start, end);
    const composing = composingAtCursor || !committed;
    segments.push({ kind: composing ? "text" : "tag", text: tag });
    last = end;
    match = re.exec(value);
  }
  if (last < value.length) {
    segments.push({ kind: "text", text: value.slice(last) });
  }
  return segments;
}

function appendTextWithBreaks(parent, text) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (line) parent.appendChild(document.createTextNode(line));
    if (i < lines.length - 1) parent.appendChild(document.createElement("br"));
  });
}

export function renderValueToEditable(root, value, cursor, tagMenuOpen) {
  if (!root) return;
  root.innerHTML = "";
  const segments = splitForDom(value, cursor, tagMenuOpen);
  if (segments.length === 0) {
    return;
  }
  for (const seg of segments) {
    if (seg.kind === "tag") {
      const chip = document.createElement("span");
      chip.contentEditable = "false";
      chip.dataset.tag = seg.text;
      chip.className = "h-tag";
      chip.textContent = seg.text;
      root.appendChild(chip);
    } else if (seg.text) {
      appendTextWithBreaks(root, seg.text);
    }
  }
}

function locateTextPosition(root, targetOffset) {
  let offset = 0;
  const stack = [{ node: root, i: 0 }];

  const trySelect = (node, nodeOffset) => {
    const sel = window.getSelection();
    if (!sel) return false;
    const range = document.createRange();
    range.setStart(node, nodeOffset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  };

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length || 0;
      if (offset + len >= targetOffset) {
        return trySelect(node, targetOffset - offset);
      }
      offset += len;
      return false;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      if (el.dataset?.tag) {
        const len = (el.dataset.tag || "").length;
        if (offset + len >= targetOffset) {
          const parent = el.parentNode;
          if (!parent) return false;
          const idx = Array.from(parent.childNodes).indexOf(el) + 1;
          return trySelect(parent, Math.min(idx, parent.childNodes.length));
        }
        offset += len;
        return false;
      }
      if (el.tagName === "BR") {
        if (offset + 1 >= targetOffset) {
          const parent = el.parentNode;
          if (!parent) return false;
          const idx = Array.from(parent.childNodes).indexOf(el) + 1;
          return trySelect(parent, idx);
        }
        offset += 1;
        return false;
      }
      for (const child of el.childNodes) {
        if (walk(child)) return true;
      }
    }
    return false;
  };

  for (const child of root.childNodes) {
    if (walk(child)) return;
  }
  trySelect(root, root.childNodes.length);
}

export function syncDomFromValue(root, value, cursor, tagMenuOpen, restoreCaret = true) {
  renderValueToEditable(root, value, cursor, tagMenuOpen);
  if (restoreCaret) {
    locateTextPosition(root, cursor);
  }
}