import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Stack,
  Box,
  Typography,
  InputBase,
  Paper,
  Popper,
  ClickAwayListener,
  List,
  ListItemButton,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhoneIcon from "@mui/icons-material/Phone";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DateRangeIcon from "@mui/icons-material/DateRange";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PetsIcon from "@mui/icons-material/Pets";
import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import CustomDatePickerDialog from "../CustomDatePickerDialog";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { FaceTagPicker } from "../PhotoFaceMarkupBlocks";
import PersonAvatar from "../PersonAvatar";
import ExternalEntityAvatar from "../ExternalEntityAvatar";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  ENTITY_TYPES,
  RELATION_TYPES,
  getRelationTypeLabel,
  getExternalEntityLabel,
  findPersonById,
  findExternalById,
  normalizeRelations,
  collectRelationsForSave,
  buildFaceTagOptions,
} from "../../utils/externalEntities";
import { TOOLBAR_MENU } from "../../layout/toolbarTokens";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";
import ChevronUpChevronDownIcon from "../svg/ChevronUpChevronDownIcon";
import {
  sectionLabelSx,
  fieldBlockSx,
  fieldRowSx,
  fieldTitleSx,
  fieldValueSx,
  inputSx,
} from "../dialogFieldStyles";
import { glassPaperSx, glassBackdropSx } from "./glassDialog";

const TYPE_ICONS = {
  person: <PersonOutlinedIcon />,
  pet: <PetsIcon />,
};

