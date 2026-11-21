import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Stack,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocationPickerDialog from "./LocationPickerDialog";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import CustomSwitch from "../../components/CustomSwitch";
import PhotoCaptionBlock from "../PhotoCaptionBlock";
import PhotoOwnerField from "../PhotoOwnerField";
import PhotoAttendeesList from "../PhotoAttendeesList";
import LocationArrowFillIcon from "../svg/LocationArrowFillIcon";
import PhotoBadgePlusIcon from "../svg/PhotoBadgePlusIcon";
import ExifReader from "exifreader";
import { usePhotoFaceMarkup } from "../../hooks/usePhotoFaceMarkup";
import {
  PhotoFacePreviewBlock,
  PhotoFaceFormSection,
} from "../PhotoFaceMarkupBlocks";
import {
  PhotoThumbCropPanel,
  PhotoThumbCropToolbar,
} from "../PhotoThumbCropTools";
import { cropToThumbWebp } from "../../utils/thumbCrop";
import { formatShortAddress } from "../../utils/address";
import {
  enrichFacesWithDescriptors,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import {
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  normalizeFaces,
  addAttendeeToPhoto,
  removeAttendeeFromPhoto,
} from "../../utils/photoFaces";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";
import { sectionLabelSx } from "../dialogFieldStyles";
import { glassPaperSx, glassBackdropSx } from "./glassDialog";

export default function PhotoUploadDialog({
  open,
  onClose,
  personId,
  currentUserId,
  onPhotoAdded,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const groupSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "12px",
    overflow: "hidden",
    bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.015),
  };

  const [saving, setSaving] = useState(false);

  // Поля формы
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [externalPeople, setExternalPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [datePhoto, setDatePhoto] = useState("");

  const [selectedOwner, setSelectedOwner] = useState(null);

  // Превью и файл
  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState(null);
  const [filePath, setFilePath] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("4/3");

  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;

  const [convertedArrayBuffer, setConvertedArrayBuffer] = useState(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [uniqueTags, setUniqueTags] = useState([]);
  const facesRef = useRef([]);

  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [thumbsEditing, setThumbsEditing] = useState(false);
  const [thumbsCrop, setThumbsCrop] = useState({ x: 0, y: 0 });
  const [thumbsZoom, setThumbsZoom] = useState(1);
  const [thumbsPixels, setThumbsPixels] = useState(null);
  const [thumbsBusy, setThumbsBusy] = useState(false);
  const customThumbBlobRef = useRef(null);
  const [customThumbReady, setCustomThumbReady] = useState(false);

  const faceMarkup = usePhotoFaceMarkup(addNotification);
  const {
    resetFaces,
    previewFrameRef,
    faces,
    setFaces, // Достаем прямой сеттер из хука
    imageSize,
    selectedFaceId,
    setSelectedFaceId,
    drawMode,
    setDrawMode,
    detecting,
    handlePreviewLoad,
    handleFacesChange,
    handleAddFace,
    handleDetectFaces,
  } = faceMarkup;

  useEffect(() => {
    facesRef.current = normalizeFaces(faces || []);
  }, [faces]);

  // Главная функция обновления лиц
  const onFacesChange = (nextFaces) => {
    const normalized = normalizeFaces(nextFaces);
    facesRef.current = normalized;
    
    // Обновляем состояние внутри хука
    if (typeof setFaces === "function") {
      setFaces(normalized);
    } else {
      handleFacesChange(normalized, people.map((p) => p.id));
    }

    // Подтягиваем привязанных людей в селекторы
    const facePeopleIds = normalized.map((f) => f.personId).filter(Boolean);
    if (facePeopleIds.length) {
      setPeople((prev) => {
        const currentIds = prev.map((p) => p.id);
        const combined = [...new Set([...currentIds, ...facePeopleIds])];
        return allPeople.filter((p) => combined.includes(p.id));
      });
    }

    const externalIds = syncExternalPeopleFromFaces(normalized, externalPeople);
    setExternalPeople(externalIds);
  };

  // Автосинхронизация при любых изменениях в faces из хука
  useEffect(() => {
    if (faces && faces.length > 0 && allPeople.length > 0) {
      const facePeopleIds = faces.map((f) => f.personId).filter(Boolean);
      if (facePeopleIds.length > 0) {
        setPeople((prev) => {
          const currentIds = prev.map((p) => p.id);
          const combined = [...new Set([...currentIds, ...facePeopleIds])];
          return allPeople.filter((p) => combined.includes(p.id));
        });
      }
    }
  }, [faces, allPeople]);

  useEffect(() => {
    if (open) {
      window.photoAPI.getGlobalHashtags().then(setUniqueTags);
      window.peopleAPI.getAll().then(setAllPeople);
      window.externalAPI?.getAll?.().then(setAllExternal);
    }
  }, [open, saving]);

  const clearCustomThumb = () => {
    customThumbBlobRef.current = null;
    setCustomThumbReady(false);
  };

  const exitThumbsEditing = () => {
    setThumbsCrop({ x: 0, y: 0 });
    setThumbsZoom(1);
    setThumbsPixels(null);
    setThumbsBusy(false);
    setThumbsEditing(false);
  };

  const resetThumbEditor = () => {
    exitThumbsEditing();
    clearCustomThumb();
  };

  const clearSelectedFile = () => {
    setPreview(null);
    setFilename(null);
    setFilePath(null);
    setConvertedArrayBuffer(null);
    setAspectRatio("4/3");
    setDragCounter(0);
    setLat(null);
    setLng(null);
    setLocationName("");
    setGeoEnabled(false);
    resetFaces();
    facesRef.current = [];
    resetThumbEditor();
  };

  useEffect(() => {
    if (open && !keepOpen) {
      setTitle("");
      setDescription("");
      setPeople([]);
      setExternalPeople([]);
      setSelectedOwner(null);
      setDatePhoto("");
      setPreview(null);
      setFilename(null);
      setFilePath(null);
      setAspectRatio("4/3");
      setConvertedArrayBuffer(null);
      setDragCounter(0);
      setLat(null);
      setLng(null);
      setLocationName("");
      setGeoEnabled(false);
      resetFaces();
      facesRef.current = [];
      resetThumbEditor();
    }
  }, [open, keepOpen, resetFaces]);

  useEffect(() => {
    if (!open) resetThumbEditor();
  }, [open]);

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
        onFacesChange(next);
        setSelectedFaceId(null);
      }
      return undefined;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedFaceId, faces, onFacesChange, setSelectedFaceId]);

  const resolveLocationName = async (la, ln) => {
    try {
      const rev = await window.geoAPI?.reverse?.(Number(la), Number(ln));
      return formatShortAddress(rev) || rev?.name || rev?.displayName || "";
    } catch {
      return "";
    }
  };

  const extractExifData = async (input) => {
    try {
      let buffer = input instanceof Blob || input instanceof File ? await input.arrayBuffer() : input;
      const tags = ExifReader.load(buffer);
      if (tags["DateTimeOriginal"]) {
        const dateStr = tags["DateTimeOriginal"].description;
        const datePart = dateStr.split(" ")[0].replace(/:/g, "-");
        setDatePhoto(datePart);
      }
      if (tags["GPSLatitude"] && tags["GPSLongitude"]) {
        const exifLat = tags["GPSLatitude"].description;
        const exifLng = tags["GPSLongitude"].description;
        setLat(exifLat);
        setLng(exifLng);
        setGeoEnabled(true);
        resolveLocationName(exifLat, exifLng).then((name) => {
          if (name) setLocationName(name);
        });
      }
    } catch (error) {
      console.warn("Метаданные не найдены:", error.message);
    }
  };

  const handleFileSelect = async () => {
    const result = await window.photoAPI.selectFile();
    if (!result?.path) return;

    setConvertedArrayBuffer(null);
    resetFaces();
    facesRef.current = [];
    resetThumbEditor();
    const raw = result.path.replace(/^file:\/\//, "");

    const response = await fetch(`file://${raw}`);
    const blob = await response.blob();
    await extractExifData(blob);

    const ext = raw.split(".").pop().toLowerCase();
    let previewUrl = "";

    if (ext === "heic") {
      try {
        const ab = await window.photoAPI.convertHeic(raw);
        setConvertedArrayBuffer(ab);
        const previewBlob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(previewBlob);
        setFilename(result.filename.replace(/\.heic$/i, ".jpg"));
        setFilePath(null);
      } catch (err) {
        console.error("Ошибка HEIC:", err);
        return;
      }
    } else {
      previewUrl = `file://${raw}`;
      setFilename(result.filename);
      setFilePath(raw);
    }

    setPreview(previewUrl);
    updateAspectRatio(previewUrl);
  };

  const updateAspectRatio = (url) => {
    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setAspectRatio(r < 0.9 ? "3/4" : r > 1.3 ? "4/3" : "1/1");
    };
    img.src = url;
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragCounter(0);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await extractExifData(file);

    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      alert(`Формат .${ext} не поддерживается.`);
      return;
    }

    setConvertedArrayBuffer(null);
    resetFaces();
    facesRef.current = [];
    resetThumbEditor();
    let previewUrl, name, pathOnDisk = null;

    if (ext === "heic") {
      try {
        const fileBuffer = await file.arrayBuffer();
        const ab = await window.photoAPI.convertHeic(fileBuffer);

        setConvertedArrayBuffer(ab);
        const previewBlob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(previewBlob);
        name = file.name.replace(/\.heic$/i, ".jpg");
      } catch (err) {
        console.error(err);
        alert("Ошибка конвертации HEIC.");
        return;
      }
    } else {
      previewUrl = URL.createObjectURL(file);
      name = file.name;
      const ab = await file.arrayBuffer();
      setConvertedArrayBuffer(ab);
    }

    setPreview(previewUrl);
    setFilename(name);
    setFilePath(pathOnDisk);
    updateAspectRatio(previewUrl);
  };

  const enterThumbsEditing = () => {
    if (!preview) return;
    setDrawMode(false);
    setSelectedFaceId(null);
    setThumbsEditing(true);
    setThumbsCrop({ x: 0, y: 0 });
    setThumbsZoom(1);
    setThumbsPixels(null);
  };

  const applyThumbDraft = async () => {
    if (!preview || !thumbsPixels || thumbsBusy) return;
    setThumbsBusy(true);
    try {
      const blob = await cropToThumbWebp(preview, thumbsPixels);
      customThumbBlobRef.current = blob;
      setCustomThumbReady(true);
      exitThumbsEditing();
      addNotification({
        title: "Превью",
        message: "Фрагмент будет сохранён вместе с фото",
        type: "success",
        category: "photo",
      });
    } catch (e) {
      addNotification({
        title: "Превью",
        message: e.message || "Не удалось подготовить превью",
        type: "error",
        category: "photo",
      });
    } finally {
      setThumbsBusy(false);
    }
  };

  const handleSave = async () => {
    if (!filename) {
      addNotification({
        title: "Ошибка",
        message: "Сначала выберите файл.",
        type: "warning",
        category: "photo",
      });
      return;
    }

    const finalOwnerId = personId ? currentUserId : selectedOwner?.id;
    if (!finalOwnerId) {
      addNotification({
        title: "Ошибка",
        message: "Выберите владельца фото.",
        type: "warning",
        category: "photo",
      });
      return;
    }

    setSaving(true);

    try {
      const extractedHashtags = description
        ? (description.match(/#[\p{L}\d_]+/gu) || []).map((t) => t.toLowerCase())
        : [];

      // БЕРЕМ ИСКЛЮЧИТЕЛЬНО АКТУАЛЬНОЕ СОСТОЯНИЕ ИЗ ХУКА
      let facesToSave = normalizeFaces(facesRef.current.length ? facesRef.current : faces || []);

      const peopleIdsArray = people.map((p) => p.id);
      const basePeopleIds = personId
        ? [...new Set([...peopleIdsArray, personId])]
        : peopleIdsArray;

      const finalPeopleIds = syncPeopleFromFaces(facesToSave, basePeopleIds);
      const finalExternalIds = syncExternalPeopleFromFaces(facesToSave, externalPeople);

      if (preview) {
        facesToSave = await enrichFacesWithDescriptors(
          preview,
          facesToSave,
          imageSize
        );
      }

      const meta = {
        title: title.trim(),
        description: description.trim(),
        hashtags: extractedHashtags,
        people: finalPeopleIds,
        externalPeople: finalExternalIds,
        owner: finalOwnerId,
        date: new Date().toISOString().split("T")[0],
        datePhoto: datePhoto,
        aspectRatio: aspectRatio,
        lat: lat,
        lng: lng,
        locationName: locationName || null,
        faces: facesToSave,
        imageSize,
      };

      let newPhoto = null;

      if (convertedArrayBuffer) {
        const blobForSaving = new Blob([convertedArrayBuffer], { type: "image/jpeg" });
        newPhoto = await window.photoAPI.saveBlobFile(meta, blobForSaving, filename);
      } else if (filePath) {
        newPhoto = await window.photoAPI.saveWithFilename(meta, filePath);
      } else {
        newPhoto = await window.photoAPI.saveWithFilename(meta, filename);
      }

      if (newPhoto) {
        if (customThumbBlobRef.current && newPhoto.filename) {
          try {
            const thumbBuffer = await customThumbBlobRef.current.arrayBuffer();
            await window.photoAPI.saveThumbs(
              finalOwnerId,
              newPhoto.filename,
              thumbBuffer,
            );
          } catch (thumbErr) {
            console.warn("Custom thumb save failed:", thumbErr);
            addNotification({
              title: "Превью",
              message:
                "Фото сохранено, но не удалось записать превью: " +
                (thumbErr.message || thumbErr),
              type: "warning",
              category: "photo",
            });
          }
        }

        await syncReferencesAfterPhotoSave(
          { owner: finalOwnerId, id: newPhoto.id },
          facesToSave
        );

        addNotification({
          title: "Фото добавлено",
          message: `Файл "${filename}" успешно сохранен.`,
          type: "success",
          category: "photo",
        });

        if (onPhotoAdded) onPhotoAdded(newPhoto);

        if (keepOpen) {
          setTitle("");
          setDescription("");
          setPeople([]);
          setExternalPeople([]);
          setSelectedOwner(null);
          setPreview(null);
          setFilename(null);
          setFilePath(null);
          setAspectRatio("4/3");
          setConvertedArrayBuffer(null);
          setDragCounter(0);
          setLat(null);
          setLng(null);
          setLocationName("");
          setGeoEnabled(false);
          resetFaces();
          resetThumbEditor();
        } else {
          onClose();
        }
      } else {
        throw new Error("Ошибка при обработке фото на стороне сервера.");
      }
    } catch (err) {
      console.error("Save failed:", err);
      addNotification({
        title: "Ошибка сохранения",
        message: err.message || "Не удалось сохранить фото",
        type: "error",
        category: "photo",
      });
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = saving || !filename || (!personId && !selectedOwner);

  useDialogSaveHotkey({
    open,
    onSave: handleSave,
    disabled: isSaveDisabled,
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setKeepOpen(false);
      }}
      maxWidth={false}
      slotProps={{
        backdrop: { sx: glassBackdropSx },
        paper: {
          sx: (t) => ({
            ...glassPaperSx(t),
            width: 1200,
            maxWidth: "94vw",
            height: "min(800px, 92vh)",
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
            Добавить фото
          </Typography>
        </Box>
        <Stack
          direction="row"
          sx={{ flex: 1, minHeight: 0, alignItems: "stretch" }}
        >
          {/* ЛЕВАЯ КОЛОНКА */}
          <Box
            sx={{
              width: 400,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              p: "16px 8px 16px 16px",
            }}
          >
            <Box
              sx={{
                p: 1,
                flexGrow: 1,
                overflowY: "auto",
                bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.015),
                borderRadius: "16px",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "divider",
                  borderRadius: 2,
                },
              }}
            >
              <Stack spacing={2.5}>
                <PhotoCaptionBlock
                  title={title}
                  description={description}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                  tagSuggestions={uniqueTags}
                />

                <Stack spacing={1.5}>
                  {!personId && (
                    <PhotoOwnerField
                      allPeople={allPeople}
                      ownerId={selectedOwner?.id ?? null}
                      label="Владелец (папка) / Люди на фото"
                      onChange={(id) =>
                        setSelectedOwner(
                          allPeople.find((p) => p.id === id) || { id },
                        )
                      }
                    />
                  )}

                  <PhotoAttendeesList
                  label=""
                  allPeople={allPeople}
                  allExternal={allExternal}
                  peopleIds={people.map((p) => p.id)}
                  externalPeopleIds={externalPeople}
                  onAdd={(option) => {
                    const next = addAttendeeToPhoto(
                      {
                        people: people.map((p) => p.id),
                        externalPeople,
                        faces,
                      },
                      option,
                    );
                    setPeople(
                      next.people
                        .map((id) => allPeople.find((p) => p.id === id))
                        .filter(Boolean),
                    );
                    setExternalPeople(next.externalPeople);
                    onFacesChange(next.faces);
                  }}
                  onRemove={(option) => {
                    const next = removeAttendeeFromPhoto(
                      {
                        people: people.map((p) => p.id),
                        externalPeople,
                        faces,
                      },
                      { kind: option.kind, id: option.id },
                    );
                    setPeople(
                      next.people
                        .map((id) => allPeople.find((p) => p.id === id))
                        .filter(Boolean),
                    );
                    setExternalPeople(next.externalPeople);
                    onFacesChange(next.faces);
                  }}
                />
                </Stack>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 700,
                      display: "block",
                      mb: "4px",
                      pl: "12px",
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
                          color: datePhoto ? "text.primary" : "text.secondary",
                        }}
                      >
                        {datePhoto || "Указать дату"}
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
                        disabled={!filename}
                        onChange={(e) => {
                          setGeoEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setLat(null);
                            setLng(null);
                            setLocationName("");
                          }
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
                              color:
                                locationName || (lat != null && lng != null)
                                  ? "text.primary"
                                  : "text.secondary",
                            }}
                          >
                            {locationName ||
                              (lat != null && lng != null
                                ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
                                : "Указать место")}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>

                <Box>
                  <Typography sx={sectionLabelSx}>Разметка</Typography>
                  <PhotoFaceFormSection
                    theme={theme}
                    faces={faces}
                    allPeople={allPeople}
                    allExternal={allExternal}
                    onSelectFace={setSelectedFaceId}
                    onFacesChange={onFacesChange}
                    onAddFace={() => onFacesChange(handleAddFace())}
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
                      Нет размеченных лиц. Нажмите «Найти» или нарисуйте
                      рамку на превью.
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography sx={sectionLabelSx}>При сохранении</Typography>
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
                        <PhotoBadgePlusIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                        <Typography
                          sx={{
                            fontSize: "0.815rem",
                            fontWeight: 600,
                            lineHeight: 1.35,
                            color: "text.primary",
                          }}
                        >
                          Добавить ещё одну
                        </Typography>
                      </Stack>
                      <CustomSwitch
                        checked={keepOpen}
                        onChange={(e) => setKeepOpen(e.target.checked)}
                      />
                    </Stack>
                  </Box>
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
                    Окно останется открытым после сохранения
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* ПРАВАЯ КОЛОНКА */}
          <Stack
            spacing={1.25}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              p: "16px 16px 16px 8px",
            }}>
            <Box
              sx={{
                position: "relative",
                flexGrow: 1,
                minHeight: 0,
                width: "100%",
                bgcolor: isDark ? alpha("#000", 0.35) : alpha("#000", 0.03),
                borderRadius: "16px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              {!preview ? (
                <Box
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragCounter((c) => c + 1)}
                  onDragLeave={() => setDragCounter((c) => Math.max(c - 1, 0))}
                  onDrop={onDrop}
                  onClick={handleFileSelect}
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: isDragging
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                    transition: "background-color 0.2s ease",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "16px",
                      bgcolor: alpha(theme.palette.primary.main, 0.09),
                      color: theme.palette.primary.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1,
                    }}
                  >
                    <PhotoBadgePlusIcon sx={{ fontSize: 30 }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Перетащите фото
                  </Typography>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    или нажмите, чтобы выбрать файл
                  </Typography>
                </Box>
              ) : thumbsEditing ? (
                <>
                  <PhotoThumbCropPanel
                    imageSrc={preview}
                    crop={thumbsCrop}
                    zoom={thumbsZoom}
                    onCropChange={setThumbsCrop}
                    onZoomChange={setThumbsZoom}
                    onCropComplete={(_, pixels) => setThumbsPixels(pixels)}
                  />
                  <PhotoThumbCropToolbar
                    zoom={thumbsZoom}
                    onZoomDecrease={() =>
                      setThumbsZoom((z) => Math.max(z - 0.2, 1))
                    }
                    onZoomIncrease={() =>
                      setThumbsZoom((z) => Math.min(z + 0.2, 5))
                    }
                    onSave={applyThumbDraft}
                    onCancel={exitThumbsEditing}
                    canSave={Boolean(thumbsPixels)}
                    busy={thumbsBusy}
                    saveLabel="Применить"
                  />
                </>
              ) : (
                <>
                  <PhotoFacePreviewBlock
                    preview={preview}
                    previewFrameRef={previewFrameRef}
                    faces={faces}
                    imageSize={imageSize}
                    allPeople={allPeople}
                    allExternal={allExternal}
                    selectedFaceId={selectedFaceId}
                    onSelectFace={setSelectedFaceId}
                    onFacesChange={onFacesChange}
                    drawMode={drawMode}
                    setDrawMode={setDrawMode}
                    detecting={detecting}
                    onDetect={async () => {
                      const detected = await handleDetectFaces(preview);
                      if (detected) onFacesChange(detected);
                    }}
                    onPreviewLoad={handlePreviewLoad}
                    onEditThumb={enterThumbsEditing}
                    customThumbReady={customThumbReady}
                  />
                  <IconButton
                    onClick={clearSelectedFile}
                    size="small"
                    title="Удалить фото"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      zIndex: 4,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                    }}
                  >
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </>
              )}

              {filename && (
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    right: 12,
                    bottom: 10,
                    zIndex: 2,
                    maxWidth: "70%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#fff",
                    bgcolor: "rgba(0,0,0,0.45)",
                    borderRadius: "8px",
                    px: 1,
                    py: 0.25,
                    pointerEvents: "none",
                  }}
                >
                  {filename}
                  {faces?.length > 0 && ` · Лиц: ${faces.length}`}
                  {customThumbReady && " · Превью"}
                </Typography>
              )}
            </Box>
          </Stack>
        </Stack>

        <DialogActionsBar sx={{ flexShrink: 0 }}>
          <DialogActionButton onClick={onClose}>
            Отменить
          </DialogActionButton>
          <DialogActionButton
            tone="primary"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              "Сохранить"
            )}
          </DialogActionButton>
        </DialogActionsBar>
      </DialogContent>

      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={datePhoto}
        format="YYYY-MM-DD"
        showTime={true}
        onSave={(newDate) => {
          setDatePhoto(newDate);
          setDatePickerOpen(false);
        }}
      />
      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initial={
          lat != null && lng != null ? { lat, lng } : null
        }
        onSelect={({ lat: la, lng: ln, name }) => {
          setLat(la);
          setLng(ln);
          setLocationName(name || "");
          if (!name) {
            resolveLocationName(la, ln).then((resolved) => {
              if (resolved) setLocationName(resolved);
            });
          }
        }}
      />
    </Dialog>
  );
}