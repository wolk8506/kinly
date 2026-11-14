import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  InputBase,
  IconButton,
  Paper,
  Popper,
  ClickAwayListener,
  List,
  ListSubheader,
  ListItemButton,
  Divider,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PetsIcon from "@mui/icons-material/Pets";
import PersonAvatar from "./PersonAvatar";
import { getPersonLabel } from "../utils/photoFaces";
import { buildFaceTagOptions } from "../utils/externalEntities";
import { TOOLBAR_MENU } from "../layout/toolbarTokens";

const SEARCH_CLEAR_SIZE = 12;
const SEARCH_CLEAR_ICON_SIZE = 8;
const ROW_AVATAR = 20;
const ADD_ICON = 20;
const ATTENDEE_FONT_SIZE = "0.815rem";
const ATTENDEE_FONT_WEIGHT = 500;

function AttendeeRemoveButton({ onClick }) {
  return (
    <IconButton
      size="small"
      aria-label="Убрать с снимка"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="attendee-remove"
      disableRipple
      sx={{
        flexShrink: 0,
        p: 0,
        width: SEARCH_CLEAR_SIZE,
        height: SEARCH_CLEAR_SIZE,
        borderRadius: "50%",
        opacity: 0,
        transition: "opacity 120ms ease",
        bgcolor: "#999999",
        color: "#fff",
        "&.MuiIconButton-root:hover": {
          bgcolor: "#999999",
          backgroundColor: "#999999",
        },
      }}
    >
      <CloseIcon
        sx={{
          fontSize: SEARCH_CLEAR_ICON_SIZE,
          width: SEARCH_CLEAR_ICON_SIZE,
          height: SEARCH_CLEAR_ICON_SIZE,
        }}
      />
    </IconButton>
  );
}

function ExternalMiniAvatar({ entity }) {
  const isPet = entity?.type === "pet";
  return (
    <Box
      sx={{
        width: ROW_AVATAR,
        height: ROW_AVATAR,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        color: "text.secondary",
      }}
    >
      {isPet ? (
        <PetsIcon sx={{ fontSize: 12 }} />
      ) : (
        <PersonOutlineOutlinedIcon sx={{ fontSize: 12 }} />
      )}
    </Box>
  );
}

function filterOptions(options, query, selectedKeys) {
  const q = query.trim().toLowerCase();
  return options.filter((o) => {
    const key = `${o.kind}:${o.id}`;
    if (selectedKeys.has(key)) return false;
    if (!q) return true;
    return (
      o.label.toLowerCase().includes(q) ||
      String(o.id).toLowerCase().includes(q)
    );
  });
}

