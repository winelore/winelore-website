'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import {
    AlertCircle,
    Barcode,
    Check,
    ChevronDown,
    Droplet,
    FlaskConical,
    Layers,
    Loader2,
    Tag,
    Wine,
} from 'lucide-react';

import { AppHeader } from '@/components/AppHeader';
import { BackLink } from '@/components/BackLink';
import { useTranslation } from '@/lib/i18n/context';
import {
    createSampleAction,
    getBatchDetailsAction,
    getBatchesForBeverageAction,
    type BatchSimpleInfo,
} from './actions';
import { type BeverageCharacteristic } from '@/lib/beverageCharacteristics';
import { getMyBeveragesAction, type BeverageSimpleInfo } from '@/app/batch/create/actions';

interface SelectOption {
    value: string;
    label: string;
    hint?: string;
}

function CustomSelect({
    value,
    options,
    onChange,
    disabled = false,
    loading = false,
    placeholder = 'Оберіть варіант...',
    hasError = false,
    emptyMessage,
    emptyAction,
}: {
    value: string;
    options: SelectOption[];
    onChange: (val: string) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
    hasError?: boolean;
    emptyMessage?: string;
    emptyAction?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value),
        [options, value]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && !loading && setIsOpen((prev) => !prev)}
                disabled={disabled || loading}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all cursor-pointer ${
                    isOpen
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-white shadow-sm'
                        : hasError
                        ? 'border-rose-300 bg-slate-50/50'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-white'
                } disabled:cursor-not-allowed disabled:opacity-60`}
            >
                <span className={`truncate ${selectedOption ? 'text-slate-800' : 'text-slate-400 font-medium'}`}>
                    {loading ? 'Завантаження...' : selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="shrink-0 text-slate-400">
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                    )}
                </span>
            </button>

            {isOpen && !disabled && !loading && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl shadow-slate-200/80 backdrop-blur-md transition-all duration-200">
                    {options.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-5 text-center">
                            <Layers className="h-6 w-6 text-slate-300" />
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                                {emptyMessage || 'Немає доступних варіантів'}
                            </p>
                            {emptyAction}
                        </div>
                    ) : (
                        options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`flex w-full flex-col items-start gap-0.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                                    }`}
                                >
                                    <div className="flex w-full items-center justify-between gap-2">
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </div>
                                    {option.hint && (
                                        <span className={`text-[10px] font-normal ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                            {option.hint}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ step, title, icon: Icon, hint, badge }: {
    step: number;
    title: string;
    icon: React.ElementType;
    hint?: string;
    badge?: string;
}) {
    return (
        <div className={`flex gap-3 ${hint ? 'items-start' : 'items-center'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-800">
                        <span className="mr-1.5 text-slate-300">{step}</span>
                        {title}
                    </h2>
                    {badge && (
                        <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {badge}
                        </span>
                    )}
                </div>
                {hint && <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p>}
            </div>
        </div>
    );
}

function FieldError({ message }: { message: string }) {
    return (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {message}
        </p>
    );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <span className={`text-xs font-semibold break-words ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
                {value}
            </span>
        </div>
    );
}

function CreateSampleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, formatBeverageType, formatStatus } = useTranslation();

    const initialBatchId = searchParams.get('batchId') || '';
    const initialBeverageId = searchParams.get('beverageId') || '';

    const [currentAuid, setCurrentAuid] = useState<number | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    // Cascading selection state
    const [beveragesList, setBeveragesList] = useState<BeverageSimpleInfo[]>([]);
    const [beveragesLoading, setBeveragesLoading] = useState(false);
    const [selectedBeverageId, setSelectedBeverageId] = useState(initialBeverageId);

    const [batchesList, setBatchesList] = useState<BatchSimpleInfo[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
    const [selectedBatch, setSelectedBatch] = useState<BatchSimpleInfo | null>(null);
    const [batchLoading, setBatchLoading] = useState(false);

    // Batch volume tracking
    const [usedVolumeMl, setUsedVolumeMl] = useState<number>(0);
    const [remainingVolumeMl, setRemainingVolumeMl] = useState<number | null>(null);
    const [samplesCount, setSamplesCount] = useState<number>(0);

    // Characteristics state
    const [characteristics, setCharacteristics] = useState<BeverageCharacteristic[]>([]);
    const [characteristicsLoading, setCharacteristicsLoading] = useState(false);
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});

    // Sample inputs
    const [volumeMl, setVolumeMl] = useState('750');

    const [showErrors, setShowErrors] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const cookieAuid = Cookies.get('auid');
        setCurrentAuid(cookieAuid ? parseInt(cookieAuid, 10) : null);
        setAuthChecked(true);
    }, []);

    // Load user's beverages
    useEffect(() => {
        if (!authChecked) return;
        setBeveragesLoading(true);
        getMyBeveragesAction()
            .then((list) => {
                setBeveragesList(list);
                if (!selectedBeverageId && !initialBatchId && list.length > 0) {
                    setSelectedBeverageId(list[0].id);
                }
            })
            .catch((err) => console.error('Failed to load beverages:', err))
            .finally(() => setBeveragesLoading(false));
    }, [authChecked]);

    // If initialBatchId was passed, load batch details directly
    useEffect(() => {
        if (!selectedBatchId) {
            setSelectedBatch(null);
            setUsedVolumeMl(0);
            setRemainingVolumeMl(null);
            setSamplesCount(0);
            return;
        }

        setBatchLoading(true);
        setCharacteristicsLoading(true);

        getBatchDetailsAction(selectedBatchId)
            .then((res) => {
                if (res.success && res.batch) {
                    setSelectedBatch(res.batch);
                    if (res.batch.beverage?.id && !selectedBeverageId) {
                        setSelectedBeverageId(res.batch.beverage.id);
                    }
                    setCharacteristics(res.characteristics || []);
                    setUsedVolumeMl(res.usedVolumeMl || 0);
                    setRemainingVolumeMl(res.remainingVolumeMl !== undefined ? res.remainingVolumeMl : null);
                    setSamplesCount(res.samplesCount || 0);
                } else {
                    toast.error(res.error || 'Партію не знайдено');
                }
            })
            .catch((err) => console.error('Failed to fetch batch details:', err))
            .finally(() => {
                setBatchLoading(false);
                setCharacteristicsLoading(false);
            });
    }, [selectedBatchId]);

    // When selectedBeverageId changes and initialBatchId is not locked, fetch its batches
    useEffect(() => {
        if (!selectedBeverageId) {
            setBatchesList([]);
            return;
        }

        setBatchesLoading(true);
        getBatchesForBeverageAction(selectedBeverageId)
            .then((items) => {
                setBatchesList(items);
                if (!selectedBatchId && items.length > 0) {
                    setSelectedBatchId(items[0].id);
                }
            })
            .catch((err) => console.error('Failed to fetch batches for beverage:', err))
            .finally(() => setBatchesLoading(false));
    }, [selectedBeverageId]);

    const selectedBeverage = useMemo(
        () => beveragesList.find((b) => b.id === selectedBeverageId),
        [beveragesList, selectedBeverageId]
    );

    const beverageOptions: SelectOption[] = useMemo(() => {
        return beveragesList.map((b) => {
            const parts: string[] = [];
            if (b.status) {
                parts.push(`${t('common.status', { defaultValue: 'Статус' })}: ${formatStatus(b.status)}`);
            }
            if (b.isOwn === false) {
                parts.push(t('batch.fromCatalog', { defaultValue: 'з каталогу' }));
            }
            return {
                value: b.id,
                label: b.name,
                hint: parts.length > 0 ? parts.join(' • ') : undefined,
            };
        });
    }, [beveragesList, t, formatStatus]);

    const batchOptions: SelectOption[] = useMemo(() => {
        return batchesList.map((batch) => {
            const lot = batch.lotNumber || `ID: ${batch.id.slice(-6).toUpperCase()}`;
            const vol = batch.volumeMl ? `${batch.volumeMl.toLocaleString()} мл` : '';
            return {
                value: batch.id,
                label: lot,
                hint: vol || undefined,
            };
        });
    }, [batchesList]);

    const numVolume = Number(volumeMl);
    const isVolumeExceeded = remainingVolumeMl !== null && !isNaN(numVolume) && numVolume > remainingVolumeMl;
    const isBatchExhausted = remainingVolumeMl !== null && remainingVolumeMl <= 0;

    const invalid = {
        batch: !selectedBatchId,
        volumeMl: volumeMl !== '' && (isNaN(numVolume) || numVolume <= 0),
        volumeExceeded: isVolumeExceeded,
        batchExhausted: isBatchExhausted,
    };

    const targetBeverageId = selectedBatch?.beverage?.id || selectedBeverageId;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        setSubmitError(null);

        if (!currentAuid) {
            setSubmitError(t('competition.createErrorAuth', { defaultValue: 'Будь ласка, увійдіть у систему' }));
            return;
        }

        if (invalid.batch) {
            toast.error(t('sample.errorBatchRequired', { defaultValue: 'Оберіть партію для створення зразка' }));
            return;
        }

        if (invalid.batchExhausted) {
            toast.error(t('sample.batchVolumeExhausted', { defaultValue: 'У цій партії вичерпано весь доступний об\'єм.' }));
            return;
        }

        if (invalid.volumeExceeded) {
            toast.error(
                t('sample.errorVolumeExceedsRemaining', {
                    defaultValue: `Об'єм зразка перевищує доступний залишок партії (${remainingVolumeMl?.toLocaleString()} мл)`,
                    max: remainingVolumeMl?.toLocaleString() || '0',
                })
            );
            return;
        }

        if (invalid.volumeMl) {
            toast.error(t('sample.errorInvalidVolume', { defaultValue: 'Вкажіть коректний об\'єм зразка' }));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createSampleAction({
                batchId: selectedBatchId,
                volumeMl: volumeMl ? Number(volumeMl) : undefined,
                attributes: Object.keys(dynamicAttributes).length > 0 ? dynamicAttributes : undefined,
            });

            if (!result.success || !result.sampleId) {
                throw new Error(result.error || 'Не вдалося створити зразок');
            }

            toast.success(t('sample.createSuccess', { defaultValue: 'Зразок успішно створено!' }));
            if (targetBeverageId) {
                router.push(`/beverage/${targetBeverageId}?tab=batches`);
            } else {
                router.push('/myBeverages');
            }
        } catch (err: any) {
            console.error('Sample creation failed:', err);
            const msg = err?.message || t('sample.createErrorGeneric', { defaultValue: 'Помилка при створенні зразка' });
            setSubmitError(msg);
            toast.error(msg);
            setIsSubmitting(false);
        }
    };

    const inputClass = (hasError: boolean) =>
        `w-full rounded-xl border bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60 ${
            hasError
                ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
        }`;

    return (
        <div className="flex h-screen flex-col bg-slate-50/50 text-slate-800">
            <AppHeader activeTab="beverages" />

            <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                    <BackLink
                        href={targetBeverageId ? `/beverage/${targetBeverageId}?tab=batches` : '/myBeverages'}
                        label={
                            selectedBatch?.beverage?.name
                                ? `${t('common.previous', { defaultValue: 'Назад' })}: ${selectedBatch.beverage.name}`
                                : t('beverage.backToMyBeverages', { defaultValue: 'До моїх напоїв' })
                        }
                    />

                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <FlaskConical className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                                {t('sample.createTitle', { defaultValue: 'Створити зразок (Sample)' })}
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                {t('sample.createSubtitle', { defaultValue: 'Реєстрація зразка з партії для подальшої участі в оцінюванні.' })}
                            </p>
                        </div>
                    </div>

                    {authChecked && !currentAuid && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {t('competition.createErrorAuth', { defaultValue: 'Будь ласка, увійдіть у систему' })}
                        </div>
                    )}

                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/50"
                        >
                            {/* 1 — Beverage & Batch Association */}
                            <section className="flex flex-col gap-5 p-6 sm:p-8">
                                <SectionHeader
                                    step={1}
                                    title={t('sample.sectionAssociation', { defaultValue: 'Прив\'язка до партії та напою' })}
                                    icon={Layers}
                                    hint={t('sample.sectionAssociationHint', { defaultValue: 'Зразок має належати до конкретної партії напою' })}
                                />

                                {initialBatchId && selectedBatch ? (
                                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-indigo-100 text-indigo-600 shadow-sm">
                                                    <Wine className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {t('batch.summaryBeverage', { defaultValue: 'Напій' })}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">
                                                        {selectedBatch.beverage?.name || '—'}
                                                    </h4>
                                                </div>
                                            </div>
                                            {selectedBatch.beverage?.typeName && (
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-600 border border-indigo-100 shadow-sm">
                                                    {formatBeverageType(selectedBatch.beverage.typeName) || selectedBatch.beverage.typeName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="border-t border-indigo-100/60 pt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Barcode className="h-4 w-4 text-indigo-600 shrink-0" />
                                                <span className="text-xs font-bold text-slate-700 truncate">
                                                    {t('sample.batchLabel', { defaultValue: 'Партія' })}:{' '}
                                                    {selectedBatch.lotNumber || `ID: ${selectedBatch.id.slice(-6).toUpperCase()}`}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBatchId('');
                                                    setSelectedBatch(null);
                                                }}
                                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                            >
                                                {t('common.change', { defaultValue: 'Змінити' })}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Beverage selector */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                {t('batch.beverageLabel', { defaultValue: 'Напій' })}
                                            </label>
                                            <CustomSelect
                                                value={selectedBeverageId}
                                                options={beverageOptions}
                                                onChange={(val) => {
                                                    setSelectedBeverageId(val);
                                                    setSelectedBatchId('');
                                                    setSelectedBatch(null);
                                                }}
                                                disabled={isSubmitting}
                                                loading={beveragesLoading}
                                                placeholder={t('batch.selectBeveragePlaceholder', { defaultValue: 'Оберіть напій...' })}
                                                emptyMessage="У вас ще немає створених напоїв"
                                                emptyAction={
                                                    <a
                                                        href="/beverage/create"
                                                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                                                    >
                                                        + Створити напій
                                                    </a>
                                                }
                                            />
                                        </div>

                                        {/* Batch selector */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                {t('sample.batchLabel', { defaultValue: 'Партія' })}
                                            </label>
                                            <CustomSelect
                                                value={selectedBatchId}
                                                options={batchOptions}
                                                onChange={(val) => setSelectedBatchId(val)}
                                                disabled={isSubmitting || !selectedBeverageId}
                                                loading={batchesLoading || batchLoading}
                                                placeholder={
                                                    batchesList.length === 0 && !batchesLoading
                                                        ? t('sample.noBatchesFound', { defaultValue: 'Для цього напою немає партій' })
                                                        : t('sample.selectBatchPlaceholder', { defaultValue: 'Оберіть партію...' })
                                                }
                                                hasError={showErrors && invalid.batch}
                                                emptyMessage={
                                                    selectedBeverageId
                                                        ? 'Для обраного напою ще немає партій'
                                                        : 'Спочатку оберіть напій зі списку вище'
                                                }
                                                emptyAction={
                                                    selectedBeverageId ? (
                                                        <a
                                                            href={`/batch/create?beverageId=${selectedBeverageId}`}
                                                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                                                        >
                                                            + Створити партію для напою
                                                        </a>
                                                    ) : undefined
                                                }
                                            />
                                            {showErrors && invalid.batch && (
                                                <FieldError message={t('sample.errorBatchRequired', { defaultValue: 'Оберіть партію' })} />
                                            )}
                                        </div>
                                    </>
                                )}
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 2 — Sample Volume */}
                            <section className="flex flex-col gap-5 p-6 sm:p-8">
                                <SectionHeader
                                    step={2}
                                    title={t('sample.sectionVolume', { defaultValue: 'Об\'єм зразка' })}
                                    icon={Droplet}
                                    hint={t('sample.sectionVolumeHint', { defaultValue: 'Вкажіть об\'єм зразка в мілілітрах (напр. стандартна пляшка 750 мл)' })}
                                />

                                {/* Batch Volume Status Banner */}
                                {selectedBatch && typeof selectedBatch.volumeMl === 'number' && selectedBatch.volumeMl > 0 && (
                                    <div className={`rounded-2xl border p-4 transition-all ${
                                        invalid.batchExhausted
                                            ? 'border-rose-200 bg-rose-50/50'
                                            : invalid.volumeExceeded
                                            ? 'border-amber-200 bg-amber-50/40'
                                            : 'border-indigo-100 bg-indigo-50/30'
                                    }`}>
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Droplet className={`h-4 w-4 ${invalid.batchExhausted ? 'text-rose-500' : 'text-indigo-600'}`} />
                                                <span className="text-xs font-bold text-slate-800">
                                                    {t('sample.batchVolumeTotal', { defaultValue: 'Загальний об\'єм партії' })}: {selectedBatch.volumeMl.toLocaleString()} мл
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {t('sample.batchVolumeUsed', { defaultValue: 'Вже виділено під зразки' })}: <strong className="text-slate-800">{usedVolumeMl.toLocaleString()} мл</strong> ({samplesCount} шт.)
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    invalid.batchExhausted
                                                        ? 'bg-rose-500'
                                                        : (usedVolumeMl / selectedBatch.volumeMl) > 0.8
                                                        ? 'bg-amber-500'
                                                        : 'bg-indigo-600'
                                                }`}
                                                style={{ width: `${Math.min(100, (usedVolumeMl / selectedBatch.volumeMl) * 100)}%` }}
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[11px]">
                                            <span className="font-semibold text-slate-500">
                                                {t('sample.batchVolumeRemaining', { defaultValue: 'Доступний залишок' })}:
                                            </span>
                                            <span className={`font-bold ${
                                                invalid.batchExhausted
                                                    ? 'text-rose-600'
                                                    : 'text-indigo-700'
                                            }`}>
                                                {remainingVolumeMl !== null ? `${remainingVolumeMl.toLocaleString()} мл` : '—'}
                                            </span>
                                        </div>

                                        {invalid.batchExhausted && (
                                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                {t('sample.batchVolumeExhausted', { defaultValue: 'У цій партії вичерпано весь доступний об\'єм. Створення нових зразків неможливе.' })}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="sample-volume" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('sample.volumeLabel', { defaultValue: 'Об\'єм зразка (мл)' })}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="sample-volume"
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="750"
                                            className={inputClass((showErrors && invalid.volumeMl) || invalid.volumeExceeded)}
                                            value={volumeMl}
                                            onChange={(e) => setVolumeMl(e.target.value)}
                                            disabled={isSubmitting || invalid.batchExhausted}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            мл
                                        </span>
                                    </div>

                                    {/* Presets */}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {[
                                            { label: '100 мл', val: '100' },
                                            { label: '375 мл', val: '375' },
                                            { label: '500 мл', val: '500' },
                                            { label: '750 мл (стандарт)', val: '750' },
                                            { label: '1 000 мл', val: '1000' },
                                            { label: '1 500 мл (магнум)', val: '1500' },
                                        ].map((preset) => {
                                            const isPresetDisabled =
                                                isSubmitting ||
                                                invalid.batchExhausted ||
                                                (remainingVolumeMl !== null && Number(preset.val) > remainingVolumeMl);
                                            return (
                                                <button
                                                    key={preset.val}
                                                    type="button"
                                                    onClick={() => !isPresetDisabled && setVolumeMl(preset.val)}
                                                    disabled={isPresetDisabled}
                                                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                                        isPresetDisabled
                                                            ? 'border-slate-150 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                                            : volumeMl === preset.val
                                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 cursor-pointer'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {showErrors && invalid.volumeMl && (
                                        <FieldError message={t('sample.errorInvalidVolume', { defaultValue: 'Введіть коректний об\'єм' })} />
                                    )}

                                    {invalid.volumeExceeded && (
                                        <FieldError
                                            message={t('sample.errorVolumeExceedsRemaining', {
                                                defaultValue: `Об'єм зразка перевищує доступний залишок у партії (макс. ${remainingVolumeMl?.toLocaleString()} мл)`,
                                                max: remainingVolumeMl?.toLocaleString() || '0',
                                            })}
                                        />
                                    )}
                                </div>
                            </section>

                            {/* 3 — Dynamic Characteristics (only if defined in beverage type schema for SAMPLE) */}
                            {characteristics.length > 0 && (
                                <>
                                    <div className="h-px bg-slate-100" />

                                    <section className="flex flex-col gap-5 p-6 sm:p-8">
                                        <SectionHeader
                                            step={3}
                                            title={t('sample.sectionCharacteristics', { defaultValue: 'Характеристики зразка' })}
                                            icon={Tag}
                                            badge={t('competition.createOptional', { defaultValue: 'Опціонально' })}
                                            hint={t('sample.sectionCharacteristicsHint', { defaultValue: 'Специфікації зразка з бекенду (тара, корок тощо)' })}
                                        />

                                        {characteristics.map((char) => {
                                            const val = dynamicAttributes[char.code] ?? '';
                                            const isEnum = char.typeName.includes('Enum') || (char.allowedValues && char.allowedValues.length > 0);

                                            if (isEnum && char.allowedValues) {
                                                return (
                                                    <div key={char.code} className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                            {char.name || char.code}
                                                            {char.isRequired && <span className="ml-1 text-rose-500">*</span>}
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {char.allowedValues.map((allowedVal) => {
                                                                const isSelected = val === allowedVal;
                                                                return (
                                                                    <button
                                                                        key={allowedVal}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setDynamicAttributes((prev) => {
                                                                                const next = { ...prev };
                                                                                if (isSelected) {
                                                                                    delete next[char.code];
                                                                                } else {
                                                                                    next[char.code] = allowedVal;
                                                                                }
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        disabled={isSubmitting}
                                                                        className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                                                                            isSelected
                                                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
                                                                        }`}
                                                                    >
                                                                        {allowedVal}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={char.code} className="flex flex-col gap-2">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        {char.name || char.code}
                                                        {char.isRequired && <span className="ml-1 text-rose-500">*</span>}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={inputClass(false)}
                                                        value={val}
                                                        onChange={(e) =>
                                                            setDynamicAttributes((prev) => ({
                                                                ...prev,
                                                                [char.code]: e.target.value,
                                                            }))
                                                        }
                                                        disabled={isSubmitting}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </section>
                                </>
                            )}

                            {/* Submit error banner */}
                            {submitError && (
                                <div className="border-t border-rose-100 bg-rose-50/60 p-6 sm:p-8">
                                    <div className="flex items-start gap-3 text-rose-600">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                                {t('sample.createErrorHeader', { defaultValue: 'Помилка при створенні зразка' })}
                                            </h4>
                                            <p className="mt-1 text-xs font-medium leading-relaxed">{submitError}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Live Summary Sidebar */}
                        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
                            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
                                <h3 className="text-sm font-extrabold tracking-tight text-slate-800 border-b border-slate-100 pb-3">
                                    {t('sample.summaryTitle', { defaultValue: 'Підсумок зразка' })}
                                </h3>

                                <div className="divide-y divide-slate-50">
                                    <SummaryRow
                                        label={t('batch.summaryBeverage', { defaultValue: 'Напій' })}
                                        value={(selectedBeverage?.name || selectedBatch?.beverage?.name) || '—'}
                                        muted={!selectedBeverage && !selectedBatch?.beverage}
                                    />

                                    <SummaryRow
                                        label={t('sample.summaryBatch', { defaultValue: 'Партія' })}
                                        value={
                                            selectedBatch
                                                ? selectedBatch.lotNumber || `ID: ${selectedBatch.id.slice(-6).toUpperCase()}`
                                                : '—'
                                        }
                                        muted={!selectedBatch}
                                    />

                                    <SummaryRow
                                        label={t('sample.summaryVolume', { defaultValue: 'Об\'єм' })}
                                        value={volumeMl ? `${Number(volumeMl).toLocaleString()} мл` : '—'}
                                        muted={!volumeMl}
                                    />

                                    {Object.entries(dynamicAttributes).map(([k, v]) => {
                                        if (!v) return null;
                                        const char = characteristics.find(c => c.code === k);
                                        const label = char ? char.name : k;
                                        return (
                                            <SummaryRow
                                                key={k}
                                                label={label}
                                                value={String(v)}
                                            />
                                        );
                                    })}
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={
                                            isSubmitting ||
                                            !authChecked ||
                                            !currentAuid ||
                                            !selectedBatchId ||
                                            invalid.batchExhausted ||
                                            invalid.volumeExceeded
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>{t('sample.submitting', { defaultValue: 'Створення зразка...' })}</span>
                                            </>
                                        ) : (
                                            <>
                                                <FlaskConical className="h-4 w-4" />
                                                <span>{t('sample.createButton', { defaultValue: 'Створити зразок' })}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function CreateSamplePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        }>
            <CreateSampleContent />
        </Suspense>
    );
}
