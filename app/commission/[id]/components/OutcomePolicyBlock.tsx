"use client"

import React, { useState } from "react"
import {
    Sliders,
    Plus,
    Pencil,
    Trash2,
    ChevronRight,
    Copy,
    Check,
    Tag,
    FileCode,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Layers,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/context"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    removeCommissionOutcomePolicyAction,
    type OutcomePolicyEditionDetail,
} from "../../actions"
import { OutcomePolicyCatalogModal } from "./OutcomePolicyCatalogModal"

interface TemplateEditionLink {
    id: string
    beverageType: {
        id: string
        code: string
        name: string
    }
    templateEdition: any
}

interface OutcomePolicyBlockProps {
    commissionId: string
    outcomePolicyEdition?: OutcomePolicyEditionDetail | null
    templateEditions: TemplateEditionLink[]
    isCompetitionHolder: boolean
    canEdit: boolean
    onRefresh: () => void
}

export function OutcomePolicyBlock({
    commissionId,
    outcomePolicyEdition,
    templateEditions,
    isCompetitionHolder,
    canEdit,
    onRefresh,
}: OutcomePolicyBlockProps) {
    const { t, formatStatus } = useTranslation()

    const [isCatalogOpen, setIsCatalogOpen] = useState(false)
    const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
    const [copiedScript, setCopiedScript] = useState(false)

    const isAssigned = !!outcomePolicyEdition
    const template = outcomePolicyEdition?.inputTemplateEdition?.template

    const handleCopyScript = (scriptCode: string) => {
        navigator.clipboard.writeText(scriptCode)
        setCopiedScript(true)
        toast.success(t("commission.scriptCodeCopied"))
        setTimeout(() => setCopiedScript(false), 2000)
    }

    const handleRemove = async () => {
        setIsRemoving(true)
        try {
            const res = await removeCommissionOutcomePolicyAction(commissionId)
            if (res.success) {
                toast.success(t("commission.outcomePolicyRemoved"))
                setIsConfirmRemoveOpen(false)
                onRefresh()
            } else {
                toast.error(res.error || t("commission.outcomePolicyRemoveError"))
            }
        } catch {
            toast.error(t("commission.outcomePolicyRemoveError"))
        } finally {
            setIsRemoving(false)
        }
    }

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-xs">
                        <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight text-slate-800">
                            {t("commission.outcomePolicy")}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {t("commission.outcomePolicySubtitle")}
                        </p>
                    </div>
                </div>

                {isCompetitionHolder && canEdit && (
                    <button
                        type="button"
                        onClick={() => setIsCatalogOpen(true)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer ${
                            isAssigned
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                    >
                        {isAssigned ? (
                            <>
                                <Pencil className="w-3.5 h-3.5" />
                                <span>{t("commission.changeOutcomePolicy")}</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                <span>{t("commission.assignOutcomePolicy")}</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Content Card */}
            {isAssigned && outcomePolicyEdition ? (
                <div className="flex flex-col border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden transition-all duration-300">
                    <div className="p-5 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    {/* Scope badge */}
                                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                                        {outcomePolicyEdition.calculationScope === "REPLICA"
                                            ? t("commission.scopeReplica")
                                            : t("commission.scopeCommission")}
                                    </span>

                                    {/* Template badge */}
                                    {template ? (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            {t("commission.outcomePolicyForTemplate")}:{" "}
                                            {template.beverageType?.name || template.beverageType?.code
                                                ? `${template.beverageType.name || template.beverageType.code}: `
                                                : ""}
                                            {template.name} v{outcomePolicyEdition.inputTemplateEdition?.version}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                                            {t("commission.universalTemplate")}
                                        </span>
                                    )}

                                    {/* Version & Status */}
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shadow-2xs">
                                        v{outcomePolicyEdition.version}
                                    </span>
                                    {outcomePolicyEdition.status && (
                                        <span
                                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                outcomePolicyEdition.status === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-amber-100 text-amber-800"
                                            }`}
                                        >
                                            {formatStatus(outcomePolicyEdition.status)}
                                        </span>
                                    )}
                                </div>

                                <h4 className="text-base font-extrabold text-slate-800">
                                    {outcomePolicyEdition.policyName}
                                </h4>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 transition-colors cursor-pointer"
                                >
                                    {t("commission.outcomePolicyPreview")}{" "}
                                    <ChevronRight
                                        className={`w-3.5 h-3.5 transition-transform ${
                                            isDetailsExpanded ? "rotate-90" : ""
                                        }`}
                                    />
                                </button>

                                {isCompetitionHolder && canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmRemoveOpen(true)}
                                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                        title={t("commission.removeOutcomePolicy")}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Output properties preview pills */}
                        {outcomePolicyEdition.outputProperties &&
                            outcomePolicyEdition.outputProperties.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                                        {t("commission.outputPropertiesLabel")}:
                                    </span>
                                    {outcomePolicyEdition.outputProperties.map((prop) => (
                                        <span
                                            key={prop.id || prop.code}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                prop.isResult
                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                    : "bg-white text-slate-600 border-slate-200"
                                            }`}
                                        >
                                            {prop.name || prop.code}
                                            {prop.isResult && (
                                                <span className="ml-1 text-[8px] font-extrabold uppercase px-1 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                                                    {t("commission.outcomePolicyResultBadge")}
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}
                    </div>

                    {/* Expandable Preview Details */}
                    {isDetailsExpanded && (
                        <div className="px-6 pb-6 pt-4 border-t border-slate-200/80 bg-white flex flex-col gap-4">
                            {/* Properties grid */}
                            <div>
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                                    {t("commission.outputPropertiesLabel")} (
                                    {outcomePolicyEdition.outputProperties?.length || 0})
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {outcomePolicyEdition.outputProperties?.map((prop) => (
                                        <div
                                            key={prop.id || prop.code}
                                            className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex flex-col gap-1"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-slate-800">
                                                    {prop.name}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {prop.isResult && (
                                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] rounded font-extrabold uppercase">
                                                            {t("commission.outcomePolicyResultBadge")}
                                                        </span>
                                                    )}
                                                    <span className="px-1.5 py-0.5 bg-white text-slate-600 text-[9px] rounded font-mono font-medium border border-slate-200">
                                                        {prop.code}
                                                    </span>
                                                </div>
                                            </div>
                                            {prop.description && (
                                                <p className="text-[10px] text-slate-400">
                                                    {prop.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Script code viewer */}
                            {outcomePolicyEdition.scriptCode && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                                            {t("commission.scriptCodeLabel")}
                                        </h5>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyScript(outcomePolicyEdition.scriptCode)}
                                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                        >
                                            {copiedScript ? (
                                                <>
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    <span className="text-emerald-600">
                                                        {t("commission.scriptCodeCopied")}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3" />
                                                    <span>{t("commission.copyScriptCode")}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[250px] shadow-inner">
                                        <code>{outcomePolicyEdition.scriptCode}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl gap-3">
                    <Sliders className="w-8 h-8 text-slate-400 opacity-60" />
                    <div>
                        <p className="text-sm font-bold text-slate-600">
                            {t("commission.noOutcomePolicyForCommission")}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                            {t("commission.noOutcomePolicyDesc")}
                        </p>
                    </div>

                    {isCompetitionHolder && canEdit && (
                        <button
                            type="button"
                            onClick={() => setIsCatalogOpen(true)}
                            className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{t("commission.assignOutcomePolicy")}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Catalog Modal */}
            <OutcomePolicyCatalogModal
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                commissionId={commissionId}
                currentOutcomePolicyEditionId={outcomePolicyEdition?.id}
                templateEditions={templateEditions}
                onSuccess={onRefresh}
            />

            {/* Confirm Remove Alert Dialog */}
            <AlertDialog open={isConfirmRemoveOpen} onOpenChange={setIsConfirmRemoveOpen}>
                <AlertDialogContent className="rounded-3xl max-w-md p-6 bg-white border border-slate-100 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-extrabold text-slate-900">
                            {t("commission.removeOutcomePolicy")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-slate-500 mt-2">
                            {t("commission.removeOutcomePolicyConfirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50">
                            {t("competition.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemove}
                            disabled={isRemoving}
                            className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isRemoving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                t("commission.removeOutcomePolicy")
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
