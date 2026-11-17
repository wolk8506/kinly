// Общие стили полевых блоков диалогов в стиле добавления фото:
// секция с подписью → поле-блок (радиус 12, тинт) → строки 36px
// (иконка 18px + текст, зазор 12px) или borderless-инпуты.
// См. docs/design/patterns.md → «Form dialog — поля и секции».

export const sectionLabelSx = {
  display: "block",
  mb: 1,
  ml: "12px",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "text.secondary",
};

export const fieldBlockSx = {
  borderRadius: "12px",
  overflow: "hidden",
  bgcolor: (t) =>
    t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
};

export const fieldRowSx = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  px: "12px",
  py: "9px",
  minWidth: 0,
};

export const fieldTitleSx = {
  fontSize: "0.815rem",
  fontWeight: 600,
  lineHeight: 1.35,
  color: "text.primary",
};

export const fieldValueSx = {
  fontSize: "0.815rem",
  fontWeight: 500,
  lineHeight: 1.35,
};

// Borderless-инпут внутри fieldRow/fieldBlock. Важно: lineHeight "inherit"
// у внутреннего input/textarea — у MUI InputBase свой line-height 1.4375,
// без inherit строка поля получается ~36.7px вместо 36px.
export const inputSx = {
  width: "100%",
  px: "12px",
  py: "9px",
  fontSize: "0.815rem",
  fontWeight: 500,
  lineHeight: 1.35,
  color: "text.primary",
  "& input, & textarea": { p: 0, lineHeight: "inherit" },
};
