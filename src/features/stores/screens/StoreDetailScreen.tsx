import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { colors, radius, spacing } from "@/design/tokens";
import type { StoreSummary } from "@/domain/stores/StoreRepository";
import { StoreMapPreview } from "@/features/stores/components/StoreMapPreview";
import { useStoreDetails } from "@/features/stores/hooks/useStoreDetails";
import { useStoreCoordinateActions } from "@/features/stores/hooks/useStoreCoordinateActions";
import { formatCoordinates, getValidStoreCoordinate, type StoreCoordinate } from "@/features/stores/storeCoordinates";

type StoreDetailScreenProps = {
  storeId: string;
};

type DetailItem = {
  label: string;
  value?: string;
};

export function StoreDetailScreen({ storeId }: StoreDetailScreenProps) {
  const { error, isLoading, refresh, store } = useStoreDetails(storeId);

  return (
    <Screen contentContainerStyle={styles.content}>
      {isLoading ? (
        <View style={styles.stateBox}>
          <AppText color={colors.text.secondary}>Loading store...</AppText>
        </View>
      ) : null}

      {error ? (
        <View style={styles.stateBox}>
          <AppText color={colors.action.danger}>{error.message}</AppText>
          <AppButton label="Retry" onPress={() => void refresh()} variant="secondary" />
        </View>
      ) : null}

      {!isLoading && !error && !store ? (
        <EmptyState
          body="Open Stores, search a city or nearby area, then choose a store from the loaded list."
          title="Store Not Found"
        />
      ) : null}

      {store ? <StoreDetailContent store={store} /> : null}
    </Screen>
  );
}

function StoreDetailContent({ store }: { store: StoreSummary }) {
  const coordinate = getValidStoreCoordinate(store);
  const primaryItems: DetailItem[] = [
    { label: "Category", value: store.category },
    { label: "Address", value: store.address },
    { label: "Coordinates", value: coordinate ? formatCoordinates(coordinate) : undefined }
  ];
  const metadataItems: DetailItem[] = [
    { label: "Brand", value: store.brand },
    { label: "Operator", value: store.operator },
    { label: "Opening Hours", value: store.openingHours },
    { label: "Phone", value: store.phone },
    { label: "Website", value: store.website }
  ];

  return (
    <>
      <View style={styles.header}>
        <AppText variant="titleLarge">{store.name}</AppText>
        {store.category ? <AppText color={colors.text.secondary}>{store.category}</AppText> : null}
      </View>

      <DetailGroup items={primaryItems} />
      {coordinate ? <StoreMapSection coordinate={coordinate} storeName={store.name} /> : null}
      <DetailGroup items={metadataItems} />

      <View style={styles.group}>
        <ListRow detail={store.id} title="OpenStreetMap ID" />
        <ListRow detail="Store data from OpenStreetMap contributors, available under ODbL." title="Source" />
      </View>
    </>
  );
}

function StoreMapSection({ coordinate, storeName }: { coordinate: StoreCoordinate; storeName: string }) {
  return (
    <View style={styles.mapSection}>
      <AppText variant="bodyStrong">Map</AppText>
      <StoreMapPreview latitude={coordinate.latitude} longitude={coordinate.longitude} title={storeName} />
      <StoreCoordinateActions coordinate={coordinate} storeName={storeName} />
    </View>
  );
}

function StoreCoordinateActions({ coordinate, storeName }: { coordinate: StoreCoordinate; storeName: string }) {
  const { copyCoordinates, feedback, openInMaps } = useStoreCoordinateActions({ coordinate, storeName });

  return (
    <View style={styles.coordinateActions}>
      <View style={styles.actionRow}>
        <AppButton label="Open in Maps" onPress={() => void openInMaps()} style={styles.actionButton} />
        <AppButton
          label="Copy Coordinates"
          onPress={() => void copyCoordinates()}
          style={styles.actionButton}
          variant="secondary"
        />
      </View>
      {feedback ? (
        <AppText color={feedback.tone === "error" ? colors.action.danger : colors.text.secondary} variant="caption">
          {feedback.message}
        </AppText>
      ) : null}
    </View>
  );
}

function DetailGroup({ items }: { items: DetailItem[] }) {
  const visibleItems = items.filter((item) => item.value);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      {visibleItems.map((item) => (
        <ListRow detail={item.value} key={item.label} title={item.label} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    minWidth: 150
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  coordinateActions: {
    gap: spacing.sm
  },
  content: {
    gap: spacing.xl
  },
  header: {
    gap: spacing.xs
  },
  group: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md
  },
  mapSection: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.md,
    padding: spacing.md
  },
  stateBox: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.md,
    padding: spacing.md
  }
});
