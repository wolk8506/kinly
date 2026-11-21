import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  InputBase,
  Paper,
  Popper,
  ClickAwayListener,
  List,
  ListItemButton,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronUpChevronDownIcon from "./svg/ChevronUpChevronDownIcon";
import PersonAvatar from "./PersonAvatar";
import { getPersonLabel } from "../utils/photoFaces";
import { TOOLBAR_MENU } from "../layout/toolbarTokens";

const ROW_AVATAR = 20;
const FIELD_FONT_SIZE = "0.815rem";
const FIELD_FONT_WEIGHT = 500;
const MENU_INPUT_PY = 0.75;
const TOGGLE_SIZE = 20;
const TOGGLE_ICON = 14;

const ownerMenuItemSx = {
  py: 0.75,
  borderRadius: `${TOOLBAR_MENU.itemRadiusPx}`,
  transform: "none",
  transition: "none",
  "&:hover": { bgcolor: "transparent" },
  "&.Mui-selected": {
    bgcolor: "action.selected",
    transform: "none",
  },
  "&.Mui-selected:hover": {
    bgcolor: "action.selected",
    transform: "none",
  },
};

function filterOwnerOptions(options, query, ownerId) {
  const q = query.trim().toLowerCase();
  return options.filter((o) => {
    if (ownerId != null && String(o.id) === String(ownerId)) return false;
    if (!q) return true;
    return (
      o.label.toLowerCase().includes(q) ||
      String(o.id).toLowerCase().includes(q)
    );
  });
}

export default function PhotoOwnerField({
  allPeople = [],
  ownerId = null,
  onChange,
  onInteractionEnd,
  label = "Владелец (папка)",
}) {
  const theme = useTheme();
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const menuPaperRef = useRef(null);
  const inputRef = useRef(null);
  const menuInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const options = useMemo(
    () =>
      allPeople.map((p) => ({
        id: p.id,
        label: `${p.id} :: ${getPersonLabel(p) || "Без имени"}`,
        data: p,
      })),
    [allPeople],
  );

  const selected = useMemo(() => {
    if (ownerId == null) return null;
    return (
      options.find((o) => String(o.id) === String(ownerId)) || {
        id: ownerId,
        label: `${ownerId} :: …`,
        data: allPeople.find((p) => p.id === ownerId),
      }
    );
  }, [ownerId, options, allPeople]);

  const filtered = useMemo(
    () => filterOwnerOptions(options, query, ownerId),
    [options, query, ownerId],
  );

  const pickOption = useCallback(
    (option) => {
      onChange?.(option.id);
      setQuery("");
      setHighlight(0);
      setMenuOpen(false);
    },
    [onChange],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const handleSectionClickAway = useCallback(
    (event) => {
      const target = event.target;
      if (sectionRef.current?.contains(target)) return;
      if (menuPaperRef.current?.contains(target)) return;
      closeMenu();
    },
    [closeMenu],
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!menuOpen) return;
      e.preventDefault();
      setHighlight((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      if (!menuOpen) return;
      e.preventDefault();
      setHighlight((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === "Enter" && menuOpen && filtered[highlight]) {
      e.preventDefault();
      pickOption(filtered[highlight]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setMenuOpen(false);
    }
  };

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    requestAnimationFrame(() => {
      if (ownerId != null) {
        menuInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    });
  }, [ownerId]);

  const toggleMenu = useCallback(() => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    openMenu();
  }, [menuOpen, openMenu]);

  const handleFieldBlur = useCallback((e) => {
    const related = e.relatedTarget;
    if (menuPaperRef.current?.contains(related)) return;
    if (sectionRef.current?.contains(related)) return;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (menuPaperRef.current?.contains(active)) return;
      if (active === inputRef.current || active === menuInputRef.current) return;
      setMenuOpen(false);
    });
  }, []);

  return (
    <ClickAwayListener onClickAway={handleSectionClickAway}>
      <Box ref={sectionRef}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5, display: "block" }}
        >
          {label}
        </Typography>

        <Box
          ref={anchorRef}
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            bgcolor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: "12px",
              py: "9px",
              minWidth: 0,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
              {selected ? (
                <Box
                  className="owner-pill"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: 0,
                    maxWidth: "100%",
                    width: "min(100%, max-content)",
                    borderRadius: "8px",
                    transition: "background-color 120ms ease",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <PersonAvatar
                    personId={selected.id}
                    initials={getPersonLabel(selected.data)}
                    size={ROW_AVATAR}
                  />
                  <Typography
                    component="span"
                    sx={{
                      fontSize: FIELD_FONT_SIZE,
                      fontWeight: FIELD_FONT_WEIGHT,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selected.label}
                  </Typography>
                </Box>
              ) : (
                <InputBase
                  inputRef={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                    setMenuOpen(true);
                  }}
                  onBlur={handleFieldBlur}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    openMenu();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Поиск по id, имени…"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    width: "100%",
                    fontSize: FIELD_FONT_SIZE,
                    fontWeight: FIELD_FONT_WEIGHT,
                    color: query ? "text.primary" : "text.secondary",
                    "& input": { p: 0 },
                  }}
                />
              )}
            </Box>
            <Box
              component="button"
              type="button"
              aria-label="Открыть список"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
              }}
              sx={{
                width: TOGGLE_SIZE,
                height: TOGGLE_SIZE,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "action.hover",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                p: 0,
              }}
            >
              <ChevronUpChevronDownIcon
                sx={{ fontSize: TOGGLE_ICON, color: "text.secondary" }}
              />
            </Box>
          </Box>

          <Popper
            open={menuOpen}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            sx={{
              zIndex: (t) => t.zIndex.modal + 2,
              width: anchorRef.current?.offsetWidth,
            }}
          >
            <Paper
              ref={menuPaperRef}
              elevation={0}
              onMouseDown={(e) => e.preventDefault()}
              sx={{
                mt: 0.5,
                maxHeight: 280,
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
                py: 0.5,
              }}
            >
              <Box sx={{ px: 1.25, py: MENU_INPUT_PY }}>
                <InputBase
                  inputRef={menuInputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                    setMenuOpen(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onBlur={handleFieldBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Поиск по id, имени…"
                  sx={{
                    width: "100%",
                    fontSize: FIELD_FONT_SIZE,
                    fontWeight: FIELD_FONT_WEIGHT,
                    color: query ? "text.primary" : "text.secondary",
                    "& input": { p: 0 },
                  }}
                />
              </Box>
              {filtered.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    px: 2,
                    py: 1.5,
                    color: "text.secondary",
                    fontSize: FIELD_FONT_SIZE,
                    fontWeight: FIELD_FONT_WEIGHT,
                  }}
                >
                  {ownerId != null && !query.trim()
                    ? "Текущий владелец не показывается в списке — введите поиск"
                    : "Ничего не найдено"}
                </Typography>
              ) : (
                <List dense disablePadding sx={{ px: 0.5, pb: 0.5 }}>
                  {filtered.map((option, index) => (
                    <ListItemButton
                      key={option.id}
                      disableRipple
                      selected={menuOpen && index === highlight}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pickOption(option)}
                      sx={ownerMenuItemSx}
                    >
                      <Typography
                        sx={{
                          fontSize: FIELD_FONT_SIZE,
                          fontWeight: FIELD_FONT_WEIGHT,
                          pointerEvents: "none",
                        }}
                      >
                        {option.label}
                      </Typography>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Paper>
          </Popper>
        </Box>
      </Box>
    </ClickAwayListener>
  );
}