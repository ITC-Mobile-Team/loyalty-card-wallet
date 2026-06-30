import Foundation
import Vision

public struct VisionBarcodeDecodedResult {
  public let confidence: Float
  public let data: String
  public let type: String

  public init(confidence: Float, data: String, type: String) {
    self.confidence = confidence
    self.data = data
    self.type = type
  }
}

public final class VisionBarcodeDecoder {
  public init() {}

  public func decodeImage(url: URL, barcodeTypes: [String]) throws -> [VisionBarcodeDecodedResult] {
    let request = VNDetectBarcodesRequest()
    let requestedTypes = normalizedTypes(barcodeTypes)
    let symbologies = symbologies(for: requestedTypes)

    if !symbologies.isEmpty {
      request.symbologies = symbologies
    }

    try VNImageRequestHandler(url: url, options: [:]).perform([request])

    return (request.results ?? [])
      .compactMap { observation in
        mapObservation(observation, requestedTypes: requestedTypes)
      }
      .sorted { left, right in
        if left.confidence == right.confidence {
          if left.type == right.type {
            return left.data < right.data
          }

          return left.type < right.type
        }

        return left.confidence > right.confidence
      }
  }

  private func normalizedTypes(_ barcodeTypes: [String]) -> [String] {
    barcodeTypes.map {
      $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
  }

  private func symbologies(for requestedTypes: [String]) -> [VNBarcodeSymbology] {
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

  private func mapObservation(
    _ observation: VNBarcodeObservation,
    requestedTypes: [String]
  ) -> VisionBarcodeDecodedResult? {
    guard let rawPayload = observation.payloadStringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
          !rawPayload.isEmpty,
          let mapped = scannerResult(
            for: observation.symbology,
            payload: rawPayload,
            requestedTypes: requestedTypes
          )
    else {
      return nil
    }

    return VisionBarcodeDecodedResult(
      confidence: observation.confidence,
      data: mapped.data,
      type: mapped.type
    )
  }

  private func scannerResult(
    for symbology: VNBarcodeSymbology,
    payload: String,
    requestedTypes: [String]
  ) -> (data: String, type: String)? {
    switch symbology {
    case .code128:
      return (payload, "code128")
    case .code39:
      return (payload, "code39")
    case .ean13:
      let upcARequested = requestedTypes.contains("upc_a") || requestedTypes.contains("upca")

      if upcARequested && payload.count == 13 && payload.hasPrefix("0") {
        return (String(payload.dropFirst()), "upc_a")
      }

      if upcARequested && payload.count == 12 {
        return (payload, "upc_a")
      }

      return (payload, "ean13")
    case .ean8:
      return (payload, "ean8")
    case .i2of5:
      return (payload, "itf")
    case .itf14:
      return (payload, "itf14")
    case .qr:
      return (payload, "qr")
    case .upce:
      return (payload, "upc_e")
    default:
      return nil
    }
  }
}
