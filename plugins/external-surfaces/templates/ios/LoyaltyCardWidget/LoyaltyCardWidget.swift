import CryptoKit
import Foundation
import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.com.anonymous.loyalty-card-wallet"
private let snapshotFileName = "external-card-snapshot.json"
private let walletFallbackURL = URL(string: "loyaltycardwallet://")!

private struct SnapshotEnvelope: Decodable {
  let app: String
  let envelopeVersion: Int
  let payload: String
  let integrity: SnapshotIntegrity
}

private struct SnapshotIntegrity: Decodable {
  let algorithm: String
  let digest: String
}

private struct SnapshotPayload: Decodable {
  let app: String
  let snapshotVersion: Int
  let revision: Int
  let generatedAt: String
  let expiresAt: String
  let entries: [SnapshotCard]
}

private struct SnapshotCard: Decodable, Identifiable {
  let sourceCardId: String
  let revision: Int
  let generatedAt: String
  let state: String
  let storeName: String?
  let cardNumber: String?
  let barcodeFormat: String?
  let backgroundColor: String?

  var id: String { sourceCardId }

  var deepLink: URL {
    let encoded = sourceCardId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? ""
    return URL(string: "loyaltycardwallet:///card/\(encoded)/scan-mode") ?? walletFallbackURL
  }
}

private enum SnapshotOutcome {
  case ready([SnapshotCard])
  case fallback(String)
}

private struct LoyaltyCardWidgetEntry: TimelineEntry {
  let date: Date
  let outcome: SnapshotOutcome
}

private struct LoyaltyCardWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> LoyaltyCardWidgetEntry {
    LoyaltyCardWidgetEntry(date: Date(), outcome: .fallback("Open Wallet"))
  }

  func getSnapshot(in context: Context, completion: @escaping (LoyaltyCardWidgetEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<LoyaltyCardWidgetEntry>) -> Void) {
    let entry = loadEntry()
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60))))
  }

  private func loadEntry() -> LoyaltyCardWidgetEntry {
    LoyaltyCardWidgetEntry(date: Date(), outcome: loadSnapshot())
  }
}

