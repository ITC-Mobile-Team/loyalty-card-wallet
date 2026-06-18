import type { BarcodeRenderer } from "@/domain/barcode/BarcodeRenderer";
import type { AppInfoProvider } from "@/domain/account/AppInfo";
import type { CardRepository } from "@/domain/cards/CardRepository";
import type { ImageSelectionService } from "@/domain/images/ImageSelection";
import type { ImageStore } from "@/domain/images/ImageStore";
import type { LocationProvider } from "@/domain/stores/LocationProvider";
import type { StoreRepository } from "@/domain/stores/StoreRepository";
import type { SharingService } from "@/domain/sharing/SharingPorts";
import type { TextShareService } from "@/domain/sharing/TextShareService";
import type { AppError, ErrorReporter } from "@/core/errors/AppError";
import type { InteractionFeedback } from "@/core/interaction/InteractionFeedback";
import type { HttpClient } from "@/core/network/HttpClient";
import type { NetworkManager } from "@/core/network/NetworkManager";
import type { ScannerService } from "@/core/scanner/ScannerService";

export type AppDependencies = {
  appInfoProvider: AppInfoProvider;
  barcodeRenderer: BarcodeRenderer;
  cardRepository: CardRepository;
  errorReporter: ErrorReporter;
  httpClient: HttpClient;
  imageSelectionService: ImageSelectionService;
  imageStore: ImageStore;
  interactionFeedback: InteractionFeedback;
  locationProvider: LocationProvider;
  networkManager: NetworkManager;
  scannerService: ScannerService;
  sharingService: SharingService;
  storeRepository: StoreRepository;
  textShareService: TextShareService;
};

export type AppDependencyOverrides = Partial<AppDependencies>;

export type DependencyFactoryError = AppError;
