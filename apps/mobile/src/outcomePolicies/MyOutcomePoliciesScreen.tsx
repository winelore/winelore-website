import { useCallback, useMemo, useRef } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "expo-router"
import type { OutcomePolicySummary } from "@winelore/core"
import { getDateLocale } from "@winelore/core/i18n"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { EntityList } from "../lists/EntityList"
import { myOutcomePoliciesSource } from "../lists/sources"
import { usePagedList } from "../lists/usePagedList"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { palette, radius } from "../theme"
import { cardSurface } from "../ui/EntityCard"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"

/**
 * The web's /myOutcomePolicies: the outcome policies this user owns. A card
 * opens the policy's editor, as a row does on the web, and so does the
 * create button; the list reloads when the editor closes. The web's
 * numbered pages become scrolling, as on the other lists.
 */
export function MyOutcomePoliciesScreen() {
    const { t, tCount } = useTranslation()
    const { session } = useAuth()
    const open = useOpenDestination()
    const source = useMemo(() => myOutcomePoliciesSource(session?.auid ?? ""), [session?.auid])
    const list = usePagedList(source)

    // Back from the editor, whatever it saved or created.
    const shown = useRef(false)
    useFocusEffect(
        useCallback(() => {
            if (shown.current) list.refresh()
            shown.current = true
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [list.refresh]),
    )

    return (
        <EntityList
            // The web's "My Outcome Policies"; the same name Home and the profile sheet give it.
            title={t("common.myOutcomePolicies")}
            subtitle={t("myOutcomePolicies.subtitle")}
            countLabel={(total) => tCount("common.outcomePoliciesCount", total)}
            action={{ label: t("myOutcomePolicies.createButton"), onPress: () => open(destinations.createOutcomePolicy) }}
            list={list}
            keyExtractor={(policy) => policy.id}
            renderItem={(policy) => <PolicyRow policy={policy} onOpen={() => open(destinations.outcomePolicy(policy.id))} />}
            empty={{ icon: "outcomePolicy", title: t("myOutcomePolicies.emptyTitle"), description: t("myOutcomePolicies.emptyDescription") }}
            error={{ title: t("errors.serverTitle"), description: t("errors.serverDesc") }}
        />
    )
}

/** One policy: the web's row — name, created date, latest version and status, and the edit glyph. */
function PolicyRow({ policy, onOpen }: { policy: OutcomePolicySummary; onOpen: () => void }) {
    const { t, locale } = useTranslation()
    const created = new Intl.DateTimeFormat(getDateLocale(locale), { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(policy.createdAt),
    )
    const edition = policy.latestEdition
    const active = edition?.status === "ACTIVE"

    return (
        <PressableSurface onPress={onOpen} accessibilityHint={t("myOutcomePolicies.edit")} style={styles.card}>
            <View style={styles.tile}>
                <Icon name="outcomePolicy" size={24} color={palette.accent} />
            </View>
            <View style={styles.text}>
                <Text style={styles.name} numberOfLines={2}>
                    {policy.name}
                </Text>
                <View style={styles.meta}>
                    <Icon name="calendar" size={13} color={palette.textMuted} />
                    <Text style={styles.metaText}>
                        {t("myOutcomePolicies.createdAt")}: {created}
                    </Text>
                    {edition ? (
                        <View style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
                            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]}>
                                v{edition.version} · {edition.status}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <View style={styles.edit}>
                <Icon name="edit" size={16} color={palette.textMuted} />
            </View>
        </PressableSurface>
    )
}

const styles = StyleSheet.create({
    // bg-white border-slate-100 p-6 rounded, as the web's row on a phone
    card: { ...cardSurface, borderRadius: radius.panel, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
    tile: { padding: 12, borderRadius: radius.tile, backgroundColor: palette.accentSoft },
    text: { flex: 1, minWidth: 0 },
    name: { fontSize: 18, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3, color: palette.heading },
    meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 4, marginTop: 8 },
    metaText: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    chip: { marginLeft: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
    // bg-emerald-50 text-emerald-600 border-emerald-100 / bg-slate-100 text-slate-500
    chipActive: { backgroundColor: "#ecfdf5", borderColor: "#d0fae5" },
    chipIdle: { backgroundColor: palette.borderSoft, borderColor: palette.borderSoft },
    chipLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    chipLabelActive: { color: palette.positive },
    chipLabelIdle: { color: palette.textMuted },
    edit: { padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.background },
})
