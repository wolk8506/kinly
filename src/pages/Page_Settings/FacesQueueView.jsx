import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Stack,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Chip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhotoFaceOverlay from "../../components/PhotoFaceOverlay";
import FaceFramesHelpPopover from "../../components/FaceFramesHelpPopover";
import { PhotoFaceFormSection } from "../../components/PhotoFaceMarkupBlocks";
import AppButton from "../../components/AppButton";
import {
  buildReviewQueue,
  buildNoFacesQueue,
  getPendingFaceIds,
  normalizeFaces,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  faceNeedsReview,
  createDefaultFace,
} from "../../utils/photoFaces";
import { detectFacesFromImageUrl } from "../../services/faceDetection";
import {
  suggestPersonsFromFaceIndex,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import { useFaceReviewStore } from "../../store/useFaceReviewStore";
import { useNotificationStore } from "../../store/useNotificationStore";

async function persistPhotoFaces(
  currentItem,
  nextFaces,
  allPhotos,
  { dismissFromQueue = false } = {},
) {
  const normalized = normalizeFaces(nextFaces);
  const existing = allPhotos.find(
    (p) => p.id === currentItem.photoId && p.owner === currentItem.owner,
  );

  const updatedEntry = {
    ...existing,
    id: currentItem.photoId,
    filename: currentItem.filename,
    title: currentItem.title,
    owner: currentItem.owner,
    imageSize: currentItem.imageSize,
    faces: normalized,
    people: syncPeopleFromFaces(normalized, existing?.people || []),
    externalPeople: syncExternalPeopleFromFaces(
      normalized,
      existing?.externalPeople || [],
    ),
    faceScanNoFaces: dismissFromQueue
      ? false
      : normalized.length === 0
        ? existing?.faceScanNoFaces
        : false,
  };

  await window.photoAPI.addOrUpdateOwnerJson(currentItem.owner, updatedEntry);
  if (normalized.length > 0) {
    await syncReferencesAfterPhotoSave(
      { owner: currentItem.owner, id: currentItem.photoId },
      normalized,
    );
  }

  return updatedEntry;
}

export default function FacesQueueView({
  mode = "review",
  allPeople: allPeopleProp = [],
  onExit,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isNoFaces = mode === "noFaces";

  const setPendingCount = useFaceReviewStore((s) => s.setPendingCount);
  const setNoFacesCount = useFaceReviewStore((s) => s.setNoFacesCount);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [allPeople, setAllPeople] = useState(allPeopleProp);
  const [allExternal, setAllExternal] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const [queue, setQueue] = useState([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [faceIndex, setFaceIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [autoNextPhoto, setAutoNextPhoto] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [faceHelpAnchor, setFaceHelpAnchor] = useState(null);
  const previewFrameRef = useRef(null);
  const queueRef = useRef([]);
  const photoIndexRef = useRef(0);
  const persistDebounceRef = useRef(null);

  queueRef.current = queue;
  photoIndexRef.current = photoIndex;

  const currentItem = queue[photoIndex] || null;
  const currentFaces = currentItem?.faces || [];
  const allFaceIds = useMemo(
    () => currentFaces.map((f) => f.id),
    [currentFaces],
  );
  const currentFaceId = allFaceIds[faceIndex] ?? null;

  const syncCount = useCallback(
    (nextQueue) => {
      if (isNoFaces) {
        setNoFacesCount(nextQueue.length);
      } else {
        setPendingCount(
          nextQueue.reduce(
            (sum, item) => sum + item.pendingFaceIds.length,
            0,
          ),
        );
      }
    },
    [isNoFaces, setNoFacesCount, setPendingCount],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const photos = await window.photoAPI.getAllGlobal();
      setAllPhotos(photos);
      const nextQueue = isNoFaces
        ? buildNoFacesQueue(photos)
        : buildReviewQueue(photos);
      setQueue(nextQueue);
      setPhotoIndex(0);
      setFaceIndex(0);
      setDrawMode(false);
      syncCount(nextQueue);
    } finally {
      setLoading(false);
    }
  }, [isNoFaces, syncCount]);

  useEffect(() => {
    if (allPeopleProp.length === 0) {
      window.peopleAPI
        ?.getAll?.()
        .then(setAllPeople)
        .catch(() => {});
    } else {
      setAllPeople(allPeopleProp);
    }
    window.externalAPI
      ?.getAll?.()
      .then(setAllExternal)
      .catch(() => {});
    loadQueue();
  }, [allPeopleProp, loadQueue]);

  useEffect(() => {
    if (!currentItem) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    window.photoAPI
      .getPath(currentItem.owner, currentItem.filename, "webp")
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [currentItem?.owner, currentItem?.filename]);

  const totalPending = useMemo(
    () =>
      isNoFaces
        ? queue.length
        : queue.reduce((sum, item) => sum + item.pendingFaceIds.length, 0),
    [queue, isNoFaces],
  );

  const cancelLayoutPersist = () => {
    if (persistDebounceRef.current) {
      clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = null;
    }
  };

  const flushLayoutPersist = useCallback(async () => {
    cancelLayoutPersist();
    const item = queueRef.current[photoIndexRef.current];
    if (!item) return;
    try {
      const allPhotos = await window.photoAPI.getAllGlobal();
      await persistPhotoFaces(item, item.faces, allPhotos);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const scheduleLayoutPersist = () => {
    cancelLayoutPersist();
    persistDebounceRef.current = setTimeout(() => {
      persistDebounceRef.current = null;
      flushLayoutPersist();
    }, 600);
  };

  useEffect(
    () => () => {
      flushLayoutPersist();
    },
    [flushLayoutPersist],
  );

  const updateQueueFaces = (nextFaces, imageSize) => {
    const normalized = normalizeFaces(nextFaces);
    const nextQueue = [...queue];
    nextQueue[photoIndex] = {
      ...nextQueue[photoIndex],
      faces: normalized,
      ...(isNoFaces ? {} : { pendingFaceIds: getPendingFaceIds(normalized) }),
      imageSize: imageSize || nextQueue[photoIndex].imageSize,
    };
    return nextQueue;
  };

  const commitQueue = (nextQueue) => {
    setQueue(nextQueue);
    syncCount(nextQueue);
  };

  const removeCurrentFromQueue = (currentQueue = queue) => {
    const nextQueue = currentQueue.filter((_, i) => i !== photoIndex);
    commitQueue(nextQueue);

    if (nextQueue.length === 0) {
      setPhotoIndex(0);
      setFaceIndex(0);
      setDrawMode(false);
      return nextQueue;
    }

    setPhotoIndex(Math.min(photoIndex, nextQueue.length - 1));
    setFaceIndex(0);
    setDrawMode(false);
    return nextQueue;
  };

  const advanceFromCurrentPhoto = async ({ dismiss = false } = {}) => {
    if (!currentItem) return;

    cancelLayoutPersist();
    setSaving(true);
    try {
      const allPhotos = await window.photoAPI.getAllGlobal();
      await persistPhotoFaces(currentItem, currentItem.faces || [], allPhotos, {
        dismissFromQueue: dismiss,
      });
      removeCurrentFromQueue();
    } catch (e) {
      console.error(e);
      addNotification({
        title: "Фото без лиц",
        message: e.message || "Не удалось сохранить",
        type: "error",
        category: "faceReview",
      });
    } finally {
      setSaving(false);
    }
  };

  const goToNextPhoto = async () => {
    await flushLayoutPersist();
    if (queue.length === 0) return;
    if (photoIndex < queue.length - 1) {
      setPhotoIndex(photoIndex + 1);
      setFaceIndex(0);
    }
    setDrawMode(false);
  };

  const goToPrevPhoto = async () => {
    await flushLayoutPersist();
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
      setFaceIndex(0);
    }
    setDrawMode(false);
  };

  const afterSave = async (nextFaces, { goNextPhoto = false } = {}) => {
    cancelLayoutPersist();
    const allPhotos = await window.photoAPI.getAllGlobal();
    await persistPhotoFaces(currentItem, nextFaces, allPhotos);
    const nextQueue = updateQueueFaces(nextFaces);
    commitQueue(nextQueue);

    const normalized = normalizeFaces(nextFaces);

    if (isNoFaces) {
      const currentIdx = normalized.findIndex((f) => f.id === currentFaceId);
      let nextFaceIdx = -1;
      for (let i = currentIdx + 1; i < normalized.length; i += 1) {
        if (faceNeedsReview(normalized[i])) {
          nextFaceIdx = i;
          break;
        }
      }
      if (nextFaceIdx === -1) {
        for (let i = 0; i < currentIdx; i += 1) {
          if (faceNeedsReview(normalized[i])) {
            nextFaceIdx = i;
            break;
          }
        }
      }
      if (nextFaceIdx >= 0) {
        setFaceIndex(nextFaceIdx);
      } else if (currentIdx === -1 && normalized.length > 0) {
        setFaceIndex(normalized.length - 1);
      }
      return;
    }

    const pendingOnPhoto = getPendingFaceIds(normalized);

    if (goNextPhoto || (autoNextPhoto && pendingOnPhoto.length === 0)) {
      if (photoIndex < nextQueue.length - 1) {
        setPhotoIndex(photoIndex + 1);
        setFaceIndex(0);
      }
      setDrawMode(false);
      return;
    }

    if (faceIndex >= normalized.length) {
      setFaceIndex(Math.max(0, normalized.length - 1));
    }
  };

  const handleFacesChange = (nextFaces) => {
    commitQueue(updateQueueFaces(nextFaces));
    scheduleLayoutPersist();
  };

  const handlePreviewLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight || !currentItem) return;
    const imageSize = { width: naturalWidth, height: naturalHeight };
    if (
      currentItem.imageSize?.width === naturalWidth &&
      currentItem.imageSize?.height === naturalHeight
    ) {
      return;
    }
    const nextQueue = [...queue];
    nextQueue[photoIndex] = { ...nextQueue[photoIndex], imageSize };
    setQueue(nextQueue);
  };

  const handleDetectFaces = async () => {
    if (!previewUrl || !currentItem) return;
    setDetecting(true);
    setDrawMode(false);
    try {
      const { faces: detected } = await detectFacesFromImageUrl(previewUrl);
      if (detected.length === 0) {
        addNotification({
          title: "Лица",
          message: isNoFaces
            ? "На фото не найдено лиц"
            : "На фото не найдено новых лиц",
          type: "info",
          category: "faceReview",
        });
        return;
      }
      const suggestedDetected = await suggestPersonsFromFaceIndex(detected);
      const nextFaces = normalizeFaces(suggestedDetected);
      await afterSave(nextFaces);
      setFaceIndex(
        isNoFaces ? 0 : Math.max(0, nextFaces.length - suggestedDetected.length),
      );
      addNotification({
        title: "Лица",
        message: isNoFaces
          ? `Найдено лиц: ${detected.length}`
          : `Добавлено лиц: ${detected.length}`,
        type: "success",
        category: "faceReview",
      });
    } catch (e) {
      addNotification({
        title: "Лица",
        message: e.message || "Ошибка определения лиц",
        type: "error",
        category: "faceReview",
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleDeleteFace = async (faceId) => {
    setSaving(true);
    try {
      const nextFaces = currentFaces.filter((f) => f.id !== faceId);
      await afterSave(nextFaces);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!currentFaceId) return undefined;

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
        handleDeleteFace(currentFaceId);
      }
      return undefined;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentFaceId, handleDeleteFace]);

  const handleAddFace = () => {
    if (!currentItem) return;
    const nextFaces = normalizeFaces([
      ...(currentItem.faces || []),
      createDefaultFace(),
    ]);
    handleFacesChange(nextFaces);
    setFaceIndex(Math.max(0, nextFaces.length - 1));
    setDrawMode(false);
  };

  const handleSkipPhoto = () => advanceFromCurrentPhoto({ dismiss: true });

  const handleExit = async () => {
    await flushLayoutPersist();
    if (!isNoFaces && totalPending === 0 && queue.length > 0) {
      addNotification({
        title: "Очередь проверки",
        message: "Все лица проверены",
        type: "success",
        category: "faceReview",
      });
    }
    onExit?.();
  };

  const cardSx = {
    borderRadius: "16px",
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: isDark ? alpha(theme.palette.background.paper, 0.6) : "#fff",
    overflow: "hidden",
  };

  const mapControlSx = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.text.primary,
    "&.MuiIconButton-root:hover:not(.Mui-disabled)": {
      bgcolor: `${theme.palette.glass.hover} !important`,
    },
    "&.Mui-disabled": { color: theme.palette.text.disabled },
  };

  const title = isNoFaces ? "Фото без лиц" : "Проверка лиц";
  const subtitle = isNoFaces
    ? "Снимки, на которых сканирование не нашло лиц"
    : "Отметьте и подпишите найденные лица";
  const emptyText = isNoFaces
    ? "Нет фото, где сканирование не нашло лиц."
    : "Нет лиц, ожидающих проверки.";

  return (
    <Box
      sx={{
        height: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          px: 1,
          py: 1.5,
          flexShrink: 0
        }}>
        <Tooltip title="Назад в настройки">
          <IconButton
            onClick={handleExit}
            size="small"
            sx={{ borderRadius: "8px" }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "8px",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaceRetouchingNaturalIcon sx={{ fontSize: 16 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: "0.8125rem",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              lineHeight: 1.2
            }}>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {!loading && queue.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{
            alignItems: "center"
          }}>
            {(currentItem?.title || currentItem?.filename) && (
              <Chip
                size="small"
                label={currentItem?.title || currentItem?.filename}
                sx={{
                  height: 24,
                  maxWidth: 220,
                  borderRadius: "999px",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  color: "text.secondary",
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              />
            )}
            <Chip
              size="small"
              label={`Фото ${photoIndex + 1} из ${queue.length}`}
              sx={{
                height: 24,
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "0.75rem",
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                color: "text.secondary",
              }}
            />
            <Chip
              size="small"
              label={
                isNoFaces
                  ? `В очереди: ${queue.length}`
                  : `Без подписи: ${totalPending}`
              }
              sx={{
                height: 24,
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "0.75rem",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            />
          </Stack>
        )}
      </Stack>

      {loading ? (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={32} />
        </Box>
      ) : queue.length === 0 ? (
        <Box
          sx={{
            ...cardSx,
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaceRetouchingNaturalIcon sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: "0.95rem"
            }}>
            {emptyText}
          </Typography>
          <AppButton preset="secondary" onClick={handleExit} sx={{ px: 3 }}>
            Назад в настройки
          </AppButton>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0, display: "flex", gap: 1.5 }}>
          <Box
            sx={{
              ...cardSx,
              width: 400,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                minHeight: 0,
                overflowY: "auto",
                px: 2,
                py: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              {!isNoFaces && totalPending === 0 && (
                <Alert
                  severity="success"
                  sx={{ py: 0.2, fontSize: "0.8rem", borderRadius: "12px" }}
                >
                  Все лица подписаны.
                </Alert>
              )}

              <PhotoFaceFormSection
                theme={theme}
                faces={currentFaces}
                allPeople={allPeople}
                allExternal={allExternal}
                onSelectFace={(id) => {
                  const idx = allFaceIds.indexOf(id);
                  if (idx >= 0) setFaceIndex(idx);
                }}
                onFacesChange={(nextFaces) => {
                  afterSave(nextFaces).catch((e) => console.error(e));
                }}
                onAddFace={handleAddFace}
              />
              {currentFaces.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.85rem",
                    py: 2,
                    textAlign: "center"
                  }}>
                  {isNoFaces
                    ? "На снимке нет рамок. Нажмите «Найти» или «Пропустить»."
                    : "Нет рамок. Нажмите «Найти» или добавьте лицо вручную."}
                </Typography>
              )}
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                p: 1.5,
                borderTop: `1px solid ${theme.palette.divider}`,
                flexShrink: 0
              }}>
              <AppButton
                preset="secondary"
                startIcon={<NavigateBeforeIcon sx={{ fontSize: 16 }} />}
                onClick={goToPrevPhoto}
                disabled={photoIndex === 0 || saving}
              >
                Назад
              </AppButton>

              <AppButton
                preset="secondary"
                endIcon={<NavigateNextIcon sx={{ fontSize: 16 }} />}
                onClick={goToNextPhoto}
                disabled={photoIndex >= queue.length - 1 || saving}
              >
                Далее
              </AppButton>

              {isNoFaces ? (
                <AppButton
                  preset="secondary"
                  onClick={handleSkipPhoto}
                  disabled={saving || queue.length === 0}
                  sx={{ ml: "auto" }}
                >
                  Пропустить
                </AppButton>
              ) : (
                <Tooltip title="Авто-переход к следующему фото после подписи всех лиц">
                  <span>
                    <AppButton
                      preset={autoNextPhoto ? "primary" : "secondary"}
                      disableElevation
                      onClick={() => setAutoNextPhoto((v) => !v)}
                      sx={{ ml: "auto" }}
                    >
                      Автопереход
                    </AppButton>
                  </span>
                </Tooltip>
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              ...cardSx,
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                position: "relative",
                flexGrow: 1,
                minHeight: 0,
                width: "100%",
                bgcolor: isDark ? alpha("#000", 0.35) : alpha("#000", 0.03),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                p: 0.5,
              }}
            >
              {previewUrl && (
                <Box
                  ref={previewFrameRef}
                  sx={{
                    position: "relative",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    display: "flex",
                  }}
                >
                  <Box
                    component="img"
                    src={previewUrl}
                    alt=""
                    onLoad={handlePreviewLoad}
                    sx={{
                      maxHeight: "calc(100vh - 160px)",
                      maxWidth: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  {currentItem?.imageSize?.width > 0 && (
                    <PhotoFaceOverlay
                      faces={currentFaces}
                      imageSize={currentItem.imageSize}
                      imageFrameRef={previewFrameRef}
                      allPeople={allPeople}
                      allExternal={allExternal}
                      editable
                      selectedFaceId={currentFaceId}
                      onSelectFace={(id) => {
                        const idx = allFaceIds.indexOf(id);
                        if (idx >= 0) setFaceIndex(idx);
                      }}
                      onFacesChange={handleFacesChange}
                      drawMode={drawMode}
                      highlightFaceId={currentFaceId}
                    />
                  )}

                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 10,
                      zIndex: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      borderRadius: "16px",
                      overflow: "hidden",
                      bgcolor: theme.palette.glass.surface,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    <Tooltip title="Найти лица" placement="left">
                      <span>
                        <IconButton
                          size="small"
                          aria-label="Найти лица на фото"
                          disabled={detecting || saving}
                          onClick={handleDetectFaces}
                          sx={mapControlSx}
                        >
                          {detecting ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <FaceRetouchingNaturalIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Управление рамками" placement="left">
                      <IconButton
                        size="small"
                        aria-label="Подсказка по разметке лиц"
                        onClick={(e) => setFaceHelpAnchor(e.currentTarget)}
                        sx={mapControlSx}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <FaceFramesHelpPopover
                    anchorEl={faceHelpAnchor}
                    onClose={() => setFaceHelpAnchor(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    arrowSide="right"
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