private struct LoyaltyCardWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: LoyaltyCardWidgetEntry

  var body: some View {
    Group {
      switch entry.outcome {
      case .ready(let cards):
        readyContent(cards)
      case .fallback(let message):
        Link(destination: walletFallbackURL) {
          fallbackView(message)
        }
      }
    }
    .containerBackground(
      LinearGradient(
        colors: [
          Color(red: 0.055, green: 0.055, blue: 0.065),
          Color(red: 0.015, green: 0.015, blue: 0.02)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ),
      for: .widget
    )
    .foregroundStyle(.white)
  }

  @ViewBuilder
  private func readyContent(_ cards: [SnapshotCard]) -> some View {
    if family == .systemSmall, let card = cards.first {
      Link(destination: card.deepLink) {
        featuredCard(card, compact: true)
      }
    } else {
      VStack(alignment: .leading, spacing: 10) {
        header
        ForEach(Array(cards.prefix(family == .systemLarge ? 4 : 3))) { card in
          Link(destination: card.deepLink) {
            rowCard(card)
          }
        }
      }
      .padding(2)
    }
  }

  private var header: some View {
    HStack(spacing: 6) {
      Image(systemName: "wallet.pass.fill")
        .font(.caption)
        .foregroundStyle(.white.opacity(0.72))
      Text("LOYALTY CARDS")
        .font(.caption2.weight(.bold))
        .tracking(0.8)
        .foregroundStyle(.white.opacity(0.72))
      Spacer()
      Text("CHECKOUT")
        .font(.caption2.weight(.bold))
        .tracking(0.6)
        .foregroundStyle(Color(red: 0.66, green: 0.86, blue: 1.0))
    }
  }

  private func featuredCard(_ card: SnapshotCard, compact: Bool) -> some View {
    ZStack(alignment: .bottomLeading) {
      RoundedRectangle(cornerRadius: 20, style: .continuous)
        .fill(
          LinearGradient(
            colors: [
              accentColor(for: card).opacity(0.82),
              Color(red: 0.055, green: 0.055, blue: 0.07)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        .overlay(alignment: .topTrailing) {
          barcodeMark
            .padding(14)
        }
        .overlay {
          RoundedRectangle(cornerRadius: 20, style: .continuous)
            .stroke(.white.opacity(0.16), lineWidth: 1)
        }

      VStack(alignment: .leading, spacing: compact ? 7 : 9) {
        Text("READY TO SCAN")
          .font(.caption2.weight(.bold))
          .tracking(0.8)
          .foregroundStyle(.white.opacity(0.7))
        Spacer(minLength: 8)
        Text(card.storeName ?? "Loyalty Card")
          .font(.headline.weight(.semibold))
          .lineLimit(2)
        Text(masked(card.cardNumber))
          .font(.system(.caption, design: .monospaced).weight(.semibold))
          .padding(.horizontal, 9)
          .padding(.vertical, 5)
          .background(.white.opacity(0.12), in: Capsule())
        Text("OPEN BARCODE")
          .font(.caption2.weight(.bold))
          .tracking(0.7)
          .foregroundStyle(Color(red: 0.66, green: 0.86, blue: 1.0))
      }
      .padding(14)
    }
  }

  private func rowCard(_ card: SnapshotCard) -> some View {
    HStack(spacing: 10) {
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(accentColor(for: card).opacity(0.85))
        .frame(width: 42, height: 42)
        .overlay {
          Image(systemName: "barcode.viewfinder")
            .font(.system(size: 18, weight: .semibold))
        }
      VStack(alignment: .leading, spacing: 3) {
        Text(card.storeName ?? "Loyalty Card")
          .font(.subheadline.weight(.semibold))
          .lineLimit(1)
        Text(masked(card.cardNumber))
          .font(.system(.caption2, design: .monospaced).weight(.medium))
          .foregroundStyle(.white.opacity(0.66))
      }
      Spacer()
      Text("OPEN BARCODE")
        .font(.caption2.weight(.semibold))
        .foregroundStyle(Color(red: 0.66, green: 0.86, blue: 1.0))
    }
    .padding(10)
    .background(.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(.white.opacity(0.08), lineWidth: 1)
    }
  }

  private func fallbackView(_ message: String) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Image(systemName: "wallet.pass")
        .font(.title2)
        .foregroundStyle(Color(red: 0.66, green: 0.86, blue: 1.0))
      Spacer(minLength: 8)
      Text(message)
        .font(.headline.weight(.semibold))
      Text("Open the app to refresh selected cards.")
        .font(.caption)
        .foregroundStyle(.white.opacity(0.66))
    }
    .padding(4)
  }

  private var barcodeMark: some View {
    HStack(alignment: .center, spacing: 2) {
      ForEach(0..<9, id: \.self) { index in
        Capsule()
          .fill(.white.opacity(index.isMultiple(of: 3) ? 0.9 : 0.46))
          .frame(width: index.isMultiple(of: 3) ? 3 : 1.5, height: index.isMultiple(of: 2) ? 30 : 22)
      }
    }
  }

  private func accentColor(for card: SnapshotCard) -> Color {
    if let backgroundColor = card.backgroundColor, let color = Color(hex: backgroundColor) {
      return color
    }
    return Color(red: 0.18, green: 0.42, blue: 0.84)
  }

  private func masked(_ value: String?) -> String {
    guard let value else { return "Open in app" }
    let compact = value.filter { !$0.isWhitespace && $0 != "-" }
    return compact.count > 4 ? "•••• \(compact.suffix(4))" : compact
  }
}

private extension Color {
  init?(hex: String) {
    let sanitized = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    guard sanitized.count == 6, let value = UInt64(sanitized, radix: 16) else {
      return nil
    }

    self = Color(
      red: Double((value >> 16) & 0xff) / 255,
      green: Double((value >> 8) & 0xff) / 255,
      blue: Double(value & 0xff) / 255
    )
  }
}

@main
private struct LoyaltyCardWidget: Widget {
  let kind = "LoyaltyCardWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LoyaltyCardWidgetProvider()) { entry in
      LoyaltyCardWidgetView(entry: entry)
    }
    .configurationDisplayName("Loyalty Cards")
    .description("Open selected loyalty cards at checkout.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

private func loadSnapshot() -> SnapshotOutcome {
  guard
    let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ),
    let data = try? Data(contentsOf: container.appendingPathComponent(snapshotFileName)),
    let envelope = try? JSONDecoder().decode(SnapshotEnvelope.self, from: data),
    envelope.app == "loyalty-card-wallet",
    envelope.envelopeVersion == 1,
    envelope.integrity.algorithm == "sha256",
    sha256(envelope.payload) == envelope.integrity.digest,
    let payloadData = decodeBase64URL(envelope.payload),
    let payload = try? JSONDecoder().decode(SnapshotPayload.self, from: payloadData),
    payload.app == "loyalty-card-wallet",
    payload.snapshotVersion == 1,
    let expiry = parseExternalSnapshotTimestamp(payload.expiresAt),
    expiry > Date()
  else {
    return .fallback("Open Wallet")
  }

  let cards = payload.entries
    .filter {
      $0.state == "active" &&
      $0.storeName?.isEmpty == false &&
      $0.cardNumber?.isEmpty == false &&
      $0.barcodeFormat?.isEmpty == false
    }
    .sorted { $0.sourceCardId < $1.sourceCardId }
  return cards.isEmpty ? .fallback("Open Wallet") : .ready(cards)
}

private func parseExternalSnapshotTimestamp(_ value: String) -> Date? {
  let fractionalFormatter = ISO8601DateFormatter()
  fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let date = fractionalFormatter.date(from: value) {
    return date
  }

  return ISO8601DateFormatter().date(from: value)
}

private func sha256(_ value: String) -> String {
  SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
}

private func decodeBase64URL(_ value: String) -> Data? {
  var normalized = value.replacingOccurrences(of: "-", with: "+")
    .replacingOccurrences(of: "_", with: "/")
  let remainder = normalized.count % 4
  if remainder == 1 { return nil }
  if remainder > 0 {
    normalized.append(String(repeating: "=", count: 4 - remainder))
  }
  return Data(base64Encoded: normalized)
}
