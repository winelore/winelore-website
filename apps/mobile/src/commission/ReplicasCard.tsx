import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import { isMemberUser, replicasForSelector, type CommissionReplica } from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { Segmented } from "../ui/Segmented"
import { panelSurface } from "../ui/Surface"

interface ReplicasCardProps {
    replicas: CommissionReplica[]
    selectedId: string | null
    auid: string | null
    /** A holder adds replicas to a draft, and renames the selected draft replica. */
    canEdit: boolean
    busy: boolean
    onSelect: (id: string) => void
    onAdd: (name: string, type: "STANDARD" | "TRAINEE") => Promise<boolean>
    onRename: (id: string, name: string) => Promise<boolean>
}

/**
 * The web's replica selector: each tasting replica as a row — its name,
 * type, whether it is yours and its status — the selected one in indigo.
 * Choosing one changes the panel, steps and controls below to it.
 */
export function ReplicasCard({ replicas, selectedId, auid, canEdit, busy, onSelect, onAdd, onRename }: ReplicasCardProps) {
    const { t, formatReplicaType, formatStatus } = useTranslation()
    const [adding, setAdding] = useState(false)
    const [newName, setNewName] = useState("")
    const [newType, setNewType] = useState<"STANDARD" | "TRAINEE">("STANDARD")
    const [renaming, setRenaming] = useState(false)
    const [renameDraft, setRenameDraft] = useState("")

    const add = async () => {
        if (await onAdd(newName, newType)) setAdding(false)
    }
    const rename = async () => {
        if (selectedId && (await onRename(selectedId, renameDraft))) setRenaming(false)
    }

    return (
        <View style={panelSurface}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Icon name="layers" size={16} color={palette.accentBright} />
                    <Text style={styles.title}>{t("commission.tastingReplicas")}</Text>
                </View>
                {canEdit && !adding ? (
                    <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => {
                            setNewName("")
                            setNewType("STANDARD")
                            setAdding(true)
                        }}
                        style={({ pressed }) => [styles.addButton, (pressed || busy) && styles.dimmed]}
                    >
                        <Icon name="plus" size={14} color={palette.accent} weight="semibold" />
                        <Text style={styles.addLabel}>{t("commission.addReplica")}</Text>
                    </Pressable>
                ) : null}
            </View>

            {adding ? (
                <View style={styles.form}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{t("commission.addTastingReplica")}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={t("competition.cancel")} hitSlop={8} onPress={() => setAdding(false)}>
                            <Icon name="close" size={16} color={palette.textFaint} />
                        </Pressable>
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>{t("commission.replicaNameOptional")}</Text>
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            autoFocus
                            placeholder="e.g. Replica B"
                            placeholderTextColor={palette.textFaint}
                            style={styles.fieldInput}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>{t("commission.replicaType")}</Text>
                        <Segmented
                            options={[
                                { value: "STANDARD", label: t("commission.typeStandard") },
                                { value: "TRAINEE", label: t("commission.typeTrainee") },
                            ]}
                            value={newType}
                            onChange={setNewType}
                            accessibilityLabel={t("commission.replicaType")}
                        />
                    </View>
                    <View style={styles.formActions}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setAdding(false)}
                            disabled={busy}
                            style={({ pressed }) => [styles.secondary, pressed && styles.dimmed]}
                        >
                            <Text style={styles.secondaryLabel}>{t("competition.cancel")}</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={add}
                            disabled={busy}
                            style={({ pressed }) => [styles.primary, (pressed || busy) && styles.dimmed]}
                        >
                            {busy ? (
                                <ActivityIndicator size="small" color={palette.onAccent} />
                            ) : (
                                <Icon name="plus" size={14} color={palette.onAccent} weight="semibold" />
                            )}
                            <Text style={styles.primaryLabel}>{busy ? t("competition.adding") : t("commission.addReplica")}</Text>
                        </Pressable>
                    </View>
                </View>
            ) : null}

            {replicas.length === 0 && !adding ? <Text style={styles.empty}>{t("commission.noReplicasYet")}</Text> : null}

            <View style={styles.list}>
                {replicasForSelector(replicas).map((replica) => {
                    const selected = replica.id === selectedId
                    const mine = replica.members.some((member) => isMemberUser(member, auid))

                    if (renaming && selected) {
                        return (
                            <View key={replica.id} style={styles.renameRow}>
                                <TextInput
                                    value={renameDraft}
                                    onChangeText={setRenameDraft}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={rename}
                                    placeholder={t("commission.replicaNamePlaceholder")}
                                    placeholderTextColor={palette.textFaint}
                                    style={styles.renameInput}
                                />
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("common.save")}
                                    onPress={rename}
                                    disabled={busy}
                                    style={({ pressed }) => [styles.iconPrimary, (pressed || busy) && styles.dimmed]}
                                >
                                    {busy ? (
                                        <ActivityIndicator size="small" color={palette.onAccent} />
                                    ) : (
                                        <Icon name="done" size={14} color={palette.onAccent} weight="bold" />
                                    )}
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("competition.cancel")}
                                    onPress={() => setRenaming(false)}
                                    style={({ pressed }) => [styles.iconSecondary, pressed && styles.dimmed]}
                                >
                                    <Icon name="close" size={14} color={palette.textMuted} weight="bold" />
                                </Pressable>
                            </View>
                        )
                    }

                    const look = STATUS_LOOK[replica.status === "STARTED" ? "started" : replica.status === "COMPLETED" ? "done" : "other"][
                        selected ? "selected" : "idle"
                    ]

                    return (
                        <Pressable
                            key={replica.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => {
                                if (selected) return
                                Haptics.selectionAsync()
                                onSelect(replica.id)
                            }}
                            style={({ pressed }) => [styles.row, selected ? styles.rowSelected : styles.rowIdle, pressed && !selected && styles.rowPressed]}
                        >
                            <View style={styles.rowMain}>
                                <Text style={[styles.rowName, selected && styles.rowNameSelected]}>{replica.name}</Text>
                                <View style={[styles.typeChip, selected && styles.typeChipSelected]}>
                                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                                        {formatReplicaType(replica.type)}
                                    </Text>
                                </View>
                                {canEdit && selected && replica.status === "DRAFT" ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={t("commission.renameReplica")}
                                        hitSlop={8}
                                        onPress={() => {
                                            setRenameDraft(replica.name || "")
                                            setRenaming(true)
                                        }}
                                        style={styles.renameButton}
                                    >
                                        <Icon name="edit" size={14} color="rgba(255, 255, 255, 0.8)" />
                                    </Pressable>
                                ) : null}
                            </View>
                            <View style={styles.rowSide}>
                                {mine ? (
                                    <View style={[styles.mine, selected && styles.mineSelected]}>
                                        <Text style={[styles.mineLabel, selected && styles.mineLabelSelected]}>
                                            {t("commission.myTasting")}
                                        </Text>
                                    </View>
                                ) : null}
                                <View style={[styles.status, { backgroundColor: look.background }]}>
                                    <Text style={[styles.statusLabel, { color: look.color }]}>
                                        {formatStatus(replica.status)}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

/** The replica's status chip, as the web tints it on an idle and on the selected (indigo) row. */
const STATUS_LOOK = {
    started: {
        idle: { background: "rgba(0, 188, 125, 0.1)", color: palette.positive },
        selected: { background: "#00d492", color: "#1e1a4d" },
    },
    done: {
        idle: { background: "#f1f5f9", color: palette.textMuted },
        selected: { background: "#314158", color: palette.border },
    },
    other: {
        idle: { background: "rgba(254, 154, 0, 0.1)", color: palette.warning },
        selected: { background: "#ffba00", color: "#1e1a4d" },
    },
} as const

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: palette.accentSoft,
    },
    addLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.accent },
    dimmed: { opacity: 0.5 },
    form: {
        gap: 12,
        padding: 16,
        marginBottom: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.8)",
        backgroundColor: palette.background,
        ...continuous,
    },
    formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    formTitle: { fontSize: 12, fontWeight: "700", color: palette.heading },
    field: { gap: 6 },
    fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    fieldInput: {
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#cad5e2",
        fontSize: 14,
        fontWeight: "600",
        color: palette.textStrong,
    },
    formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
    secondary: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    secondaryLabel: { fontSize: 12, fontWeight: "600", color: "#45556c" },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: palette.accent,
    },
    primaryLabel: { fontSize: 12, fontWeight: "600", color: palette.onAccent },
    empty: { paddingVertical: 12, fontSize: 12, color: palette.textFaint, textAlign: "center" },
    list: { gap: 8 },
    row: {
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radius.tile,
        borderWidth: 1,
        ...continuous,
    },
    rowIdle: { borderColor: "rgba(226, 232, 240, 0.6)", backgroundColor: palette.background },
    rowSelected: {
        borderColor: palette.accent,
        backgroundColor: palette.accent,
        boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.2), 0 4px 6px -4px rgba(99, 102, 241, 0.2)",
    },
    rowPressed: { backgroundColor: "#f1f5f9" },
    rowMain: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    rowName: { fontSize: 13, fontWeight: "700", color: "#45556c" },
    rowNameSelected: { color: palette.onAccent },
    typeChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "#eef2f6",
    },
    typeChipSelected: { borderColor: "#615fff", backgroundColor: "rgba(67, 45, 215, 0.6)" },
    typeLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", color: palette.textMuted },
    typeLabelSelected: { color: "#e0e7ff" },
    renameButton: { marginLeft: 4, padding: 4, borderRadius: 4 },
    rowSide: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    mine: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, backgroundColor: palette.accent },
    mineSelected: { backgroundColor: palette.surface },
    mineLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: palette.onAccent },
    mineLabelSelected: { color: palette.accent },
    status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
    statusLabel: { fontSize: 9, fontWeight: "700" },
    renameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "#a3b3ff",
        backgroundColor: palette.surface,
        ...continuous,
    },
    renameInput: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#a3b3ff",
        backgroundColor: palette.background,
        fontSize: 13,
        fontWeight: "600",
        color: palette.text,
    },
    iconPrimary: { padding: 7, borderRadius: 8, backgroundColor: palette.accent },
    iconSecondary: { padding: 7, borderRadius: 8, backgroundColor: palette.borderSoft },
})
