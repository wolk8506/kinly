import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  IconButton,
  Chip,
  alpha,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import CloseIcon from "@mui/icons-material/Close";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import {
  useToolbarButtonGroupHitSx,
} from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";

const EXPANDED_WIDTH = 320;
/** Как в ExpandingSearch — белый кружок с крестиком. */
const SEARCH_CLEAR_SIZE = 12;
const SEARCH_CLEAR_ICON_SIZE = 8;

function PeopleSelectSurface({ hasSelection, onClick, children }) {
  const hitSx = useToolbarButtonGroupHitSx(hasSelection);

  return (
    <Box
      onClick={onClick}
      sx={{
        ...hitSx,
        display: "flex",
        alignItems: "center",
        gap: TOOLBAR_HIT.gapIconLabelPx,
        width: "100%",
        minWidth: 0,
        cursor: "pointer",
      }}
    >
      {children}
    </Box>
  );
}

export default function ExpandingPeopleSelect({
  allPeople,
  selectedPeople,
  onChange,
  photos,
  options,
  placeholder = "Кто на фото?",
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef(null);

  const processedPeople = useMemo(() => {
    if (options) {
      return [...options].sort((a, b) => {
        const aSel = selectedPeople.some((p) => p.id === a.id);
        const bSel = selectedPeople.some((p) => p.id === b.id);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return 0;
      });
    }
    const idsInPhotos = new Set();
    photos?.forEach((p) => {
      if (p.owner) idsInPhotos.add(p.owner);
      if (p.people) p.people.forEach((id) => idsInPhotos.add(id));
    });

    const activePeople = allPeople.filter((p) => idsInPhotos.has(p.id));

    return [...activePeople].sort((a, b) => {
      const aSel = selectedPeople.some((p) => p.id === a.id);
      const bSel = selectedPeople.some((p) => p.id === b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [allPeople, photos, selectedPeople, options]);

  useEffect(() => {
    if (selectedPeople.length > 0) {
      setIsExpanded(true);
    } else if (!isMenuOpen) {
      setIsExpanded(false);
    }
  }, [selectedPeople, isMenuOpen]);

  const handleContainerClick = (e) => {
    if (e.target.closest(".clear-button")) return;
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsMenuOpen(true);
    }
  };

  const getName = (p) =>
    `${p.firstName || ""} ${p.lastName || p.maidenName || ""}`.trim();

  const hasSelection = selectedPeople.length > 0;

  return (
    <ToolbarButtonGroup
      gap={0}
      sx={{
        width: isExpanded ? EXPANDED_WIDTH : "auto",
        transition: (theme) =>
          theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
      }}
      contentSx={{
        alignItems: "center",
        width: "100%",
        minWidth: 0,
      }}
    >
      <PeopleSelectSurface
        hasSelection={hasSelection}
        onClick={handleContainerClick}
      >
        <Box sx={{ display: "flex", flexShrink: 0, p: 0, alignItems: "center" }}>
          <GroupIcon
            sx={{
              fontSize: TOOLBAR_HIT.iconSize,
              color: "inherit",
            }}
          />
        </Box>

        {isExpanded && (
          <Autocomplete
            multiple
            open={isMenuOpen}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onOpen={() => setIsMenuOpen(true)}
            onClose={(event, reason) => {
              if (reason === "toggleInput") return;
              setIsMenuOpen(false);
              if (selectedPeople.length === 0) {
                setIsExpanded(false);
              }
            }}
            disableCloseOnSelect
            options={processedPeople}
            groupBy={(option) =>
              selectedPeople.some((p) => p.id === option.id)
                ? "Выбранные"
                : "Остальные"
            }
            getOptionLabel={(u) => `${u.id} :: ${getName(u)}`}
            value={selectedPeople}
            onChange={onChange}
            limitTags={1}
            renderValue={(value, getItemProps) => {
              if (value.length === 0) return null;

              const { key, ...tagProps } = getItemProps({ index: 0 });
              const extraCount = value.length - 1;
              return (
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    ml: 0.5,
                    alignItems: "center",
                    flex: "1 1 auto",
                    minWidth: 0,
                    maxWidth: "100%",
                  }}
                >
                  <Chip
                    key={key}
                    label={getName(value[0])}
                    size="small"
                    variant="filled"
                    sx={{
                      color: "inherit",
                      height: 24,
                      fontSize: "0.75rem",
                      flexShrink: 1,
                      minWidth: 0,
                      maxWidth: extraCount > 0 ? 118 : 150,
                      "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "block",
                      },
                    }}
                    {...tagProps}
                  />
                  {extraCount > 0 && (
                    <Chip
                      label={`+${extraCount}`}
                      size="small"
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        height: 24,
                        fontSize: "0.75rem",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={inputRef}
                placeholder={
                  selectedPeople.length === 0 && isExpanded ? placeholder : ""
                }
                variant="standard"
                sx={{
                  ml: 0.5,
                  flex: 1,
                  minWidth: 0,
                  "& .MuiInputBase-root": {
                    py: 0,
                  },
                  "& .MuiInputBase-input": {
                    color: "inherit",
                    fontSize: "0.875rem",
                    padding: 0,
                  },
                }}
                slotProps={{
                  ...params.slotProps,
                  input: { ...params.slotProps.input, disableUnderline: true },
                }}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  mt: 1.5,
                  width: 350,
                  borderRadius: TOOLBAR_MENU.paperRadiusPx,
                  zIndex: (theme) => theme.zIndex.modal + 1,
                  "& .MuiAutocomplete-groupLabel": {
                    bgcolor: "background.paper",
                    color: "primary.main",
                    fontWeight: "bold",
                    lineHeight: "30px",
                  },
                },
              },
            }}
            sx={{
              flex: 1,
              minWidth: 0,
              "& .MuiAutocomplete-endAdornment": { display: "none" },
              "& .MuiAutocomplete-inputRoot": {
                flexWrap: "nowrap",
                alignItems: "center",
                gap: 0,
                py: 0,
                pl: 0,
                pr: 0.25,
                minHeight: TOOLBAR_HIT.height,
                height: TOOLBAR_HIT.height,
                maxHeight: TOOLBAR_CAPSULE.height - TOOLBAR_CAPSULE.padding * 2,
              },
              "& .MuiAutocomplete-input": {
                py: 0,
                minWidth: isMenuOpen ? 48 : selectedPeople.length > 0 ? 0 : 24,
                width: isMenuOpen
                  ? undefined
                  : selectedPeople.length > 0
                    ? 0
                    : undefined,
                flex: isMenuOpen
                  ? "1 1 auto"
                  : selectedPeople.length > 0
                    ? "0 0 0"
                    : "1 1 auto",
              },
            }}
          />
        )}

        {hasSelection && (
          <IconButton
            className="clear-button"
            size="small"
            aria-label="Сбросить фильтр по людям"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null, []);
              setIsExpanded(false);
              setIsMenuOpen(false);
            }}
            sx={{
              flexShrink: 0,
              p: 0,
              width: SEARCH_CLEAR_SIZE,
              height: SEARCH_CLEAR_SIZE,
              borderRadius: "50%",
              bgcolor: "#fff",
              color: (theme) =>
                theme.palette.mode === "dark" ? "#3a3a3a" : "#6e6e6e",
              "&:hover": {
                bgcolor: alpha("#fff", 0.92),
              },
            }}
          >
            <CloseIcon
              sx={{
                fontSize: SEARCH_CLEAR_ICON_SIZE,
                width: SEARCH_CLEAR_ICON_SIZE,
                height: SEARCH_CLEAR_ICON_SIZE,
              }}
            />
          </IconButton>
        )}
      </PeopleSelectSurface>
    </ToolbarButtonGroup>
  );
}
