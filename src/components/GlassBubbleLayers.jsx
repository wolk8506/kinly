import React, { useId, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Контур пузыря в реальных пикселях: скруглённый прямоугольник +
// скруглённый хвостик. Размер поповера измеряется через ResizeObserver,
// поэтому хвостик выглядит одинаково при любой высоте/ширине меню.
// Для хвостиков сверху/снизу svg приподнят/опущен на 14px, для бокового —
// удлинён на 14px вправо.
const RAISE_PX = 14;

function bubblePath(tipX, W, H, mx = (v) => v, my = (v) => v) {
  const r = 16;
  const top = 13.74;
  const bottom = H;
  const X = mx;
  const Y = my;
  const clampTopL = Math.max(tipX - 20, r + 2);
  const clampTopR = Math.min(tipX + 20, W - r - 2);
  const tipL = [tipX - 5.2, 6.4];
  const tipR = [tipX + 5.2, 6.4];
  const tipC = [tipX, -1.0];
  const edgeL = [tipX - 10.5, top - 3];
  const edgeR = [tipX + 10.5, top - 3];
  const c1L = [tipX - 16.5, top];
  const c2L = [tipX - 12.5, top - 1.5];
  const c1R = [tipX + 12.5, top - 1.5];
  const c2R = [tipX + 16.5, top];
  return [
    `M ${X(clampTopL)} ${Y(top)}`,
    `C ${X(c1L[0])} ${Y(c1L[1])} ${X(c2L[0])} ${Y(c2L[1])} ${X(edgeL[0])} ${Y(edgeL[1])}`,
    `L ${X(tipL[0])} ${Y(tipL[1])}`,
    `Q ${X(tipC[0])} ${Y(tipC[1])} ${X(tipR[0])} ${Y(tipR[1])}`,
    `L ${X(edgeR[0])} ${Y(edgeR[1])}`,
    `C ${X(c1R[0])} ${Y(c1R[1])} ${X(c2R[0])} ${Y(c2R[1])} ${X(clampTopR)} ${Y(top)}`,
    `L ${X(W - r - 1)} ${Y(top)}`,
    `Q ${X(W - 1)} ${Y(top)} ${X(W - 1)} ${Y(top + r)}`,
    `L ${X(W - 1)} ${Y(bottom - r)}`,
    `Q ${X(W - 1)} ${Y(bottom)} ${X(W - r - 1)} ${Y(bottom)}`,
    `L ${X(r + 1)} ${Y(bottom)}`,
    `Q ${X(1)} ${Y(bottom)} ${X(1)} ${Y(bottom - r)}`,
    `L ${X(1)} ${Y(top + r)}`,
    `Q ${X(1)} ${Y(top)} ${X(r + 1)} ${Y(top)}`,
    "Z",
  ].join(" ");
}

// Боковой хвостик справа: повёрнутая на 90° версия верхнего —
// основание ~24px по вертикали, вылет ~11.5px за правый край.
function bubblePathRight(tipY, panelW, panelH, mx = (v) => v, my = (v) => v) {
  const r = 16;
  const RX = panelW - 1;
  const top = 1;
  const bottom = panelH;
  const X = mx;
  const Y = my;
  const ty = Math.min(Math.max(tipY, top + r + 26), bottom - r - 26);
  const tipAX = RX + 7;
  const tipCtrlX = RX + 17.5;
  const baseT = ty - 21;
  const baseB = ty + 21;
  const edgeT = ty - 11;
  const edgeB = ty + 11;
  return [
    `M ${X(r + 1)} ${Y(top)}`,
    `L ${X(RX - r - 1)} ${Y(top)}`,
    `Q ${X(RX)} ${Y(top)} ${X(RX)} ${Y(top + r)}`,
    `L ${X(RX)} ${Y(baseT)}`,
    `C ${X(RX)} ${Y(ty - 17)} ${X(RX + 1)} ${Y(ty - 13)} ${X(RX + 3)} ${Y(edgeT)}`,
    `L ${X(tipAX)} ${Y(ty - 5.2)}`,
    `Q ${X(tipCtrlX)} ${Y(ty)} ${X(tipAX)} ${Y(ty + 5.2)}`,
    `L ${X(RX + 3)} ${Y(edgeB)}`,
    `C ${X(RX + 1)} ${Y(ty + 13)} ${X(RX)} ${Y(ty + 17)} ${X(RX)} ${Y(baseB)}`,
    `L ${X(RX)} ${Y(bottom - r)}`,
    `Q ${X(RX)} ${Y(bottom)} ${X(RX - r - 1)} ${Y(bottom)}`,
    `L ${X(r + 1)} ${Y(bottom)}`,
    `Q ${X(1)} ${Y(bottom)} ${X(1)} ${Y(bottom - r)}`,
    `L ${X(1)} ${Y(top + r)}`,
    `Q ${X(1)} ${Y(top)} ${X(r + 1)} ${Y(top)}`,
    "Z",
  ].join(" ");
}

// Три слоя на одном контуре: заливка+тень (svg), стекло через clip-path
// (blur только внутри формы, включая хвостик), сплошная обводка (svg).
// Рендерить первым ребёнком внутри Popover — paper должен быть
// прозрачным (background/boxShadow/border выключены).
export default function GlassBubbleLayers({
  arrowSide = "center",
  tipX,
  tipY,
  tail = "top",
}) {
  const theme = useTheme();
  const clipId = `gb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const isDark = theme.palette.mode === "dark";
  const glassBg = isDark ? "rgba(51,51,51,0.37)" : "rgba(255,255,255,0.65)";
  const glassBorder = isDark
    ? "rgba(166,166,166,0.17)"
    : "rgba(0,0,0,0.08)";

  const isSide = tail === "right";
  // svg имеет width:100% (+14px вправо для бокового хвоста) и
  // height:calc(100% + 14px) для верхнего/нижнего — по нему
  // восстанавливаем реальный размер панели в пикселях.
  const measureRef = useRef(null);
  const [size, setSize] = useState(null);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return undefined;
    const update = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const next = isSide
        ? { panelW: cw - RAISE_PX, panelH: ch, svgW: cw, svgH: ch }
        : { panelW: cw, panelH: ch - RAISE_PX, svgW: cw, svgH: ch };
      setSize((prev) =>
        prev &&
        prev.panelW === next.panelW &&
        prev.panelH === next.panelH &&
        prev.svgW === next.svgW &&
        prev.svgH === next.svgH
          ? prev
          : next,
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSide]);

  const layerStyle = {
    position: "absolute",
    top: tail === "top" ? -RAISE_PX : 0,
    left: 0,
    width: isSide ? `calc(100% + ${RAISE_PX}px)` : "100%",
    height: isSide ? "100%" : `calc(100% + ${RAISE_PX}px)`,
    overflow: "visible",
    pointerEvents: "none",
    display: "block",
  };

  if (!size || size.panelW <= 0 || size.panelH <= 0) {
    return (
      <svg
        ref={measureRef}
        aria-hidden="true"
        style={{ ...layerStyle, visibility: "hidden" }}
      />
    );
  }

  const { panelW, panelH, svgW, svgH } = size;
  const bubbleD = isSide
    ? bubblePathRight(
        tipY ?? panelH * 0.3,
        panelW,
        panelH,
      )
    : bubblePath(
        tipX ??
          (arrowSide === "right" || arrowSide === "bottom-right"
            ? panelW - (arrowSide === "bottom-right" ? 18 : 40)
            : arrowSide === "left"
              ? 38
              : panelW / 2),
        svgW,
        svgH,
        undefined,
        (v) => (tail === "bottom" ? svgH - v : v),
      );
  // clip-path в objectBoundingBox: x — доля ширины слоя, y — доля его высоты.
  const bubbleClipD = isSide
    ? bubblePathRight(
        tipY ?? panelH * 0.3,
        panelW,
        panelH,
        (v) => v / svgW,
        (v) => v / svgH,
      )
    : bubblePath(
        tipX ??
          (arrowSide === "right" || arrowSide === "bottom-right"
            ? panelW - (arrowSide === "bottom-right" ? 18 : 40)
            : arrowSide === "left"
              ? 38
              : panelW / 2),
        svgW,
        svgH,
        (v) => v / svgW,
        (v) => (tail === "bottom" ? svgH - v : v) / svgH,
      );

  return (
    <>
      <svg
        ref={measureRef}
        aria-hidden="true"
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="none"
        style={{
          ...layerStyle,
          filter: isDark
            ? "drop-shadow(0 18px 48px rgba(0,0,0,0.45))"
            : "drop-shadow(0 18px 48px rgba(0,0,0,0.22))",
        }}
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={bubbleClipD} />
          </clipPath>
        </defs>
        <path d={bubbleD} fill={glassBg} />
      </svg>

      <Box
        aria-hidden="true"
        sx={{
          ...layerStyle,
          clipPath: `url(#${clipId})`,
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
        }}
      />

      <svg
        aria-hidden="true"
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="none"
        style={layerStyle}
      >
        <path
          d={bubbleD}
          fill="none"
          stroke={glassBorder}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}
