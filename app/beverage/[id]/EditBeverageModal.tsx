"use client"

import React, { useEffect, useState } from "react"
import { toast } from "sonner"
import { X, Pencil, Loader2, Check, AlertCircle, MapPin, Users, UserPlus, Trash2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import {
    changeBeverageNameAction,
    changeBeverageOriginAction,
    registerBeverageProducerAction,
    unregisterBeverageProducerAction,
} from "../actions"
import { searchUserByUsernameAction } from "@/app/commission/actions"

interface ProducerDetails {
    id: string
    auid: number[]
    role: string
    displayName?: string
    username?: string
}

interface EditableBeverage {
    id: string
    name: string
    producers: ProducerDetails[]
    origin?: { latitude?: number | null; longitude?: number | null } | null
}

interface EditBeverageModalProps {
    isOpen: boolean
    onClose: () => void
    beverage: EditableBeverage
    onUpdated: (patch: Partial<EditableBeverage> & { producers?: ProducerDetails[] }) => void
}

function getAvatarGradient(auid: number): string {
    const gradients = [
        "from-pink-500 via-rose-500 to-red-500",
        "from-indigo-500 via-purple-500 to-pink-500",
        "from-blue-500 via-teal-500 to-emerald-500",
        "from-amber-400 via-orange-500 to-red-500",
        "from-violet-600 via-purple-600 to-indigo-600",
        "from-cyan-500 via-blue-500 to-indigo-500",
    ]
    return gradients[Math.abs(auid) % gradients.length]
}

function producerLabel(p: ProducerDetails): string {
    if (p.displayName) return p.displayName
    if (p.username) return `@${p.username}`
    return `AUID ${p.auid[0]}`
}

export function EditBeverageModal({ isOpen, onClose, beverage, onUpdated }: EditBeverageModalProps) {
    const { t } = useTranslation()

    const [name, setName] = useState(beverage.name)
    const [latitude, setLatitude] = useState(beverage.origin?.latitude != null ? String(beverage.origin.latitude) : "")
    const [longitude, setLongitude] = useState(beverage.origin?.longitude != null ? String(beverage.origin.longitude) : "")
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const [usernameInput, setUsernameInput] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [foundUser, setFoundUser] = useState<{ auid: number; username: string; displayName: string } | null>(null)
    const [selectedRole, setSelectedRole] = useState<"MAKER" | "BOTTLER">("MAKER")
    const [isAddingProducer, setIsAddingProducer] = useState(false)
    const [removingProducerId, setRemovingProducerId] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setName(beverage.name)
            setLatitude(beverage.origin?.latitude != null ? String(beverage.origin.latitude) : "")
            setLongitude(beverage.origin?.longitude != null ? String(beverage.origin.longitude) : "")
            setSaveError(null)
            setUsernameInput("")
            setFoundUser(null)
            setSearchError(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, beverage.id])

    useEffect(() => {
        const trimmed = usernameInput.trim().replace(/^@/, "")
        if (!trimmed) {
            setFoundUser(null)
            setSearchError(null)
            return
        }
        const timer = setTimeout(async () => {
            setIsSearching(true)
            setSearchError(null)
            setFoundUser(null)
            try {
                const res = await searchUserByUsernameAction(trimmed)
                if (res.success && res.user) {
                    setFoundUser(res.user)
                } else {
                    setSearchError(res.error || t("beverage.edit.userNotFound"))
                }
            } catch (err: any) {
                setSearchError(err.message || t("beverage.edit.searchError"))
            } finally {
                setIsSearching(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [usernameInput, t])

    if (!isOpen) return null

    const nameChanged = name.trim() !== beverage.name
    const latChanged = latitude !== (beverage.origin?.latitude != null ? String(beverage.origin.latitude) : "")
    const lngChanged = longitude !== (beverage.origin?.longitude != null ? String(beverage.origin.longitude) : "")
    const hasChanges = nameChanged || latChanged || lngChanged

    const handleSave = async () => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            setSaveError(t("beverage.edit.nameRequired"))
            return
        }
        setIsSaving(true)
        setSaveError(null)
        try {
            let patch: Partial<EditableBeverage> = {}

            if (nameChanged) {
                const updated = await changeBeverageNameAction(beverage.id, trimmedName)
                patch.name = updated.name
            }

            if (latChanged || lngChanged) {
                const hasCoords = latitude.trim() !== "" && longitude.trim() !== ""
                const origin = hasCoords ? { latitude: Number(latitude), longitude: Number(longitude) } : null
                const updated = await changeBeverageOriginAction(beverage.id, origin)
                patch.origin = updated.origin
            }

            onUpdated(patch)
            toast.success(t("beverage.edit.saveSuccess"))
            onClose()
        } catch (err: any) {
            setSaveError(err.message || t("beverage.edit.saveError"))
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddProducer = async () => {
        if (!foundUser) return
        setIsAddingProducer(true)
        try {
            const updated = await registerBeverageProducerAction(beverage.id, foundUser.auid, selectedRole)
            // The mutation only returns {id, auid, role} per producer — the server
            // doesn't resolve display names. Stamp the one we just searched for so
            // it doesn't render as "Unknown User" until the page next reloads.
            const enrichedProducers = (updated.producers as ProducerDetails[]).map((p) =>
                p.auid[0] === foundUser.auid
                    ? { ...p, displayName: foundUser.displayName, username: foundUser.username }
                    : p
            )
            onUpdated({ producers: enrichedProducers })
            setUsernameInput("")
            setFoundUser(null)
            toast.success(t("beverage.edit.saveSuccess"))
        } catch (err: any) {
            toast.error(err.message || t("beverage.edit.addProducerError"))
        } finally {
            setIsAddingProducer(false)
        }
    }

    const handleRemoveProducer = async (producerDetailsId: string) => {
        setRemovingProducerId(producerDetailsId)
        try {
            const updated = await unregisterBeverageProducerAction(beverage.id, producerDetailsId)
            onUpdated({ producers: updated.producers as ProducerDetails[] })
            toast.success(t("beverage.edit.saveSuccess"))
        } catch (err: any) {
            toast.error(err.message || t("beverage.edit.removeProducerError"))
        } finally {
            setRemovingProducerId(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg overflow-hidden bg-white rounded-[32px] border border-slate-100 shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                            <Pencil className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">{t("beverage.edit.title")}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {t("beverage.edit.nameLabel")}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("beverage.edit.namePlaceholder")}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* Origin */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                {t("beverage.edit.originLabel")}
                            </label>
                            {(latitude || longitude) && (
                                <button
                                    type="button"
                                    onClick={() => { setLatitude(""); setLongitude("") }}
                                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                    {t("beverage.edit.clearOrigin")}
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{t("beverage.edit.originHint")}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("beverage.edit.latitudeLabel")}</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("beverage.edit.longitudeLabel")}</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {saveError && (
                        <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{saveError}</span>
                        </p>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span>{isSaving ? t("beverage.edit.saving") : t("beverage.edit.save")}</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] w-full bg-slate-100" />

                    {/* Producers */}
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            {t("beverage.edit.producersTitle")}
                        </label>

                        {beverage.producers.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {beverage.producers.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                                    >
                                        <div
                                            className={`flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br ${getAvatarGradient(p.auid[0])} text-white font-bold text-[10px] shrink-0 border-2 border-white shadow-sm`}
                                        >
                                            {producerLabel(p).slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 truncate">{producerLabel(p)}</p>
                                            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">{p.role}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveProducer(p.id)}
                                            disabled={removingProducerId === p.id}
                                            aria-label={t("beverage.edit.removeProducer")}
                                            title={t("beverage.edit.removeProducer")}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                        >
                                            {removingProducerId === p.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 font-medium">{t("beverage.edit.noProducers")}</p>
                        )}

                        {/* Add producer */}
                        <div className="mt-1 p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-3">
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">@</span>
                                <input
                                    type="text"
                                    placeholder={t("beverage.edit.usernameLabel")}
                                    value={usernameInput}
                                    onChange={(e) => {
                                        setUsernameInput(e.target.value)
                                        if (foundUser) setFoundUser(null)
                                        if (searchError) setSearchError(null)
                                    }}
                                    className="w-full pl-8 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                                {isSearching && (
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 flex items-center">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    </span>
                                )}
                            </div>
                            {searchError && (
                                <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{searchError}</span>
                                </p>
                            )}

                            {foundUser && (
                                <div className="flex items-center gap-3 animate-fade-in">
                                    <div
                                        className={`flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarGradient(foundUser.auid)} text-white font-bold text-xs shrink-0 border-2 border-white shadow-sm`}
                                    >
                                        {foundUser.displayName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">{foundUser.displayName}</p>
                                        <p className="text-[10px] text-indigo-600 font-semibold">@{foundUser.username}</p>
                                    </div>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value as "MAKER" | "BOTTLER")}
                                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer shrink-0"
                                    >
                                        <option value="MAKER">{t("roles.maker")}</option>
                                        <option value="BOTTLER">{t("roles.bottler")}</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddProducer}
                                        disabled={isAddingProducer}
                                        className="flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all active:scale-95 cursor-pointer shrink-0"
                                        title={t("beverage.edit.addProducer")}
                                    >
                                        {isAddingProducer ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
