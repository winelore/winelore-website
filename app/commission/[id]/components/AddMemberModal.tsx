"use client"

import React, { useState, useEffect } from "react"
import { X, Search, Crown, Users, Check, AlertCircle, Loader2, UserPlus } from "lucide-react"
import { searchUserByUsernameAction, addCommissionReplicaMemberAction } from "../../actions"
import { useTranslation } from "@/lib/i18n/context"

function getAvatarGradient(auid: number): string {
    const gradients = [
        "from-pink-500 via-rose-500 to-red-500",
        "from-indigo-500 via-purple-500 to-pink-500",
        "from-blue-500 via-teal-500 to-emerald-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-violet-600 via-purple-600 to-indigo-600",
        "from-cyan-500 via-blue-500 to-indigo-500",
        "from-emerald-400 via-teal-500 to-cyan-500",
        "from-fuchsia-500 via-purple-600 to-pink-600",
    ]
    const idx = Math.abs(auid) % gradients.length
    return gradients[idx]
}

interface AddMemberModalProps {
    isOpen: boolean
    onClose: () => void
    replicaId: string
    replicaName: string
    onMemberAdded: () => void
}

export function AddMemberModal({
    isOpen,
    onClose,
    replicaId,
    replicaName,
    onMemberAdded,
}: AddMemberModalProps) {
    const { t } = useTranslation()
    const [usernameInput, setUsernameInput] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [foundUser, setFoundUser] = useState<{
        auid: number
        username: string
        displayName: string
    } | null>(null)
    const [selectedRole, setSelectedRole] = useState<"HEAD" | "EXPERT">("EXPERT")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setUsernameInput("")
            setFoundUser(null)
            setSearchError(null)
            setSubmitError(null)
            setSelectedRole("EXPERT")
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSearch = async () => {
        const trimmed = usernameInput.trim().replace(/^@/, "")
        if (!trimmed) {
            setSearchError(t("commission.enterUsername"))
            return
        }
        setIsSearching(true)
        setSearchError(null)
        setFoundUser(null)
        setSubmitError(null)
        try {
            const res = await searchUserByUsernameAction(trimmed)
            if (res.success && res.user) {
                setFoundUser(res.user)
            } else {
                setSearchError(res.error || t("commission.userNotFound"))
            }
        } catch (err: any) {
            setSearchError(err.message || t("commission.searchError"))
        } finally {
            setIsSearching(false)
        }
    }

    const handleAddMember = async () => {
        if (!foundUser) return
        setIsSubmitting(true)
        setSubmitError(null)
        try {
            const res = await addCommissionReplicaMemberAction(replicaId, foundUser.auid, selectedRole)
            if (res.success) {
                onMemberAdded()
                onClose()
            } else {
                setSubmitError(res.error || t("commission.failedToAddMember"))
            }
        } catch (err: any) {
            setSubmitError(err.message || t("commission.addMemberError"))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-2xl animate-scale-up">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">
                                {t("commission.addExpertToCommission")}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {t("commission.replicaLabel")}: <span className="font-semibold text-slate-600">{replicaName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 flex flex-col gap-5">
                    {/* Username Search Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            {t("commission.usernameAxusId")}
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                                    @
                                </span>
                                <input
                                    type="text"
                                    placeholder="username"
                                    value={usernameInput}
                                    onChange={(e) => {
                                        setUsernameInput(e.target.value)
                                        if (foundUser) setFoundUser(null)
                                        if (searchError) setSearchError(null)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            handleSearch()
                                        }
                                    }}
                                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={isSearching || !usernameInput.trim()}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none shrink-0"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                <span>{t("commission.search")}</span>
                            </button>
                        </div>
                        {searchError && (
                            <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold mt-2">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{searchError}</span>
                            </p>
                        )}
                    </div>

                    {/* Found User Card Preview */}
                    {foundUser && (
                        <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-4 animate-fade-in">
                            <div className="flex items-center gap-3.5">
                                <div
                                    className={`relative flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                        foundUser.auid
                                    )} text-white font-bold text-sm shadow-md shrink-0 border-2 border-white`}
                                >
                                    {foundUser.displayName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-slate-800 truncate">
                                        {foundUser.displayName}
                                    </h4>
                                    <p className="text-xs text-indigo-600 font-semibold">
                                        @{foundUser.username}
                                    </p>
                                    <span className="inline-block text-[10px] text-slate-400 font-mono mt-0.5">
                                        AUID: {foundUser.auid}
                                    </span>
                                </div>
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                                    <Check className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Role Selector: HEAD or EXPERT ONLY */}
                            <div className="border-t border-indigo-100/60 pt-3">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                                    {t("commission.roleInCommission")}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("EXPERT")}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                            selectedRole === "EXPERT"
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        <span>{t("commission.tasterExpert")}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole("HEAD")}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                            selectedRole === "HEAD"
                                                ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Crown className="w-4 h-4" />
                                        <span>{t("commission.headRole")}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {submitError && (
                        <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{submitError}</span>
                        </p>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        {t("competition.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={!foundUser || isSubmitting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        <span>{t("commission.addToCommission")}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
