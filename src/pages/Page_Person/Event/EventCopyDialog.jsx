import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Stack,
  Box,
  Paper,
  Popper,
  ClickAwayListener,
  List,
  ListItemButton,
  InputBase,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DialogActionButton, {
  DialogActionsBar,
} from "../../../components/Dialog/DialogActionButton";
import PhotoOwnerField from "../../../components/PhotoOwnerField";
import SwapHorizontalCircleIcon from "@mui/icons-material/SwapHorizontalCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ChevronUpChevronDownIcon from "../../../components/svg/ChevronUpChevronDownIcon";
import { EVENT_TYPES } from "./EventTypesList";
import { TOOLBAR_MENU } from "../../../layout/toolbarTokens";
import {
  glassPaperSx,
  glassBackdropSx,
} from "../../../components/Dialog/glassDialog";
import {
  sectionLabelSx,
  fieldBlockSx,
  fieldRowSx,
  fieldTitleSx,
  fieldValueSx,
} from "../../../components/dialogFieldStyles";

const eventLabel = (ev) =>
  `${ev.type || "Событие"}${ev.date ? ` — ${ev.date}` : ""}`;

const eventIcon = (ev) =>
  EVENT_TYPES.find(
    (i) => i.name === (typeof ev.type === "string" ? ev.type : ev.type?.name),
  )?.icon;

