import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Box,
  Paper,
  List,
  ListItemButton,
  Typography,
  Popper,
  alpha,
  useTheme,
} from "@mui/material";
import { TOOLBAR_MENU } from "../layout/toolbarTokens";
import {
  serializeEditableRoot,
  getCaretTextOffset,
  syncDomFromValue,
  normalizeEditableText,
  isEditableTextEmpty,
  valueFromEditableRaw,
  normalizeHashAlias,
  hashFragmentAt,
  hashReplaceRange,
} from "./hashtagEditableDom";

const TAG_CHIP_COLOR = "#79b0ff";
const TAG_CHIP_BG = "#2b3a5f";
const TAG_CHIP_RADIUS = "8px";
const TAG_MENU_FOCUS_RING = "#79b0ff";

function tagMenuLabel(tag) {
  const raw = String(tag).trim();
  return raw.startsWith("#") ? raw : `#${raw}`;
}

const INSET_FONT_SIZE = "0.815rem";
const INSET_LINE_HEIGHT = 1.5;
const INSET_PAD_X = "12px";
const INSET_PAD_TOP = "9px";
const INSET_PAD_BOTTOM = "9px";

const HashtagInput = ({
  value,
  onChange,
  suggestions = [],
  placeholder,
  label = "Описание",
  variant = "default",
  onBlur,
  onEscape,
}) => {
  const isInset = variant === "inset";
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef(null);
  const editableRef = useRef(null);
  const listRef = useRef(null);
  const menuPaperRef = useRef(null);
  const skipExternalSync = useRef(false);
  const suppressInputRef = useRef(false);
  const focusedRef = useRef(false);
  const didHydrateRef = useRef(false);
  const prevShowListRef = useRef(false);
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);

  const effectiveSuggestions =
    suggestions.length > 0 ? suggestions : localSuggestions;
  const suggestionsRef = useRef(effectiveSuggestions);
  suggestionsRef.current = effectiveSuggestions;
  const [filteredTags, setFilteredTags] = useState([]);
  const [showList, setShowList] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredTags]);

  useEffect(() => {
    if (!editableRef.current) return;
    refreshTagMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSuggestions]);

  useEffect(() => {
    if (showList && listRef.current) {
      const activeElement = listRef.current.querySelector(
        `[data-idx="${activeIndex}"]`,
      );
      if (activeElement) activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showList]);

  const runDomSync = (root, nextValue, tagMenuOpen, restoreCaret) => {
    const cursor = getCaretTextOffset(root);
    const shouldRestoreCaret =
      restoreCaret !== false &&
      typeof document !== "undefined" &&
      document.activeElement === root;
    suppressInputRef.current = true;
    try {
      syncDomFromValue(root, nextValue, cursor, tagMenuOpen, shouldRestoreCaret);
    } finally {
      const release = () => {
        suppressInputRef.current = false;
      };
      queueMicrotask(release);
      setTimeout(release, 0);
    }
  };

  const publishValue = (raw) => {
    skipExternalSync.current = true;
    onChange(valueFromEditableRaw(raw));
  };

  useLayoutEffect(() => {
    const root = editableRef.current;
    if (!root) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      if (value) {
        runDomSync(root, value, false);
      }
      return;
    }

    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }

  if (focusedRef.current) return;

    const domText = normalizeEditableText(serializeEditableRoot(root));
    const propText = normalizeEditableText(value);
    if (domText !== propText) {
      runDomSync(root, value, false, false);
    }
  }, [value]);

  useLayoutEffect(() => {
    const root = editableRef.current;
    if (!root || !focusedRef.current) return;
    if (showList === prevShowListRef.current) return;
    prevShowListRef.current = showList;
    const domText = valueFromEditableRaw(serializeEditableRoot(root));
    const propText = valueFromEditableRaw(value);
    const syncText = domText || propText;
    if (!syncText && !showList) return;
    runDomSync(root, syncText, showList, true);
  }, [showList, value]);

  const updateTagMenu = (text, cursor) => {
    const normalized = normalizeHashAlias(text);
    const fragment = hashFragmentAt(normalized, cursor);
    if (!fragment) {
      setShowList(false);
      setFilteredTags([]);
      setMenuLoading(false);
      return;
    }

    const list = suggestionsRef.current;

    if (list.length === 0) {
      setShowList(true);
      setFilteredTags([]);
      return;
    }

    setMenuLoading(false);
    let match = [];
    if (fragment === "#") {
      match = list;
    } else {
      const searchPattern = fragment.toLowerCase();
      match = list.filter((t) => {
        const tag = t.startsWith("#")
          ? t.toLowerCase()
          : `#${t.toLowerCase()}`;
        return tag.startsWith(searchPattern);
      });
    }

    setFilteredTags(match);
    setShowList(true);
  };

  const refreshTagMenu = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = editableRef.current;
        if (!root) return;
        const text = normalizeHashAlias(serializeEditableRoot(root));
        const cursor = getCaretTextOffset(root);
        updateTagMenu(text, cursor);
      });
    });
  };

  const loadSuggestions = () => {
    if (typeof window === "undefined") {
      return Promise.resolve([]);
    }
    if (!window.photoAPI?.getGlobalHashtags) {
      return Promise.resolve([]);
    }
    if (suggestionsRef.current.length > 0) {
      return Promise.resolve(suggestionsRef.current);
    }
    setMenuLoading(true);
    return window.photoAPI
      .getGlobalHashtags()
      .then((tags) => {
        const list = Array.isArray(tags) ? tags : [];
        setLocalSuggestions(list);
        return list;
      })
      .catch(() => [])
      .finally(() => setMenuLoading(false));
  };

  const commitChipsOnBlur = () => {
    const root = editableRef.current;
    if (!root || focusedRef.current) return;
    const domText = valueFromEditableRaw(
      normalizeHashAlias(serializeEditableRoot(root)),
    );
    runDomSync(root, domText, false, false);
    if (domText !== valueFromEditableRaw(value)) {
      publishValue(domText);
    }
  };

  const handleInput = () => {
    if (suppressInputRef.current) return;
    const root = editableRef.current;
    if (!root) return;
    const raw = normalizeHashAlias(serializeEditableRoot(root));
    const cursor = getCaretTextOffset(root);
    publishValue(raw);
    refreshTagMenu();

    const fragment = hashFragmentAt(raw, cursor);
    if (fragment) {
      loadSuggestions().then(refreshTagMenu);
    }

    const published = valueFromEditableRaw(raw);
    if (
      !fragment &&
      /(?:^|\s)#[\p{L}\d_]+ /u.test(published) &&
      document.activeElement === root
    ) {
      queueMicrotask(() => {
        const el = editableRef.current;
        if (!el) return;
        runDomSync(el, published, false, true);
      });
    }
  };

  const applyTag = (tag) => {
    const root = editableRef.current;
    if (!root || !tag) return;

    const current = normalizeHashAlias(serializeEditableRoot(root));
    const cursor = getCaretTextOffset(root);
    const range = hashReplaceRange(current, cursor);
    if (!range) return;

    const formattedTag = tag.startsWith("#") ? tag : `#${tag}`;
    const next =
      current.slice(0, range.start) + formattedTag + " " + current.slice(range.end);
    const newCursor = range.start + formattedTag.length + 1;

    publishValue(next);
    setShowList(false);
    prevShowListRef.current = false;
    requestAnimationFrame(() => {
      suppressInputRef.current = true;
      try {
        syncDomFromValue(
          root,
          next,
          newCursor,
          false,
          document.activeElement === root,
        );
      } finally {
        const release = () => {
          suppressInputRef.current = false;
        };
        queueMicrotask(release);
        setTimeout(release, 0);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "#" || e.key === "№" || (e.key === "3" && e.shiftKey)) {
      loadSuggestions().finally(refreshTagMenu);
    }

    if (e.key === "Escape") {
      e.stopPropagation?.();
      if (showList) {
        e.preventDefault();
        setShowList(false);
      } else {
        onEscape?.();
        e.currentTarget.blur?.();
      }
      return;
    }
    if (!showList) return;
    if (filteredTags.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev + 1 < filteredTags.length ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      applyTag(filteredTags[activeIndex]);
    }
  };

  const editableSx = {
    outline: "none",
    width: "100%",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: isInset ? INSET_FONT_SIZE : "1rem",
    fontWeight: 500,
    lineHeight: isInset ? INSET_LINE_HEIGHT : 1.4375,
    color: "text.primary",
    pt: isInset ? INSET_PAD_TOP : "8.5px",
    pb: isInset ? INSET_PAD_BOTTOM : "8.5px",
    px: isInset ? INSET_PAD_X : "14px",
    minHeight: isInset ? "1.5em" : "5.75em",
    ...(isInset
      ? {
          maxHeight: `calc(${INSET_FONT_SIZE} * ${INSET_LINE_HEIGHT} * 24)`,
          overflowY: "auto",
        }
      : {}),
    cursor: "text",
    "& .h-tag": {
      display: "inline",
      bgcolor: TAG_CHIP_BG,
      borderRadius: TAG_CHIP_RADIUS,
      px: 0.75,
      py: 0.125,
      mx: 0.125,
      color: TAG_CHIP_COLOR,
      userSelect: "none",
    },
  };

  const tagMenuPaperSx = {
    minWidth: 180,
    maxWidth: 280,
    maxHeight: 220,
    overflow: "auto",
    borderRadius: TOOLBAR_MENU.paperRadiusPx,
    bgcolor:
      theme.palette.mode === "dark"
        ? "rgba(31, 31, 31, 0.72)"
        : alpha(theme.palette.background.paper, 0.88),
    backdropFilter: "blur(12px) saturate(140%)",
    WebkitBackdropFilter: "blur(12px) saturate(140%)",
    border: "1px solid",
    borderColor: theme.palette.glass?.border ?? "divider",
    py: 0.375,
    px: 0.375,
  };

  const placeholderText = placeholder ?? (isInset ? "Описание и #теги" : "");
  const showPlaceholder =
    Boolean(placeholderText) && isEditableTextEmpty(value);

  return (
    <Box ref={containerRef} sx={{ position: "relative", width: "100%" }}>
      {!isInset && label ? (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 700,
            mb: 0.5,
            display: "block",
            px: 0.5,
          }}
        >
          {label}
        </Typography>
      ) : null}

      <Box
        sx={{
          position: "relative",
          borderRadius: isInset ? 0 : "12px",
          bgcolor: isInset
            ? "transparent"
            : isDark
              ? alpha("#000", 0.1)
              : "transparent",
          border: isInset ? "none" : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          "&:focus-within": isInset
            ? {}
            : {
                borderColor: theme.palette.primary.main,
              },
        }}
      >
        {showPlaceholder ? (
          <Typography
            aria-hidden
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: "none",
              color: "text.secondary",
              fontSize: isInset ? INSET_FONT_SIZE : "1rem",
              fontWeight: 500,
              lineHeight: isInset ? INSET_LINE_HEIGHT : 1.4375,
              pt: isInset ? INSET_PAD_TOP : "8.5px",
              pb: isInset ? INSET_PAD_BOTTOM : "8.5px",
              px: isInset ? INSET_PAD_X : "14px",
            }}
          >
            {placeholderText}
          </Typography>
        ) : null}
        <Box
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholderText}
          onInput={handleInput}
          onFocus={() => {
            focusedRef.current = true;
            loadSuggestions().finally(refreshTagMenu);
          }}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            focusedRef.current = false;
            requestAnimationFrame(() => {
              const active = document.activeElement;
              if (menuPaperRef.current?.contains(active)) return;
              if (containerRef.current?.contains(active)) return;
              setShowList(false);
              setMenuLoading(false);
              commitChipsOnBlur();
            });
            onBlur?.(e);
          }}
          sx={editableSx}
        />
      </Box>

      <Popper
        open={showList}
        anchorEl={editableRef.current}
        placement="bottom-start"
        style={{ zIndex: 15000 }}
        modifiers={[
          { name: "offset", options: { offset: [0, 6] } },
          { name: "flip", enabled: true },
        ]}
      >
        {showList ? (
          <Paper ref={menuPaperRef} elevation={0} sx={tagMenuPaperSx}>
            <List ref={listRef} dense disablePadding>
              {menuLoading ? (
                <Typography
                  sx={{
                    px: 0.75,
                    py: 0.75,
                    fontSize: "0.815rem",
                    color: "text.secondary",
                  }}
                >
                  Загрузка тегов…
                </Typography>
              ) : null}
              {!menuLoading && filteredTags.length === 0 ? (
                <Typography
                  sx={{
                    px: 0.75,
                    py: 0.75,
                    fontSize: "0.815rem",
                    color: "text.secondary",
                  }}
                >
                  Нет сохранённых тегов
                </Typography>
              ) : null}
              {filteredTags.map((tag, idx) => {
                const isActive = idx === activeIndex;
                const label = tagMenuLabel(tag);
                return (
                  <ListItemButton
                    key={tag}
                    data-idx={idx}
                    disableGutters
                    disableRipple
                    selected={isActive}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      applyTag(tag);
                    }}
                    sx={{
                      borderRadius: TAG_CHIP_RADIUS,
                      py: 0.5,
                      pl: 0.75,
                      pr: 0.75,
                      mb: 0.125,
                      minHeight: 32,
                      alignItems: "center",
                      bgcolor: "transparent",
                      boxShadow: isActive
                        ? `0 0 0 2px ${TAG_MENU_FOCUS_RING}`
                        : "none",
                      "&:hover": {
                        bgcolor: isActive
                          ? "transparent"
                          : isDark
                            ? "rgba(255, 255, 255, 0.08)"
                            : "action.hover",
                      },
                      "&.Mui-selected": {
                        bgcolor: "transparent",
                      },
                      "&.Mui-selected:hover": {
                        bgcolor: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "action.hover",
                      },
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: isInset ? INSET_FONT_SIZE : "0.875rem",
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? TAG_CHIP_COLOR : "text.primary",
                        lineHeight: 1.25,
                        userSelect: "none",
                      }}
                    >
                      {label}
                    </Typography>
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        ) : null}
      </Popper>
    </Box>
  );
};

export default HashtagInput;