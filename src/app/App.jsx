import React, { useEffect, useMemo, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useSnackbar } from "notistack";

import MainLayout from "../layout/MainLayout";
import { ThemeContext } from "../theme/ThemeContext.js";
import { useSettingsStore } from "../store/useSettingsStore";
import { getPalette } from "../theme/palette";
import { MOTION, RADIUS } from "../theme/designTokens";
import appIcon from "../../build/icons/icon.png";

// Системный шрифт: SF Pro на macOS, Segoe UI на Windows.
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

const wave = keyframes`
  0%, 100% { opacity: 0.12; }
  50% { opacity: 1; }
`;

// Точки iOS-спиннера: цвета по кругу, как в boot-splash (index.html).
const BOOT_DOT_COLORS = [
  "#7f9cff", "#78a7f5", "#71b2ec", "#6abde2",
  "#63c8d9", "#5bd3cf", "#54ddc5", "#5cd1d0",
  "#65c4dc", "#6eb7e8", "#76a9f3", "#7f9cff",
];

const compactButton = {
  height: 24,
  minHeight: 24,
  padding: "0 18px",
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1.2,
  "& .MuiButton-startIcon": {
    mr: 0.5,
    ml: 0,
    "& > *:nth-of-type(1)": { fontSize: 16 },
  },
};

