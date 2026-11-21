import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  Button,
  Stack,
  Box,
  CircularProgress,
  Typography,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhotoFaceOverlay from "../PhotoFaceOverlay";
import { PhotoFaceFormSection } from "../PhotoFaceMarkupBlocks";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { useNotificationStore } from "../../store/useNotificationStore";
import { detectFacesFromImageUrl } from "../../services/faceDetection";
import {
  enrichFacesWithDescriptors,
  suggestPersonsFromFaceIndex,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import {
  normalizeFaces,
  createDefaultFace,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
} from "../../utils/photoFaces";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";
import { glassPaperSx, glassBackdropSx } from "./glassDialog";
import FaceFramesHelpPopover from "../FaceFramesHelpPopover";

// Редактор разметки лиц фото в стиле iOS (как PhotoPreviewDialog).
export default function PhotoFacesDialog({
  open,
  meta,
  onClose,
  allPeople = [],
  photoPaths,
  setPhotos,
  onSaved,
}) {
  const theme = useTheme();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [allExternal, setAllExternal] = useState([]);
  const [faces, setFaces] = useState([]);
  const [imageSize, setImageSize] = useState(null);
  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faceHelpAnchor, setFaceHelpAnchor] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewFrameRef = useRef(null);

  useEffect(() => {
    if (open) {
      window.externalAPI?.getAll?.().then((data) => setAllExternal(data || []));
    }
  }, [open]);

  useEffect(() => {
    if (meta && open) {
      setFaces(normalizeFaces(meta.faces));
      setImageSize(meta.imageSize ?? null);
      setSelectedFaceId(null);
      setDrawMode(false);
    }
  }, [meta, open]);

  useEffect(() => {
    let mounted = true;
    async function loadPreview() {
      if (!meta?.filename || !open) return;
      setPreviewLoading(true);
      const cachedFull =
        photoPaths?.full?.[meta.id] || photoPaths?.[meta.id] || null;
      if (cachedFull) {
        if (mounted) {
          setPreviewUrl(cachedFull);
          setPreviewLoading(false);
        }
        return;
      }
      try {
        const p = await window.photoAPI.getPath(meta.owner, meta.filename, "webp");
        if (mounted) setPreviewUrl(p);
      } catch (e) {
        console.warn("Preview load failed", e);
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    }
    loadPreview();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, photoPaths, open]);

  const handleFacesChange = (nextFaces) => {
    const normalized = normalizeFaces(nextFaces);
    setFaces(normalized);
    if (
      selectedFaceId &&
      !normalized.some((f) => f.id === selectedFaceId)
    ) {
      setSelectedFaceId(null);
    }
  };

  const handleAddFace = () => {
    const next = [...faces, createDefaultFace()];
    handleFacesChange(next);
    setSelectedFaceId(next[next.length - 1].id);
    setDrawMode(false);
  };

  const handleDetectFaces = async () => {
    if (!meta?.owner || !meta?.filename) return;
    setDetecting(true);
    setDrawMode(false);
    try {
      const detectUrl =
        previewUrl ||
        (await window.photoAPI.getPath(meta.owner, meta.filename, "webp"));
      if (!detectUrl) throw new Error("Не удалось загрузить изображение");

      const { faces: detected, imageSize: size } = await detectFacesFromImageUrl(
        detectUrl,
        { withDescriptors: true, applyNmsFilter: true },
      );

      if (detected.length === 0) {
        addNotification({
          title: "Лица",
          message: "На фото не найдено лиц",
          type: "info",
          category: "photo",
        });
        return;
      }

      const suggested = await suggestPersonsFromFaceIndex(detected);
      setImageSize(size);
      handleFacesChange(suggested);
      setSelectedFaceId(suggested[0]?.id ?? null);
      addNotification({
        title: "Лица",
        message: `Найдено лиц: ${detected.length}`,
        type: "success",
        category: "photo",
      });
    } catch (e) {
      console.error(e);
      addNotification({
        title: "Лица",
        message: e.message || "Ошибка определения лиц",
        type: "error",
        category: "photo",
      });
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (!open || !selectedFaceId) return undefined;
    const handleKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName;
      const isFormField =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;
      if (isFormField) return undefined;
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        const next = faces.filter((f) => f.id !== selectedFaceId);
        handleFacesChange(next);
        setSelectedFaceId(null);
      }
      return undefined;
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedFaceId, faces]);

  const handleSave = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      let facesToSave = normalizeFaces(faces);
      if (previewUrl) {
        facesToSave = await enrichFacesWithDescriptors(
          previewUrl,
          facesToSave,
          imageSize,
        );
      }

      const updatedEntry = {
        ...meta,
        faces: facesToSave,
        imageSize,
        people: syncPeopleFromFaces(facesToSave, meta.people),
        externalPeople: syncExternalPeopleFromFaces(
          facesToSave,
          meta.externalPeople,
        ),
      };

      await window.photoAPI.addOrUpdateOwnerJson(meta.owner, updatedEntry);
      await syncReferencesAfterPhotoSave(
        { owner: meta.owner, id: meta.id },
        facesToSave,
      );

      setPhotos?.((prev) =>
        prev.map((p) => (p.id === meta.id ? updatedEntry : p)),
      );
      onSaved?.(updatedEntry);
      onClose?.();
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлена разметка лиц, ID: ${meta.id ?? null}. Лиц: ${facesToSave.length}`,
        type: "success",
        category: "photo",
      });
    } catch (e) {
      console.error("Save faces failed", e);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: "Ошибка: " + (e.message || e),
        type: "error",
        category: "photo",
      });
    } finally {
      setSaving(false);
    }
  };

  useDialogSaveHotkey({ open, onSave: handleSave, disabled: saving });

  // Стеклянные контролы как на карте.
  const glassBg = theme.palette.glass.surface;
  const glassHover = theme.palette.glass.hover;
  const glassSx = {
    bgcolor: glassBg,
    color: theme.palette.text.primary,
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    "&:hover": {
      backgroundColor: `${glassBg} !important`,
      backgroundImage: `linear-gradient(${glassHover}, ${glassHover})`,
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        backdrop: { sx: glassBackdropSx },
        paper: {
          sx: (t) => ({
            ...glassPaperSx(t),
            width: 920,
            maxWidth: "94vw",
            maxHeight: "94vh",
            display: "flex",
            flexDirection: "column",
          }),
        }
      }}
    >
      <Box sx={{ p: 3, overflowY: "auto" }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 2.5 }}
        >
          Лица
        </Typography>

        <Stack direction="row" spacing={2} sx={{
          alignItems: "stretch"
        }}>
          {/* ФОТО */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: "min(640px, 72vh)",
              borderRadius: "16px",
              overflow: "hidden",
              position: "relative",
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {previewLoading && (
              <CircularProgress sx={{ position: "absolute", zIndex: 1 }} />
            )}
            {previewUrl && (
              <Box
                ref={previewFrameRef}
                sx={{
                  position: "relative",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Превью"
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.currentTarget;
                    if (naturalWidth && naturalHeight) {
                      setImageSize({
                        width: naturalWidth,
                        height: naturalHeight,
                      });
                    }
                  }}
                  sx={{
                    maxHeight: "min(640px, 72vh)",
                    maxWidth: "100%",
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
                    onSelectFace={setSelectedFaceId}
                    onFacesChange={handleFacesChange}
                    drawMode={drawMode}
                    highlightFaceId={selectedFaceId}
                  />
                )}
              </Box>
            )}

            <Stack
              direction="row"
              spacing={1}
              sx={{ position: "absolute", top: 12, left: 12, zIndex: 3 }}
            >
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
                disabled={detecting || !previewUrl}
                onClick={handleDetectFaces}
                sx={{
                  ...glassSx,
                  height: 36,
                  minHeight: 36,
                  borderRadius: "999px",
                  px: 2,
                  fontSize: "0.8125rem",
                  lineHeight: 1.2,
                  fontWeight: 700,
                  "& .MuiButton-startIcon": {
                    mr: 0.5,
                    ml: 0,
                    "& > *:nth-of-type(1)": { fontSize: 16 },
                  },
                }}
              >
                Найти
              </Button>
              <IconButton
                size="small"
                aria-label="Подсказка по разметке лиц"
                onClick={(e) => setFaceHelpAnchor(e.currentTarget)}
                sx={{
                  ...glassSx,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>

            <FaceFramesHelpPopover
              anchorEl={faceHelpAnchor}
              onClose={() => setFaceHelpAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "center" }}
            />
          </Box>

          {/* СПИСОК ЛИЦ */}
          <Box
            sx={{
              width: 340,
              flexShrink: 0,
              height: "min(640px, 72vh)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
              <PhotoFaceFormSection
                theme={theme}
                faces={faces}
                allPeople={allPeople}
                allExternal={allExternal}
                onSelectFace={setSelectedFaceId}
                onFacesChange={handleFacesChange}
                onAddFace={handleAddFace}
              />
              {faces.length === 0 && (
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
                  Нет размеченных лиц. Нажмите «Найти» или нарисуйте рамку.
                </Typography>
              )}
            </Box>

            <DialogActionsBar sx={{ px: 0, pb: 0 }}>
              <DialogActionButton onClick={onClose}>Отмена</DialogActionButton>
              <DialogActionButton
                tone="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </DialogActionButton>
            </DialogActionsBar>
          </Box>
        </Stack>
      </Box>
    </Dialog>
  );
}
