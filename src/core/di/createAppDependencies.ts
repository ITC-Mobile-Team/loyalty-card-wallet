import { ExpoAppInfoProvider } from "@/data/account/ExpoAppInfoProvider";
import { NativeBarcodeRenderer } from "@/data/barcode/NativeBarcodeRenderer";
import { SQLiteMerchantCatalogRepository } from "@/data/catalog/SQLiteMerchantCatalogRepository";
import { SQLiteCardRepository } from "@/data/cards/SQLiteCardRepository";
import { SQLiteImportSessionRepository } from "@/data/importing/SQLiteImportSessionRepository";
import { ExpoImageSelectionService } from "@/data/images/ExpoImageSelectionService";
import { PrivateImageStore } from "@/data/images/PrivateImageStore";
import { NativeInteractionFeedback } from "@/data/interaction/NativeInteractionFeedback";
import { ExpoLocationProvider } from "@/data/location/ExpoLocationProvider";
import { ExpoScannerService } from "@/data/scanner/ExpoScannerService";
import { IosVisionImageBarcodeDecoder } from "@/data/scanner/IosVisionImageBarcodeDecoder";
import { LocalSharingService } from "@/data/sharing/LocalSharingService";
import { NativeTextShareService } from "@/data/sharing/NativeTextShareService";
import { SQLiteExportMetadataStore } from "@/data/sharing/SQLiteExportMetadataStore";
import { createMigratedDatabaseProvider } from "@/data/storage/createMigratedDatabaseProvider";
import { createExpoSQLiteDatabaseProvider } from "@/data/storage/expoSqliteDatabase";
import { SQLiteStorageTransactionRunner } from "@/data/storage/StorageTransactionRunner";
import { OverpassStoreRepository } from "@/data/stores/OverpassStoreRepository";
import { SQLiteMerchantLinkRepository } from "@/data/stores/SQLiteMerchantLinkRepository";
import { DiagnosticsErrorReporter } from "@/core/errors/DiagnosticsErrorReporter";
import { FetchHttpClient } from "@/core/network/FetchHttpClient";
import { StaticNetworkManager } from "@/core/network/StaticNetworkManager";
import { ExpoBackupCrypto } from "@/data/backup/ExpoBackupCrypto";
import { ExpoBackupDocumentProvider } from "@/data/backup/ExpoBackupDocumentProvider";
import { EncryptedBackupContainer } from "@/data/backup/EncryptedBackupContainer";
import { JsonBundleCodec } from "@/data/backup/JsonBundleCodec";
import { LocalBackupService } from "@/data/backup/LocalBackupService";
import { BoundedLocalDiagnosticsService } from "@/data/diagnostics/BoundedLocalDiagnosticsService";
import { ExpoLocalAuthService } from "@/data/security/ExpoLocalAuthService";
import { SQLiteLocalSecuritySettingsStore } from "@/data/security/SQLiteLocalSecuritySettingsStore";
import { ExpoSnapshotIntegrityHasher } from "@/data/external-surfaces/ExpoSnapshotIntegrityHasher";
import { JsonExternalSnapshotRepository } from "@/data/external-surfaces/JsonExternalSnapshotRepository";
import { ExpoNativeSharedSnapshotStorage } from "@/data/external-surfaces/ExpoNativeSharedSnapshotStorage";
import { ExternalSnapshotAwareCardRepository } from "@/data/external-surfaces/ExternalSnapshotAwareCardRepository";

import type { AppDependencies, AppDependencyOverrides } from "./dependencies";

export function createAppDependencies(overrides: AppDependencyOverrides = {}): AppDependencies {
  const databaseProvider = createMigratedDatabaseProvider(createExpoSQLiteDatabaseProvider());
  const sqliteCardRepository = new SQLiteCardRepository(databaseProvider);
  const httpClient = new FetchHttpClient();
  const imageStore = new PrivateImageStore(databaseProvider);
  const sharingMetadataStore = new SQLiteExportMetadataStore(databaseProvider);
  const storageTransactionRunner = new SQLiteStorageTransactionRunner(databaseProvider);
  const diagnostics = new BoundedLocalDiagnosticsService();
  const backupContainer = new EncryptedBackupContainer(new ExpoBackupCrypto(), new JsonBundleCodec());
  const externalSnapshotRepository = new JsonExternalSnapshotRepository(
    new ExpoNativeSharedSnapshotStorage(),
    new ExpoSnapshotIntegrityHasher()
  );
  const cardRepository = new ExternalSnapshotAwareCardRepository(
    sqliteCardRepository,
    externalSnapshotRepository
  );

  return {
    appInfoProvider: new ExpoAppInfoProvider(),
    backupService: new LocalBackupService(
      cardRepository,
      imageStore,
      backupContainer,
      new ExpoBackupDocumentProvider(),
      storageTransactionRunner
    ),
    barcodeRenderer: new NativeBarcodeRenderer(),
    cardRepository,
    cardQueryRepository: sqliteCardRepository,
    errorReporter: new DiagnosticsErrorReporter(diagnostics),
    externalSnapshotRepository,
    httpClient,
    imageSelectionService: new ExpoImageSelectionService(),
    imageStore,
    importSessionRepository: new SQLiteImportSessionRepository(databaseProvider),
    interactionFeedback: new NativeInteractionFeedback(),
    locationProvider: new ExpoLocationProvider(),
    localAuthService: new ExpoLocalAuthService(),
    localDiagnosticsService: diagnostics,
    localSecuritySettingsStore: new SQLiteLocalSecuritySettingsStore(databaseProvider),
    merchantCatalogRepository: new SQLiteMerchantCatalogRepository(databaseProvider),
    merchantLinkRepository: new SQLiteMerchantLinkRepository(databaseProvider),
    networkManager: new StaticNetworkManager(),
    scannerService: new ExpoScannerService(new IosVisionImageBarcodeDecoder()),
    sharingService: new LocalSharingService(cardRepository, imageStore, sharingMetadataStore, storageTransactionRunner),
    storeRepository: new OverpassStoreRepository(httpClient),
    textShareService: new NativeTextShareService(),
    ...overrides
  };
}
