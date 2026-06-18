import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { AddCardFormView, type AddCardFormValues } from "@/components/views/AddCardFormView";
import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import { colors, radius, spacing } from "@/design/tokens";
import {
  normalizeScanResult,
  shouldAcceptScanResult,
  type RawScanResult,
  type ScanDebounceState
} from "@/domain/scanner/ScanResult";
import { useCreateCardDraft } from "@/features/add-card/hooks/useCreateCardDraft";

type AddScanScreenProps = {
  onEnterManually: () => void;
  onImportPhoto: () => void;
  onSaved: (cardId: string) => void;
};

type CameraPermissionUiState = "idle" | "requesting" | "granted" | "denied";

const scanDebounceMs = 1500;

export function AddScanScreen({
  onEnterManually,
  onImportPhoto,
  onSaved
}: AddScanScreenProps) {
  const { errorReporter, interactionFeedback, scannerService } = useDependencies();
  const ScannerCameraView = scannerService.CameraScannerView;
  const scanDebounceRef = useRef<ScanDebounceState | null>(null);
  const [permissionState, setPermissionState] = useState<CameraPermissionUiState>("idle");
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [scanError, setScanError] = useState<AppError | null>(null);
  const [values, setValues] = useState<AddCardFormValues | null>(null);
  const { createCard, error: saveError, isSaving } = useCreateCardDraft();

  async function requestCameraAccess() {
    setScanError(null);
    setPermissionState("requesting");

    try {
      const permission = await scannerService.requestCameraPermission();
      setPermissionCanAskAgain(permission.canAskAgain);

      if (permission.status === "granted") {
        setPermissionState("granted");
        return;
      }

      setPermissionState("denied");
      setScanError({
        kind: "permission",
        permission: "camera",
        message: "Camera access is needed to scan a loyalty card barcode."
      });
      interactionFeedback.warning();
    } catch (error) {
      const appError = toUnknownAppError(error);
      setPermissionState("idle");
      setScanError(appError);
      errorReporter.report(appError);
      interactionFeedback.error();
    }
  }

  function handleCameraError(error: AppError) {
    setScanError(error);
    errorReporter.report(error);
    interactionFeedback.error();
  }

  function handleScanned(result: RawScanResult) {
    const debounceResult = shouldAcceptScanResult(result, Date.now(), scanDebounceRef.current, scanDebounceMs);
    scanDebounceRef.current = debounceResult.state;

    if (!debounceResult.accepted) {
      return;
    }

    const normalized = normalizeScanResult(result);

    if (isAppError(normalized)) {
      setScanError(normalized);
      errorReporter.report(normalized);
      interactionFeedback.warning();
      return;
    }

    setScanError(null);
    interactionFeedback.selectionChanged();
    setValues({
      barcodeFormat: normalized.barcodeFormat,
      cardNumber: normalized.cardNumber,
      storeName: ""
    });
  }

  async function handleSubmit() {
    if (!values) {
      return;
    }

    const card = await createCard(values);

    if (card) {
      onSaved(card.id);
    }
  }

  if (values) {
    return (
      <Screen contentContainerStyle={{ gap: spacing.xl }}>
        <AddCardFormView
          errorMessage={saveError?.message}
          helperText="Confirm the scanned number and add a store name before saving."
          isSaving={isSaving}
          onChange={setValues}
          onSubmit={handleSubmit}
          submitLabel="Save Card"
          title="Confirm Scanned Card"
          values={values}
        />
        <AppButton label="Scan Again" onPress={() => setValues(null)} variant="secondary" />
      </Screen>
    );
  }

  const isCameraActive = permissionState === "granted";
  const requestLabel = permissionState === "requesting" ? "Requesting..." : "Start Scanner";

  return (
    <Screen contentContainerStyle={styles.screenContent} padded={false}>
      <View
        accessibilityLabel={isCameraActive ? "Camera scanner, scanning for a barcode" : undefined}
        accessible={isCameraActive}
        style={styles.scannerArea}
      >
        {isCameraActive ? (
          <>
            <ScannerCameraView
              isActive={isCameraActive}
              onError={handleCameraError}
              onScanned={handleScanned}
              style={styles.camera}
            />
            <View pointerEvents="none" style={styles.frameOverlay}>
              <View style={styles.scanFrame} />
            </View>
          </>
        ) : (
          <View style={styles.permissionPanel}>
            <AppButton disabled={permissionState === "requesting"} label={requestLabel} onPress={requestCameraAccess} />
            <AppText color={colors.text.secondary} style={styles.centeredText}>
              Scanning starts after camera access is granted.
            </AppText>
            {permissionState === "denied" && !permissionCanAskAgain ? (
              <AppText color={colors.text.secondary} style={styles.centeredText}>
                Camera access is disabled in system settings. Manual entry and photo import are still available.
              </AppText>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.bottomPanel}>
        {scanError ? <AppText color={colors.action.danger}>{scanError.message}</AppText> : null}
        <View style={styles.actions}>
          <AppButton label="Enter Manually" onPress={onEnterManually} variant="secondary" />
          <AppButton label="Add From Photo" onPress={onImportPhoto} variant="secondary" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1
  },
  scannerArea: {
    backgroundColor: colors.surface.raised,
    flex: 1,
    minHeight: 430,
    overflow: "hidden"
  },
  camera: {
    flex: 1,
    minHeight: 430
  },
  frameOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: spacing.xl,
    position: "absolute",
    right: 0,
    top: 0
  },
  scanFrame: {
    borderColor: colors.action.focus,
    borderRadius: radius.card,
    borderWidth: 3,
    height: 180,
    width: "82%"
  },
  permissionPanel: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl
  },
  centeredText: {
    textAlign: "center"
  },
  bottomPanel: {
    gap: spacing.md,
    padding: spacing.md
  },
  actions: {
    gap: spacing.sm
  }
});