function ReplaceEventPicker({ theme, events, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [query, setQuery] = useState("");
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const menuPaperRef = useRef(null);
  const menuInputRef = useRef(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? events
        .map((ev, idx) => ({ ev, idx }))
        .filter(({ ev }) => eventLabel(ev).toLowerCase().includes(q))
    : events.map((ev, idx) => ({ ev, idx }));

  const selected =
    value !== "" && value != null ? events[value] : null;

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => menuInputRef.current?.focus());
    }
  }, [open]);

  const pick = (idx) => {
    onChange(idx);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.target === menuInputRef.current) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
        );
      } else if (e.key === "Enter" && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight].idx);
      } else if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].idx);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <ClickAwayListener
      onClickAway={(e) => {
        const t = e.target;
        if (sectionRef.current?.contains(t)) return;
        if (menuPaperRef.current?.contains(t)) return;
        setOpen(false);
      }}
    >
      <Box ref={sectionRef} sx={{ flex: 1, minWidth: 0 }}>
        <Box
          ref={anchorRef}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          sx={{
            ...fieldRowSx,
            width: "100%",
            cursor: "pointer",
            "&:focus-visible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            },
          }}
        >
          <Stack
            direction="row"
            spacing="12px"
            sx={{ alignItems: "center", minWidth: 0, flex: 1 }}
          >
            {selected && (
              <Box
                sx={{
                  color: "primary.main",
                  display: "flex",
                  flexShrink: 0,
                  "& svg": { fontSize: 18 },
                }}
              >
                {eventIcon(selected)}
              </Box>
            )}
            <Typography
              sx={{
                ...fieldValueSx,
                color: selected ? "text.primary" : "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selected ? eventLabel(selected) : "Выбрать событие"}
            </Typography>
          </Stack>
          <ChevronUpChevronDownIcon
            sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0, ml: "auto" }}
          />
        </Box>

        <Popper
          open={open}
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
            <Box sx={{ px: 1.25, py: 0.75 }}>
              <InputBase
                inputRef={menuInputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Поиск по событию…"
                sx={{
                  width: "100%",
                  fontSize: "0.815rem",
                  fontWeight: 500,
                  color: query ? "text.primary" : "text.secondary",
                  "& input": { p: 0 },
                }}
              />
            </Box>
            <Divider sx={{ mx: 0.5, my: 0.25 }} />
            {filtered.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  px: 2,
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: "0.815rem",
                  fontWeight: 500,
                }}
              >
                Ничего не найдено
              </Typography>
            ) : (
              <List dense disablePadding sx={{ px: 0.5, pb: 0.5 }}>
                {filtered.map(({ ev, idx }, index) => (
                  <ListItemButton
                    key={idx}
                    disableRipple
                    selected={open && index === highlight}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(idx)}
                    sx={{
                      py: 0.75,
                      borderRadius: `${TOOLBAR_MENU.itemRadiusPx}`,
                      transform: "none",
                      transition: "none",
                      gap: 1.5,
                      "&:hover": { bgcolor: "transparent" },
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                        transform: "none",
                      },
                      "&.Mui-selected:hover": {
                        bgcolor: "action.selected",
                        transform: "none",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: "primary.main",
                        display: "flex",
                        "& svg": { fontSize: 18 },
                      }}
                    >
                      {eventIcon(ev)}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.815rem",
                        fontWeight: 500,
                        pointerEvents: "none",
                      }}
                    >
                      {eventLabel(ev)}
                    </Typography>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

function ModeRow({ icon, title, subtitle, selected, disabled, onClick }) {
  const theme = useTheme();
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        ...fieldRowSx,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        bgcolor: selected
          ? alpha(theme.palette.primary.main, 0.1)
          : "transparent",
        "&:hover": disabled
          ? undefined
          : { bgcolor: alpha(theme.palette.action.hover, 0.06) },
      }}
    >
      <Box
        sx={{
          color: selected ? "primary.main" : "text.secondary",
          display: "flex",
          flexShrink: 0,
          "& svg": { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={fieldTitleSx}>{title}</Typography>
        {subtitle && (
          <Typography
            sx={{
              ...fieldValueSx,
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function EventCopyDialog({
  open,
  onClose,
  allPeople,
  eventData,
  onConfirmCopy,
}) {
  const theme = useTheme();
  const [targetPersonId, setTargetPersonId] = useState(null);
  const [mode, setMode] = useState(null); // 'new' | 'replace'
  const [selectedEventIndex, setSelectedEventIndex] = useState("");

  const targetPerson = useMemo(
    () => allPeople.find((p) => String(p.id) === String(targetPersonId)) || null,
    [allPeople, targetPersonId],
  );

  const targetEvents = useMemo(() => {
    return targetPerson?.events || [];
  }, [targetPerson]);

  const handleClose = () => {
    setTargetPersonId(null);
    setMode(null);
    setSelectedEventIndex("");
    onClose();
  };

  const handleExecute = () => {
    onConfirmCopy(targetPerson.id, mode, selectedEventIndex);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      slotProps={{
        backdrop: { sx: glassBackdropSx },
        paper: {
          sx: (t) => ({
            ...glassPaperSx(t),
            width: 480,
            maxWidth: "94vw",
            display: "flex",
            flexDirection: "column",
          }),
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2, flexShrink: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "center" }}
          >
            <ContentCopyIcon
              sx={{ color: "primary.main", fontSize: 20 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Копирование события
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 3, pb: 2 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={sectionLabelSx}>Кому</Typography>
              <PhotoOwnerField
                allPeople={allPeople.filter((p) => !p.archived)}
                ownerId={targetPersonId}
                onChange={(id) => {
                  setTargetPersonId(id);
                  setMode(null);
                  setSelectedEventIndex("");
                }}
                label=""
              />
            </Box>

            {targetPerson && (
              <Box>
                <Typography sx={sectionLabelSx}>Действие</Typography>
                <Box sx={fieldBlockSx}>
                  <ModeRow
                    icon={<AddCircleIcon />}
                    title="Как новое событие"
                    subtitle="Добавить копию к существующим"
                    selected={mode === "new"}
                    onClick={() => {
                      setMode("new");
                      setSelectedEventIndex("");
                    }}
                  />
                  <Box sx={{ borderTop: "1px solid", borderColor: "divider", opacity: 0.5 }} />
                  <ModeRow
                    icon={<SwapHorizontalCircleIcon />}
                    title="Заменить событие"
                    subtitle={
                      targetEvents.length === 0
                        ? "У человека нет событий"
                        : `Заменить одно из ${targetEvents.length}`
                    }
                    selected={mode === "replace"}
                    disabled={targetEvents.length === 0}
                    onClick={() => setMode("replace")}
                  />
                </Box>
              </Box>
            )}

            {mode === "replace" && targetEvents.length > 0 && (
              <Box>
                <Typography sx={sectionLabelSx}>Событие для замены</Typography>
                <Box sx={fieldBlockSx}>
                  <ReplaceEventPicker
                    theme={theme}
                    events={targetEvents}
                    value={selectedEventIndex}
                    onChange={setSelectedEventIndex}
                  />
                </Box>
              </Box>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActionsBar>
        <DialogActionButton onClick={handleClose}>Отмена</DialogActionButton>
        <DialogActionButton
          tone={mode === "replace" ? "danger" : "primary"}
          disabled={
            !targetPerson ||
            !mode ||
            (mode === "replace" && selectedEventIndex === "")
          }
          onClick={handleExecute}
        >
          {mode === "replace" ? "Заменить" : "Копировать"}
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
