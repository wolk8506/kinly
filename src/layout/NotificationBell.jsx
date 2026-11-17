import {
  IconButton,
  Popover,
  Box,
  Typography,
  Button,
  Stack,
  useTheme,
  lighten,
} from "@mui/material";
import BellFillIcon from "../components/svg/BellFillIcon";
import BellBadgeFillIcon from "../components/svg/BellBadgeFillIcon";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useNotificationStore } from "../store/useNotificationStore";
import { useState, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import { formatNotificationDate } from "../utils/formatDate";
import TrashFillIcon from "../components/svg/TrashFillIcon";
import EventIcon from "@mui/icons-material/Event";
import InfoIcon from "@mui/icons-material/Info";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PieChartIcon from "@mui/icons-material/PieChart";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import ButtonConteiner from "../components/ButtonConteiner";
import GlassBubbleLayers from "../components/GlassBubbleLayers";

const notificationIcon = {
  trash: <TrashFillIcon />,
  people: <PermIdentityIcon />,
  photo: <PhotoLibraryIcon />,
  fact: <InfoIcon />,
  event: <EventIcon />,
  dangerZone: <WarningAmberIcon />,
  optimizationMaster: <AutoFixHighIcon />,
  dataManagement: <PieChartIcon />,
  faceReview: <FaceRetouchingNaturalIcon />,
};

const STATUS_CONFIG = {
  success: { palette: "success" },
  error: { palette: "error" },
  info: { palette: "info" },
  warning: { palette: "warning" },
};

export const NotificationBell = () => {
  const theme = useTheme();
  const {
    notifications,
    hasNew,
    markAsSeen,
    clearNewStatus,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const visibleNotifications = showAllNotifications ? notifications : notifications.slice(0, 5);
  const bottomStackLayers = Math.min(2, Math.max(0, notifications.length - 5));
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";
  const tailBg = isDark ? "rgba(51,51,51,0.37)" : "rgba(255,255,255,0.65)";
  const tailBorder = isDark
    ? "rgba(166,166,166,0.17)"
    : "rgba(0,0,0,0.08)";

  // Общий «пузырный» стиль карточек — как у GlassBubbleLayers.
  const glassCardSx = {
    borderRadius: "16px",
    bgcolor: tailBg,
    backdropFilter: "blur(25px)",
    WebkitBackdropFilter: "blur(25px)",
    border: "1px solid",
    borderColor: tailBorder,
  };

  // Позиция кончика хвостика — строго над центром колокольчика,
  // с учётом возможного сдвига поповера у краёв экрана.
  const headerRef = useRef(null);
  const [tipX, setTipX] = useState(172);
  useLayoutEffect(() => {
    if (!anchorEl || !headerRef.current) return;
    const hr = headerRef.current.getBoundingClientRect();
    const ar = anchorEl.getBoundingClientRect();
    const cx = ar.left + ar.width / 2 - hr.left;
    setTipX(Math.min(Math.max(cx, 24), hr.width - 24));
  }, [anchorEl]);

  const handleOpen = (event) => {
    setShowAllNotifications(false);
    setAnchorEl(event.currentTarget);
    markAsSeen();
  };

  const handleClose = () => {
    setShowAllNotifications(false);
    setAnchorEl(null);
    clearNewStatus();
  };

  const buttonName = (data) => {
    if (typeof data !== "string") return "Детали ▸";
    if (data.includes("/person/")) return "К человеку ▸";
    if (data.includes("/external")) return "В справочник ▸";
    if (data.includes("/trash")) return "Корзина ▸";
    return "Детали ▸";
  };

  return (
    <>
      <Box sx={{ ml: 2, mr: 2, display: "inline-flex", WebkitAppRegion: "no-drag" }}>
        <ButtonConteiner>
          <IconButton
            onClick={handleOpen}
            aria-label="Уведомления"
            aria-expanded={Boolean(anchorEl)}
            sx={{
              p: 0,
              color: "inherit",
            }}
          >
            {hasNew ? (
              <BellBadgeFillIcon sx={{ fontSize: 18 }} />
            ) : (
              <BellFillIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </ButtonConteiner>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        elevation={0} // Убираем тень самого поповера
        slotProps={{
          paper: {
            sx: {
              width: 360,
              mt: 1.5,
              bgcolor: "transparent", // Убираем общий фон
              boxShadow: "none",
              backgroundImage: "none",
              border: "none",
              overflow: "visible",
              maxHeight: "calc(100vh - 24px)",
            },
          }
        }}
      >
        {/* ШАПКА — единый стеклянный пузырь с хвостиком, как у меню тулбаров */}
        <Box
          ref={headerRef}
          sx={{ position: "relative", width: 344, mx: "auto" }}
        >
          <style>{`
            .MuiIconButton-root.notif-delete-btn:hover:not(.Mui-disabled) {
              background-color: #ffffff !important;
            }
          `}</style>
          <GlassBubbleLayers tail="top" tipX={tipX} />
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              p: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Центр уведомлений ({notifications.length})
          </Typography>
          {notifications.length > 0 && (
            <Button
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={() => {
                clearAll();
                handleClose();
              }}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { color: "error.main" },
              }}
            >
              Очистить
            </Button>
          )}
          </Box>
        </Box>

        {/* СПИСОК КАРТОЧЕК */}
        <Box
          sx={{
            height: showAllNotifications ? "calc(100vh - 150px)" : "auto",
            maxHeight: showAllNotifications ? "calc(100vh - 150px)" : "none",
            overflowY: showAllNotifications ? "auto" : "visible",
            overscrollBehavior: "contain",
            pt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            // px: 0.5,
            pb: 3, // Запас для видимости стопки внизу
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            mb: 2,
            width: 356,
            mr: "auto",
            ml: "auto",
          }}
        >
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Box
                  sx={{
                    p: 2,
                    textAlign: "center",
                    width: 344,
                    mx: "auto",
                    ...glassCardSx,
                  }}
                >
                  <Typography variant="body2" sx={{
                    color: "text.disabled"
                  }}>
                    Нет новых уведомлений
                  </Typography>
                </Box>
              </motion.div>
            ) : (
              visibleNotifications.map((note, index) => {
                const status = STATUS_CONFIG[note.type] || STATUS_CONFIG.info;
                const statusColor = theme.palette[status.palette].main;

                return (
                  <motion.div
                    key={note.id} // Важно: key должен быть уникальным ID уведомления
                    layout="position" // Анимируем положение без изменения размеров
                    initial={false}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 1.1,
                      transition: { duration: 0.3, ease: "easeOut" },
                    }}
                    style={{ originX: 0.5, originY: 0.5, position: "relative", zIndex: 5 - index }} // Центр трансформации
                  >
                    {bottomStackLayers > 0 && index === 4 && !showAllNotifications && (
                      <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                        {Array.from({ length: bottomStackLayers }, (_, layerIndex) => {
                          const depth = bottomStackLayers - layerIndex;
                          return (
                            <Box
                              key={depth}
                              sx={{
                                position: "absolute",
                                inset: `0 ${depth * 16}px -${depth * 8}px`,
                                zIndex: layerIndex,
                                ...glassCardSx,
                                boxShadow: `0 ${depth * 2 + 1}px ${depth * 5 + 4}px rgba(0,0,0,0.12)`,
                              }}
                            />
                          );
                        })}
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: "relative",
                        zIndex: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: 344,
                        height: 72,
                        minHeight: 72,
                        boxSizing: "border-box",
                        mx: "auto",
                        p: "12px 14px 12px 10px",
                        color: "text.primary",
                        ...glassCardSx,
                        transition:
                          "background-color 0.2s ease, transform 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          "& .button": { opacity: 1 },
                        },
                      }}
                    >
                      {/* КНОПКА УДАЛЕНИЯ */}
                      <IconButton
                        className="button notif-delete-btn"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(note.id);
                        }}
                        sx={{
                          position: "absolute",
                          top: -6,
                          left: -6,
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                          color: "rgba(0,0,0,0.65)",
                          p: 0,
                          bgcolor: lighten(
                            theme.palette.background.paper,
                            0.15,
                          ),
                          zIndex: 10,
                          "&:hover": {
                            color: "rgba(0,0,0,0.85)",
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>

                      {(note.link || note.category === "faceReview") && (
                        <Button
                          className="button"
                          size="small"
                          onClick={() => {
                            if (note.category === "faceReview") {
                              navigate("/settings/faces/review");
                            } else {
                              navigate(note.link);
                            }
                            handleClose();
                          }}
                          sx={{
                            color: statusColor,
                            opacity: 0,
                            py: 0,
                            transition: "opacity 0.2s ease",
                            textTransform: "none",
                            fontWeight: 700,
                            position: "absolute",
                            bottom: 6,
                            right: 12,
                            bgcolor: lighten(
                              theme.palette.background.paper,
                              0.15,
                            ),
                          }}
                        >
                          {note.category === "faceReview"
                            ? "Проверить ▸"
                            : buttonName(note.link)}
                        </Button>
                      )}

                      <Box
                        sx={{
                          display: "flex",
                          flex: "0 0 40px",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 48,
                          "& svg": { width: 32, height: 32 },
                        }}
                      >
                        {notificationIcon[note.category]}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: "center", minWidth: 0 }}
                          >
                            {note.isNew && (
                              <CircleIcon
                                sx={{
                                  fontSize: 10,
                                  color: statusColor,
                                  opacity: 0.8,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 700,
                                lineHeight: "16px",
                                letterSpacing: "-0.02em",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {note.title}
                            </Typography>
                          </Stack>
                          <Typography
                            sx={{
                              flexShrink: 0,
                              fontSize: 11,
                              fontWeight: 400,
                              lineHeight: "14px",
                              color: "text.disabled",
                            }}
                          >
                            {formatNotificationDate(note.timestamp)}
                          </Typography>
                        </Stack>

                        <Typography
                          sx={{
                            mt: 0.25,
                            fontSize: 13,
                            fontWeight: 400,
                            lineHeight: "16px",
                            letterSpacing: "-0.008em",
                            whiteSpace: "pre-line",
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                            overflow: "hidden",
                            color: "text.secondary",
                          }}
                        >
                          {note.message}
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
          {!showAllNotifications && notifications.length > 5 && (
            <Button
              size="small"
              onClick={() => setShowAllNotifications(true)}
              sx={{
                alignSelf: "center",
                mt: "12px",
                minHeight: 28,
                minWidth: 0,
                px: 1.5,
                py: 0,
                borderRadius: 999,
                border: `1px solid ${tailBorder}`,
                bgcolor: tailBg,
                color: "text.secondary",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                fontSize: 12,
                lineHeight: 1,
                textTransform: "none",
                "&:hover": {
                  bgcolor: isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(0,0,0,0.05)",
                },
              }}
            >
              Показать все
            </Button>
          )}
        </Box>
      </Popover>
    </>
  );
};
