import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Stack,
  InputBase,
  Divider,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CropIcon from "@mui/icons-material/Crop";
import EditIcon from "@mui/icons-material/Edit";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import LocationArrowFillIcon from "../components/svg/LocationArrowFillIcon";
import PhotoCaptionBlock from "../components/PhotoCaptionBlock";
import CustomDatePickerDialog from "../components/CustomDatePickerDialog";
import LocationPickerDialog from "../components/Dialog/LocationPickerDialog";
import { usePhotoInspectorStore } from "../store/usePhotoInspectorStore";
import { useNotificationStore } from "../store/useNotificationStore";
import {
  groupSx,
  RowIcon,
  SettingsRow,
} from "../pages/Page_Settings/settingsUi";
import {
  getPersonLabel,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  normalizeFaces,
  addAttendeeToPhoto,
  removeAttendeeFromPhoto,
} from "../utils/photoFaces";
import PhotoAttendeesList from "../components/PhotoAttendeesList";
import PhotoOwnerField from "../components/PhotoOwnerField";
import { syncReferencesAfterPhotoSave } from "../utils/faceIndex";
import { formatShortAddress } from "../utils/address";
import CustomSwitch from "../components/CustomSwitch";
import {
  inspectorDrawerTransitionProps,
  inspectorPaperSx,
} from "./inspectorPanelTransition";

