// pages/Page_GenealogyTree/GenealogyTreePage.jsx
// Страница «Генеалогическое дерево»: модель, раскладка и состояние из URL.

import React, { useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import GenealogyTreeCanvas from "./GenealogyTreeCanvas";
import { DEFAULT_TREE_MODE } from "./treeModes";
import {
  buildFamilyGraph,
  buildTreeLayout,
  collectPathIds,
} from "./treeModel";

export default function GenealogyTreePage({
  allPeople,
  loading,
  error,
  onRetry,
  mode = DEFAULT_TREE_MODE,
  personId,
  rootPersonId,
  onSelectPerson,
  onChooseRoot,
}) {
  const graph = useMemo(() => buildFamilyGraph(allPeople || []), [allPeople]);

  const layout = useMemo(
    () => buildTreeLayout(graph, rootPersonId, mode),
    [graph, rootPersonId, mode],
  );

  const highlightIds = useMemo(
    () => collectPathIds(graph, personId),
    [graph, personId],
  );

  const theme = useTheme();
  const hasPeople = (allPeople || []).length > 0;

  if (loading) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 50px)",
          width: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!hasPeople) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 130px)",
          px: 3,
          textAlign: "center",
          animation: "fadeIn 0.8s ease-out",
          "@keyframes fadeIn": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 4, md: 6 },
            width: "100%",
            maxWidth: 500,
            borderRadius: "24px",
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            border: "1px solid",
            borderColor: "divider",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Stack spacing={3} sx={{ alignItems: "center" }}>
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: theme.palette.accents.indigo,
                  filter: "blur(25px)",
                  opacity: 0.15,
                  borderRadius: "50%",
                }}
              />
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  border: "4px solid",
                  borderColor: "background.paper",
                  boxShadow: theme.shadows[4],
                  bgcolor: alpha(theme.palette.accents.indigo, 0.16),
                  color: theme.palette.accents.indigo,
                }}
              >
                <AccountTreeIcon sx={{ fontSize: 56 }} />
              </Avatar>
            </Box>

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Генеалогическое дерево
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", maxWidth: 350, mx: "auto" }}
              >
                Древо пока пустует. Добавьте первого предка — ветви
                построятся автоматически.
              </Typography>
            </Box>

            <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
              <Button
                variant="contained"
                component={Link}
                nativeButton={false}
                to="/?action=add"
                size="large"
                startIcon={<PersonAddAlt1Icon />}
                sx={{
                  height: 32,
                  borderRadius: "999px",
                  px: 2,
                  fontWeight: 600,
                }}
              >
                Добавить первого человека
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    );
  }

  if (error || !layout) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 50px)",
          width: "100%",
          display: "grid",
          placeItems: "center",
          px: 3,
        }}
      >
        <Stack
          spacing={1.5}
          sx={{
            alignItems: "center",
            maxWidth: 380
          }}>
          <AccountTreeIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography sx={{ fontWeight: 700, textAlign: "center" }}>
            {error ? "Не удалось загрузить данные" : "Нет данных для дерева"}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              textAlign: "center"
            }}>
            {error
              ? "Проверьте хранилище и попробуйте ещё раз."
              : "Добавьте людей и связи между ними — дерево построится автоматически."}
          </Typography>
          {error && onRetry && (
            <Button variant="outlined" size="small" onClick={onRetry}>
              Повторить
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 50px)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <GenealogyTreeCanvas
        layout={layout}
        mode={mode}
        selectedPersonId={personId}
        rootPersonId={rootPersonId}
        highlightIds={highlightIds}
        onSelectPerson={onSelectPerson}
        onChooseRoot={onChooseRoot}
      />
    </Box>
  );
}
