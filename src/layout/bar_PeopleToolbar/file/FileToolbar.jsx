import React from "react";
import { Stack, Box, IconButton, Tooltip } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { usePersonStore } from "../../../store/usePersonStore";
import ButtonConteiner from "../../../components/ButtonConteiner";
import { TOOLBAR_HIT } from "../../toolbarTokens";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../../appBarToolbarLayout";

export default function FileToolbar() {
  const executeUpload = usePersonStore((state) => state.executeUpload);
  const openFilesFolder = usePersonStore((state) => state.openFilesFolder);

  return (
    <Stack direction="row" sx={{ ...toolbarRowSx, flex: 1, minWidth: 0 }}>
      <Box sx={toolbarDragSpacerSx} />

      <Box sx={toolbarClusterSx}>
        <ButtonConteiner>
          <Tooltip title="Открыть папку файлов">
            <IconButton
              onClick={() => openFilesFolder?.()}
              disabled={!openFilesFolder}
              size="small"
              sx={{ color: "inherit", p: 0 }}
            >
              <FolderOpenIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Загрузить файлы">
            <IconButton
              onClick={() => executeUpload?.()}
              disabled={!executeUpload}
              size="small"
              sx={{ color: "inherit", p: 0 }}
            >
              <UploadFileIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
            </IconButton>
          </Tooltip>
        </ButtonConteiner>
      </Box>
    </Stack>
  );
}