// Правая панель-инспектор фото. Редактирует метаданные выбранного фото
// (заголовок, описание, люди, дата, место, имя файла). Разметка лиц и превью
// открываются в модальном редакторе (кнопка «Лица и превью»).
export default function PhotoInspectorPanel({ allPeople = [] }) {
  const theme = useTheme();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Список фото и его сеттер берём из стора: активная галерея их регистрирует,
  // поэтому одна панель работает и в глобальной, и в персональной галерее.
  const photos = usePhotoInspectorStore((s) => s.photos);
  const setPhotos = usePhotoInspectorStore((s) => s.setPhotos);
  const open = usePhotoInspectorStore((s) => s.open);
  const selectedId = usePhotoInspectorStore((s) => s.selectedId);
  const draft = usePhotoInspectorStore((s) => s.draft);
  const dirty = usePhotoInspectorStore((s) => s.dirty);
  const pendingPhoto = usePhotoInspectorStore((s) => s.pendingPhoto);
  const actions = usePhotoInspectorStore((s) => s.actions);
  const toggle = usePhotoInspectorStore((s) => s.toggle);
  const update = usePhotoInspectorStore((s) => s.update);
  const setLocation = usePhotoInspectorStore((s) => s.setLocation);
  const markSaved = usePhotoInspectorStore((s) => s.markSaved);
  const resolvePending = usePhotoInspectorStore((s) => s.resolvePending);
  const resetDraft = usePhotoInspectorStore((s) => s.resetDraft);

  const [allExternal, setAllExternal] = useState([]);
  const [uniqueTags, setUniqueTags] = useState([]);
  const [saving, setSaving] = useState(false);
  // Очередь автосохранений: гарантирует последовательную запись на диск.
  const saveChainRef = useRef(Promise.resolve());
  const [rename, setRename] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [previewThumbUrl, setPreviewThumbUrl] = useState("");

  const photo = useMemo(
    () => photos.find((p) => p.id === selectedId) || null,
    [photos, selectedId],
  );

  // Свежие внешние сущности и теги для автодополнения.
  useEffect(() => {
    window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
    window.photoAPI?.getGlobalHashtags?.().then((tags) => setUniqueTags(tags || []));
  }, []);

  // Держим черновик синхронным с актуальными данными фото, пока нет правок.
  useEffect(() => {
    if (photo && !dirty) resetDraft(photo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, dirty]);

  useEffect(() => {
    if (photo) setNewFilename(photo.filename || "");
  }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draft) {
      setGeoEnabled(false);
      return;
    }
    const hasGeoData =
      Boolean((draft.locationName || "").trim()) ||
      draft.lat != null ||
      draft.lng != null;
    setGeoEnabled(hasGeoData);
  }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Для точек без названия места (старые фото, неудачный reverse при
  // сохранении) подтягиваем адрес через reverse-геокодинг.
  useEffect(() => {
    if (!draft) return undefined;
    const la = Number(draft.lat);
    const ln = Number(draft.lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return undefined;
    if ((draft.locationName || "").trim()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const rev = await window.geoAPI?.reverse?.(la, ln);
        const name = formatShortAddress(rev) || rev?.name || "";
        if (cancelled || !name) return;
        const cur = usePhotoInspectorStore.getState().draft;
        if (
          !cur ||
          (cur.locationName || "").trim() ||
          Number(cur.lat) !== la ||
          Number(cur.lng) !== ln
        ) {
          return;
        }
        update({ locationName: name });
        scheduleSave();
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id, draft?.lat, draft?.lng, draft?.locationName]);

  useEffect(() => {
    let mounted = true;

    async function loadPreviewThumb() {
      if (!photo?.owner || !photo?.filename) {
        if (mounted) setPreviewThumbUrl("");
        return;
      }
      try {
        const path = await window.photoAPI?.getPath?.(
          photo.owner,
          photo.filename,
          "thumbs",
        );
        if (mounted) setPreviewThumbUrl(path || "");
      } catch {
        if (mounted) setPreviewThumbUrl("");
      }
    }

    loadPreviewThumb();
    return () => {
      mounted = false;
    };
  }, [photo?.owner, photo?.filename]);

  const handleSave = async () => {
    // Всегда берём актуальный черновик из стора: позволяет сохранять
    // сразу после update() (например, подтверждение геометки в модалке).
    const draft = usePhotoInspectorStore.getState().draft;
    if (!photo || !draft) return;
    setSaving(true);
    try {
      const oldData = photo;
      const extractedHashtags = draft.description
        ? (draft.description.match(/#[\p{L}\d_]+/gu) || []).map((t) =>
            t.toLowerCase(),
          )
        : [];
      const finalFilename = rename
        ? newFilename || oldData.filename
        : oldData.filename;
      const ownerChanged = String(draft.owner) !== String(oldData.owner);
      const filenameChanged =
        String(finalFilename) !== String(oldData.filename);

      if (ownerChanged) {
        await window.fileAPI.moveFile(
          oldData.owner,
          draft.owner,
          oldData.filename,
          finalFilename,
        );
      } else if (filenameChanged) {
        await window.fileAPI.renameFile?.(
          oldData.owner,
          oldData.filename,
          finalFilename,
        );
      }

      const faces = normalizeFaces(draft.faces ?? oldData.faces);
      const updatedEntry = {
        ...oldData,
        title: draft.title,
        description: draft.description,
        owner: draft.owner,
        people: syncPeopleFromFaces(faces, draft.people),
        externalPeople: syncExternalPeopleFromFaces(
          faces,
          draft.externalPeople,
        ),
        datePhoto: draft.datePhoto,
        locationName: draft.locationName?.trim() || null,
        lat: draft.lat,
        lng: draft.lng,
        filename: finalFilename,
        hashtags: extractedHashtags,
        faces,
      };

      if (ownerChanged || filenameChanged) {
        await window.photoAPI.removeFromOwnerJson(oldData.owner, {
          filename: oldData.filename,
          id: oldData.id,
        });
      }
      await window.photoAPI.addOrUpdateOwnerJson(draft.owner, updatedEntry);
      await syncReferencesAfterPhotoSave(
        { owner: draft.owner, id: updatedEntry.id },
        faces,
      );

      setPhotos?.((prev) =>
        prev.map((p) => (p.id === oldData.id ? updatedEntry : p)),
      );
      actions.onSaved?.(updatedEntry, { ownerChanged, filenameChanged });
      markSaved();
      setRename(false);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлено фото ID: ${updatedEntry.id ?? null}.\nИмя файла: ${updatedEntry.filename ?? ""}`,
        type: "success",
        category: "photo",
      });
      return updatedEntry;
    } catch (e) {
      console.error("Save failed", e);
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

  // Автосохранение: запускает handleSave последовательно (без гонок записи).
  const scheduleSave = () => {
    saveChainRef.current = saveChainRef.current.then(() => handleSave());
    return saveChainRef.current;
  };

  // ESC — откат поля к сохранённому значению (без записи).
  const revertField = (name, value) =>
    usePhotoInspectorStore.getState().revertField(name, value);

  // Смена фото при наличии правок: сначала автосохраняем текущее, потом уходим.
  useEffect(() => {
    if (!pendingPhoto) return;
    (async () => {
      try {
        await scheduleSave();
      } finally {
        resolvePending();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPhoto]);

  // Сохранение только геометки из модалки карты — отдельно от прочих правок.
  const handleSaveLocation = async ({ lat, lng, name }) => {
    if (!photo) return;
    const hasPoint = lat != null && lng != null;
    const nextLat = hasPoint ? lat : null;
    const nextLng = hasPoint ? lng : null;
    const nextName = hasPoint ? name || "" : "";
    try {
      const updatedEntry = {
        ...photo,
        lat: nextLat,
        lng: nextLng,
        locationName: nextName.trim() || null,
      };
      await window.photoAPI.addOrUpdateOwnerJson(photo.owner, updatedEntry);
      setPhotos?.((prev) =>
        prev.map((p) => (p.id === photo.id ? updatedEntry : p)),
      );
      actions.onSaved?.(updatedEntry, {});
      setLocation({ lat: nextLat, lng: nextLng, locationName: nextName });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлена геометка фото ID: ${updatedEntry.id ?? null}.`,
        type: "success",
        category: "photo",
      });
      return true;
    } catch (e) {
      console.error("Save location failed", e);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: "Ошибка: " + (e.message || e),
        type: "error",
        category: "photo",
      });
      return false;
    }
  };


  const locationText = draft?.locationName?.trim()
    ? draft.locationName
    : draft?.lat != null && draft?.lng != null
      ? `${Number(draft.lat).toFixed(5)}, ${Number(draft.lng).toFixed(5)}`
      : "";

  const facesCount = normalizeFaces(photo?.faces).length;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={toggle}
        variant="persistent"
        {...inspectorDrawerTransitionProps}
        slotProps={{
          paper: {
            sx: { top: 50, height: "calc(100% - 50px)", ...inspectorPaperSx },
          }
        }}
      >
        <Box
          sx={{
            width: 340,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!photo || !draft ? (
            <Box sx={{ p: "10px" }}>
              <Box sx={groupSx}>
                <SettingsRow
                  icon={
                    <RowIcon bg="gray">
                      <PhotoLibraryIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Фото не выбрано"
                  subtitle="Выберите фото в галерее, чтобы посмотреть сведения."
                  multiline
                />
              </Box>
            </Box>
          ) : (
            <>
              <Box sx={{ flexGrow: 1, overflowY: "auto", p: "10px" }}>
                <Stack spacing={1}>
                  <PhotoCaptionBlock
                    title={draft.title ?? ""}
                    description={draft.description ?? ""}
                    onTitleChange={(val) => update({ title: val })}
                    onDescriptionChange={(val) => update({ description: val })}
                    tagSuggestions={uniqueTags}
                    onTitleBlur={() => {
                      if (usePhotoInspectorStore.getState().dirty) scheduleSave();
                    }}
                    onDescriptionBlur={() => {
                      if (usePhotoInspectorStore.getState().dirty) scheduleSave();
                    }}
                    onTitleEscape={() => revertField("title", photo.title ?? "")}
                    onDescriptionEscape={() =>
                      revertField("description", photo.description ?? "")
                    }
                  />

                  <PhotoOwnerField
                    allPeople={allPeople}
                    ownerId={draft.owner ?? null}
                    label="Владелец (папка) / Люди на фото"
                    onChange={(id) => {
                      update({ owner: id });
                      scheduleSave();
                    }}
                    onInteractionEnd={() => {
                      if (usePhotoInspectorStore.getState().dirty) scheduleSave();
                    }}
                  />

                  <PhotoAttendeesList
                    label=""
                    allPeople={allPeople}
                    allExternal={allExternal}
                    peopleIds={draft.people || []}
                    externalPeopleIds={draft.externalPeople || []}
                    onAdd={(option) => {
                      const next = addAttendeeToPhoto(
                        {
                          people: draft.people,
                          externalPeople: draft.externalPeople,
                          faces: draft.faces,
                        },
                        option,
                      );
                      update(next);
                      scheduleSave();
                    }}
                    onRemove={(option) => {
                      const next = removeAttendeeFromPhoto(
                        {
                          people: draft.people,
                          externalPeople: draft.externalPeople,
                          faces: draft.faces,
                        },
                        { kind: option.kind, id: option.id },
                      );
                      update(next);
                      scheduleSave();
                    }}
                    onInteractionEnd={() => {
                      if (usePhotoInspectorStore.getState().dirty) scheduleSave();
                    }}
                  />

                  <Box sx={{ mb: "12px" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 700,
                        display: "block",
                        mb: "4px",
                      }}
                    >
                      Дата и место
                    </Typography>

                      <Box
                        sx={{
                          borderRadius: "12px",
                          bgcolor: (t) =>
                            t.palette.mode === "dark"
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          onClick={() => setDatePickerOpen(true)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: "12px",
                            py: "9px",
                            gap: 1,
                            cursor: "pointer",
                          }}
                        >
                          <Stack direction="row" spacing="12px" sx={{ alignItems: "center" }}>
                            <CalendarMonthIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                            <Typography
                              sx={{
                                fontSize: "0.815rem",
                                fontWeight: 600,
                                lineHeight: 1.35,
                                color: "text.primary",
                              }}
                            >
                              Дата снимка
                            </Typography>
                          </Stack>

                          <Typography
                            sx={{
                              fontSize: "0.815rem",
                              fontWeight: 500,
                              lineHeight: 1.35,
                              color: draft.datePhoto ? "text.primary" : "text.secondary",
                            }}
                          >
                            {draft.datePhoto || "Указать дату"}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          mt: "12px",
                          borderRadius: "12px",
                          bgcolor: (t) =>
                            t.palette.mode === "dark"
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          overflow: "hidden",
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
                            <LocationArrowFillIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                            <Typography
                              sx={{
                                fontSize: "0.815rem",
                                fontWeight: 600,
                                lineHeight: 1.35,
                                color: "text.primary",
                              }}
                            >
                              Геопозиция
                            </Typography>
                          </Stack>
                          <CustomSwitch
                            checked={geoEnabled}
                            onChange={async (e) => {
                              const nextChecked = e.target.checked;
                              if (nextChecked) {
                                setGeoEnabled(true);
                                return;
                              }

                              const prev = {
                                lat: draft.lat ?? null,
                                lng: draft.lng ?? null,
                                locationName: draft.locationName || "",
                              };

                              setGeoEnabled(false);
                              setLocation({ lat: null, lng: null, locationName: "" });
                              const saved = await handleSaveLocation({
                                lat: null,
                                lng: null,
                                name: "",
                              });
                              if (!saved) {
                                setGeoEnabled(true);
                                setLocation(prev);
                              }
                            }}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: theme.palette.error.main,
                              },
                            }}
                          />
                        </Stack>

                        {geoEnabled && (
                          <>
                            <Divider
                              sx={{
                                opacity: 0.35,
                                mx: 1.25,
                                borderColor: "divider",
                              }}
                            />
                            <Box
                              onClick={() => setLocationPickerOpen(true)}
                              sx={{
                                pl: "42px",
                                pr: "12px",
                                py: "9px",
                                cursor: "pointer",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.815rem",
                                  lineHeight: 1.35,
                                  fontWeight: 500,
                                  color: locationText ? "text.primary" : "text.secondary",
                                }}
                              >
                                {locationText || "Введите место"}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 700,
                        display: "block",
                        mb: "4px",
                      }}
                    >
                      Имя файла, лица и превью
                    </Typography>
                    <Box
                      sx={{
                        borderRadius: "12px",
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        overflow: "hidden",
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
                          <InsertDriveFileOutlinedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                          <Typography
                            sx={{
                              fontSize: "0.815rem",
                              fontWeight: 600,
                              lineHeight: 1.35,
                              color: "text.primary",
                            }}
                          >
                            Имя файла на диске
                          </Typography>
                        </Stack>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (rename) {
                              setRename(false);
                              return;
                            }
                            setNewFilename(photo.filename || "");
                            setRename(true);
                          }}
                          sx={{
                            p: 0,
                            bgcolor: rename ? "primary.main" : "transparent",
                            color: rename
                              ? "primary.contrastText"
                              : "action.active",
                          }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>

                      {rename && (
                        <>
                          <Divider
                            sx={{
                              opacity: 0.35,
                              mx: 1.25,
                              borderColor: "divider",
                            }}
                          />
                          <Box
                            sx={{
                              pl: "42px",
                              pr: "12px",
                              py: "9px",
                            }}
                          >
                            <InputBase
                              autoFocus
                              fullWidth
                              value={newFilename}
                              onChange={(e) => setNewFilename(e.target.value)}
                              onBlur={() => {
                                scheduleSave();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                  setRename(false);
                                } else if (e.key === "Escape") {
                                  e.stopPropagation();
                                  setNewFilename(photo.filename || "");
                                  setRename(false);
                                }
                              }}
                              sx={{
                                width: "100%",
                                fontSize: "0.815rem",
                                lineHeight: 1.35,
                                fontWeight: 500,
                                fontFamily: "monospace",
                                color: "text.primary",
                                "& input": { p: 0 },
                              }}
                            />
                          </Box>
                        </>
                      )}
                    </Box>

                    <Stack spacing="12px" sx={{ mt: "12px" }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={async () => {
                        let target = photo;
                        if (usePhotoInspectorStore.getState().dirty) {
                          const saved = await scheduleSave();
                          if (!saved) return;
                          target = saved;
                        }
                        actions.openFaces?.(target);
                      }}
                      sx={{
                        width: "100%",
                        border: "none",
                        textAlign: "left",
                        borderRadius: "12px",
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        px: "12px",
                        py: "9px",
                        cursor: "pointer",
                      }}
                    >
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Stack direction="row" spacing="12px" sx={{ alignItems: "center" }}>
                          <FaceRetouchingNaturalIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                          <Typography
                            sx={{
                              fontSize: "0.815rem",
                              fontWeight: 600,
                              lineHeight: 1.35,
                              color: "text.primary",
                            }}
                          >
                            Лица
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            fontSize: "0.815rem",
                            fontWeight: 500,
                            lineHeight: 1.35,
                            color: "text.secondary",
                          }}
                        >
                          {facesCount}
                        </Typography>
                      </Stack>
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      onClick={async () => {
                        let target = photo;
                        if (usePhotoInspectorStore.getState().dirty) {
                          const saved = await scheduleSave();
                          if (!saved) return;
                          target = saved;
                        }
                        actions.openPreview?.(target);
                      }}
                      sx={{
                        width: "100%",
                        border: "none",
                        textAlign: "left",
                        borderRadius: "12px",
                        bgcolor: (t) =>
                          t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        px: "12px",
                        py: "9px",
                        cursor: "pointer",
                      }}
                    >
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Stack direction="row" spacing="12px" sx={{ alignItems: "center" }}>
                          <CropIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                          <Typography
                            sx={{
                              fontSize: "0.815rem",
                              fontWeight: 600,
                              lineHeight: 1.35,
                              color: "text.primary",
                            }}
                          >
                            Превью
                          </Typography>
                        </Stack>
                        <Box
                          component="img"
                          src={previewThumbUrl || undefined}
                          alt=""
                          sx={{
                            width: "auto",
                            height: 18,
                            borderRadius: "4px",
                            minWidth: 18,
                            bgcolor: "action.hover",
                            objectFit: "cover",
                          }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                  </Box>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={draft?.datePhoto || ""}
        format="YYYY-MM-DD"
        showTime={true}
        onSave={(d) => {
          update({ datePhoto: d });
          setDatePickerOpen(false);
          scheduleSave();
        }}
      />

      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initial={
          draft?.lat != null && draft?.lng != null
            ? { lat: draft.lat, lng: draft.lng }
            : null
        }
        initialQuery={draft?.locationName || ""}
        onSelect={({ lat, lng, name }) => {
          // Геометку сохраняем сразу из модалки; в панели она обновляется,
          // но не считается отслеживаемым изменением (dirty не выставляется).
          handleSaveLocation({ lat, lng, name });
        }}
      />
    </>
  );
}