function TypePickerField({
  theme,
  options,
  value,
  onPick,
  label = "Тип записи",
  icon = null,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const menuPaperRef = useRef(null);

  const selected = options.find((o) => o.value === value) || null;

  const pick = (o) => {
    onPick(o);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" && options[highlight]) {
      e.preventDefault();
      pick(options[highlight]);
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
          sx={{
            ...fieldRowSx,
            width: "100%",
          }}
        >
          <Box
            onClick={() => setOpen((v) => !v)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              "&:focus-visible": {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
                borderRadius: "8px",
              },
            }}
          >
            {(selected?.icon || icon) && (
              <Box
                sx={{
                  color: "primary.main",
                  display: "flex",
                  flexShrink: 0,
                  "& svg": { fontSize: 18 },
                }}
              >
                {selected?.icon || icon}
              </Box>
            )}
            <Typography sx={fieldTitleSx}>{label}</Typography>
            <Box sx={{ flex: 1 }} />
            {selected && (
              <Typography
                sx={{
                  ...fieldValueSx,
                  color: "text.primary",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {selected.label}
              </Typography>
            )}
          </Box>
          <Box
            component="button"
            type="button"
            aria-label="Открыть список"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            sx={{
              width: 18,
              height: 18,
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
              sx={{ fontSize: 12, color: "text.secondary" }}
            />
          </Box>
        </Box>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-end"
          sx={{ zIndex: (t) => t.zIndex.modal + 2 }}
        >
          <Paper
            ref={menuPaperRef}
            elevation={0}
            sx={{
              mt: 0.5,
              width: "max-content",
              maxHeight: 280,
              overflow: "auto",
              borderRadius: TOOLBAR_MENU.paperRadiusPx,
              backgroundImage: "none",
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
            <List dense disablePadding sx={{ px: 0.5, pb: 0.5 }}>
              {options.map((o, index) => (
                <ListItemButton
                  key={o.value}
                  disableRipple
                  selected={open && index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(o)}
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
                    {o.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.815rem",
                      fontWeight: 500,
                      pointerEvents: "none",
                    }}
                  >
                    {o.label}
                  </Typography>
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

export default function AddExternalEntityDialog({
  open,
  onClose,
  entity = null,
  onSaved,
}) {
  const theme = useTheme();
  const isEdit = Boolean(entity?.id);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [type, setType] = useState("person");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [relations, setRelations] = useState([]);
  const [saving, setSaving] = useState(false);
  const isPet = type === "pet";

  const [newRelation, setNewRelation] = useState({
    targetKind: "person",
    mainPersonId: null,
    mainExternalEntityId: null,
    relationType: "other",
    dates: "",
    notes: "",
  });

  const relationTypeOptions = useMemo(() => {
    const entries = Object.entries(RELATION_TYPES).filter(
      ([key]) => (isPet ? key === "pet_owner" : key !== "pet_owner"),
    );
    return entries.map(([key, label]) => ({ value: key, label }));
  }, [isPet]);

  const typeOptions = useMemo(
    () =>
      Object.entries(ENTITY_TYPES).map(([key, { label }]) => ({
        value: key,
        label,
        icon: TYPE_ICONS[key],
      })),
    [],
  );

  const relationTargetOptions = useMemo(() => {
    const options = buildFaceTagOptions(allPeople, allExternal);
    return options.filter(
      (o) => !(o.kind === "external" && String(o.id) === String(entity?.id)),
    );
  }, [allPeople, allExternal, entity?.id]);

  const selectedRelationTarget = relationTargetOptions.find((opt) => {
    if (newRelation.targetKind === "person") {
      return (
        opt.kind === "person" &&
        Number(opt.id) === Number(newRelation.mainPersonId)
      );
    }
    return (
      opt.kind === "external" &&
      String(opt.id) === String(newRelation.mainExternalEntityId || "")
    );
  }) || null;

  useEffect(() => {
    if (!open) return;

    window.peopleAPI.getAll().then(setAllPeople);
    window.externalAPI.getAll().then((list) => setAllExternal(list || []));

    if (entity?.id) {
      setType(entity.type || "person");
      setName(entity.name || "");
      setNotes(entity.notes || "");
      setPhone(entity.phone || "");
      setEmail(entity.email || "");
      setAddress(entity.address || "");
      setBirthday(entity.birthday || "");
      setRelations(normalizeRelations(entity.relations || []));
    } else {
      setType("person");
      setName("");
      setNotes("");
      setPhone("");
      setEmail("");
      setAddress("");
      setBirthday("");
      setRelations([]);
    }

    setNewRelation({
      targetKind: "person",
      mainPersonId: null,
      mainExternalEntityId: null,
      relationType: entity?.type === "pet" ? "pet_owner" : "other",
      dates: "",
      notes: "",
    });
  }, [open, entity?.id]);

  const getPersonLabel = (p) =>
    [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
      .filter(Boolean)
      .join(" ") || `ID ${p.id}`;

  const handleAddRelation = () => {
    if (
      (newRelation.targetKind === "person" && !newRelation.mainPersonId) ||
      (newRelation.targetKind === "external" && !newRelation.mainExternalEntityId)
    ) {
      return;
    }

    const safeRelation = isPet
      ? { ...newRelation, relationType: "pet_owner" }
      : newRelation;
    const normalized = normalizeRelations([
      {
        id: `R${Date.now()}`,
        ...safeRelation,
      },
    ]);
    if (!normalized.length) return;

    setRelations((prev) => [...prev, ...normalized]);
    setNewRelation({
      targetKind: "person",
      mainPersonId: null,
      mainExternalEntityId: null,
      relationType: isPet ? "pet_owner" : "other",
      dates: "",
      notes: "",
    });
  };

  const handleRemoveRelation = (relId) => {
    setRelations((prev) => prev.filter((r) => r.id !== relId));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addNotification({
        title: "Справочник",
        message: "Укажите имя",
        type: "warning",
        category: "people",
      });
      return;
    }

    setSaving(true);
    try {
      const relationsToSave = collectRelationsForSave(relations, newRelation);

      let savedId;
      if (isEdit) {
        await window.externalAPI.update(entity.id, {
          type,
          name: name.trim(),
          notes: notes.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          birthday: birthday.trim(),
          relations: relationsToSave,
        });
        savedId = entity.id;
        addNotification({
          title: "Справочник",
          message: "Запись обновлена",
          type: "success",
          category: "people",
          link: `/external?selected=${encodeURIComponent(entity.id)}`,
        });
      } else {
        const created = await window.externalAPI.add({
          type,
          name: name.trim(),
          notes: notes.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          birthday: birthday.trim(),
          relations: relationsToSave,
        });
        savedId = created.id;
        addNotification({
          title: "Справочник",
          message: `Добавлено: ${created.name} (${created.id})`,
          type: "success",
          category: "people",
          link: `/external?selected=${encodeURIComponent(created.id)}`,
        });
      }
      onSaved?.(savedId);
      onClose();
    } catch (err) {
      console.error(err);
      addNotification({
        title: "Справочник",
        message: "Ошибка сохранения",
        type: "error",
        category: "people",
      });
    } finally {
      setSaving(false);
    }
  };

  useDialogSaveHotkey({ open, onSave: handleSave, disabled: saving });

  const canAddRelation =
    (newRelation.targetKind === "person" && newRelation.mainPersonId) ||
    (newRelation.targetKind === "external" && newRelation.mainExternalEntityId);

  return (
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
            height: "min(760px, 90vh)",
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
          <Typography variant="h6" sx={{ textAlign: "center", fontWeight: 700 }}>
            {isEdit ? "Редактировать запись" : "Новая запись в справочнике"}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 3, pb: 2 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={sectionLabelSx}>Основное</Typography>
              <Stack spacing={1.5}>
                <Box sx={fieldBlockSx}>
                  <TypePickerField
                    theme={theme}
                    options={typeOptions}
                    value={type}
                    onPick={(o) => {
                      setType(o.value);
                      setNewRelation((s) => ({
                        ...s,
                        relationType: o.value === "pet" ? "pet_owner" : "other",
                        dates: "",
                        notes: "",
                      }));
                    }}
                  />
                  <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                  <InputBase
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === "pet" ? "Кличка" : "Имя / ФИО"}
                    sx={inputSx}
                  />
                </Box>
                <Box sx={fieldBlockSx}>
                  <Box
                    onClick={() => setBirthdayPickerOpen(true)}
                    sx={{ ...fieldRowSx, cursor: "pointer", justifyContent: "space-between" }}
                  >
                    <Stack
                      direction="row"
                      spacing="12px"
                      sx={{ alignItems: "center", minWidth: 0 }}
                    >
                      <CalendarMonthIcon
                        sx={{
                          color: "text.secondary",
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      />
                      <Typography sx={fieldTitleSx}>Дата рождения</Typography>
                    </Stack>
                    <Typography
                      sx={{
                        ...fieldValueSx,
                        color: birthday ? "text.primary" : "text.secondary",
                      }}
                    >
                      {birthday || "Указать дату"}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Описание</Typography>
              <Box sx={fieldBlockSx}>
                <InputBase
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Описание / справка"
                  multiline
                  minRows={1}
                  sx={{
                    ...inputSx,
                    "& textarea": { p: 0, fieldSizing: "content" },
                  }}
                />
              </Box>
            </Box>

            {!isPet && (
            <Box>
              <Typography sx={sectionLabelSx}>Контакты</Typography>
              <Box sx={fieldBlockSx}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "12px", px: "12px", py: "9px" }}>
                  <PhoneIcon sx={{ color: "text.secondary", fontSize: 18, flexShrink: 0 }} />
                  <InputBase
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Телефон"
                    sx={{ ...inputSx, px: 0, py: 0, flex: 1, minWidth: 0 }}
                  />
                </Box>
                <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: "12px", px: "12px", py: "9px" }}>
                  <AlternateEmailIcon sx={{ color: "text.secondary", fontSize: 18, flexShrink: 0 }} />
                  <InputBase
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    sx={{ ...inputSx, px: 0, py: 0, flex: 1, minWidth: 0 }}
                  />
                </Box>
                <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: "12px", px: "12px", py: "9px" }}>
                  <HomeOutlinedIcon sx={{ color: "text.secondary", fontSize: 18, flexShrink: 0 }} />
                  <InputBase
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Адрес"
                    sx={{ ...inputSx, px: 0, py: 0, flex: 1, minWidth: 0 }}
                  />
                </Box>
              </Box>
            </Box>
            )}

            <Box>
              <Typography sx={sectionLabelSx}>Связи</Typography>
              <Stack spacing={1.5}>
                {relations.length > 0 && (
                  <Box sx={fieldBlockSx}>
                    {relations.map((rel, index) => {
                      const person = findPersonById(
                        allPeople,
                        rel.mainPersonId,
                      );
                      const external = findExternalById(
                        allExternal,
                        rel.mainExternalEntityId,
                      );
                      return (
                        <Box
                          key={rel.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            px: "12px",
                            py: "9px",
                            minWidth: 0,
                            ...(index > 0 && {
                              borderTop: "1px solid",
                              borderColor: "divider",
                            }),
                          }}
                        >
                          {rel.targetKind === "external" ? (
                            <ExternalEntityAvatar
                              entityId={rel.mainExternalEntityId}
                              entity={external}
                              size={22}
                            />
                          ) : (
                            <PersonAvatar
                              personId={rel.mainPersonId}
                              initials={person ? getPersonLabel(person) : undefined}
                              size={22}
                            />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                ...fieldTitleSx,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {rel.targetKind === "external"
                                ? external
                                  ? `${external.id} :: ${getExternalEntityLabel(external)}`
                                  : `ID ${rel.mainExternalEntityId}`
                                : person
                                  ? getPersonLabel(person)
                                  : `ID ${rel.mainPersonId}`}
                            </Typography>
                            <Typography
                              sx={{
                                ...fieldValueSx,
                                fontSize: "0.75rem",
                                color: "text.secondary",
                              }}
                            >
                              {getRelationTypeLabel(rel.relationType)}
                              {rel.dates ? ` · ${rel.dates}` : ""}
                              {rel.notes ? ` — ${rel.notes}` : ""}
                            </Typography>
                          </Box>
                          <Box
                            component="button"
                            type="button"
                            aria-label="Удалить связь"
                            onClick={() => handleRemoveRelation(rel.id)}
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              display: "grid",
                              placeItems: "center",
                              border: "none",
                              bgcolor: "transparent",
                              color: "text.secondary",
                              cursor: "pointer",
                              p: 0,
                              flexShrink: 0,
                              "&:hover": { color: "error.main" },
                            }}
                          >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                <Box sx={fieldBlockSx}>
                  <TypePickerField
                    theme={theme}
                    options={relationTypeOptions}
                    value={isPet ? "pet_owner" : newRelation.relationType}
                    onPick={(o) =>
                      setNewRelation((s) => ({
                        ...s,
                        relationType: o.value,
                      }))
                    }
                    label="Тип связи"
                    icon={<LinkIcon />}
                  />
                  <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                  <Box sx={{ px: "12px", py: "9px" }}>
                    <FaceTagPicker
                      theme={theme}
                      options={relationTargetOptions}
                      option={selectedRelationTarget}
                      hint={!selectedRelationTarget}
                      onPick={(opt) => {
                        if (!opt) return;
                        setNewRelation((s) => ({
                          ...s,
                          targetKind: opt.kind,
                          mainPersonId:
                            opt.kind === "person" ? Number(opt.id) : null,
                          mainExternalEntityId:
                            opt.kind === "external" ? String(opt.id) : null,
                        }));
                      }}
                    />
                  </Box>
                  <Divider sx={{ opacity: 0.35, mx: 1.25 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: "12px", px: "12px", py: "9px" }}>
                    <DateRangeIcon sx={{ color: "text.secondary", fontSize: 18, flexShrink: 0 }} />
                    <InputBase
                      value={newRelation.dates}
                      onChange={(e) =>
                        setNewRelation((s) => ({ ...s, dates: e.target.value }))
                      }
                      placeholder="Период, например 1985–1990"
                      sx={{ ...inputSx, px: 0, py: 0, flex: 1, minWidth: 0 }}
                    />
                  </Box>
                </Box>

                <Box
                  component="button"
                  type="button"
                  disabled={!canAddRelation}
                  onClick={handleAddRelation}
                  sx={{
                    ...fieldRowSx,
                    width: "100%",
                    borderRadius: "12px",
                    border: "none",
                    cursor: canAddRelation ? "pointer" : "default",
                    bgcolor: (t) =>
                      t.palette.mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    color: canAddRelation ? "primary.main" : "text.disabled",
                    opacity: canAddRelation ? 1 : 0.6,
                    fontSize: "0.815rem",
                    fontWeight: 600,
                    "&:hover": canAddRelation
                      ? { bgcolor: "action.hover" }
                      : undefined,
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  Добавить связь
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActionsBar>
        <DialogActionButton onClick={onClose} disabled={saving}>
          Отмена
        </DialogActionButton>
        <DialogActionButton
          tone="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {isEdit ? "Сохранить" : "Добавить"}
        </DialogActionButton>
      </DialogActionsBar>

      <CustomDatePickerDialog
        open={birthdayPickerOpen}
        onClose={() => setBirthdayPickerOpen(false)}
        initialDate={birthday}
        onSave={(newDate) => {
          setBirthday(newDate);
          setBirthdayPickerOpen(false);
        }}
      />
    </Dialog>
  );
}
