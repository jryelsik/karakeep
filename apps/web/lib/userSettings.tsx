"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useSortOrderStore } from "@/lib/store/useSortOrderStore";
import { useQuery } from "@tanstack/react-query";

import { useUpdateUserSettings } from "@karakeep/shared-react/hooks/users";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { ZUserSettings } from "@karakeep/shared/types/users";

export const UserSettingsContext = createContext<ZUserSettings>({
  bookmarkClickAction: "open_original_link",
  archiveDisplayBehaviour: "show",
  timezone: "UTC",
  backupsEnabled: false,
  backupsFrequency: "daily",
  backupsRetentionDays: 7,
  readerFontSize: null,
  readerLineHeight: null,
  readerFontFamily: null,
  autoTaggingEnabled: null,
  autoSummarizationEnabled: null,
  tagStyle: "as-generated",
  curatedTagIds: null,
  inferredTagLang: null,
  customBookmarkOrders: {},
  customListOrders: {},
});

function hasLocalOnlyKeys(
  merged: Record<string, string[]>,
  server: Record<string, string[]>,
) {
  return Object.keys(merged).some(
    (k) => merged[k]?.length > 0 && !server[k]?.length,
  );
}

export function UserSettingsContextProvider({
  userSettings,
  children,
}: {
  userSettings: ZUserSettings;
  children: React.ReactNode;
}) {
  const api = useTRPC();
  const { data } = useQuery(
    api.users.settings.queryOptions(undefined, {
      initialData: userSettings,
    }),
  );
  const { mutate: updateSettings } = useUpdateUserSettings();
  const hydrateCustomOrders = useSortOrderStore(
    (state) => state.hydrateCustomOrders,
  );
  const serverSyncSeq = useSortOrderStore((state) => state.serverSyncSeq);
  const lastSyncedSeqRef = useRef(useSortOrderStore.getState().serverSyncSeq);
  const didBackfillLocalRef = useRef(false);

  useEffect(() => {
    const serverBookmarks = data.customBookmarkOrders ?? {};
    const serverLists = data.customListOrders ?? {};
    hydrateCustomOrders(serverBookmarks, serverLists);

    if (!didBackfillLocalRef.current) {
      didBackfillLocalRef.current = true;
      const { customOrders, customListOrders } = useSortOrderStore.getState();
      if (
        hasLocalOnlyKeys(customOrders, serverBookmarks) ||
        hasLocalOnlyKeys(customListOrders, serverLists)
      ) {
        updateSettings({
          customBookmarkOrders: customOrders,
          customListOrders,
        });
      }
    }
  }, [
    data.customBookmarkOrders,
    data.customListOrders,
    hydrateCustomOrders,
    updateSettings,
  ]);

  useEffect(() => {
    if (serverSyncSeq <= lastSyncedSeqRef.current) {
      return;
    }
    lastSyncedSeqRef.current = serverSyncSeq;
    const { customOrders, customListOrders } = useSortOrderStore.getState();
    updateSettings({
      customBookmarkOrders: customOrders,
      customListOrders,
    });
  }, [serverSyncSeq, updateSettings]);

  return (
    <UserSettingsContext.Provider value={data}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
}
