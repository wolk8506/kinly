import React from "react";
import { Drawer, Box } from "@mui/material";
import ExternalEntityDetail from "../pages/Page_External/ExternalEntityDetail";
import {
  inspectorDrawerTransitionProps,
  inspectorPaperSx,
} from "./inspectorPanelTransition";

export default function ExternalInspectorPanel({
  open,
  onClose,
  entityId,
  onDeleted,
  onSelectExternal,
  onEntityChanged,
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      {...inspectorDrawerTransitionProps}
      slotProps={{
        paper: {
          sx: {
            top: 50,
            height: "calc(100% - 50px)",
            ...inspectorPaperSx,
            borderLeft: "1px solid",
            borderColor: "divider",
          },
        }
      }}
    >
      <Box
        sx={{
          width: 340,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ flexGrow: 1, overflowY: "auto", height: "100%" }}>
          <ExternalEntityDetail
            entityId={entityId}
            onDeleted={onDeleted}
            onSelectExternal={onSelectExternal}
            onEntityChanged={onEntityChanged}
            compact
          />
        </Box>
      </Box>
    </Drawer>
  );
}