export default function App() {
  const [mode, setMode] = useState("light"); // фактическая тема
  const [auto, setAuto] = useState(true); // следовать за системой
  const [userPref, setUserPref] = useState("light"); // ручной выбор
  const [themeReady, setThemeReady] = useState(false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadSettings(); // Загружаем настройки из БД в память при старте
  }, []);

  // Старт мог произойти не с той папкой данных (внешний диск отключён,
  // нет прав доступа). Показываем это один раз после загрузки окна.
  useEffect(() => {
    let cancelled = false;
    const api = window.storageAPI;
    if (!api?.consumeStartupNotice) return undefined;

    api
      .consumeStartupNotice()
      .then((notice) => {
        if (cancelled || !notice) return;
        if (notice.kind === "fallback") {
          enqueueSnackbar(
            `Папка «${notice.from}» недоступна. Включена стандартная: ${notice.to}. Прежнюю папку можно вернуть в настройках.`,
            { variant: "warning", autoHideDuration: 12000 },
          );
        } else if (notice.kind === "unavailable") {
          enqueueSnackbar(
            "Нет доступа к папке данных. Выберите другое место хранения в настройках.",
            { variant: "error", autoHideDuration: 12000 },
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  // начальная загрузка
  useEffect(() => {
    const savedAuto = localStorage.getItem("theme-auto");
    const savedPref = localStorage.getItem("theme-user");

    const autoEnabled = savedAuto !== "false"; // по умолчанию true
    setAuto(autoEnabled);
    setUserPref(savedPref || "light");

    if (autoEnabled && window.themeAPI) {
      window.themeAPI.get().then((systemTheme) => {
        setMode(systemTheme);
        setThemeReady(true); // 🎯 тема загружена
      });
      window.themeAPI.onChange?.(setMode);
    } else {
      setMode(autoEnabled ? "light" : savedPref || "light");
      setThemeReady(true); // 🎯 можно рендерить
    }
  }, []);

  // при изменении auto или userPref
  useEffect(() => {
    localStorage.setItem("theme-auto", auto);
    localStorage.setItem("theme-user", userPref);

    if (auto && window.themeAPI) {
      window.themeAPI.get().then(setMode);
    } else if (!auto) {
      setMode(userPref);
    }
  }, [auto, userPref]);

  useEffect(() => {
    if (!themeReady) return;
    document.body.style.background = getPalette(mode).background.default;
    window.windowAPI?.setCaptionTheme?.(mode === "dark");
  }, [themeReady, mode]);

  // Кольцо фокуса включаем только при клавиатурной модальности: браузер
  // считает программный фокус «клавиатурным», если предыдущий элемент
  // удалён из DOM, — из-за этого autoFocus в диалогах рисует кольцо, хотя
  // клавиатуру не трогали.
  useEffect(() => {
    const root = document.documentElement;
    const onKey = () => root.setAttribute("data-kbd", "1");
    const onPointer = () => root.removeAttribute("data-kbd");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
      root.removeAttribute("data-kbd");
    };
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: getPalette(mode),
        transitions: {
          easing: {
            // Встроенные кривые MUI слабые: вход должен начинаться сразу.
            easeOut: MOTION.easeOut,
            easeInOut: MOTION.easeInOut,
          },
        },
        typography: {
          fontFamily: SYSTEM_FONT,
        },
        components: {
          // 1. Глобальные стили (ваши скроллбары)
          MuiCssBaseline: {
            styleOverrides: (themeParam) => ({
              "*::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "*::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "*::-webkit-scrollbar-thumb": {
                backgroundColor:
                  themeParam.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
                border: "2px solid transparent",
                backgroundClip: "content-box",

                /* Тут добавляем анимацию */
                transition: "background-color 0.3s ease, width 0.3s ease",
              },
              "*::-webkit-scrollbar-thumb:hover": {
                backgroundColor:
                  themeParam.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(0, 0, 0, 0.4)",

                /* И увеличиваем толщину */
                width: "12px",
              },

              /* Firefox (ограниченная поддержка) */
              "*": {
                scrollbarWidth: "thin",
                scrollbarColor: `${themeParam.palette.divider} transparent`,
              },

              /* Уважаем системную настройку «Уменьшить движение»: анимации
                 и переходы становятся мгновенными, а не исчезают совсем. */
              "@media (prefers-reduced-motion: reduce)": {
                "*": {
                  animationDuration: "0.01ms !important",
                  animationIterationCount: "1 !important",
                  transitionDuration: "0.01ms !important",
                  scrollBehavior: "auto !important",
                },
              },

              /* Видимый фокус для клавиатуры: мышь его не показывает. */
              "[data-kbd] .MuiButtonBase-root:focus-visible": {
                outline: `2px solid ${themeParam.palette.primary.main}`,
                outlineOffset: 2,
              },

              /* Ховер кнопок — лёгкий оттенок их собственного (активного)
                 цвета, а не серый action.hover. Включены только «плоские»
                 варианты (outlined/text) и иконко-кнопки; у contained
                 ховер и так = затемнённый цвет кнопки.
                 [data-accent] — кнопки с активным фоном красят ховер сами,
                 иначе белый оттенок съедает их цвет. */
              ".MuiButton-outlined:hover:not(.Mui-disabled):not([data-accent]), .MuiButton-text:hover:not(.Mui-disabled):not([data-accent]), .MuiIconButton-root:hover:not(.Mui-disabled):not([data-accent]), .MuiToggleButton-root:hover:not(.Mui-disabled), .MuiButtonGroup-root .MuiButton-outlined:hover:not(.Mui-disabled)":
                {
                  backgroundColor:
                    "color-mix(in srgb, currentColor 12%, transparent) !important",
                },
            }),
          },

          // 2. Скругление для всех текстовых полей
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: `${RADIUS.control}px`, // Установите нужное значение (например, 12px или 16px)
                // Можно также сразу задать стили для рамок, если нужно
                "& .MuiOutlinedInput-notchedOutline": {
                  transition: "border-color 0.2s ease-in-out",
                },
              },
            },
          },

          // 3. Единая геометрия обычных кнопок: высота 24, radius 12,
          // вторичные — с лёгкой нейтральной заливкой вместо рамки.
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: `${RADIUS.control}px`,
                textTransform: "none", // Убирает капс у кнопок (обычно хорошо смотрится со скруглениями)
              },
              sizeSmall: compactButton,
              sizeMedium: compactButton,
              outlined: {
                border: 0,
                backgroundColor: "rgba(128, 128, 128, 0.12)",
                "&:hover:not(.Mui-disabled)": {
                  backgroundColor: "rgba(128, 128, 128, 0.2) !important",
                },
              },
            },
          },

          // 4. Скругление для выпадающих списков (Paper внутри Select/Autocomplete)
          MuiPaper: {
            styleOverrides: {
              rounded: {
                borderRadius: `${RADIUS.card}px`,
              },
            },
          },

          // Диалоги — единое скругление и без градиентной заливки Paper.
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: `${RADIUS.dialog}px`,
                backgroundImage: "none",
              },
            },
          },

          // 5. Тултипы как в macOS: первая задержка ~0.6с,
          // последующие после недавнего тултипа — почти мгновенно,
          // после паузы задержка снова включается.
          MuiTooltip: {
            defaultProps: {
              enterDelay: 600,
              enterNextDelay: 150,
              leaveDelay: 0,
            },
          },

          // 6. Глобальная настройка для всех TextField (включая DatePicker)
          MuiTextField: {
            defaultProps: {
              size: "small", // Чтобы везде по умолчанию был маленький размер
            },
            styleOverrides: {
              root: {
                // Гарантируем, что радиус из OutlinedInput применится здесь
                "& .MuiOutlinedInput-root": {
                  borderRadius: `${RADIUS.control}px`,
                },
              },
            },
          },

          // 6. Специально для полей DatePicker (если они используют внутренние стили)
          MuiInputBase: {
            styleOverrides: {
              root: {
                borderRadius: `${RADIUS.control}px`,
              },
            },
          },

          // 7. Фикс специально для MUI X (v7+) - Поля ввода календарей
          MuiPickersOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: `${RADIUS.control}px`, // Тот же радиус, что и везде
                "& .MuiOutlinedInput-notchedOutline": {
                  transition: "border-color 0.2s ease-in-out",
                },
              },
            },
          },

          // На всякий случай для других типов полей MUI X (если используете стандартные или заполненные)
          MuiPickersInputBase: {
            styleOverrides: {
              root: {
                borderRadius: `${RADIUS.control}px`,
              },
            },
          },
        },
      }),
    [mode],
  );

  if (!themeReady) {
    return (
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          bgcolor: "#05070d",
          background:
            "radial-gradient(1200px 600px at 20% 20%, rgba(49,84,255,0.18), transparent 55%), radial-gradient(900px 600px at 80% 70%, rgba(0,219,176,0.13), transparent 60%), linear-gradient(160deg, #05070d 0%, #0b1021 45%, #06080f 100%)",
        }}
      >
        {/* Тот же layout, что в pre-React splash (index.html): логотип
            148px + спиннер 44px — переход между экранами незаметен. */}
        <Box
          sx={{
            width: 220,
            height: 220,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
          }}
        >
          <Box
            component="img"
            src={appIcon}
            alt="Kinly"
            sx={{ width: 148, height: 148, objectFit: "contain" }}
          />
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{ width: 44, height: 44, flexShrink: 0 }}
          >
            {BOOT_DOT_COLORS.map((color, i) => (
              <Box
                component="circle"
                key={i}
                cx={92}
                cy={50}
                r={4}
                fill={color}
                transform={i === 0 ? undefined : `rotate(${i * 30} 50 50)`}
                sx={{
                  animation: `${wave} 1.2s ease-in-out infinite`,
                  animationDelay: `${-(BOOT_DOT_COLORS.length - 1 - i) * 0.1}s`,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <ThemeContext.Provider value={{ auto, setAuto, userPref, setUserPref }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainLayout />
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
