import ExpoModulesCore
import Foundation
import WidgetKit

private let appGroupIdentifier = "group.com.anonymous.loyalty-card-wallet"
private let snapshotFileName = "external-card-snapshot.json"

private final class SharedSnapshotStorageException: Exception {
  override var reason: String {
    "The external card snapshot could not be accessed."
  }
}

public final class ExternalSnapshotStorageModule: Module {
  private let queue = DispatchQueue(label: "loyalty-card-wallet.external-snapshot-storage")

  public func definition() -> ModuleDefinition {
    Name("ExternalSnapshotStorage")

    AsyncFunction("read") { () -> String? in
      try self.queue.sync {
        let url = try self.snapshotURL()
        guard FileManager.default.fileExists(atPath: url.path) else {
          return nil
        }
        return try String(contentsOf: url, encoding: .utf8)
      }
    }

    AsyncFunction("write") { (serialized: String) in
      try self.queue.sync {
        let url = try self.snapshotURL()
        try serialized.write(to: url, atomically: true, encoding: .utf8)
      }
    }

    AsyncFunction("clear") {
      try self.queue.sync {
        let url = try self.snapshotURL()
        if FileManager.default.fileExists(atPath: url.path) {
          try FileManager.default.removeItem(at: url)
        }
      }
    }

    AsyncFunction("notifyChanged") {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  private func snapshotURL() throws -> URL {
    guard let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ) else {
      throw SharedSnapshotStorageException()
    }
    return container.appendingPathComponent(snapshotFileName, isDirectory: false)
  }
}
