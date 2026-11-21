import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  IconButton,
  Divider,
  InputBase,
  Paper,
  Popper,
  ClickAwayListener,
  List,
  ListItemButton,
  ListSubheader,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FaceIcon from "@mui/icons-material/Face";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import CropIcon from "@mui/icons-material/Crop";
import CheckIcon from "@mui/icons-material/Check";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import PersonAvatar from "./PersonAvatar";
import ExternalEntityAvatar from "./ExternalEntityAvatar";
import PhotoFaceOverlay from "./PhotoFaceOverlay";
import { TOOLBAR_MENU } from "../layout/toolbarTokens";
import { distanceToConfidence } from "../services/faceRecognition";
import {
  confirmFaceAssignment,
  confirmExternalFaceAssignment,
  getPersonLabel,
} from "../utils/photoFaces";
import {
  buildFaceTagOptions,
  faceTagOptionFromFace,
  applyFaceTagOption,
} from "../utils/externalEntities";

export function PhotoFacePreviewBlock({
  preview,
  previewFrameRef,
  faces,
  imageSize,
  allPeople,
  allExternal = [],
  selectedFaceId,
  onSelectFace,
  onFacesChange,
  drawMode,
  setDrawMode,
  detecting,
  onDetect,
  onPreviewLoad,
  onEditThumb,
  customThumbReady = false,
}) {
  const boxRef = useRef(null);
  const [imgMaxH, setImgMaxH] = useState(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const update = () => setImgMaxH(Math.max(0, el.clientHeight - 32));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  if (!preview) return null;

  return (
    <Box
      ref={boxRef}
      sx={{
        position: "relative",
        width: "100%",
        zIndex: 1,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 0",
      }}
    >
      <Box
        ref={previewFrameRef}
        sx={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
          lineHeight: 0,
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={preview}
          alt="Превью"
          onLoad={onPreviewLoad}
          sx={{
            maxWidth: "100%",
            maxHeight: imgMaxH != null ? `${imgMaxH}px` : "55vh",
            objectFit: "contain",
            display: "block",
          }}
        />
        {imageSize?.width > 0 && (
          <PhotoFaceOverlay
            faces={faces}
            imageSize={imageSize}
            imageFrameRef={previewFrameRef}
            allPeople={allPeople}
            allExternal={allExternal}
            editable
            selectedFaceId={selectedFaceId}
            onSelectFace={onSelectFace}
            onFacesChange={onFacesChange}
            drawMode={drawMode}
          />
        )}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 3,
        }}
      >
        <Button
          size="small"
          variant={drawMode ? "contained" : "outlined"}
          startIcon={<AddIcon />}
          onClick={() => {
            setDrawMode((v) => !v);
            if (!drawMode) onSelectFace(null);
          }}
          sx={{
            bgcolor: drawMode ? "primary.main" : "rgba(0,0,0,0.55)",
            color: "#fff",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          {drawMode ? "Рамка…" : "Рамка"}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={
            detecting ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <FaceRetouchingNaturalIcon />
            )
          }
          disabled={detecting}
          onClick={onDetect}
          sx={{
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          Найти
        </Button>
        {onEditThumb && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CropIcon />}
            onClick={onEditThumb}
            sx={{
              bgcolor: "rgba(0,0,0,0.55)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            Превью
          </Button>
        )}
      </Stack>

      {customThumbReady && (
        <Chip
          label="Превью настроено"
          size="small"
          color="success"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 3,
            fontWeight: 600,
          }}
        />
      )}
    </Box>
  );
}

const FACE_PICKER_AVATAR = 18;
const FACE_PICKER_FONT_SIZE = "0.815rem";
const FACE_PICKER_FONT_WEIGHT = 500;

const faceMenuItemSx = {
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

function FaceEntityAvatar({ option }) {
  if (!option) return null;
  if (option.kind === "person") {
    return (
      <PersonAvatar
        personId={option.id}
        initials={getPersonLabel(option.data)}
        size={FACE_PICKER_AVATAR}
      />
    );
  }
  return (
    <ExternalEntityAvatar
      entityId={option.id}
      entity={option.data}
      size={FACE_PICKER_AVATAR}
    />
  );
}

export function FaceTagPicker({ theme, options, option, hint = false, onPick }) {
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const menuPaperRef = useRef(null);
  const inputRef = useRef(null);
  const menuInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const { peopleOptions, externalOptions } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (o) =>
      !q ||
      o.label.toLowerCase().includes(q) ||
      String(o.id).toLowerCase().includes(q);
    return {
      peopleOptions: options.filter((o) => o.kind === "person" && match(o)),
      externalOptions: options.filter((o) => o.kind === "external" && match(o)),
    };
  }, [options, query]);

  const flatFiltered = useMemo(
    () => [...peopleOptions, ...externalOptions],
    [peopleOptions, externalOptions],
  );

  const pickOption = useCallback(
    (opt) => {
      onPick?.(opt);
      setQuery("");
      setHighlight(0);
      setMenuOpen(false);
    },
    [onPick],
  );

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    requestAnimationFrame(() => {
      if (option) menuInputRef.current?.focus();
      else inputRef.current?.focus();
    });
  }, [option]);

  const handleClickAway = useCallback((event) => {
    const target = event.target;
    if (sectionRef.current?.contains(target)) return;
    if (menuPaperRef.current?.contains(target)) return;
    setMenuOpen(false);
  }, []);

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

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!menuOpen) return;
      e.preventDefault();
      setHighlight((i) =>
        flatFiltered.length ? (i + 1) % flatFiltered.length : 0,
      );
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

  const renderRows = (items) =>
    items.map((opt) => {
      const index = flatFiltered.indexOf(opt);
      return (
        <ListItemButton
          key={`${opt.kind}-${opt.id}`}
          disableRipple
          selected={menuOpen && index === highlight}
          onMouseEnter={() => setHighlight(index)}
          onClick={() => pickOption(opt)}
          sx={faceMenuItemSx}
        >
          <Typography
            sx={{
              fontSize: FACE_PICKER_FONT_SIZE,
              fontWeight: FACE_PICKER_FONT_WEIGHT,
              pointerEvents: "none",
            }}
          >
            {opt.label}
          </Typography>
        </ListItemButton>
      );
    });

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={sectionRef} sx={{ flex: 1, minWidth: 0 }}>
        <Box ref={anchorRef} sx={{ width: "100%" }}>
          {option ? (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                openMenu();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: 0,
                maxWidth: "100%",
                width: "min(100%, max-content)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background-color 120ms ease",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <FaceEntityAvatar option={option} />
              <Typography
                component="span"
                sx={{
                  fontSize: FACE_PICKER_FONT_SIZE,
                  fontWeight: hint ? 600 : FACE_PICKER_FONT_WEIGHT,
                  lineHeight: 1.35,
                  color: hint ? "primary.main" : "text.primary",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {option.label}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
              }}
            >
              <FaceIcon
                sx={{
                  color: "text.secondary",
                  fontSize: 18,
                  width: FACE_PICKER_AVATAR,
                  flexShrink: 0,
                }}
              />
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
                  if (!menuOpen) openMenu();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Выбрать человека…"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  p: 0,
                  fontSize: FACE_PICKER_FONT_SIZE,
                  fontWeight: FACE_PICKER_FONT_WEIGHT,
                  color: query ? "text.primary" : "text.secondary",
                  "& input": { p: 0 },
                }}
              />
            </Box>
          )}
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
            <Box sx={{ px: 1.25, py: 0.75 }}>
              <InputBase
                inputRef={menuInputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                  setMenuOpen(true);
                }}
                onBlur={handleFieldBlur}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
                placeholder="Поиск по id, имени…"
                sx={{
                  width: "100%",
                  fontSize: FACE_PICKER_FONT_SIZE,
                  fontWeight: FACE_PICKER_FONT_WEIGHT,
                  color: query ? "text.primary" : "text.secondary",
                  "& input": { p: 0 },
                }}
              />
            </Box>
            {flatFiltered.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  px: 2,
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: FACE_PICKER_FONT_SIZE,
                  fontWeight: FACE_PICKER_FONT_WEIGHT,
                }}
              >
                Ничего не найдено
              </Typography>
            ) : (
              <List dense disablePadding sx={{ px: 0.5, pb: 0.5 }}>
                {peopleOptions.length > 0 && (
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
                    {renderRows(peopleOptions)}
                  </>
                )}
                {peopleOptions.length > 0 && externalOptions.length > 0 && (
                  <Divider sx={{ my: 0.5 }} />
                )}
                {externalOptions.length > 0 && (
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
                    {renderRows(externalOptions)}
                  </>
                )}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

export function PhotoFaceFormSection({
  theme,
  faces,
  allPeople,
  allExternal = [],
  onSelectFace,
  onFacesChange,
  onAddFace,
}) {
  const faceTagOptions = buildFaceTagOptions(allPeople, allExternal);

  const handleAcceptSuggestion = (face) => {
    if (!face?.suggestedPersonId && !face?.suggestedExternalEntityId) return;

    const next = faces.map((f) =>
      f.id !== face.id
        ? f
        : face.suggestedExternalEntityId
          ? confirmExternalFaceAssignment(f, face.suggestedExternalEntityId)
          : confirmFaceAssignment(f, face.suggestedPersonId),
    );
    onFacesChange(next);
    onSelectFace(face.id);
  };

  return (
    <Box
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
      }}
    >
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
        <Stack direction="row" spacing="12px" sx={{ alignItems: "center" }}>
          <FaceIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <Typography
            sx={{
              fontSize: "0.815rem",
              fontWeight: 600,
              lineHeight: 1.35,
              color: "text.primary",
            }}
          >
            Лица на фото
          </Typography>
        </Stack>
        <Button size="small" onClick={onAddFace}>
          + Лицо
        </Button>
      </Stack>

      {faces.length > 0 && (
        <>
          <Divider
            sx={{ opacity: 0.35, mx: 1.25, borderColor: "divider" }}
          />
          <Box>
          {faces.map((face, index) => {
            const assignedOption = faceTagOptionFromFace(
              face,
              allPeople,
              allExternal,
            );
            const suggestedOption = assignedOption
              ? null
              : face.suggestedExternalEntityId != null
                ? faceTagOptions.find(
                    (o) =>
                      o.kind === "external" &&
                      o.id === face.suggestedExternalEntityId,
                  ) || {
                    kind: "external",
                    id: face.suggestedExternalEntityId,
                    label: `${face.suggestedExternalEntityId} :: …`,
                    data: allExternal.find(
                      (e) => e.id === face.suggestedExternalEntityId,
                    ),
                  }
                : face.suggestedPersonId != null
                  ? faceTagOptions.find(
                      (o) =>
                        o.kind === "person" &&
                        o.id === face.suggestedPersonId,
                    ) || {
                      kind: "person",
                      id: face.suggestedPersonId,
                      label: `${face.suggestedPersonId} :: …`,
                      data: allPeople.find(
                        (p) => p.id === face.suggestedPersonId,
                      ),
                    }
                  : null;
            const displayOption = assignedOption || suggestedOption;
            const isHint = !assignedOption && Boolean(suggestedOption);
            const isLast = index === faces.length - 1;

            return (
              <React.Fragment key={face.id}>
                <Box
                  onClick={() => onSelectFace(face.id)}
                  sx={{ px: "12px", py: "9px", cursor: "pointer" }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <FaceTagPicker
                      theme={theme}
                      options={faceTagOptions}
                      option={displayOption}
                      hint={isHint}
                      onPick={(opt) => {
                        const next = faces.map((f) =>
                          f.id === face.id ? applyFaceTagOption(f, opt) : f,
                        );
                        onFacesChange(next);
                        onSelectFace(face.id);
                      }}
                    />
                    {isHint && (
                      <IconButton
                        size="small"
                        disableRipple
                        data-accent
                        aria-label="Подтвердить предложение"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptSuggestion(face);
                        }}
                        sx={{
                          p: 0,
                          flexShrink: 0,
                          color: "#fff",
                          "&:hover, &.Mui-focusVisible, &:active": {
                            color: theme.palette.success.main,
                            bgcolor: "transparent",
                            backgroundColor: "transparent",
                          },
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      disableRipple
                      data-accent
                      aria-label="Удалить лицо"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFacesChange(faces.filter((f) => f.id !== face.id));
                      }}
                      sx={{
                        p: 0,
                        flexShrink: 0,
                        color: "#fff",
                        "&:hover, &.Mui-focusVisible, &:active": {
                          color: theme.palette.error.main,
                          bgcolor: "transparent",
                          backgroundColor: "transparent",
                        },
                      }}
                    >
                      <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>
                  <Typography
                    sx={{
                      pl: "32px",
                      mt: "-4px",
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      lineHeight: 1.3,
                      color: "text.secondary",
                    }}
                  >
                    Лицо {index + 1}
                    {isHint && face.suggestDistance != null
                      ? ` · Совпадает на ${distanceToConfidence(face.suggestDistance)}%`
                      : ""}
                  </Typography>
                </Box>
                {!isLast && (
                  <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                )}
              </React.Fragment>
            );
          })}
          </Box>
        </>
      )}
    </Box>
  );
}
