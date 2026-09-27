import { StyleSheet, Switch, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import {
    COMMISSION_SETTINGS,
    type CommissionPageData,
    type CommissionReplica,
    type CommissionReplicaPanel,
    type CommissionSetting,
} from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"

/**
 * One setting: its name and what it does, and the system's switch — UISwitch
 * on iOS, Material's on Android — where the web draws one.
 */
function SettingRow({
    label,
    description,
    value,
    disabled,
    onChange,
}: {
    label: string
    description: string
    value: boolean
    disabled: boolean
    onChange: (value: boolean) => void
}) {
    return (
        <View style={styles.row}>
            <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                disabled={disabled}
                onValueChange={(next) => {
                    Haptics.selectionAsync()
                    onChange(next)
                }}
                trackColor={{ true: palette.accent, false: "#cad5e2" }}
                ios_backgroundColor="#cad5e2"
                accessibilityLabel={label}
            />
        </View>
    )
}

/** The holder's evaluation settings for the whole commission. */
export function EvaluationSettingsCard({
    page,
    busy,
    onChange,
}: {
    page: CommissionPageData
    busy: boolean
    onChange: (key: CommissionSetting, value: boolean) => void
}) {
    const { t } = useTranslation()
    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.titleRow}>
                <Icon name="sliders" size={16} color={palette.accentBright} />
                <Text style={styles.title}>{t("commission.evaluationSettings")}</Text>
            </View>
            {COMMISSION_SETTINGS.map((setting) => (
                <SettingRow
                    key={setting.key}
                    label={t(setting.labelKey as never)}
                    description={t(setting.descriptionKey as never)}
                    value={page[setting.key]}
                    disabled={busy}
                    onChange={(value) => onChange(setting.key, value)}
                />
            ))}
        </View>
    )
}

/** How the chair may move a replica through its panels and candidates. */
export function ReplicaSettingsCard({
    replica,
    activePanel,
    busy,
    onChaoticCandidates,
    onChaoticPanels,
}: {
    replica: CommissionReplica
    activePanel: CommissionReplicaPanel | null
    busy: boolean
    onChaoticCandidates: (value: boolean) => void
    onChaoticPanels: (value: boolean) => void
}) {
    const { t } = useTranslation()
    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.titleRow}>
                <Icon name="layers" size={16} color={palette.accentBright} />
                <Text style={styles.title}>{t("commission.replicaSettings", { name: replica.name })}</Text>
            </View>
            <SettingRow
                label={t("commission.chaoticCandidateChangesTitle")}
                description={t("commission.chaoticCandidateChangesDesc")}
                value={Boolean(activePanel?.chaoticCurrentCandidateChangesEnabled)}
                disabled={busy || activePanel === null}
                onChange={onChaoticCandidates}
            />
            <SettingRow
                label={t("commission.chaoticPanelChangesTitle")}
                description={t("commission.chaoticPanelChangesDesc")}
                value={Boolean(replica.chaoticCurrentPanelChangesEnabled)}
                disabled={busy}
                onChange={onChaoticPanels}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    card: { gap: 12 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    title: { flexShrink: 1, fontSize: 14, fontWeight: "700", letterSpacing: -0.2, color: palette.heading },
    // p-3.5 bg-slate-50 border-slate-100 rounded-2xl
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 12, fontWeight: "700", color: palette.heading },
    rowDescription: { marginTop: 2, fontSize: 11, lineHeight: 15, color: palette.textFaint },
})
