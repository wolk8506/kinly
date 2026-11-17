import React from "react";
import { Box, Stack } from "@mui/material";

import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";
import BioToolbar from "./bio/BioToolbar";
import PhotoToolbar from "./photo/PhotoToolbar";
import InfoToolbar from "./info/InfoToolbar";
import FileToolbar from "./file/FileToolbar";
import PersonTabCluster from "./PersonTabCluster";

export default function PersonToolbar({
  activeElement,
  setActiveElement,
  infoProps,
  photoProps,
  bioProps,
}) {
  return (
    <Stack
      direction="row"
      sx={{ ...toolbarRowSx, width: "100%", flex: 1, minWidth: 0, gap: 1.5 }}
    >
      <Box sx={toolbarClusterSx}>
        <PersonTabCluster
          active={activeElement}
          onChange={setActiveElement}
        />
      </Box>

      {activeElement === "files" && (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FileToolbar />
        </Box>
      )}

      {activeElement === "info" && (
        <Stack
          direction="row"
          sx={{
            ...toolbarRowSx,
            flex: 1,
            minWidth: 0,
            alignSelf: "stretch",
          }}
        >
          <Box sx={toolbarDragSpacerSx} />
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              alignSelf: "stretch",
              display: "flex",
              alignItems: "center",
              WebkitAppRegion: "drag",
            }}
          >
            <InfoToolbar
              infoProps={infoProps}
              personRef={infoProps.personPageRef}
            />
          </Box>
          <Box sx={toolbarDragSpacerSx} />
        </Stack>
      )}

      {activeElement === "photo" && (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PhotoToolbar
            search={photoProps.search}
            setSearch={photoProps.setSearch}
            groupBy={photoProps.groupBy}
            setGroupBy={photoProps.setGroupBy}
            sortDir={photoProps.sortDir}
            setSortDir={photoProps.setSortDir}
            onAddPhoto={photoProps.onAddPhoto}
          />
        </Box>
      )}

      {activeElement === "bio" && (
        <Box sx={{ flex: 1, minWidth: 0 }}>
        <BioToolbar
          isEditing={bioProps.isEditing}
          isDirty={bioProps.isDirty}
          requestToggleEdit={bioProps.requestToggleEdit}
          onSave={bioProps.onSave}
          onPrint={bioProps.onPrint}
          onExportPdf={bioProps.onExportPdf}
          execRef={bioProps.execRef}
          isNavVisible={bioProps.isNavVisible}
          onToggleNav={bioProps.onToggleNav}
          searchQuery={bioProps.searchQuery}
          onSearchQueryChange={bioProps.onSearchQueryChange}
          searchMatchIndex={bioProps.searchMatchIndex}
          onSearchMatchIndexChange={bioProps.onSearchMatchIndexChange}
          searchMatchCount={bioProps.searchMatchCount}
        />
        </Box>
      )}
    </Stack>
  );
}
