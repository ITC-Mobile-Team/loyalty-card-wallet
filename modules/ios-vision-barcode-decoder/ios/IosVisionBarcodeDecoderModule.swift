import ExpoModulesCore
import Vision

private final class VisionBarcodeDecodeException: Exception {
  override var reason: String {
    "Vision could not decode barcodes from the selected image."
  }
}

public final class IosVisionBarcodeDecoderModule: Module {
  private let decoderQueue = DispatchQueue(label: "loyalty-card-wallet.ios-vision-barcode-decoder")
  private let decoder = VisionBarcodeDecoder()

  public func definition() -> ModuleDefinition {
    Name("IosVisionBarcodeDecoder")

    AsyncFunction("decodeImage") { (url: URL, barcodeTypes: [String]) -> [[String: Any]] in
      return try self.decodeImage(url: url, barcodeTypes: barcodeTypes)
    }
    .runOnQueue(decoderQueue)
  }

  private func decodeImage(url: URL, barcodeTypes: [String]) throws -> [[String: Any]] {
    do {
      return try decoder.decodeImage(url: url, barcodeTypes: barcodeTypes).map { result in
        [
          "type": result.type,
          "data": result.data,
          "confidence": result.confidence
        ]
      }
    } catch {
      throw VisionBarcodeDecodeException().causedBy(error)
    }
  }
}
