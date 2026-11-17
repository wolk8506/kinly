import React from "react";
import { Box, Popover, Typography } from "@mui/material";
import BackspaceIcon from "@mui/icons-material/Backspace";
import CropFreeIcon from "@mui/icons-material/CropFree";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import MouseIcon from "@mui/icons-material/Mouse";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import OpenWithIcon from "@mui/icons-material/OpenWith";
import GlassBubbleLayers from "./GlassBubbleLayers";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../layout/toolbarTokens";

const HELP_ROWS = [
  {
    Icon: FaceRetouchingNaturalIcon,
    color: "blue",
    title: "Найти",
    text: "авто-поиск всех лиц на фото",
  },
  {
    Icon: MouseIcon,
    color: "orange",
    title: "ЛКМ по рамке",
    text: "выбор лица",
  },
  {
    Icon: OpenInFullIcon,
    color: "purple",
    title: "Точка справа внизу",
    text: "ЛКМ — изменение размера рамки",
  },
  {
    Icon: CropFreeIcon,
    color: "teal",
    title: "ПКМ + перетаскивание",
    text: "рисование новой рамки",
  },
  {
    Icon: OpenWithIcon,
    color: "green",
    title: "ЛКМ + перетаскивание",
    text: "перемещение выбранной рамки",
  },
  {
    Icon: BackspaceIcon,
    color: "pink",
    title: "Backspace",
    text: "удалить выделенную рамку",
  },
];

// Подсказка «Управление рамками» — строки как у «Управление деревом»
// (иконка + действие + описание), панель — стеклянный пузырь
// GlassBubbleLayers (хвостик + сплошная рамка + blur по контуру).
export default function FaceFramesHelpPopover({
  anchorEl,
  onClose,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
  transformOrigin = { vertical: "top", horizontal: "left" },
  arrowSide = "center",
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{
        paper: {
          sx: {
            mt: 2,
            minWidth: 280,
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
      <GlassBubbleLayers arrowSide={arrowSide} />
      <Box sx={{ position: "relative", zIndex: 1, py: 0.5 }}>
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            display: "block",
            color: "primary.main",
            fontWeight: 700,
          }}
        >
          Управление рамками
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
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  lineHeight: 1.3,
                  color: "text.secondary",
                }}
              >
                {text}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Popover>
  );
}
