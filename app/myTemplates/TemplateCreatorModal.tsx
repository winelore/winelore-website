"use client"

import {
    blankCategory,
    blankProperty,
    changeProperty,
    checkTemplate,
    duplicatePropertyCodes,
    renameFormulaVariable,
    templatePropertyTypeLabel,
    type EditorCategory,
    type EditorProperty,
} from '@winelore/core/commission'
import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, AlertCircle, X, Star, GripVertical } from "lucide-react"
import { createGlobalTemplateAction, updateGlobalTemplateAction, getBeverageTypesAction, getTemplateForEditorAction } from "./actions"
import { useTranslation } from "@/lib/i18n/context"
import type { MessageKey } from '@winelore/core/i18n'

interface TemplateCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    currentAuid: number
    initialTemplateId?: string | null
}

// The editor's rules — codes, formulas, the checks before saving — are core's, which the app's editor uses too.
type PropertyState = EditorProperty
type CategoryState = EditorCategory

export function getPropertyTypeLabel(type: string, t: (key: MessageKey) => string): string {
    return templatePropertyTypeLabel(type, t)
}

export default function TemplateCreatorModal({
    isOpen,
    onClose,
    currentAuid,
    initialTemplateId = null
}: TemplateCreatorModalProps) {
    const router = useRouter()
    const { t } = useTranslation()

    const [templateName, setTemplateName] = useState("")
    const [categories, setCategories] = useState<CategoryState[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [beverageTypes, setBeverageTypes] = useState<{ id: string; code: string; name: string }[]>([])
    const [selectedBeverageTypeId, setSelectedBeverageTypeId] = useState<string>("")

    const [errorPropIds, setErrorPropIds] = useState<Set<string>>(new Set())
    const [errorCatIds, setErrorCatIds] = useState<Set<string>>(new Set())

    const dragCatIdx = useRef<number | null>(null)
    const dragPropKey = useRef<{ catId: string; propIdx: number } | null>(null)
    const [dragOverCatIdx, setDragOverCatIdx] = useState<number | null>(null)
    const [dragOverPropKey, setDragOverPropKey] = useState<{ catId: string; propIdx: number } | null>(null)

    const [draggableCatId, setDraggableCatId] = useState<string | null>(null)
    const [draggablePropId, setDraggablePropId] = useState<string | null>(null)

    const prevCodeRef = useRef<Map<string, string>>(new Map())

    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null)
            setErrorPropIds(new Set())
            setErrorCatIds(new Set())

            getBeverageTypesAction().then((types) => {
                setBeverageTypes(types)
                
                if (initialTemplateId) {
                    getTemplateForEditorAction(initialTemplateId).then((data) => {
                        if (data) {
                            setTemplateName(data.name)

                            const matchedType = types.find(t => t.id === data.beverageTypeId)
                                ?? types.find(t => t.name === data.beverageType || t.code === data.beverageType)
                            if (matchedType) {
                                setSelectedBeverageTypeId(matchedType.id)
                            } else if (types.length > 0) {
                                setSelectedBeverageTypeId(types[0].id)
                            }

                            // With its formulas, which the template page's queries leave out.
                            setCategories(data.categories)
                        }
                    }).catch(() => {
                        setErrorMsg(t("templateCreator.loadEditError"))
                    })
                } else {
                    setTemplateName("")
                    if (types.length > 0) setSelectedBeverageTypeId(types[0].id)
                    
                    setCategories([blankCategory(true)])
                }
            }).catch(() => {
                setErrorMsg(t("templateCreator.loadEditError"))
            })
        }
    }, [isOpen, initialTemplateId])

    const duplicateCodes = duplicatePropertyCodes(categories)

    const handleAddCategory = () => {
        setCategories(prev => [...prev, blankCategory()])
    }

    const handleRemoveCategory = (catId: string) => {
        setCategories(prev => prev.filter(c => c.id !== catId))
    }

    const handleCategoryNameChange = (catId: string, name: string) => {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c))
    }

    const handleAddProperty = (catId: string) => {
        const newProp = blankProperty()
        setCategories(prev =>
            prev.map(c => c.id === catId ? { ...c, properties: [...c.properties, newProp] } : c)
        )
    }

    const handleRemoveProperty = (catId: string, propId: string) => {
        setCategories(prev =>
            prev.map(c => c.id === catId
                ? { ...c, properties: c.properties.filter(p => p.id !== propId) }
                : c
            )
        )
    }

    const handlePropertyChange = (catId: string, propId: string, fields: Partial<PropertyState>) => {
        setCategories(prev => prev.map(c => c.id !== catId ? c : {
            ...c,
            properties: c.properties.map(p => p.id === propId ? changeProperty(p, fields) : p),
        }))
    }

    const handleCodeFocus = (propId: string, currentCode: string) => {
        prevCodeRef.current.set(propId, currentCode)
    }

    const handleCodeCommit = (propId: string, newCode: string) => {
        const oldCode = prevCodeRef.current.get(propId)
        if (oldCode) setCategories(prev => renameFormulaVariable(prev, oldCode, newCode))
        prevCodeRef.current.delete(propId)
    }

    const handleSave = async () => {
        setErrorMsg(null)
        setErrorPropIds(new Set())
        setErrorCatIds(new Set())

        const check = checkTemplate(templateName, categories, t)
        if (!check.ok) {
            setErrorPropIds(check.propertyIds)
            setErrorCatIds(check.categoryIds)
            setErrorMsg(check.message)
            return
        }
        const formattedCategories = check.categories

        setIsSaving(true)
        try {
            if (initialTemplateId) {
                // As the signed-in owner; this used to fall back to the action's default actor.
                await updateGlobalTemplateAction(
                    initialTemplateId,
                    templateName,
                    formattedCategories,
                    selectedBeverageTypeId,
                    currentAuid
                )
            } else {
                await createGlobalTemplateAction(
                    templateName,
                    formattedCategories,
                    currentAuid,
                    selectedBeverageTypeId
                )
            }
            onClose()
            router.refresh()
        } catch (saveErr: any) {
            setErrorMsg(saveErr.message || t("templateCreator.saveError"))
        } finally {
            setIsSaving(false)
        }
    }

    const handleCatDragStart = (idx: number) => { dragCatIdx.current = idx }
    const handleCatDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverCatIdx(idx) }
    const handleCatDrop = (targetIdx: number) => {
        const sourceIdx = dragCatIdx.current
        if (sourceIdx === null || sourceIdx === targetIdx) { dragCatIdx.current = null; setDragOverCatIdx(null); return }
        setCategories(prev => {
            const arr = [...prev]
            const [moved] = arr.splice(sourceIdx, 1)
            arr.splice(targetIdx, 0, moved)
            return arr
        })
        dragCatIdx.current = null; setDragOverCatIdx(null)
    }
    const handleCatDragEnd = () => { dragCatIdx.current = null; setDragOverCatIdx(null); setDraggableCatId(null) }

    const handlePropDragStart = (catId: string, propIdx: number) => { dragPropKey.current = { catId, propIdx } }
    const handlePropDragOver = (e: React.DragEvent, catId: string, propIdx: number) => { e.preventDefault(); setDragOverPropKey({ catId, propIdx }) }
    const handlePropDrop = (targetCatId: string, targetPropIdx: number) => {
        const source = dragPropKey.current
        if (!source) return
        if (source.catId === targetCatId && source.propIdx === targetPropIdx) { dragPropKey.current = null; setDragOverPropKey(null); return }
        setCategories(prev => {
            const arr = prev.map(c => ({ ...c, properties: [...c.properties] }))
            const srcCat = arr.find(c => c.id === source.catId)
            const tgtCat = arr.find(c => c.id === targetCatId)
            if (!srcCat || !tgtCat) return prev
            const [moved] = srcCat.properties.splice(source.propIdx, 1)
            tgtCat.properties.splice(targetPropIdx, 0, moved)
            return arr
        })
        dragPropKey.current = null; setDragOverPropKey(null)
    }
    const handlePropDragEnd = () => { dragPropKey.current = null; setDragOverPropKey(null); setDraggablePropId(null) }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden max-md:animate-cover-up md:animate-fade-in">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-4 pt-[calc(var(--safe-top)+1rem)] sm:px-8 sm:py-5 border-b border-slate-100 bg-white shadow-sm">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        {initialTemplateId ? t("templateCreator.modalTitleEdit") : t("templateCreator.modalTitleCreate")}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {t("templateCreator.modalSubtitle")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={t("templateCreator.close")}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {errorMsg && (
                <div className="mx-8 mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 text-sm font-medium animate-in fade-in-50 duration-200">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-6 flex flex-col gap-6">
                <div className="flex gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-64">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            {t("templateCreator.templateNameLabel")}
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder={t("templateCreator.templateNamePlaceholder")}
                            className="px-4 py-2.5 border border-slate-200 bg-slate-50/30 text-slate-800 rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            {t("templateCreator.beverageTypeLabel")}
                            {!!initialTemplateId && (
                                <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
                                    {t("templateCreator.readOnly")}
                                </span>
                            )}
                        </label>
                        <select
                            disabled={!!initialTemplateId}
                            value={selectedBeverageTypeId}
                            onChange={(e) => setSelectedBeverageTypeId(e.target.value)}
                            className={`px-4 py-2.5 border rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                                initialTemplateId
                                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "border-slate-200 bg-slate-50/30 text-slate-800 cursor-pointer"
                            }`}
                        >
                            {beverageTypes.length === 0 && <option value="">{t("templateCreator.loadingOption")}</option>}
                            {beverageTypes.map((bt) => (
                                <option key={bt.id} value={bt.id}>{bt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                            {t("templateCreator.categoriesLabel")}
                        </h2>
                        <button
                            type="button"
                            onClick={handleAddCategory}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-colors border border-indigo-100/50 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> {t("templateCreator.addCategory")}
                        </button>
                    </div>

                    {categories.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-[28px] bg-slate-50/30 text-center gap-2">
                            <p className="text-slate-400 text-sm font-semibold">{t("templateCreator.noCategoriesTitle")}</p>
                            <p className="text-slate-300 text-xs">{t("templateCreator.noCategoriesDesc")}</p>
                        </div>
                    )}

                    {categories.map((cat, catIdx) => (
                        <div
                            key={cat.id}
                            draggable={draggableCatId === cat.id}
                            onDragStart={() => handleCatDragStart(catIdx)}
                            onDragOver={(e) => handleCatDragOver(e, catIdx)}
                            onDrop={() => handleCatDrop(catIdx)}
                            onDragEnd={handleCatDragEnd}
                            className={`border rounded-[24px] p-5 flex flex-col gap-4 relative transition-all ${
                                dragOverCatIdx === catIdx && dragCatIdx.current !== catIdx
                                    ? "border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-200/50 scale-[1.01]"
                                    : errorCatIds.has(cat.id)
                                        ? "border-rose-300 bg-rose-50/20 ring-1 ring-rose-200"
                                        : "border-slate-100 bg-slate-50/40 hover:bg-slate-50/70"
                            }`}
                        >
                            <div className="absolute top-4 right-4 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCategory(cat.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title={t("templateCreator.deleteCategory")}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start gap-2 max-w-[85%]">
                                <div
                                    onMouseDown={() => setDraggableCatId(cat.id)}
                                    onMouseUp={() => setDraggableCatId(null)}
                                    onMouseLeave={() => setDraggableCatId(null)}
                                    className="mt-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 p-1"
                                >
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {t("templateCreator.categoryNumber", { number: catIdx + 1 })}
                                    </label>
                                    <input
                                        type="text"
                                        value={cat.name}
                                        onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                                        placeholder={t("templateCreator.categoryNamePlaceholder")}
                                        className={`px-0 py-1 bg-transparent border-b hover:border-slate-200 focus:border-indigo-500 focus:outline-hidden text-lg font-bold text-slate-800 transition-colors ${
                                            errorCatIds.has(cat.id) ? "border-rose-400" : "border-transparent"
                                        }`}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3.5 mt-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        {t("templateCreator.propertiesLabel")}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleAddProperty(cat.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" /> {t("templateCreator.addProperty")}
                                    </button>
                                </div>

                                {cat.properties.map((p, propIdx) => {
                                    const isCodeDuplicate = p.code.trim() && duplicateCodes.has(p.code.trim())
                                    return (
                                        <div
                                            key={p.id}
                                            draggable={draggablePropId === p.id}
                                            onDragStart={() => handlePropDragStart(cat.id, propIdx)}
                                            onDragOver={(e) => handlePropDragOver(e, cat.id, propIdx)}
                                            onDrop={() => handlePropDrop(cat.id, propIdx)}
                                            onDragEnd={handlePropDragEnd}
                                            className={`flex flex-wrap items-center gap-2 p-3 rounded-2xl transition-all ${
                                                dragOverPropKey?.catId === cat.id && dragOverPropKey?.propIdx === propIdx
                                                    ? "bg-indigo-50 ring-2 ring-indigo-200"
                                                    : "bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <div
                                                onMouseDown={() => setDraggablePropId(p.id)}
                                                onMouseUp={() => setDraggablePropId(null)}
                                                onMouseLeave={() => setDraggablePropId(null)}
                                                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 p-1"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={p.name}
                                                onChange={(e) => handlePropertyChange(cat.id, p.id, { name: e.target.value })}
                                                placeholder={t("templateCreator.propertyNamePlaceholder")}
                                                className={`flex-1 min-w-[160px] px-3 py-1.5 border rounded-lg text-sm font-medium ${
                                                    errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
                                                }`}
                                            />
                                            <input
                                                type="text"
                                                value={p.code}
                                                onFocus={() => handleCodeFocus(p.id, p.code)}
                                                onBlur={(e) => handleCodeCommit(p.id, e.target.value)}
                                                onChange={(e) => handlePropertyChange(cat.id, p.id, { code: e.target.value })}
                                                placeholder={t("templateCreator.codePlaceholder")}
                                                className={`w-40 shrink-0 px-3 py-1.5 border rounded-lg text-sm font-mono ${
                                                    isCodeDuplicate ? "border-rose-500 bg-rose-50" : "border-slate-200"
                                                }`}
                                            />
                                            <select
                                                value={p.type}
                                                onChange={(e) => handlePropertyChange(cat.id, p.id, { type: e.target.value as any })}
                                                className="shrink-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold bg-white cursor-pointer"
                                            >
                                                <option value="Int">{getPropertyTypeLabel("Int", t)}</option>
                                                <option value="Double">{getPropertyTypeLabel("Double", t)}</option>
                                                <option value="Discrete">{getPropertyTypeLabel("Discrete", t)}</option>
                                                <option value="Enum">{getPropertyTypeLabel("Enum", t)}</option>
                                                <option value="Boolean">{getPropertyTypeLabel("Boolean", t)}</option>
                                                <option value="Smart">{getPropertyTypeLabel("Smart", t)}</option>
                                            </select>

                                            {(p.type === "Int" || p.type === "Double") && (
                                                <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2 py-1 border border-slate-200 rounded-lg">
                                                    <span className="text-xs font-medium text-slate-400">{t("templateCreator.fromLabel")}</span>
                                                    <input
                                                        type="number"
                                                        value={p.minLimit ?? ""}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { minLimit: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                        placeholder="0"
                                                        className="w-14 px-1.5 py-0.5 border border-slate-200 rounded-md bg-white text-sm text-center font-medium focus:outline-hidden focus:border-indigo-500"
                                                    />
                                                    <span className="text-xs font-medium text-slate-400">{t("templateCreator.toLabel")}</span>
                                                    <input
                                                        type="number"
                                                        value={p.maxLimit ?? ""}
                                                        onChange={(e) => handlePropertyChange(cat.id, p.id, { maxLimit: e.target.value === "" ? undefined : Number(e.target.value) })}
                                                        placeholder="100"
                                                        className="w-14 px-1.5 py-0.5 border border-slate-200 rounded-md bg-white text-sm text-center font-medium focus:outline-hidden focus:border-indigo-500"
                                                    />
                                                </div>
                                            )}

                                            {p.type === "Discrete" && (
                                                <input
                                                    type="text"
                                                    value={p.allowedValuesStr}
                                                    onChange={(e) => handlePropertyChange(cat.id, p.id, { allowedValuesStr: e.target.value })}
                                                    placeholder={t("templateCreator.discretePlaceholder")}
                                                    title={t("templateCreator.discreteTitle")}
                                                    className={`flex-1 min-w-[150px] px-3 py-1.5 border rounded-lg text-sm font-mono bg-white ${
                                                        errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200"
                                                    }`}
                                                />
                                            )}

                                            {p.type === "Enum" && (
                                                <input
                                                    type="text"
                                                    value={p.allowedValuesStr}
                                                    onChange={(e) => handlePropertyChange(cat.id, p.id, { allowedValuesStr: e.target.value })}
                                                    placeholder={t("templateCreator.enumPlaceholder")}
                                                    title={t("templateCreator.enumTitle")}
                                                    className={`flex-1 min-w-[150px] px-3 py-1.5 border rounded-lg text-sm font-mono bg-white ${
                                                        errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200"
                                                    }`}
                                                />
                                            )}

                                            {p.type === "Smart" && (
                                                <input
                                                    type="text"
                                                    value={p.expressionStr}
                                                    onChange={(e) => handlePropertyChange(cat.id, p.id, { expressionStr: e.target.value })}
                                                    placeholder={t("templateCreator.formulaPlaceholder")}
                                                    title={t("templateCreator.formulaTitle")}
                                                    className={`flex-1 min-w-[180px] px-3 py-1.5 border rounded-lg text-sm font-mono bg-white ${
                                                        errorPropIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200"
                                                    }`}
                                                />
                                            )}

                                            <div className="ml-auto flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePropertyChange(cat.id, p.id, { isResult: !p.isResult })}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        p.isResult ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400 hover:text-slate-600"
                                                    }`}
                                                    title={t("templateCreator.markResult")}
                                                >
                                                    <Star className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProperty(cat.id, p.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="shrink-0 px-4 pt-4 pb-safe-4 sm:p-8 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                    {t("competition.cancel")}
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-colors disabled:opacity-50"
                >
                    {isSaving ? t("templateCreator.saving") : t("templateCreator.saveChanges")}
                </button>
            </div>
        </div>
    )
}