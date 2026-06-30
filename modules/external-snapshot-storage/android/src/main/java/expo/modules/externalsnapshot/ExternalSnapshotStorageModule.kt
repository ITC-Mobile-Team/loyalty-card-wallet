package expo.modules.externalsnapshot

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private const val snapshotFileName = "external-card-snapshot.json"
private const val widgetProviderClass = "com.anonymous.loyaltycardwallet.widget.LoyaltyCardWidgetProvider"

class ExternalSnapshotStorageModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExternalSnapshotStorage")

    AsyncFunction("read") {
      val context = requireNotNull(appContext.reactContext)
      val file = File(context.filesDir, snapshotFileName)
      if (file.exists()) file.readText(Charsets.UTF_8) else null
    }

    AsyncFunction("write") { serialized: String ->
      val context = requireNotNull(appContext.reactContext)
      val destination = File(context.filesDir, snapshotFileName)
      val temporary = File(context.filesDir, "$snapshotFileName.tmp")
      temporary.writeText(serialized, Charsets.UTF_8)
      if (!temporary.renameTo(destination)) {
        temporary.copyTo(destination, overwrite = true)
        temporary.delete()
      }
    }

    AsyncFunction("clear") {
      val context = requireNotNull(appContext.reactContext)
      File(context.filesDir, snapshotFileName).delete()
    }

    AsyncFunction("notifyChanged") {
      val context = requireNotNull(appContext.reactContext)
      val component = ComponentName(context.packageName, widgetProviderClass)
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isNotEmpty()) {
        context.sendBroadcast(
          Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            .setComponent(component)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        )
      }
    }
  }
}
