# NSIS is DPI-unaware by default, so at 125% Windows bitmap-stretches the
# whole wizard and the text turns blurry. The dialogs are laid out in dialog
# units, so declaring awareness lets them re-layout instead of being scaled.
ManifestDPIAware true

# Older builds installed into a folder named after package.json "name"
# (genealogy-react) or productName (Genealogy). Windows keeps that folder in
# Software\<APP_GUID>\InstallLocation and every later installer reuses it,
# so the old name outlives the config change.
!macro customInit
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4

  StrLen $1 "$INSTDIR"

  ; legacy suffix "genealogy-react" (старый package.json "name")
  StrLen $2 "genealogy-react"
  IntOp $3 $1 - $2
  ${If} $3 > 0
    StrCpy $0 "$INSTDIR" $3
    ${If} $0 == "genealogy-react"
      Goto genealogy_fix_dir
    ${EndIf}
  ${EndIf}

  ; legacy suffix "Genealogy" (productName до переименования в Kinly)
  StrLen $2 "Genealogy"
  IntOp $3 $1 - $2
  ${If} $3 > 0
    StrCpy $0 "$INSTDIR" $3
    ${If} $0 == "Genealogy"
      Goto genealogy_fix_dir
    ${EndIf}
  ${EndIf}

  Goto genealogy_legacy_dir_done

genealogy_fix_dir:
  ; $3 — смещение, с которого начинается старый суффикс: оставляем префикс
  ; и подставляем актуальное имя приложения.
  StrCpy $4 "$INSTDIR" "" $3
  StrCpy $INSTDIR "$4${APP_FILENAME}"
  # The installer pages re-read InstallLocation after this macro, so the stale
  # value has to be removed, not just ignored.
  DeleteRegValue HKCU "Software\${APP_GUID}" "InstallLocation"
  DeleteRegValue HKLM "Software\${APP_GUID}" "InstallLocation"

genealogy_legacy_dir_done:
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend
