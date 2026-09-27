import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Calendar, Percent, Droplet, Barcode, FlaskConical, Plus, ExternalLink, Pencil, Check, X } from "lucide-react"

import { changeBatchVolumeAction, changeBatchLotNumberAction, updateBatchAttributesAction } from "../actions"
import { batchFigures } from "@winelore/core/beverage"

export function BatchCard({
                              batch,
                              beverageId,
                              t,
                              canEdit = true,
                              setSelectedBatchForSamples
                          }: {
    batch: any;
    beverageId: string;
    t: any;
    canEdit?: boolean;
    setSelectedBatchForSamples: (batch: any) => void;
}) {
    const router = useRouter()

    const figures = batchFigures(batch)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editVolumeMl, setEditVolumeMl] = useState<string>(batch.volumeMl !== null && batch.volumeMl !== undefined ? String(batch.volumeMl) : "")
    const [editLotNumber, setEditLotNumber] = useState<string>(batch.lotNumber || "")
    const [editAbv, setEditAbv] = useState<string>(figures.abv ? String(figures.abv) : "")
    const [editName, setEditName] = useState<string>(batch.attributes?.vintage ? String(batch.attributes.vintage) : "")

    const openEdit = () => {
        const currentFigures = batchFigures(batch)
        setEditVolumeMl(batch.volumeMl !== null && batch.volumeMl !== undefined ? String(batch.volumeMl) : "")
        setEditLotNumber(batch.lotNumber || "")
        setEditAbv(currentFigures.abv ? String(currentFigures.abv) : "")
        setEditName(batch.attributes?.vintage ? String(batch.attributes.vintage) : "")
        setIsEditing(true)
    }

    useEffect(() => {
        if (!isEditing) {
            const currentFigures = batchFigures(batch)
            setEditVolumeMl(batch.volumeMl !== null && batch.volumeMl !== undefined ? String(batch.volumeMl) : "")
            setEditLotNumber(batch.lotNumber || "")
            setEditAbv(currentFigures.abv ? String(currentFigures.abv) : "")
            setEditName(batch.attributes?.vintage ? String(batch.attributes.vintage) : "")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch.id, isEditing])

    const displayVintage = batch.attributes?.vintage || figures.vintage
    const batchSamples = batch.samples || []

    const handleSave = async () => {
        if (isSaving) return
        setIsSaving(true)
        try {
            const vol = editVolumeMl.trim() ? parseInt(editVolumeMl.trim(), 10) : null;
            const lot = editLotNumber.trim() || null;
            const abvVal = editAbv.trim() || null;
            const nameVal = String(editName).trim() || null;

            let hasAttributeChanges = false;
            const updatedAttributes = { ...batch.attributes };

            const originalAbv = figures.abv ? String(figures.abv) : null;
            if (abvVal !== originalAbv) {
                hasAttributeChanges = true;
                if (abvVal) {
                    const numericAbv = parseFloat(abvVal.replace(',', '.'));
                    const finalAbv = isNaN(numericAbv) ? abvVal : numericAbv;

                    updatedAttributes.alcoholByVolume = finalAbv;
                    delete updatedAttributes.abv;
                    delete updatedAttributes.alcohol;
                } else {
                    delete updatedAttributes.alcoholByVolume;
                    delete updatedAttributes.abv;
                    delete updatedAttributes.alcohol;
                }
            }

            const originalName = batch.attributes?.vintage ? String(batch.attributes.vintage) : null;
            if (nameVal !== originalName) {
                hasAttributeChanges = true;
                if (nameVal) {
                    const strictVintage = Number(nameVal);
                    updatedAttributes.vintage = !isNaN(strictVintage) && Number.isInteger(strictVintage) ? strictVintage : nameVal;
                } else {
                    delete updatedAttributes.vintage;
                }
            }

            const originalVol = batch.volumeMl ?? null;
            if (vol !== originalVol) {
                await changeBatchVolumeAction(batch.id, beverageId, vol)
            }
            const originalLot = batch.lotNumber ?? null;
            if (lot !== originalLot) {
                await changeBatchLotNumberAction(batch.id, beverageId, lot)
            }
            if (hasAttributeChanges) {
                await updateBatchAttributesAction(batch.id, beverageId, updatedAttributes);
            }

            setIsEditing(false)
            router.refresh()
            toast.success(t("beverage.batches.updateSuccess", { defaultValue: "Партію оновлено" }))
        } catch (err: any) {
            const msg = err.message || "";
            if (msg.includes("vintage")) {
                toast.error(t("beverage.batches.invalidVintage", { defaultValue: "Невірний формат року. Введіть число (наприклад 2024)" }))
            } else if (msg.includes("alcoholByVolume") || msg.includes("abv") || msg.includes("alcohol")) {
                toast.error(t("beverage.batches.invalidAbv", { defaultValue: "Невірний формат алкоголю. Введіть число (наприклад 14.5)" }))
            } else {
                toast.error(t("beverage.batches.generalError", { defaultValue: "Помилка збереження: перевірте правильність даних" }))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setEditVolumeMl(batch.volumeMl !== null && batch.volumeMl !== undefined ? String(batch.volumeMl) : "")
        setEditLotNumber(batch.lotNumber || "")
        setEditAbv(figures.abv ? String(figures.abv) : "")
        setEditName(batch.attributes?.vintage ? String(batch.attributes.vintage) : "")
    }

    const batchVol = figures.batchVolume
    const groupedSamples = figures.sampleGroups
    const totalSamplesVol = figures.sampleVolume

    return (
        <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-md hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group/batch relative overflow-hidden flex flex-col justify-between">
            {/* Side border decoration */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-60 group-hover/batch:opacity-100 transition-opacity" />

            <div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleSave()
                                    if (e.key === "Escape") handleCancel()
                                }}
                                className="w-full text-sm font-extrabold text-slate-900 bg-white border border-indigo-400 focus:border-indigo-600 rounded-xl px-3 py-1 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder={t("beverage.batches.vintage")}
                                disabled={isSaving}
                                autoFocus
                            />
                        ) : (
                            <span className="text-md font-bold text-slate-800">
                                {displayVintage ? `${t("beverage.batches.vintage")} ${displayVintage}` : t("beverage.batches.noVintage")}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline-block">
                            ID: {batch.id.slice(-6).toUpperCase()}
                        </span>
                        {canEdit && (!isEditing ? (
                            <button
                                type="button"
                                onClick={openEdit}
                                title={t("common.edit", { defaultValue: "Редагувати" })}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        ) : isEditing ? (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    title={t("common.save", { defaultValue: "Зберегти" })}
                                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer flex items-center justify-center"
                                >
                                    {isSaving ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    title={t("common.cancel", { defaultValue: "Скасувати" })}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : null)}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                        <Percent className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.abv")}</span>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editAbv}
                                onChange={(e) => setEditAbv(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleSave()
                                    if (e.key === "Escape") handleCancel()
                                }}
                                className="w-full text-center text-xs font-bold text-slate-900 bg-white border border-indigo-400 focus:border-indigo-600 rounded-lg px-2 py-0.5 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="%"
                                disabled={isSaving}
                            />
                        ) : (
                            <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                {figures.abv ?? t("common.na")}
                            </span>
                        )}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                        <Droplet className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.volume")}</span>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editVolumeMl}
                                onChange={(e) => setEditVolumeMl(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleSave()
                                    if (e.key === "Escape") handleCancel()
                                }}
                                className="w-full text-center text-xs font-bold text-slate-900 bg-white border border-indigo-400 focus:border-indigo-600 rounded-lg px-2 py-0.5 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="ml"
                                disabled={isSaving}
                            />
                        ) : (
                            <span className="text-xs font-bold text-slate-700 mt-0.5 block truncate">
                                {batch.volumeMl !== undefined && batch.volumeMl !== null
                                    ? `${batch.volumeMl} ml`
                                    : t("common.na")}
                            </span>
                        )}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-3 text-center">
                        <Barcode className="w-4 h-4 mx-auto text-indigo-600/80 mb-1" />
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("beverage.batches.lotNumber")}</span>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editLotNumber}
                                onChange={(e) => setEditLotNumber(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleSave()
                                    if (e.key === "Escape") handleCancel()
                                }}
                                className="w-full text-center text-xs font-bold text-slate-900 bg-white border border-indigo-400 focus:border-indigo-600 rounded-lg px-2 py-0.5 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="Lot #"
                                disabled={isSaving}
                            />
                        ) : (
                            <span className="text-xs font-bold text-slate-700 mt-0.5 block truncate" title={batch.lotNumber || ""}>
                                {batch.lotNumber || t("common.na")}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Samples Section */}
            <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-[24px]">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-700">
                            {t("sample.samplesTitle", { defaultValue: "Зразки (Samples)" })}
                        </span>
                        <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                            {batchSamples.length}
                        </span>
                    </div>
                    {beverageId && (
                        <Link
                            href={`/sample/create?batchId=${batch.id}&beverageId=${beverageId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                        >
                            <Plus className="w-3 h-3" />
                            <span>{t("sample.addSampleButton", { defaultValue: "Додати зразок" })}</span>
                        </Link>
                    )}
                </div>

                {batchSamples.length > 0 ? (
                    <div className="space-y-2.5">
                        {/* Aggregated volume badges & open modal button */}
                        <div className="flex flex-wrap items-center gap-2">
                            {groupedSamples.map((group: any, gIdx: number) => (
                                <span
                                    key={gIdx}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs"
                                >
                                    <Droplet className="w-3 h-3 text-indigo-500" />
                                    <span>
                                        {group.count} × {group.volumeMl ? `${group.volumeMl.toLocaleString()} ${t("common.milliliters")}` : t("common.standard", { defaultValue: "Стандарт" })}
                                    </span>
                                </span>
                            ))}

                            <button
                                type="button"
                                onClick={() => setSelectedBatchForSamples(batch as any)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition-colors cursor-pointer"
                            >
                                <span>{t("sample.viewAllSamples", { defaultValue: "Всі зразки" })} ({batchSamples.length})</span>
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Volume utilization progress bar if batch has volumeMl */}
                        {batchVol !== null && (
                            <div className="rounded-xl border border-slate-100 bg-white/70 p-2.5">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                    <span>
                                        {t("sample.allocatedVolume", {
                                            used: totalSamplesVol.toLocaleString(),
                                            total: batchVol.toLocaleString(),
                                            defaultValue: `Виділено ${totalSamplesVol.toLocaleString()} мл з ${batchVol.toLocaleString()} мл`,
                                        })}
                                    </span>
                                    <span className={totalSamplesVol > batchVol ? "text-rose-600 font-bold" : "text-indigo-600 font-bold"}>
                                        {Math.min(100, Math.round((totalSamplesVol / batchVol) * 100))}%
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            totalSamplesVol > batchVol
                                                ? "bg-rose-500"
                                                : totalSamplesVol / batchVol > 0.8
                                                    ? "bg-amber-500"
                                                    : "bg-indigo-600"
                                        }`}
                                        style={{ width: `${Math.min(100, (totalSamplesVol / batchVol) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-[11px] text-slate-400 italic">
                        {t("sample.emptySamplesDesc", { defaultValue: "Немає зареєстрованих зразків" })}
                    </p>
                )}
            </div>
        </div>
    )
}
