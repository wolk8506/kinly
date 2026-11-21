import React from "react";
import { Box, Popover, Typography } from "@mui/material";
import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import ImageIcon from "@mui/icons-material/Image";
import MouseIcon from "@mui/icons-material/Mouse";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import TuneIcon from "@mui/icons-material/Tune";
import GlassBubbleLayers from "../../components/GlassBubbleLayers";
import { TOOLBAR_HIT } from "../../layout/toolbarTokens";

const HELP_ROWS = [
  {
    Icon: ImageIcon,
    color: "blue",
    title: "Точки",
    text: "фото по EXIF, события и справочник по местам — цвета в легенде",
  },
  {
    Icon: MouseIcon,
    color: "orange",
    title: "Клик по точке",
    text: "карточка и переход к фото, событию или записи справочника",
  },
  {
    Icon: EditLocationAltIcon,
    color: "purple",
    title: "«Исправить место»",
    text: "в карточке точки: перетащите пин или найдите место поиском",
  },
  {
    Icon: TuneIcon,
    color: "teal",
    title: "Фильтры",
    text: "«Кто на карте?», слои и «Обновить» — на верхней панели",
  },
  {
    Icon: FitScreenIcon,
    color: "green",
    title: "Все точки",
    text: "кнопка справа вверху карты",
  },
  {
    Icon: MyLocationIcon,
    color: "pink",
    title: "Моё местоположение",
    text: "в переключателе подложки справа вверху",
  },
];

// Подсказка «Управление картой» — стеклянный пузырь GlassBubbleLayers
// с боковым хвостиком вправо (кнопка «?» под «Показать все точки»).
// Окно смещено от кнопки: вверх на 98px, влево на 18px;
// хвостик — на уровне центра кнопки.
export default function MapHelpPopover({ anchorEl, onClose }) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorReference="anchorPosition"
      anchorPosition={
        anchorEl
          ? { top: anchorEl.top - 98, left: anchorEl.left - 16 }
          : undefined
      }
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            minWidth: 300,
            background: "none",
            backgroundImage: "none",
            boxShadow: "none",
            border: "none",
            borderRadius: 0,
            overflow: "visible",
          },
        },
      }}
    >
      <GlassBubbleLayers tail="right" tipY={116} />
      <Box sx={{ position: "relative", zIndex: 1, py: 0.5 }}>
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            display: "block",
            color: (t) =>
              t.palette.mode === "dark" ? "#fff" : t.palette.text.primary,
            fontWeight: 700,
          }}
        >
          Управление картой
        </Typography>

        {HELP_ROWS.map(({ Icon, color, title, text }) => (
          <Box
            key={title}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 0.6,
              whiteSpace: "nowrap",
            }}
          >
            <Icon
              sx={{
                fontSize: TOOLBAR_HIT.iconSize,
                flexShrink: 0,
                color: (t) => t.palette.accents?.[color] || "text.secondary",
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.8rem", lineHeight: 1.3 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", lineHeight: 1.3 }}>
                {text}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Popover>
  );
}
