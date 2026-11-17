import React, { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Stack,
  Button,
  Box,
  IconButton,
  Divider,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import CakeIcon from "@mui/icons-material/Cake";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LinkIcon from "@mui/icons-material/Link";
import ExternalEntityAvatar from "../../components/ExternalEntityAvatar";
import PersonAvatar from "../../components/PersonAvatar";
import DialogActionButton from "../../components/Dialog/DialogActionButton";
import AvatarPreviewDialog from "../../components/Dialog/AvatarPreviewDialog";
import AddExternalEntityDialog from "../../components/Dialog/AddExternalEntityDialog";
import ExternalAvatarEditorDialog from "../../components/Dialog/ExternalAvatarEditorDialog";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  getEntityTypeLabel,
  getExternalEntityLabel,
  getRelationTypeLabel,
  getRelationGroupLabel,
  findExternalById,
  findPersonById,
} from "../../utils/externalEntities";
import { btnStyleBlue, btnStyleRed } from "../../components/ButtonStyle";
import {
  chevron,
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../Page_Settings/settingsUi";

export default function ExternalEntityDetail({
  entityId,
  onDeleted,
  onSelectExternal,
  onEntityChanged,
  compact = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [entity, setEntity] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const loadData = useCallback(async () => {
    if (!entityId) {
      setEntity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [data, people, external] = await Promise.all([
      window.externalAPI.getById(entityId),
      window.peopleAPI.getAll(),
      window.externalAPI.getAll(),
    ]);
    setEntity(data);
    setAllPeople(people || []);
    setAllExternal(external || []);
    setLoading(false);
  }, [entityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!avatarOpen || !entity?.id) return;

    let isMounted = true;
    window.externalAPI.avatar.getPath(entity.id).then((path) => {
      if (!isMounted) return;
      setAvatarPreviewUrl(path ? `${path}?t=${Date.now()}` : null);
    });

    return () => {
      isMounted = false;
    };
  }, [avatarOpen, entity?.id]);

  const getPersonLabel = (p) =>
    [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
    `ID ${p.id}`;

  const handleArchive = async () => {
    const confirmed = window.confirm(
      `Переместить «${entity?.name}» в корзину?`,
    );
    if (!confirmed) return;
    await window.externalAPI.update(entityId, {
      archived: true,
      editedAt: new Date().toISOString(),
    });
    addNotification({
      timestamp: new Date().toISOString(),
      title: "Справочник",
      message: `«${entity?.name || entityId}» перемещена в корзину`,
      type: "warning",
      category: "trash",
      link: "/trash?tab=external",
    });
    onEntityChanged?.();
    onDeleted?.();
  };

  const handleSaved = () => {
    loadData();
    onEntityChanged?.();
  };

  if (!entityId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Выберите запись из списка слева — здесь появятся подробности.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 6
        }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (!entity) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Запись не найдена
        </Typography>
      </Box>
    );
  }

  const isPet = entity.type === "pet";

  const detailDialogs = (
    <>
      <AvatarPreviewDialog
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        imageUrl={avatarPreviewUrl}
        alt={entity.name || "Аватар"}
        onEdit={() => {
          setAvatarOpen(false);
          setAvatarEditorOpen(true);
        }}
      />

      <AddExternalEntityDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        entity={entity}
        onSaved={handleSaved}
      />

      <ExternalAvatarEditorDialog
        open={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        entityId={entity.id}
        onSaved={() => {
          setAvatarEditorOpen(false);
          setAvatarRefresh((r) => r + 1);
          onEntityChanged?.();
        }}
      />
    </>
  );

  if (compact) {
    const hasContacts =
      entity.notes ||
      (!isPet && (entity.phone || entity.email || entity.address)) ||
      entity.birthday;
    const relations = entity.relations || [];

    const relationGroups = [];
    const relationGroupMap = new Map();
    for (const rel of relations) {
      const groupLabel = getRelationGroupLabel(rel.relationType);
      if (!relationGroupMap.has(groupLabel)) {
        relationGroupMap.set(groupLabel, []);
        relationGroups.push(groupLabel);
      }
      relationGroupMap.get(groupLabel).push(rel);
    }

    const renderRelationRow = (rel) => {
      const person = findPersonById(allPeople, rel.mainPersonId);
      const external = findExternalById(allExternal, rel.mainExternalEntityId);
      const isExternal = rel.targetKind === "external";
      const target = isExternal ? external : person;
      const targetName = isExternal
        ? external
          ? getExternalEntityLabel(external)
          : `ID ${rel.mainExternalEntityId}`
        : person
          ? getPersonLabel(person)
          : `ID ${rel.mainPersonId}`;
      const onClick = isExternal
        ? external
          ? () => onSelectExternal?.(external.id)
          : undefined
        : person
          ? () => navigate(`/person/${person.id}`)
          : undefined;
      return (
        <SettingsRow
          key={rel.id}
          icon={
            target ? (
              isExternal ? (
                <ExternalEntityAvatar
                  entityId={rel.mainExternalEntityId}
                  entity={external}
                  size={32}
                />
              ) : (
                <PersonAvatar
                  personId={rel.mainPersonId}
                  initials={getPersonLabel(person)}
                  size={32}
                />
              )
            ) : (
              <RowIcon bg="gray">
                <LinkIcon sx={{ fontSize: 18 }} />
              </RowIcon>
            )
          }
          title={targetName}
          subtitle={[
            getRelationTypeLabel(rel.relationType),
            rel.dates ? `Период: ${rel.dates}` : null,
            rel.notes,
          ]
            .filter(Boolean)
            .join(" · ")}
          onClick={onClick}
          trailing={onClick ? chevron : undefined}
        />
      );
    };

    return (
      <Box sx={{ p: 2 }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", px: 0.25, pt: 0.25 }}
        >
          <Box
            onClick={() => setAvatarOpen(true)}
            sx={{
              cursor: "pointer",
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              width: 52,
              height: 52,
              display: "flex",
            }}
          >
            <ExternalEntityAvatar
              entityId={entity.id}
              entity={entity}
              size={52}
              refresh={avatarRefresh}
            />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.25,
                letterSpacing: "-0.015em",
              }}
            >
              {entity.name}
            </Typography>
            <Typography
              noWrap
              sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}
            >
              {getEntityTypeLabel(entity.type)}
              {entity.birthday ? ` · ${entity.birthday}` : ""}
            </Typography>
            <Typography
              noWrap
              sx={{ fontSize: 11.5, color: "text.disabled", lineHeight: 1.4 }}
            >
              {entity.id}
              {entity.archived ? " · в архиве" : ""}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <DialogActionButton
            tone="primary"
            startIcon={<EditIcon />}
            onClick={() => setEditOpen(true)}
            sx={{ flex: 1, minWidth: 0 }}
          >
            Редактировать
          </DialogActionButton>
          <DialogActionButton
            tone="secondary"
            startIcon={<OpenInNewRoundedIcon />}
            onClick={() => navigate(`/external/${entity.id}`)}
            sx={{ flex: 1, minWidth: 0 }}
          >
            Страница
          </DialogActionButton>
        </Stack>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {hasContacts && (
            <Box>
              <Typography sx={sectionLabelSx}>Контакты</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  {!isPet && entity.phone && (
                    <SettingsRow
                      icon={
                        <RowIcon bg="green">
                          <PhoneIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={entity.phone}
                      subtitle="Телефон"
                    />
                  )}
                  {!isPet && entity.email && (
                    <SettingsRow
                      icon={
                        <RowIcon bg="blue">
                          <EmailIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={entity.email}
                      subtitle="Email"
                    />
                  )}
                  {!isPet && entity.address && (
                    <SettingsRow
                      icon={
                        <RowIcon bg="orange">
                          <HomeIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={entity.address}
                      subtitle="Адрес"
                    />
                  )}
                  {entity.birthday && (
                    <SettingsRow
                      icon={
                        <RowIcon bg="pink">
                          <CakeIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={entity.birthday}
                      subtitle="День рождения"
                    />
                  )}
                  {entity.notes && (
                    <Box sx={{ px: 2, py: 1.25 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        Заметки
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}
                      >
                        {entity.notes}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
          )}

          {relations.length === 0 ? (
            <Box>
              <Typography sx={sectionLabelSx}>Связи</Typography>
              <Box sx={groupSx}>
                <SettingsRow
                  icon={
                    <RowIcon bg="gray">
                      <LinkIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Связи не указаны"
                />
              </Box>
            </Box>
          ) : (
            relationGroups.map((groupLabel) => (
              <Box key={groupLabel}>
                <Typography sx={sectionLabelSx}>{groupLabel}</Typography>
                <Box sx={groupSx}>
                  <Stack divider={<RowDivider />}>
                    {relationGroupMap.get(groupLabel).map(renderRelationRow)}
                  </Stack>
                </Box>
              </Box>
            ))
          )}
        </Stack>

        {detailDialogs}
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Box sx={{ position: "relative", alignSelf: "flex-start" }}>
          <Box
            onClick={() => setAvatarOpen(true)}
            sx={{
              cursor: "pointer",
              display: "inline-flex",
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            <ExternalEntityAvatar
              entityId={entity.id}
              entity={entity}
              size={120}
              refresh={avatarRefresh}
            />
          </Box>
          <IconButton
            size="small"
            onClick={() => setAvatarOpen(true)}
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              bgcolor: "primary.main",
              color: "#fff",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            <PhotoCameraIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            {isPet ? (
              <PetsIcon color="secondary" />
            ) : (
              <PersonOutlineOutlinedIcon color="primary" />
            )}
            <Typography variant="h4" sx={{
              fontWeight: 800
            }}>
              {entity.name}
            </Typography>
            <Chip label={getEntityTypeLabel(entity.type)} size="small" />
          </Stack>

          <Typography
            variant="caption"
            sx={{
              mt: 1,
              display: "inline-block",
              px: 1,
              py: 0.3,
              borderRadius: "6px",
              fontFamily: "monospace",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {entity.id}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 1.5,
              flexWrap: "wrap"
            }}>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
                sx={{ ...btnStyleBlue }}
              >
                Редактировать
              </Button>
              <Button
                size="small"
                color="warning"
                startIcon={<DeleteOutlineOutlinedIcon />}
                onClick={handleArchive}
                sx={{ ...btnStyleRed }}
              >
                В корзину
              </Button>
            </Stack>
        </Box>
      </Stack>

      {(entity.notes ||
          entity.phone ||
          entity.email ||
          entity.address ||
          entity.birthday) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom sx={{
              fontWeight: 700
            }}>
              Контакты и информация
            </Typography>
            <Stack spacing={1.25}>
              {entity.notes && (
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
                >
                  {entity.notes}
                </Typography>
              )}
              {!isPet && entity.phone && (
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.phone}</Typography>
                </Stack>
              )}
              {!isPet && entity.email && (
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.email}</Typography>
                </Stack>
              )}
              {!isPet && entity.address && (
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <HomeIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.address}</Typography>
                </Stack>
              )}
              {entity.birthday && (
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <CakeIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.birthday}</Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}

      <Divider sx={{ my: 2 }} />

      <>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 1.5
        }}>
        <LinkIcon color="primary" sx={{
          fontSize: "small"
        }} />
        <Typography variant="subtitle2" sx={{
          fontWeight: 700
        }}>
          Связи с родственниками
        </Typography>
      </Stack>

      {(entity.relations || []).length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Связи не указаны
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {entity.relations.map((rel) => {
            const person = findPersonById(allPeople, rel.mainPersonId);
            const external = findExternalById(
              allExternal,
              rel.mainExternalEntityId,
            );
            return (
              <Box
                key={rel.id}
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: isDark
                    ? alpha(theme.palette.primary.main, 0.08)
                    : alpha(theme.palette.primary.main, 0.04),
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" sx={{
                  fontWeight: 600
                }}>
                  {getRelationTypeLabel(rel.relationType)}
                </Typography>
                {rel.targetKind === "external" ? (
                  external ? (
                    <Button
                      size="small"
                      onClick={() => onSelectExternal?.(external.id)}
                      sx={{ p: 0, mt: 0.5, textTransform: "none" }}
                    >
                      {getExternalEntityLabel(external)} ({external.id})
                    </Button>
                  ) : (
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      ID {rel.mainExternalEntityId}
                    </Typography>
                  )
                ) : person ? (
                  <Button
                    component={RouterLink}
                    nativeButton={false}
                    to={`/person/${person.id}`}
                    size="small"
                    sx={{ p: 0, mt: 0.5, textTransform: "none" }}
                  >
                    {getPersonLabel(person)} (ID {person.id})
                  </Button>
                ) : (
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    ID {rel.mainPersonId}
                  </Typography>
                )}
                {rel.dates && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    Период: {rel.dates}
                  </Typography>
                )}
                {rel.notes && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    {rel.notes}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      </>

      {detailDialogs}
    </Box>
  );
}
