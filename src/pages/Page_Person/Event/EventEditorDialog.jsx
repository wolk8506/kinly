import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Stack,
  Box,
  Typography,
  InputBase,
  Divider,
  Paper,
  Popper,
  ClickAwayListener,
  List,
  ListItemButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CustomDatePickerDialog from "../../../components/CustomDatePickerDialog";
import { EVENT_TYPES } from "./EventTypesList";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocationPickerDialog from "../../../components/Dialog/LocationPickerDialog";
import LocationArrowFillIcon from "../../../components/svg/LocationArrowFillIcon";
import ChevronUpChevronDownIcon from "../../../components/svg/ChevronUpChevronDownIcon";
import PhotoAttendeesList from "../../../components/PhotoAttendeesList";
import CustomSwitch from "../../../components/CustomSwitch";
import DialogActionButton, {
  DialogActionsBar,
} from "../../../components/Dialog/DialogActionButton";
import {
  splitEventParticipantOptions,
  eventParticipantOptionsFromEvent,
} from "../../../utils/externalEntities";
import { TOOLBAR_MENU } from "../../../layout/toolbarTokens";
import useDialogSaveHotkey from "../../../hooks/useDialogSaveHotkey";
import { glassPaperSx, glassBackdropSx } from "../../../components/Dialog/glassDialog";
import {
  sectionLabelSx,
  fieldBlockSx,
  fieldRowSx as baseFieldRowSx,
  fieldTitleSx,
  fieldValueSx,
  inputSx,
} from "../../../components/dialogFieldStyles";

// Строки «подпись слева — значение справа»
const fieldRowSx = {
  ...baseFieldRowSx,
  justifyContent: "space-between",
  gap: 1,
};

