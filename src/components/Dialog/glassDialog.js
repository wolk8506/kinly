import { alpha } from "@mui/material";
import { RADIUS } from "../../theme/designTokens";

// Стеклянный материал модального окна — одно определение на все диалоги,
// чтобы подтверждение, окно обновления и редакторы были одним и тем же слоем.
// Значения — как у карточек центра уведомлений (docs/design/patterns.md).
// Ширину и высоту каждый вызывающий задаёт сам.
export const glassPaperSx = (t) => {
  const isDark = t.palette.mode === "dark";
  return {
    maxWidth: "calc(100vw - 32px)",
    borderRadius: `${RADIUS.dialog}px`,
    backgroundImage: "none",
    overflow: "hidden",
    bgcolor: isDark ? "rgba(51,51,51,0.37)" : "rgba(255,255,255,0.65)",
    backdropFilter: "blur(25px)",
    WebkitBackdropFilter: "blur(25px)",
    border: "1px solid",
    borderColor: isDark ? "rgba(166,166,166,0.17)" : "rgba(0,0,0,0.08)",
    boxShadow: isDark
      ? "0 18px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 18px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.8)",
  };
};

// Затемнение под модалкой — ослабленное, чтобы стекло читалось.
export const glassBackdropSx = {
  bgcolor: "rgba(0,0,0,0.28)",
};

// Серая пилюля — левая, необязательная кнопка в панели действий.
export const secondaryButtonSx = (t) => {
  const isDark = t.palette.mode === "dark";
  return {
    bgcolor: isDark
      ? "rgba(12,12,12,0.9)"
      : alpha(t.palette.common.black, 0.06),
    "&:hover": {
      bgcolor: isDark
        ? "rgba(24,24,24,0.95)"
        : alpha(t.palette.common.black, 0.1),
    },
  };
};
