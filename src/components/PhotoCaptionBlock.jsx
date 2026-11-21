import React from "react";
import { Box, Divider, InputBase } from "@mui/material";
import HashtagInput from "./HashtagInput";

const BODY_FONT_SIZE = "0.815rem";
const BODY_FONT_WEIGHT = 500;
const TITLE_FONT_SIZE = "1.125rem";
const TITLE_FONT_WEIGHT = 600;

export default function PhotoCaptionBlock({
  title = "",
  description = "",
  onTitleChange,
  onDescriptionChange,
  tagSuggestions = [],
  onTitleBlur,
  onDescriptionBlur,
  onTitleEscape,
  onDescriptionEscape,
}) {
  const hasTitle = Boolean(title?.trim());
  const hasDescription = Boolean(description?.trim());
  const showDivider = !(hasTitle && hasDescription);

  return (
    <Box
      sx={{
        borderRadius: "12px",
        position: "relative",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
      }}
    >
      <InputBase
        fullWidth
        multiline
        minRows={1}
        maxRows={6}
        placeholder="Название"
        value={title}
        onChange={(e) => onTitleChange?.(e.target.value)}
        onBlur={onTitleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.stopPropagation();
            onTitleEscape?.();
            e.currentTarget.blur();
          }
        }}
        sx={{
          display: "block",
          width: "100%",
          px: 1.5,
          pt: 1.15,
          pb: showDivider ? 1.15 : hasDescription ? 0.35 : 0.85,
          fontSize: TITLE_FONT_SIZE,
          fontWeight: hasTitle ? TITLE_FONT_WEIGHT : BODY_FONT_WEIGHT,
          lineHeight: 1.35,
          color: "text.primary",
          "& textarea": {
            p: 0,
            resize: "none",
          },
          "& input::placeholder, & textarea::placeholder": {
            color: "text.secondary",
            opacity: 1,
          },
        }}
      />

      {showDivider ? (
        <Divider
          sx={{
            opacity: 0.35,
            mx: 1.25,
            borderColor: "divider",
          }}
        />
      ) : null}

      <HashtagInput
        variant="inset"
        value={description}
        onChange={onDescriptionChange}
        suggestions={tagSuggestions}
        placeholder="Описание и #теги"
        onBlur={onDescriptionBlur}
        onEscape={onDescriptionEscape}
      />
    </Box>
  );
}