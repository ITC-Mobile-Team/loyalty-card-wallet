import ExpoModulesCore
import Vision

private final class VisionBarcodeDecodeException: Exception {
  override var reason: String {
    "Vision could not decode barcodes from the selected image."
  }
}

public final class IosVisionBarcodeDecoderModule: Module {
  private let decoderQueue = DispatchQueue(label: "loyalty-card-wallet.ios-vision-barcode-decoder")

  public func definition() -> ModuleDefinition {
    Name("IosVisionBarcodeDecoder")

    AsyncFunction("decodeImage") { (url: URL, barcodeTypes: [String]) -> [[String: Any]] in
      return try self.decodeImage(url: url, barcodeTypes: barcodeTypes)
    }
    .runOnQueue(decoderQueue)
  }

  private func decodeImage(url: URL, barcodeTypes: [String]) throws -> [[String: Any]] {
    let request = VNDetectBarcodesRequest()
    let symbologies = symbologies(for: barcodeTypes)

    if !symbologies.isEmpty {
      request.symbologies = symbologies
    }

    let handler = VNImageRequestHandler(url: url, options: [:])

    do {
      try handler.perform([request])
    } catch {
      throw VisionBarcodeDecodeException().causedBy(error)
    }

    return (request.results ?? [])
      .compactMap(mapObservation)
      .sorted { lhs, rhs in
        let leftConfidence = lhs["confidence"] as? Float ?? 0
        let rightConfidence = rhs["confidence"] as? Float ?? 0

        if leftConfidence == rightConfidence {
          let leftType = lhs["type"] as? String ?? ""
          let rightType = rhs["type"] as? String ?? ""

          if leftType == rightType {
            return (lhs["data"] as? String ?? "") < (rhs["data"] as? String ?? "")
          }

          return leftType < rightType
        }

        return leftConfidence > rightConfidence
      }
  }

  private func symbologies(for barcodeTypes: [String]) -> [VNBarcodeSymbology] {
    let requestedTypes = barcodeTypes.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }

    if requestedTypes.isEmpty {
      return supportedSymbologies()
    }

    return requestedTypes
      .flatMap(symbologiesForType)
      .reduce(into: [VNBarcodeSymbology]()) { result, symbology in
        if !result.contains(symbology) {
          result.append(symbology)
        }
      }
      .sorted { $0.rawValue < $1.rawValue }
  }

  private func supportedSymbologies() -> [VNBarcodeSymbology] {
    [
      .code128,
      .code39,
      .ean13,
      .ean8,
      .i2of5,
      .itf14,
      .qr,
      .upce
    ]
  }

  private func symbologiesForType(_ type: String) -> [VNBarcodeSymbology] {
    switch type {
    case "code128":
      return [.code128]
    case "code39":
      return [.code39]
    case "ean13":
      return [.ean13]
    case "ean8":
      return [.ean8]
    case "itf", "interleaved2of5":
      return [.i2of5]
    case "itf14":
      return [.itf14, .i2of5]
    case "qr":
      return [.qr]
    case "upc_a", "upca":
      return [.ean13]
    case "upc_e", "upce":
      return [.upce]
    default:
      return []
    }
  }

  private func mapObservation(_ observation: VNBarcodeObservation) -> [String: Any]? {
    guard let payload = observation.payloadStringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
          !payload.isEmpty,
          let type = scannerType(for: observation.symbology)
    else {
      return nil
    }

    return [
      "type": type,
      "data": payload,
      "confidence": observation.confidence
    ]
  }

  private func scannerType(for symbology: VNBarcodeSymbology) -> String? {
    switch symbology {
    case .code128:
      return "code128"
    case .code39:
      return "code39"
    case .ean13:
      return "ean13"
    case .ean8:
      return "ean8"
    case .i2of5:
      return "itf"
    case .itf14:
      return "itf14"
    case .qr:
      return "qr"
    case .upce:
      return "upc_e"
    default:
      return nil
    }
  }
}
