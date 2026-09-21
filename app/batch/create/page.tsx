'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import {
    AlertCircle,
    Barcode,
    Calendar,
    Check,
    ChevronDown,
    Droplet,
    Layers,
    Loader2,
    Percent,
    Tag,
    Wine,
} from 'lucide-react';

import { AppHeader } from '@/components/AppHeader';
import { BackLink } from '@/components/BackLink';
import { useMobileNavTitle } from '@/lib/mobileNav';
import { useTranslation } from '@/lib/i18n/context';
import {
    createBatchAction,
    getBeverageForBatchAction,
    getMyBeveragesAction,
    type BeverageSimpleInfo,
} from './actions';
import { type BeverageCharacteristic } from '@/lib/beverageCharacteristics';

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
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl shadow-slate-200/80 backdrop-blur-md transition-all duration-200 origin-top animate-scale-up">
                    {options.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-5 text-center">
                            <Wine className="h-6 w-6 text-slate-300" />
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

function SummaryRow({ label, value, muted = false }: { label: string; value: React.ReactNode; muted?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <div className={`text-xs font-semibold break-words ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
                {value}
            </div>
        </div>
    );
}

function CreateBatchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, formatBeverageType, formatStatus } = useTranslation();

    const initialBeverageId = searchParams.get('beverageId') || '';

    const [currentAuid, setCurrentAuid] = useState<number | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    // Beverage state
    const [beveragesList, setBeveragesList] = useState<BeverageSimpleInfo[]>([]);
    const [beveragesLoading, setBeveragesLoading] = useState(false);
    const [selectedBeverageId, setSelectedBeverageId] = useState(initialBeverageId);
    const [selectedBeverage, setSelectedBeverage] = useState<BeverageSimpleInfo | null>(null);
    const [beverageLoading, setBeverageLoading] = useState(false);

    // Characteristics state
    const [characteristics, setCharacteristics] = useState<BeverageCharacteristic[]>([]);
    const [characteristicsLoading, setCharacteristicsLoading] = useState(false);
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});

    // Batch inputs
    const [lotNumber, setLotNumber] = useState('');
    const [volumeMl, setVolumeMl] = useState('');

    const [showErrors, setShowErrors] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const cookieAuid = Cookies.get('auid');
        setCurrentAuid(cookieAuid ? parseInt(cookieAuid, 10) : null);
        setAuthChecked(true);
    }, []);

    // Load user's beverages for selector
    useEffect(() => {
        if (!authChecked) return;
        setBeveragesLoading(true);
        getMyBeveragesAction()
            .then((list) => {
                setBeveragesList(list);
                if (!selectedBeverageId && list.length > 0) {
                    setSelectedBeverageId(list[0].id);
                }
            })
            .catch((err) => console.error('Failed to load beverages list:', err))
            .finally(() => setBeveragesLoading(false));
    }, [authChecked]);

    // Load details & batch characteristics when selectedBeverageId changes
    useEffect(() => {
        if (!selectedBeverageId) {
            setSelectedBeverage(null);
            setCharacteristics([]);
            return;
        }

        setBeverageLoading(true);
        setCharacteristicsLoading(true);

        getBeverageForBatchAction(selectedBeverageId)
            .then((res) => {
                if (res.success && res.beverage) {
                    setSelectedBeverage(res.beverage);
                    setCharacteristics(res.characteristics || []);
                    // Auto-fill common default vintage (current or previous year) if in characteristics
                    const vintageChar = res.characteristics?.find(c => c.code === 'vintage');
                    if (vintageChar) {
                        const currentYear = new Date().getFullYear();
                        setDynamicAttributes((prev) => ({
                            ...prev,
                            vintage: prev.vintage || String(currentYear),
                        }));
                    }
                } else {
                    toast.error(res.error || 'Напій не знайдено');
                }
            })
            .catch((err) => console.error('Failed to fetch beverage for batch:', err))
            .finally(() => {
                setBeverageLoading(false);
                setCharacteristicsLoading(false);
            });
    }, [selectedBeverageId]);

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

    const invalid = {
        beverage: !selectedBeverageId,
        volumeMl: volumeMl !== '' && (isNaN(Number(volumeMl)) || Number(volumeMl) <= 0),
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        setSubmitError(null);

        if (!currentAuid) {
            setSubmitError(t('competition.createErrorAuth', { defaultValue: 'Будь ласка, увійдіть у систему' }));
            return;
        }

        if (invalid.beverage) {
            toast.error(t('batch.errorBeverageRequired', { defaultValue: 'Оберіть напій для партії' }));
            return;
        }

        if (invalid.volumeMl) {
            toast.error(t('batch.errorInvalidVolume', { defaultValue: 'Введіть коректний об\'єм партії' }));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createBatchAction({
                beverageId: selectedBeverageId,
                lotNumber: lotNumber.trim() || undefined,
                volumeMl: volumeMl ? Number(volumeMl) : undefined,
                attributes: Object.keys(dynamicAttributes).length > 0 ? dynamicAttributes : undefined,
            });

            if (!result.success || !result.batchId) {
                throw new Error(result.error || 'Не вдалося створити партію');
            }

            toast.success(t('batch.createSuccess', { defaultValue: 'Партію успішно створено!' }));
            router.push(`/beverage/${selectedBeverageId}?tab=batches`);
        } catch (err: any) {
            console.error('Batch creation failed:', err);
            const msg = err?.message || t('batch.createErrorGeneric', { defaultValue: 'Помилка при створенні партії' });
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

    const titleRef = useMobileNavTitle<HTMLHeadingElement>(t('batch.createTitle', { defaultValue: 'Створити партію (Batch)' }));

    return (
        <div className="app-screen bg-slate-50/50 text-slate-800">
            <AppHeader activeTab="beverages" showMobileTabBar={false} />

            <main className="app-main px-4 pt-2 pb-safe-4 sm:px-6 sm:py-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                    <BackLink
                        href={selectedBeverageId ? `/beverage/${selectedBeverageId}?tab=batches` : '/myBeverages'}
                        label={
                            selectedBeverage
                                ? `${t('common.previous', { defaultValue: 'Назад' })}: ${selectedBeverage.name}`
                                : t('beverage.backToMyBeverages', { defaultValue: 'До моїх напоїв' })
                        }
                    />

                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <Layers className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <h1 ref={titleRef} className="truncate text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                                {t('batch.createTitle', { defaultValue: 'Створити партію (Batch)' })}
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                {t('batch.createSubtitle', { defaultValue: 'Реєстрація нової партії напою з характеристиками врожаю та об\'ємом.' })}
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
                            {/* 1 — Beverage Association */}
                            <section className="flex flex-col gap-5 p-5 sm:p-8">
                                <SectionHeader
                                    step={1}
                                    title={t('batch.sectionBeverage', { defaultValue: 'Прив\'язка до напою' })}
                                    icon={Wine}
                                    hint={t('batch.sectionBeverageHint', { defaultValue: 'Оберіть напій, частиною якого є ця партія' })}
                                />

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('batch.beverageLabel', { defaultValue: 'Напій' })}
                                    </label>

                                    {initialBeverageId && selectedBeverage ? (
                                        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-indigo-100 text-indigo-600 shadow-sm">
                                                    <Wine className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-slate-800 truncate">{selectedBeverage.name}</h3>
                                                    {selectedBeverage.typeName && (
                                                        <span className="text-xs font-medium text-indigo-600">
                                                            {formatBeverageType(selectedBeverage.typeName) || selectedBeverage.typeName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBeverageId('')}
                                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                            >
                                                {t('common.change', { defaultValue: 'Змінити' })}
                                            </button>
                                        </div>
                                    ) : (
                                        <CustomSelect
                                            value={selectedBeverageId}
                                            options={beverageOptions}
                                            onChange={(val) => setSelectedBeverageId(val)}
                                            disabled={isSubmitting}
                                            loading={beveragesLoading || beverageLoading}
                                            placeholder={t('batch.selectBeveragePlaceholder', { defaultValue: 'Оберіть напій зі списку...' })}
                                            hasError={showErrors && invalid.beverage}
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
                                    )}

                                    {showErrors && invalid.beverage && (
                                        <FieldError message={t('batch.errorBeverageRequired', { defaultValue: 'Оберіть напій для партії' })} />
                                    )}
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 2 — Batch Parameters */}
                            <section className="flex flex-col gap-5 p-5 sm:p-8">
                                <SectionHeader
                                    step={2}
                                    title={t('batch.sectionBatchInfo', { defaultValue: 'Параметри партії' })}
                                    icon={Barcode}
                                    hint={t('batch.sectionBatchInfoHint', { defaultValue: 'Вкажіть номер партії та загальний об\'єм' })}
                                />

                                {/* Lot Number */}
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="lot-number" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('batch.lotNumberLabel', { defaultValue: 'Номер партії (Lot Number)' })}
                                    </label>
                                    <input
                                        id="lot-number"
                                        type="text"
                                        placeholder={t('batch.lotNumberPlaceholder', { defaultValue: 'напр. LOT-2024-01' })}
                                        className={inputClass(false)}
                                        value={lotNumber}
                                        onChange={(e) => setLotNumber(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-xs font-medium text-slate-400">
                                        {t('batch.lotNumberHint', { defaultValue: 'Унікальний ідентифікатор виробничої партії' })}
                                    </p>
                                </div>

                                {/* Volume (ml) */}
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="batch-volume" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('batch.volumeLabel', { defaultValue: 'Загальний об\'єм партії (мл)' })}
                                    </label>
                                    <input
                                        id="batch-volume"
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="напр. 500000 (для 500 л) або 750"
                                        className={inputClass(showErrors && invalid.volumeMl)}
                                        value={volumeMl}
                                        onChange={(e) => setVolumeMl(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {[
                                            { label: '750 мл', val: '750' },
                                            { label: '1 500 мл', val: '1500' },
                                            { label: '100 л', val: '100000' },
                                            { label: '500 л', val: '500000' },
                                            { label: '1 000 л', val: '1000000' },
                                        ].map((preset) => (
                                            <button
                                                key={preset.val}
                                                type="button"
                                                onClick={() => setVolumeMl(preset.val)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                                    volumeMl === preset.val
                                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                    {showErrors && invalid.volumeMl && (
                                        <FieldError message={t('batch.errorInvalidVolume', { defaultValue: 'Введіть коректне додатнє число' })} />
                                    )}
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 3 — Dynamic Characteristics based on Beverage Type */}
                            <section className="flex flex-col gap-5 p-5 sm:p-8">
                                <SectionHeader
                                    step={3}
                                    title={t('batch.sectionCharacteristics', { defaultValue: 'Характеристики партії' })}
                                    icon={Tag}
                                    badge={t('competition.createOptional', { defaultValue: 'Опціонально' })}
                                    hint={t('batch.sectionCharacteristicsHint', { defaultValue: 'Параметри за типом напою з бекенду (вінтаж, міцність тощо)' })}
                                />

                                {characteristicsLoading ? (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                        <span>{t('common.loading', { defaultValue: 'Завантаження характеристик...' })}</span>
                                    </div>
                                ) : characteristics.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                                        <p className="text-xs font-medium text-slate-400">
                                            {t('batch.noSpecificCharacteristics', {
                                                defaultValue: 'Для цього типу напою немає спеціальних обов\'язкових характеристик партії.',
                                            })}
                                        </p>
                                    </div>
                                ) : (
                                    characteristics.map((char) => {
                                        const val = dynamicAttributes[char.code] ?? '';
                                        const isInt = char.typeName.includes('Int');
                                        const isDouble = char.typeName.includes('Double');
                                        const isEnum = char.typeName.includes('Enum') || (char.allowedValues && char.allowedValues.length > 0);

                                        // Special helper for Vintage
                                        if (char.code === 'vintage' || isInt) {
                                            const currentYear = new Date().getFullYear();
                                            const vintagePresets = [
                                                currentYear,
                                                currentYear - 1,
                                                currentYear - 2,
                                                currentYear - 3,
                                                currentYear - 4,
                                            ];

                                            return (
                                                <div key={char.code} className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                                            {char.name || char.code}
                                                            {char.isRequired && <span className="text-rose-500">*</span>}
                                                        </label>
                                                        {char.minLimit && char.maxLimit && (
                                                            <span className="text-[10px] font-semibold text-slate-400">
                                                                {char.minLimit} – {char.maxLimit}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="number"
                                                        min={char.minLimit ?? 1800}
                                                        max={char.maxLimit ?? 2100}
                                                        step="1"
                                                        placeholder={char.code === 'vintage' ? String(currentYear) : ''}
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

                                                    {char.code === 'vintage' && (
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {vintagePresets.map((yr) => (
                                                                <button
                                                                    key={yr}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDynamicAttributes((prev) => ({
                                                                            ...prev,
                                                                            vintage: String(yr),
                                                                        }))
                                                                    }
                                                                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                                                        String(val) === String(yr)
                                                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                                                                    }`}
                                                                >
                                                                    {yr}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // Special helper for ABV / Double
                                        if (isDouble || char.code === 'alcoholByVolume') {
                                            return (
                                                <div key={char.code} className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                            <Percent className="h-3.5 w-3.5 text-indigo-600" />
                                                            {char.name || char.code}
                                                            {char.isRequired && <span className="text-rose-500">*</span>}
                                                        </label>
                                                        <span className="text-[10px] font-semibold text-slate-400">
                                                            0.0% – 100.0%
                                                        </span>
                                                    </div>

                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min={char.minLimit ?? 0}
                                                            max={char.maxLimit ?? 100}
                                                            step="0.1"
                                                            placeholder="напр. 13.5"
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
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                            %
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {['11.5', '12.0', '12.5', '13.0', '13.5', '14.0', '14.5'].map((pct) => (
                                                            <button
                                                                key={pct}
                                                                type="button"
                                                                onClick={() =>
                                                                    setDynamicAttributes((prev) => ({
                                                                        ...prev,
                                                                        [char.code]: pct,
                                                                    }))
                                                                }
                                                                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                                                    String(val) === pct
                                                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                                                                }`}
                                                            >
                                                                {pct}%
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Enum chips
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

                                        // Fallback text input
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
                                    })
                                )}
                            </section>

                            {/* Submit errors */}
                            {submitError && (
                                <div className="border-t border-rose-100 bg-rose-50/60 p-6 sm:p-8">
                                    <div className="flex items-start gap-3 text-rose-600">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                                {t('batch.createErrorHeader', { defaultValue: 'Помилка при створенні партії' })}
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
                                    {t('batch.summaryTitle', { defaultValue: 'Підсумок партії' })}
                                </h3>

                                <div className="divide-y divide-slate-50">
                                    <SummaryRow
                                        label={t('batch.summaryBeverage', { defaultValue: 'Напій' })}
                                        value={selectedBeverage ? selectedBeverage.name : '—'}
                                        muted={!selectedBeverage}
                                    />

                                    {selectedBeverage?.typeName && (
                                        <SummaryRow
                                            label={t('batch.summaryType', { defaultValue: 'Тип напою' })}
                                            value={formatBeverageType(selectedBeverage.typeName) || selectedBeverage.typeName}
                                        />
                                    )}

                                    <SummaryRow
                                        label={t('batch.summaryLot', { defaultValue: 'Номер партії' })}
                                        value={lotNumber.trim() || '—'}
                                        muted={!lotNumber.trim()}
                                    />

                                    <SummaryRow
                                        label={t('batch.summaryVolume', { defaultValue: 'Об\'єм' })}
                                        value={volumeMl ? `${Number(volumeMl).toLocaleString()} мл` : '—'}
                                        muted={!volumeMl}
                                    />

                                    {Object.entries(dynamicAttributes).map(([k, v]) => {
                                        if (!v) return null;
                                        const char = characteristics.find(c => c.code === k);
                                        const label = char ? char.name : k;
                                        const displayVal = k === 'alcoholByVolume' ? `${v}%` : String(v);
                                        return (
                                            <SummaryRow
                                                key={k}
                                                label={label}
                                                value={displayVal}
                                            />
                                        );
                                    })}
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !authChecked || !currentAuid}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>{t('batch.submitting', { defaultValue: 'Створення партії...' })}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Layers className="h-4 w-4" />
                                                <span>{t('batch.createButton', { defaultValue: 'Створити партію' })}</span>
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

export default function CreateBatchPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-dvh items-center justify-center bg-slate-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        }>
            <CreateBatchContent />
        </Suspense>
    );
}
