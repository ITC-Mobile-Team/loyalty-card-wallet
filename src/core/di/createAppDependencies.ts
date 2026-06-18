import { ExpoAppInfoProvider } from "@/data/account/ExpoAppInfoProvider";
import { NativeBarcodeRenderer } from "@/data/barcode/NativeBarcodeRenderer";
import { SQLiteCardRepository } from "@/data/cards/SQLiteCardRepository";
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
import { ConsoleErrorReporter } from "@/core/errors/ConsoleErrorReporter";
import { FetchHttpClient } from "@/core/network/FetchHttpClient";
import { StaticNetworkManager } from "@/core/network/StaticNetworkManager";

import type { AppDependencies, AppDependencyOverrides } from "./dependencies";

export function createAppDependencies(overrides: AppDependencyOverrides = {}): AppDependencies {
  const databaseProvider = createMigratedDatabaseProvider(createExpoSQLiteDatabaseProvider());
  const cardRepository = new SQLiteCardRepository(databaseProvider);
  const httpClient = new FetchHttpClient();
  const imageStore = new PrivateImageStore(databaseProvider);
  const sharingMetadataStore = new SQLiteExportMetadataStore(databaseProvider);
  const storageTransactionRunner = new SQLiteStorageTransactionRunner(databaseProvider);

  return {
    appInfoProvider: new ExpoAppInfoProvider(),
    barcodeRenderer: new NativeBarcodeRenderer(),
    cardRepository,
    errorReporter: new ConsoleErrorReporter(),
    httpClient,
    imageSelectionService: new ExpoImageSelectionService(),
    imageStore,
    interactionFeedback: new NativeInteractionFeedback(),
    locationProvider: new ExpoLocationProvider(),
    networkManager: new StaticNetworkManager(),
    scannerService: new ExpoScannerService(new IosVisionImageBarcodeDecoder()),
    sharingService: new LocalSharingService(cardRepository, imageStore, sharingMetadataStore, storageTransactionRunner),
    storeRepository: new OverpassStoreRepository(httpClient),
    textShareService: new NativeTextShareService(),
    ...overrides
  };
}