export default function PhotoAttendeesList({
  allPeople = [],
  allExternal = [],
  peopleIds = [],
  externalPeopleIds = [],
  onAdd,
  onRemove,
  onInteractionEnd,
}) {
  const theme = useTheme();
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const menuPaperRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [blockActive, setBlockActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const deactivateAdd = useCallback(() => {
    setBlockActive(false);
    setMenuOpen(false);
    setQuery("");
    setHighlight(0);
    inputRef.current?.blur();
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const activateAdd = useCallback(() => {
    setBlockActive(true);
  }, []);

  const openMenuFromSearchClick = useCallback(() => {
    setMenuOpen(true);
  }, []);
  const [highlight, setHighlight] = useState(0);

  const options = useMemo(
    () => buildFaceTagOptions(allPeople, allExternal),
    [allPeople, allExternal],
  );

  const selectedKeys = useMemo(() => {
    const s = new Set();
    for (const id of peopleIds) s.add(`person:${id}`);
    for (const id of externalPeopleIds) s.add(`external:${id}`);
    return s;
  }, [peopleIds, externalPeopleIds]);

  const selectedRows = useMemo(() => {
    const rows = [];
    for (const id of peopleIds) {
      const opt = options.find((o) => o.kind === "person" && o.id === id);
      if (opt) rows.push(opt);
      else {
        const p = allPeople.find((x) => x.id === id);
        rows.push({
          kind: "person",
          id,
          label: `${id} :: ${getPersonLabel(p) || "Без имени"}`,
          data: p,
        });
      }
    }
    for (const id of externalPeopleIds) {
      const opt = options.find((o) => o.kind === "external" && o.id === id);
      if (opt) rows.push(opt);
    }
    return rows;
  }, [peopleIds, externalPeopleIds, options, allPeople]);

  const filtered = useMemo(
    () => filterOptions(options, query, selectedKeys),
    [options, query, selectedKeys],
  );

  const grouped = useMemo(() => {
    const relatives = filtered.filter((o) => o.kind === "person");
    const external = filtered.filter((o) => o.kind === "external");
    return { relatives, external };
  }, [filtered]);

  const flatFiltered = useMemo(
    () => [...grouped.relatives, ...grouped.external],
    [grouped],
  );

  const pickOption = useCallback(
    (option) => {
      onAdd?.(option);
      setQuery("");
      setHighlight(0);
      setMenuOpen(false);
      inputRef.current?.focus();
    },
    [onAdd],
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!menuOpen) return;
      e.preventDefault();
      setHighlight((i) => (flatFiltered.length ? (i + 1) % flatFiltered.length : 0));
    } else if (e.key === "ArrowUp") {
      if (!menuOpen) return;
      e.preventDefault();
      setHighlight((i) =>
        flatFiltered.length
          ? (i - 1 + flatFiltered.length) % flatFiltered.length
          : 0,
      );
    } else if (e.key === "Enter" && menuOpen && flatFiltered[highlight]) {
      e.preventDefault();
      pickOption(flatFiltered[highlight]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setMenuOpen(false);
    }
  };

  const renderMenuRows = (items) =>
    items.map((option) => {
      const index = flatFiltered.indexOf(option);
      return (
        <ListItemButton
          key={`${option.kind}-${option.id}`}
          selected={menuOpen && index === highlight}
          onMouseEnter={() => setHighlight(index)}
          onClick={() => pickOption(option)}
          sx={{ py: 0.75, borderRadius: `${TOOLBAR_MENU.itemRadiusPx}` }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: ATTENDEE_FONT_SIZE,
              fontWeight: index === highlight ? 600 : ATTENDEE_FONT_WEIGHT,
            }}
          >
            {option.label}
          </Typography>
        </ListItemButton>
      );
    });

  const handleSectionClickAway = useCallback(
    (event) => {
      const target = event.target;
      if (sectionRef.current?.contains(target)) return;
      if (menuPaperRef.current?.contains(target)) return;
      deactivateAdd();
    },
    [deactivateAdd],
  );

  return (
    <ClickAwayListener onClickAway={handleSectionClickAway}>
      <Box ref={sectionRef}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5, display: "block" }}
        >
          Кто на фото
        </Typography>

        <Box
          ref={anchorRef}
          tabIndex={0}
          onFocus={(e) => {
            if (e.target !== e.currentTarget || blockActive) return;
            activateAdd();
          }}
          onClick={(e) => {
            if (blockActive) return;
            if (selectedRows.length === 0 || e.target === e.currentTarget) {
              activateAdd();
            }
          }}
          onKeyDown={(e) => {
            if (blockActive) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              activateAdd();
            }
          }}
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            outline: "none",
            minHeight: selectedRows.length === 0 && !blockActive ? 36 : undefined,
            bgcolor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            "&:focus-visible": {
              boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}`,
            },
          }}
        >
        {selectedRows.map((row, index) => {
          const isLastRow = index === selectedRows.length - 1 && !blockActive;
          return (
            <Box
              key={`${row.kind}-${row.id}`}
              sx={{
                display: "flex",
                alignItems: "center",
                minWidth: 0,
                px: 1.25,
                pt: 0.75,
                pb: isLastRow ? "6px" : 0,
              }}
            >
              <Box
                className="attendee-pill"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 0,
                  maxWidth: "100%",
                  width: "min(100%, max-content)",
                  pr: "4px",
                  borderRadius: "8px",
                  transition: "background-color 120ms ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                  "&:hover .attendee-remove": {
                    opacity: 1,
                    bgcolor: "#999999",
                    backgroundColor: "#999999",
                    color: "#fff",
                  },
                  "@media (hover: none)": {
                    "& .attendee-remove": {
                      opacity: 1,
                      bgcolor: "#999999",
                      backgroundColor: "#999999",
                      color: "#fff",
                    },
                  },
                }}
              >
                {row.kind === "person" ? (
                  <PersonAvatar
                    personId={row.id}
                    initials={getPersonLabel(row.data)}
                    size={ROW_AVATAR}
                  />
                ) : (
                  <ExternalMiniAvatar entity={row.data} />
                )}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      fontSize: ATTENDEE_FONT_SIZE,
                      fontWeight: ATTENDEE_FONT_WEIGHT,
                      flex: "1 1 auto",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.label}
                  </Typography>
                  <AttendeeRemoveButton onClick={() => onRemove?.(row)} />
                </Box>
              </Box>
            </Box>
          );
        })}

        {blockActive ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.25,
              pt: 0.85,
              pb: "6px",
            }}
          >
            <AddCircleIcon
              sx={{ fontSize: ADD_ICON, color: "text.secondary", flexShrink: 0 }}
            />
            <InputBase
              inputRef={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
                setMenuOpen(true);
              }}
              onBlur={() => {
                setMenuOpen(false);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                openMenuFromSearchClick();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setMenuOpen(false);
                  return;
                }
                handleKeyDown(e);
              }}
              placeholder="Добавить человека на фото"
              sx={{
                flex: 1,
                fontSize: ATTENDEE_FONT_SIZE,
                fontWeight: ATTENDEE_FONT_WEIGHT,
                color: query ? "text.primary" : "text.secondary",
                "& input": { p: 0 },
              }}
            />
          </Box>
        ) : null}

            <Popper
              open={menuOpen}
              anchorEl={anchorRef.current}
              placement="bottom-start"
              sx={{ zIndex: (t) => t.zIndex.modal + 2, width: anchorRef.current?.offsetWidth }}
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
                {flatFiltered.length === 0 ? (
                  <Typography
                    variant="body2"
                    sx={{
                      px: 2,
                      py: 1.5,
                      color: "text.secondary",
                      fontSize: ATTENDEE_FONT_SIZE,
                      fontWeight: ATTENDEE_FONT_WEIGHT,
                    }}
                  >
                    {selectedKeys.size === options.length
                      ? "Все из списка уже на снимке"
                      : "Ничего не найдено"}
                  </Typography>
                ) : (
                  <List dense disablePadding sx={{ px: 0.5 }}>
                    {grouped.relatives.length > 0 && (
                      <>
                        <ListSubheader
                          disableSticky
                          sx={{
                            lineHeight: "28px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "text.secondary",
                            bgcolor: "transparent",
                          }}
                        >
                          Родственники
                        </ListSubheader>
                        {renderMenuRows(grouped.relatives)}
                      </>
                    )}
                    {grouped.relatives.length > 0 && grouped.external.length > 0 && (
                      <Divider sx={{ my: 0.5 }} />
                    )}
                    {grouped.external.length > 0 && (
                      <>
                        <ListSubheader
                          disableSticky
                          sx={{
                            lineHeight: "28px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "text.secondary",
                            bgcolor: "transparent",
                          }}
                        >
                          Справочник
                        </ListSubheader>
                        {renderMenuRows(grouped.external)}
                      </>
                    )}
                  </List>
                )}
              </Paper>
            </Popper>
        </Box>
      </Box>
    </ClickAwayListener>
  );
}