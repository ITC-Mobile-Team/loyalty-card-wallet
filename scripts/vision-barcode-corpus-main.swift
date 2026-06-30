import Foundation

struct Manifest: Decodable {
  let fixtures: [Fixture]
}

struct Fixture: Decodable {
  let file: String
  let id: String
}

struct DecodedResult: Encodable {
  let confidence: Float
  let data: String
  let type: String
}

struct FixtureResult: Encodable {
  let actual: [DecodedResult]
  let id: String
}

guard CommandLine.arguments.count == 3 else {
  FileHandle.standardError.write(Data("Usage: verifier <manifest> <fixture-directory>\n".utf8))
  exit(2)
}

let manifestURL = URL(fileURLWithPath: CommandLine.arguments[1])
let fixtureDirectory = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: manifestURL))
let decoder = VisionBarcodeDecoder()
let requestedTypes = ["code128", "code39", "ean13", "ean8", "itf14", "qr", "upc_a", "upc_e"]

let results = try manifest.fixtures.map { fixture in
  let decoded = try decoder
    .decodeImage(
      url: fixtureDirectory.appendingPathComponent(fixture.file),
      barcodeTypes: requestedTypes
    )
    .map {
      DecodedResult(confidence: $0.confidence, data: $0.data, type: $0.type)
    }

  return FixtureResult(actual: decoded, id: fixture.id)
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
FileHandle.standardOutput.write(try encoder.encode(results))
FileHandle.standardOutput.write(Data("\n".utf8))
