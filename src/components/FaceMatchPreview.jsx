import React, { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import FaceIcon from "@mui/icons-material/Face";
import { alpha, useTheme } from "@mui/material/styles";
import { resolveFaceMatchPreviewUrl } from "../utils/faceSuggestionPreview";

export default function FaceMatchPreview({ matchRef, allPhotos }) {
  const theme = useTheme();
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!matchRef) {
      setUrl(null);
      return undefined;
    }
    let cancelled = false;
    resolveFaceMatchPreviewUrl(matchRef, allPhotos)
      .then((next) => {
        if (!cancelled) setUrl(next || null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [matchRef, allPhotos]);

  if (!matchRef) return null;

  return (
    <Stack spacing={0.5} sx={{ flexShrink: 0, width: 72, alignItems: "center" }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.7rem",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        Похоже на
      </Typography>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "10px",
          overflow: "hidden",
          bgcolor: alpha(theme.palette.text.primary, 0.06),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        {url ? (
          <Box
            component="img"
            src={url}
            alt=""
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <FaceIcon sx={{ fontSize: 28, color: "text.disabled" }} />
        )}
      </Box>
    </Stack>
  );
}