function EventTypePicker({ theme, type, onChange }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [query, setQuery] = useState("");
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const menuPaperRef = useRef(null);
  const menuInputRef = useRef(null);

  const q = query.trim().toLowerCase();
  const flatList = q
    ? EVENT_TYPES.filter((t) => t.name.toLowerCase().includes(q))
    : EVENT_TYPES;

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => menuInputRef.current?.focus());
    }
  }, [open]);

  const pick = (t) => {
    onChange(t);
    setQuery("");
    setHighlight(0);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.target === menuInputRef.current) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((i) => (flatList.length ? (i + 1) % flatList.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((i) =>
          flatList.length ? (i - 1 + flatList.length) % flatList.length : 0,
        );
      } else if (e.key === "Enter" && flatList[highlight]) {
        e.preventDefault();
        pick(flatList[highlight]);
      } else if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % flatList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + flatList.length) % flatList.length);
    } else if (e.key === "Enter" && flatList[highlight]) {
      e.preventDefault();
      pick(flatList[highlight]);
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
          <Stack direction="row" spacing="12px" sx={{ alignItems: "center", minWidth: 0 }}>
            <Box sx={{ color: "primary.main", display: "flex", flexShrink: 0, "& svg": { fontSize: 18 } }}>
              {type?.icon}
            </Box>
            <Typography sx={fieldTitleSx}>{type?.name}</Typography>
          </Stack>
          <ChevronUpChevronDownIcon
            sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }}
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
                placeholder="Поиск по типу события…"
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
            {flatList.length === 0 ? (
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
              {flatList.map((t, index) => (
                <ListItemButton
                  key={t.name}
                  disableRipple
                  selected={open && index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(t)}
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
                  <Box sx={{ color: "primary.main", display: "flex", "& svg": { fontSize: 18 } }}>
                    {t.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.815rem",
                      fontWeight: 500,
                      pointerEvents: "none",
                    }}
                  >
                    {t.name}
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

export default function EventEditorDialog({
  open,
  onClose,
  initialEvent,
  onSave,
  onDelete,
  onCopyRequest,
  allPeople = [],
}) {
  const theme = useTheme();
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [place, setPlace] = useState("");
  const [evLat, setEvLat] = useState(null);
  const [evLng, setEvLng] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [placeEnabled, setPlaceEnabled] = useState(false);
  const [participantOptions, setParticipantOptions] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
      setType(
        EVENT_TYPES.find((i) => i.name === initialEvent?.type) ??
          EVENT_TYPES[0],
      );
      setDate(initialEvent?.date ?? "");
      setDescription(initialEvent?.description ?? "");
      setNotes(initialEvent?.notes ?? "");
      setPlace(initialEvent?.place ?? "");
      setEvLat(initialEvent?.lat ?? null);
      setEvLng(initialEvent?.lng ?? null);
      setPlaceEnabled(
        Boolean(
          initialEvent?.place?.trim() ||
            initialEvent?.lat != null ||
            initialEvent?.lng != null,
        ),
      );
    }
  }, [open, initialEvent]);

  useEffect(() => {
    if (!open) return;
    setParticipantOptions(
      eventParticipantOptionsFromEvent(initialEvent, allPeople, allExternal),
    );
  }, [open, initialEvent, allPeople, allExternal]);

  const handleSave = () => {
    const { participants, externalParticipants } =
      splitEventParticipantOptions(participantOptions);

    onSave?.({
      type: type.name,
      date,
      description,
      notes,
      place,
      lat: evLat,
      lng: evLng,
      participants,
      externalParticipants,
    });
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  const participantPeopleIds = participantOptions
    .filter((o) => o.kind === "person")
    .map((o) => o.id);
  const participantExternalIds = participantOptions
    .filter((o) => o.kind === "external")
    .map((o) => o.id);

  const hasPlace = place.trim() !== "" || (evLat != null && evLng != null);

  useDialogSaveHotkey({ open, onSave: handleSave });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        transitionDuration={{ enter: 180, exit: 140 }}
        slotProps={{
          backdrop: { sx: glassBackdropSx },
          paper: {
            sx: (t) => ({
              ...glassPaperSx(t),
              width: 600,
              maxWidth: "94vw",
              height: "min(720px, 88vh)",
              display: "flex",
              flexDirection: "column",
            }),
          }
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 3, pt: 2.5, pb: 2, flexShrink: 0 }}>
            <Typography
              variant="h6"
              sx={{ textAlign: "center", fontWeight: 700 }}
            >
              {initialEvent ? "Редактировать событие" : "Новое событие"}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 3, pb: 2 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={sectionLabelSx}>Основное</Typography>
                <Stack spacing={1.5}>
                  <Box sx={fieldBlockSx}>
                    <EventTypePicker
                      theme={theme}
                      type={type}
                      onChange={setType}
                    />
                  </Box>
                  <Box sx={fieldBlockSx}>
                    <Box
                      onClick={() => setDatePickerOpen(true)}
                      sx={{ ...fieldRowSx, cursor: "pointer" }}
                    >
                      <Stack
                        direction="row"
                        spacing="12px"
                        sx={{ alignItems: "center", minWidth: 0 }}
                      >
                        <CalendarMonthIcon
                          sx={{ color: "text.secondary", fontSize: 18, flexShrink: 0 }}
                        />
                        <Typography sx={fieldTitleSx}>Дата</Typography>
                      </Stack>
                      <Typography
                        sx={{
                          ...fieldValueSx,
                          color: date ? "text.primary" : "text.secondary",
                        }}
                      >
                        {date || "Указать дату"}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>

              <Box>
                <Typography sx={sectionLabelSx}>Описание</Typography>
                <Box sx={fieldBlockSx}>
                  <InputBase
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Краткое описание"
                    sx={inputSx}
                  />
                  <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                  <InputBase
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Примечания"
                    multiline
                    minRows={2}
                    sx={inputSx}
                  />
                </Box>
              </Box>

              <Box>
                <Typography sx={sectionLabelSx}>Место</Typography>
                <Box sx={fieldBlockSx}>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: "12px",
                      py: "9px",
                      gap: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing="12px"
                      sx={{ alignItems: "center", minWidth: 0 }}
                    >
                      <LocationArrowFillIcon
                        sx={{ color: "text.secondary", fontSize: 18, flexShrink: 0 }}
                      />
                      <Typography sx={fieldTitleSx}>Место</Typography>
                    </Stack>
                    <CustomSwitch
                      checked={placeEnabled}
                      onChange={(e) => {
                        setPlaceEnabled(e.target.checked);
                        if (!e.target.checked) {
                          setPlace("");
                          setEvLat(null);
                          setEvLng(null);
                        }
                      }}
                    />
                  </Stack>

                  {placeEnabled && (
                    <>
                      <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                      <Box
                        onClick={() => setLocationPickerOpen(true)}
                        sx={{
                          ...fieldRowSx,
                          pl: "42px",
                          cursor: "pointer",
                        }}
                      >
                        <Typography
                          sx={{
                            ...fieldValueSx,
                            color: hasPlace ? "text.primary" : "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {place ||
                            (evLat != null && evLng != null
                              ? `${Number(evLat).toFixed(4)}, ${Number(evLng).toFixed(4)}`
                              : "Указать место")}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
                {placeEnabled &&
                  evLat != null &&
                  evLng != null &&
                  !place.trim() && (
                    <Typography
                      sx={{
                        mt: "6px",
                        pl: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 400,
                        lineHeight: 1.35,
                        color: "text.secondary",
                      }}
                    >
                      {`${Number(evLat).toFixed(4)}, ${Number(evLng).toFixed(4)}`}
                    </Typography>
                  )}
              </Box>

              <Box>
                <Typography sx={sectionLabelSx}>Участники</Typography>
                <PhotoAttendeesList
                  label=""
                  allPeople={allPeople.filter((p) => !p.archived)}
                  allExternal={allExternal}
                  peopleIds={participantPeopleIds}
                  externalPeopleIds={participantExternalIds}
                  onAdd={(option) =>
                    setParticipantOptions((prev) => [...prev, option])
                  }
                  onRemove={(option) =>
                    setParticipantOptions((prev) =>
                      prev.filter(
                        (o) => !(o.kind === option.kind && o.id === option.id),
                      ),
                    )
                  }
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActionsBar>
          {initialEvent && (
            <DialogActionButton tone="danger" onClick={handleDelete}>
              Удалить
            </DialogActionButton>
          )}
          {initialEvent && (
            <DialogActionButton
              onClick={() => {
                const { participants, externalParticipants } =
                  splitEventParticipantOptions(participantOptions);
                onCopyRequest?.({
                  type: type.name,
                  date,
                  description,
                  notes,
                  place,
                  lat: evLat,
                  lng: evLng,
                  participants,
                  externalParticipants,
                });
              }}
            >
              Копия
            </DialogActionButton>
          )}
          <DialogActionButton onClick={onClose}>Отмена</DialogActionButton>
          <DialogActionButton tone="primary" onClick={handleSave}>
            {initialEvent ? "Обновить" : "Сохранить"}
          </DialogActionButton>
        </DialogActionsBar>
      </Dialog>

      {/* Встраиваем кастомный дейтпикер */}
      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={date}
        format="DD.MM.YYYY" // или "YYYY-MM-DD"
        showTime={true} // включить выбор времени
        onSave={(newDate) => {
          setDate(newDate);
          setDatePickerOpen(false);
        }}
      />
      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initial={
          evLat != null && evLng != null ? { lat: evLat, lng: evLng } : null
        }
        initialQuery={place || ""}
        onSelect={({ lat, lng, name }) => {
          setEvLat(lat);
          setEvLng(lng);
          if (!place.trim() && name) setPlace(name);
        }}
      />
    </>
  );
}
