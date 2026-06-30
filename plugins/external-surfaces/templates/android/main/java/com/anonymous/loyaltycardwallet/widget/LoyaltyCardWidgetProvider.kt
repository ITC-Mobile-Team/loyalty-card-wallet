package com.anonymous.loyaltycardwallet.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import android.widget.RemoteViews
import com.anonymous.loyaltycardwallet.R
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.time.Instant

private const val snapshotFileName = "external-card-snapshot.json"

class LoyaltyCardWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    val card = loadActiveCard(context)
    appWidgetIds.forEach { appWidgetId ->
      manager.updateAppWidget(appWidgetId, createViews(context, appWidgetId, card))
    }
  }

  private fun createViews(context: Context, appWidgetId: Int, card: WidgetCard?): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.loyalty_card_widget)
    val destination = if (card == null) {
      Uri.parse("loyaltycardwallet://")
    } else {
      Uri.parse("loyaltycardwallet:///card/${Uri.encode(card.sourceCardId)}/scan-mode")
    }
    views.setTextViewText(
      R.id.loyalty_card_widget_title,
      card?.storeName ?: context.getString(R.string.loyalty_card_widget_fallback_title)
    )
    views.setTextViewText(
      R.id.loyalty_card_widget_number,
      card?.cardNumber?.let(::masked) ?: context.getString(R.string.loyalty_card_widget_fallback_body)
    )
    views.setTextViewText(
      R.id.loyalty_card_widget_action,
      if (card == null) {
        context.getString(R.string.loyalty_card_widget_open_wallet)
      } else {
        context.getString(R.string.loyalty_card_widget_open_barcode)
      }
    )
    val intent = Intent(Intent.ACTION_VIEW, destination).setPackage(context.packageName)
    val pendingIntent = PendingIntent.getActivity(
      context,
      appWidgetId,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.loyalty_card_widget_root, pendingIntent)
    return views
  }

  private fun loadActiveCard(context: Context): WidgetCard? {
    return runCatching {
      val serialized = File(context.filesDir, snapshotFileName).takeIf(File::exists)?.readText()
        ?: return null
      val envelope = JSONObject(serialized)
      if (
        envelope.optString("app") != "loyalty-card-wallet" ||
        envelope.optInt("envelopeVersion", -1) != 1
      ) return null
      val payload = envelope.getString("payload")
      val integrity = envelope.getJSONObject("integrity")
      if (
        integrity.optString("algorithm") != "sha256" ||
        !MessageDigest.isEqual(
          sha256(payload).toByteArray(Charsets.UTF_8),
          integrity.optString("digest").toByteArray(Charsets.UTF_8)
        )
      ) return null
      val decoded = String(Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP), Charsets.UTF_8)
      val snapshot = JSONObject(decoded)
      if (
        snapshot.optString("app") != "loyalty-card-wallet" ||
        snapshot.optInt("snapshotVersion", -1) != 1 ||
        Instant.parse(snapshot.getString("expiresAt")).isBefore(Instant.now())
      ) return null
      val entries = snapshot.getJSONArray("entries")
      for (index in 0 until entries.length()) {
        val entry = entries.getJSONObject(index)
        if (entry.optString("state") == "active") {
          val sourceCardId = entry.optString("sourceCardId")
          val storeName = entry.optString("storeName")
          val cardNumber = entry.optString("cardNumber")
          val barcodeFormat = entry.optString("barcodeFormat")
          if (
            sourceCardId.isNotBlank() &&
            storeName.isNotBlank() &&
            cardNumber.isNotBlank() &&
            barcodeFormat.isNotBlank()
          ) {
            return WidgetCard(sourceCardId, storeName, cardNumber)
          }
        }
      }
      null
    }.getOrNull()
  }

  private fun sha256(value: String): String =
    MessageDigest.getInstance("SHA-256")
      .digest(value.toByteArray(Charsets.UTF_8))
      .joinToString("") { "%02x".format(it) }

  private fun masked(value: String): String {
    val compact = value.filterNot { it.isWhitespace() || it == '-' }
    return if (compact.length > 4) "•••• ${compact.takeLast(4)}" else compact
  }

  private data class WidgetCard(
    val sourceCardId: String,
    val storeName: String,
    val cardNumber: String
  )
}
