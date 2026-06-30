import { useCallback, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";

export function useDiagnosticsController() {
  const { interactionFeedback, localDiagnosticsService, textShareService } = useDependencies();
  const [message, setMessage] = useState<string>();

  const exportDiagnostics = useCallback(async () => {
    const shared = await textShareService.shareText({
      title: "Loyalty Card Wallet diagnostics",
      message: localDiagnosticsService.exportText()
    });
    setMessage(shared ? "Redacted diagnostics shared." : "Diagnostics export canceled.");
    if (shared) interactionFeedback.success();
  }, [interactionFeedback, localDiagnosticsService, textShareService]);

  const clearDiagnostics = useCallback(() => {
    localDiagnosticsService.clear();
    setMessage("Local diagnostics cleared.");
    interactionFeedback.success();
  }, [interactionFeedback, localDiagnosticsService]);

  return {
    eventCount: localDiagnosticsService.list().length,
    message,
    clearDiagnostics,
    exportDiagnostics
  };
}
