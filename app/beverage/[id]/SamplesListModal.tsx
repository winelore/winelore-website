'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Check,
    Copy,
    Droplet,
    FlaskConical,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';

export interface BatchSampleItem {
    id: string;
    volumeMl?: number | null;
    attributes?: any;
    createdAt?: string | null;
}

export interface ModalBatchData {
    id: string;
    lotNumber?: string | null;
    volumeMl?: number | null;
    attributes?: any;
    samples?: BatchSampleItem[];
}

interface SamplesListModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: ModalBatchData | null;
    beverageId: string;
    beverageName?: string;
}

export function SamplesListModal({
    isOpen,
    onClose,
    batch,
    beverageId,
}: SamplesListModalProps) {
    const { t, formatDateTime } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const samples: BatchSampleItem[] = useMemo(() => {
        return batch?.samples || [];
    }, [batch]);

    const totalSamplesVolume = useMemo(() => {
        return samples.reduce((sum, s) => sum + (Number(s.volumeMl) || 0), 0);
    }, [samples]);

    const batchVolume = batch?.volumeMl || null;
    const remainingVolume = batchVolume !== null ? Math.max(0, batchVolume - totalSamplesVolume) : null;
    const isExhausted = remainingVolume !== null && remainingVolume <= 0;

    const filteredSamples = useMemo(() => {
        if (!searchQuery.trim()) return samples;
        const q = searchQuery.toLowerCase().trim();
        return samples.filter((s) => {
            const shortId = s.id.slice(-6).toLowerCase();
            const fullId = s.id.toLowerCase();
            const vol = s.volumeMl ? String(s.volumeMl) : '';
            return shortId.includes(q) || fullId.includes(q) || vol.includes(q);
        });
    }, [samples, searchQuery]);

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        toast.success(t('sample.copyIdSuccess', { defaultValue: 'ID зразка скопійовано' }));
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!isOpen || !batch) return null;

    const lotDisplay = batch.lotNumber || `ID: ${batch.id.slice(-6).toUpperCase()}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                            <FlaskConical className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-extrabold text-slate-800 truncate">
                                {t('sample.modalTitle', { defaultValue: 'Зразки партії' })}: {lotDisplay}
                            </h2>
                            <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">
                                {batchVolume !== null
                                    ? t('sample.modalSubtitle', {
                                          count: samples.length,
                                          used: totalSamplesVolume.toLocaleString(),
                                          total: batchVolume.toLocaleString(),
                                          defaultValue: `Всього ${samples.length} зразків • Виділено ${totalSamplesVolume.toLocaleString()} мл з ${batchVolume.toLocaleString()} мл`,
                                      })
                                    : t('sample.modalSubtitleNoLimit', {
                                          count: samples.length,
                                          used: totalSamplesVolume.toLocaleString(),
                                          defaultValue: `Всього ${samples.length} зразків • Сумарний об'єм: ${totalSamplesVolume.toLocaleString()} мл`,
                                      })}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Volume allocation bar */}
                {batchVolume !== null && (
                    <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 shrink-0">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>
                                {t('sample.allocatedVolume', {
                                    used: totalSamplesVolume.toLocaleString(),
                                    total: batchVolume.toLocaleString(),
                                    defaultValue: `Виділено ${totalSamplesVolume.toLocaleString()} мл з ${batchVolume.toLocaleString()} мл`,
                                })}
                            </span>
                            <span className={totalSamplesVolume > batchVolume ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                {remainingVolume !== null && (
                                    <>Залишок: <strong className={isExhausted ? 'text-rose-600' : 'text-indigo-700'}>{remainingVolume.toLocaleString()} мл</strong></>
                                )}
                            </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    totalSamplesVolume > batchVolume
                                        ? 'bg-rose-500'
                                        : totalSamplesVolume / batchVolume > 0.8
                                        ? 'bg-amber-500'
                                        : 'bg-indigo-600'
                                }`}
                                style={{ width: `${Math.min(100, (totalSamplesVolume / batchVolume) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Search input if samples count > 4 */}
                {samples.length > 4 && (
                    <div className="px-6 pt-4 pb-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('sample.searchPlaceholder', { defaultValue: 'Пошук за ID або кодом зразка...' })}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Samples List Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-2.5">
                    {filteredSamples.length > 0 ? (
                        filteredSamples.map((sample, index) => {
                            const shortCode = sample.id.slice(-6).toUpperCase();
                            const isCopied = copiedId === sample.id;
                            const volStr = sample.volumeMl
                                ? `${sample.volumeMl.toLocaleString()} мл`
                                : t('common.standard', { defaultValue: 'Стандарт' });

                            return (
                                <div
                                    key={sample.id}
                                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-indigo-100 transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 text-[11px] font-bold text-slate-400 shadow-xs">
                                            #{index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="flex items-center gap-1 text-xs font-extrabold text-slate-800">
                                                    <Droplet className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                                    {volStr}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyId(sample.id)}
                                                    title={`Повний ID: ${sample.id} (натисніть, щоб скопіювати)`}
                                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer"
                                                >
                                                    <span>#{shortCode}</span>
                                                    {isCopied ? (
                                                        <Check className="h-2.5 w-2.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-2.5 w-2.5 text-slate-400" />
                                                    )}
                                                </button>
                                            </div>

                                            {sample.createdAt && (
                                                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 mt-1">
                                                    <Calendar className="h-3 w-3 shrink-0" />
                                                    <span>{formatDateTime(sample.createdAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attributes summary if any */}
                                    {sample.attributes && typeof sample.attributes === 'object' && Object.keys(sample.attributes).length > 0 && (
                                        <div className="hidden sm:flex flex-wrap items-center gap-1.5 shrink-0 max-w-[200px] justify-end">
                                            {Object.entries(sample.attributes).slice(0, 2).map(([k, v]) => (
                                                <span
                                                    key={k}
                                                    className="rounded-md bg-white border border-slate-150 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                                >
                                                    {k}: <strong className="text-slate-800">{String(v)}</strong>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                            <FlaskConical className="h-10 w-10 text-slate-200 mb-2" />
                            <p className="text-xs font-bold text-slate-600">
                                {searchQuery
                                    ? t('sample.noSamplesMatch', { defaultValue: 'Зразків за таким запитом не знайдено' })
                                    : t('sample.emptySamplesDesc', { defaultValue: 'Немає зареєстрованих зразків' })}
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs font-semibold text-slate-500">
                        {t('sample.samplesTitle', { defaultValue: 'Зразки' })}: <strong className="text-slate-800">{samples.length}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                        >
                            {t('common.close', { defaultValue: 'Закрити' })}
                        </button>

                        <Link
                            href={`/sample/create?batchId=${batch.id}&beverageId=${beverageId}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('sample.addSampleButton', { defaultValue: 'Додати зразок' })}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
