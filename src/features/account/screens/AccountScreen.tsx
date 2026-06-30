import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { AccountLocalSummaryView } from "@/components/views/AccountLocalSummaryView";
import { useDependencies } from "@/core/di/useDependencies";
import { useBackupRestoreController } from "../hooks/useBackupRestoreController";
import { useLocalSecurityController } from "../hooks/useLocalSecurityController";

export function AccountScreen() {
  const { appInfoProvider, cardRepository } = useDependencies();
  const appInfo = useMemo(() => appInfoProvider.getAppInfo(), [appInfoProvider]);
  const [cardCount, setCardCount] = useState(0);
  const backup = useBackupRestoreController();
  const security = useLocalSecurityController();

  useEffect(() => {
    let mounted = true;
    async function loadCardCount() {
      const cards = await cardRepository.list();
      if (mounted) setCardCount(cards.length);
    }
    void loadCardCount();
    return () => {
      mounted = false;
    };
  }, [cardRepository]);

  return (
    <Screen keyboardAvoiding keyboardShouldPersistTaps="handled">
      <AccountLocalSummaryView
        appName={appInfo.name}
        appVersion={appInfo.version}
        cardCount={cardCount}
        backup={backup}
        security={security}
        onConfirmExport={() =>
          Alert.alert(
            "Create encrypted backup?",
            "The file contains all card numbers and private images. Forgotten backup passphrases cannot be recovered.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Create Backup", onPress: () => void backup.exportBackup() }
            ]
          )
        }
        onConfirmRestore={() =>
          Alert.alert(
            "Restore previewed cards?",
            `${backup.candidate?.preview.cardCount ?? 0} cards will be processed. Existing cards follow the selected duplicate policy.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Restore", onPress: () => void backup.restore() }
            ]
          )
        }
      />
    </Screen>
  );
}
