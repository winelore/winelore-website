'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import {
    AlertCircle,
    Check,
    ChevronDown,
    Globe,
    Layers,
    Loader2,
    Plus,
    Tag,
    Type,
    Wine,
} from 'lucide-react';

import { AppHeader } from '@/components/AppHeader';
import { BackLink } from '@/components/BackLink';
import { useTranslation } from '@/lib/i18n/context';
import {
    createBeverageAction,
    getBeverageTypesAction,
    getBeverageTypeCharacteristicsAction,
    type BeverageCharacteristic,
} from './actions';
import { LocationPickerMap } from './LocationPickerMap';

interface TypeOption {
    id: string;
    code: string;
    name: string;
}

interface SelectOption {
    value: string;
    label: string;
    isSpecial?: boolean;
}

function CustomSelect({
    value,
    options,
    onChange,
    disabled = false,
    loading = false,
    placeholder = 'Оберіть варіант...',
    hasError = false,
}: {
    value: string;
    options: SelectOption[];
    onChange: (val: string) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
    hasError?: boolean;
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
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                                    option.isSpecial
                                        ? 'bg-indigo-50/80 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-extrabold border border-indigo-100/60 my-0.5'
                                        : isSelected
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                        );
                    })}
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

export default function CreateBeveragePage() {
    const router = useRouter();
    const { t, formatBeverageType, formatStatus } = useTranslation();

    const nameRef = useRef<HTMLInputElement>(null);

    const [currentAuid, setCurrentAuid] = useState<number | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    // Form inputs
    const [name, setName] = useState('');
    const [typeSelection, setTypeSelection] = useState('');
    const [role, setRole] = useState<'MAKER' | 'BOTTLER'>('MAKER');
    const [originCoords, setOriginCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    const [typesList, setTypesList] = useState<TypeOption[]>([]);
    const [typesLoading, setTypesLoading] = useState(true);

    const [characteristics, setCharacteristics] = useState<BeverageCharacteristic[]>([]);
    const [characteristicsLoading, setCharacteristicsLoading] = useState(false);
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, string>>({});

    const [showErrors, setShowErrors] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const cookieAuid = Cookies.get('auid');
        setCurrentAuid(cookieAuid ? parseInt(cookieAuid, 10) : null);
        setAuthChecked(true);
    }, []);

    useEffect(() => {
        if (!typeSelection) return;
        let cancelled = false;
        setCharacteristicsLoading(true);
        getBeverageTypeCharacteristicsAction(typeSelection)
            .then((items) => {
                if (!cancelled) {
                    setCharacteristics(items);
                    setDynamicAttributes({});
                }
            })
            .catch((err) => {
                console.error('Error fetching type characteristics:', err);
            })
            .finally(() => {
                if (!cancelled) setCharacteristicsLoading(false);
            });

        return () => { cancelled = true; };
    }, [typeSelection]);

    useEffect(() => {
        if (!authChecked) return;
        let cancelled = false;
        setTypesLoading(true);
        getBeverageTypesAction()
            .then((items) => {
                if (cancelled) return;
                if (Array.isArray(items)) {
                    setTypesList(items);
                    if (items.length > 0) {
                        const wineItem = items.find(it => it.code?.toUpperCase() === 'WINE');
                        if (wineItem) {
                            setTypeSelection(wineItem.id);
                        } else {
                            setTypeSelection(items[0].id);
                        }
                    }
                }
            })
            .catch((err) => {
                console.error('Error fetching beverage types:', err);
            })
            .finally(() => {
                if (!cancelled) setTypesLoading(false);
            });

        return () => { cancelled = true; };
    }, [authChecked]);

    const trimmedName = name.trim();

    const selectedTypeObj = useMemo(
        () => typesList.find(tItem => tItem.id === typeSelection),
        [typesList, typeSelection]
    );

    const isWineType = useMemo(() => {
        if (!selectedTypeObj) return true;
        return selectedTypeObj.code?.toUpperCase() === 'WINE';
    }, [selectedTypeObj]);

    const invalid = {
        name: trimmedName.length === 0,
        typeSelection: !typeSelection,
    };

    const typeOptions = useMemo(() => {
        const sortedList = [...typesList].sort((a, b) => {
            if (a.code?.toUpperCase() === 'WINE') return -1;
            if (b.code?.toUpperCase() === 'WINE') return 1;
            return (a.name || a.code).localeCompare(b.name || b.code);
        });

        return sortedList.map((tItem) => {
            const formatted = formatBeverageType(tItem.code);
            const cleanLabel = formatted && formatted !== tItem.code
                ? formatted
                : (tItem.name || tItem.code);

            return {
                value: tItem.id,
                label: cleanLabel,
            };
        });
    }, [typesList, formatBeverageType]);

    const roleOptions: SelectOption[] = useMemo(() => [
        { value: 'MAKER', label: t('beverage.roleMaker', { defaultValue: 'Виробник' }) },
        { value: 'BOTTLER', label: t('beverage.roleBottler', { defaultValue: 'Розливник' }) },
    ], [t]);

    const selectedTypeName = useMemo(() => {
        const found = typesList.find(tItem => tItem.id === typeSelection);
        if (!found) return null;
        const formatted = formatBeverageType(found.code);
        return formatted && formatted !== found.code ? formatted : (found.name || found.code);
    }, [typeSelection, typesList, formatBeverageType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        setSubmitError(null);

        if (!currentAuid) {
            setSubmitError(t('competition.createErrorAuth', { defaultValue: 'Будь ласка, увійдіть у систему' }));
            return;
        }

        if (invalid.name) {
            nameRef.current?.focus();
            return;
        }

        setIsSubmitting(true);
        try {
            const origin = originCoords
                ? { latitude: originCoords.latitude, longitude: originCoords.longitude }
                : null;

            const result = await createBeverageAction({
                name: trimmedName,
                typeId: typeSelection,
                role,
                attributes: Object.keys(dynamicAttributes).length > 0 ? dynamicAttributes : undefined,
                origin,
            });

            if (!result.success || !result.beverageId) {
                throw new Error(result.error || 'Не вдалося створити напій');
            }

            toast.success(t('beverage.createSuccess', { defaultValue: 'Напій успішно створено!' }));
            router.push(`/beverage/${result.beverageId}`);
        } catch (err: any) {
            console.error('Beverage creation failed:', err);
            const rawMsg = err?.message || '';
            let message = rawMsg;
            if (rawMsg.toLowerCase().includes('invalid values: color')) {
                message = t('beverage.createErrorColor', { defaultValue: 'Некоректне значення кольору напою. Будь ласка, оберіть Червоне, Біле або Рожеве.' });
            } else if (!message) {
                message = t('beverage.createErrorGeneric', { defaultValue: 'Помилка при створенні напою' });
            }
            setSubmitError(message);
            toast.error(message);
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
                    <BackLink href="/myBeverages" label={t('beverage.backToMyBeverages', { defaultValue: 'До моїх напоїв' })} />

                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <Wine className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                                {t('beverage.createTitle', { defaultValue: 'Створити напій' })}
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                {t('beverage.createSubtitle', { defaultValue: 'Введіть інформацію про новий напій для реєстрації в каталозі.' })}
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
                            {/* 1 — Basic Information */}
                            <section className="flex flex-col gap-5 p-6 sm:p-8">
                                <SectionHeader
                                    step={1}
                                    title={t('beverage.createSectionBasics', { defaultValue: 'Основна інформація' })}
                                    icon={Type}
                                />

                                {/* Beverage Name */}
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="beverage-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('beverage.nameLabel', { defaultValue: 'Назва напою' })}
                                    </label>
                                    <input
                                        id="beverage-name"
                                        ref={nameRef}
                                        type="text"
                                        autoFocus
                                        autoComplete="off"
                                        placeholder={t('beverage.namePlaceholder', { defaultValue: 'напр. Chateau Margaux' })}
                                        className={`${inputClass(showErrors && invalid.name)} text-base`}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        disabled={isSubmitting}
                                        aria-invalid={showErrors && invalid.name}
                                    />
                                    {showErrors && invalid.name ? (
                                        <FieldError message={t('beverage.createErrorName', { defaultValue: 'Будь ласка, введіть назву напою' })} />
                                    ) : (
                                        <p className="text-xs font-medium text-slate-400">
                                            {t('beverage.nameHint', { defaultValue: 'Офіційна або комерційна назва продукту' })}
                                        </p>
                                    )}
                                </div>

                                {/* Beverage Type */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('beverage.typeLabel', { defaultValue: 'Тип напою' })}
                                    </label>

                                    <CustomSelect
                                        value={typeSelection}
                                        options={typeOptions}
                                        onChange={val => setTypeSelection(val)}
                                        disabled={isSubmitting}
                                        loading={typesLoading}
                                        hasError={showErrors && invalid.typeSelection}
                                    />

                                    <p className="text-xs font-medium text-slate-400">
                                        {typesLoading
                                            ? t('beverage.typesLoading', { defaultValue: 'Завантаження типів напоїв...' })
                                            : t('beverage.typeHint', { defaultValue: 'Оберіть категорію напою зі списку.' })}
                                    </p>
                                </div>

                                {/* Producer Role */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('beverage.producerRoleLabel', { defaultValue: 'Ваша роль як виробника' })}
                                    </label>

                                    <CustomSelect
                                        value={role}
                                        options={roleOptions}
                                        onChange={val => setRole(val as 'MAKER' | 'BOTTLER')}
                                        disabled={isSubmitting}
                                    />

                                    <p className="text-xs font-medium text-slate-400">
                                        {t('beverage.roleHint', { defaultValue: 'За замовчуванням ви реєструєтесь як виробник цього напою.' })}
                                    </p>
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 2 — Characteristics (Optional) — Dynamic backend characteristics */}
                            {(characteristicsLoading || characteristics.length > 0) && (
                                <>
                                    <section className="flex flex-col gap-5 p-6 sm:p-8">
                                        <SectionHeader
                                            step={2}
                                            title={t('beverage.createSectionCharacteristics', { defaultValue: 'Характеристики напою' })}
                                            icon={Tag}
                                            badge={t('competition.createOptional', { defaultValue: 'Опціонально' })}
                                            hint={t('beverage.characteristicsHint', { defaultValue: 'Ви можете вказати характеристики напою зараз або пізніше.' })}
                                        />

                                        {characteristicsLoading ? (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 py-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                <span>{t('common.loading', { defaultValue: 'Завантаження характеристик...' })}</span>
                                            </div>
                                        ) : (
                                            characteristics.map((char) => {
                                                const val = dynamicAttributes[char.code] || '';
                                                const hasAllowed = char.allowedValues && char.allowedValues.length > 0;

                                                return (
                                                    <div key={char.code} className="flex flex-col gap-2">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                            {char.name || char.code}
                                                            {char.isRequired && <span className="ml-1 text-rose-500">*</span>}
                                                        </label>

                                                        {hasAllowed ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {char.allowedValues!.map((allowedVal) => {
                                                                    const isSelected = val === allowedVal;
                                                                    const formatted = formatBeverageType(allowedVal);
                                                                    const label = formatted && formatted !== allowedVal ? formatted : allowedVal;

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
                                                                            {label}
                                                                        </button>
                                                                    );
                                                                })}
                                                                {val && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setDynamicAttributes((prev) => {
                                                                                const next = { ...prev };
                                                                                delete next[char.code];
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        disabled={isSubmitting}
                                                                        className="cursor-pointer rounded-full px-3 py-2 text-xs font-bold text-slate-400 transition-colors hover:text-slate-600"
                                                                    >
                                                                        {t('competition.createPresetClear', { defaultValue: 'Очистити' })}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : char.typeName === 'INT' || char.typeName === 'DOUBLE' ? (
                                                            <input
                                                                type="number"
                                                                value={val}
                                                                min={char.minLimit}
                                                                max={char.maxLimit}
                                                                onChange={(e) => {
                                                                    const inputVal = e.target.value;
                                                                    setDynamicAttributes((prev) => {
                                                                        const next = { ...prev };
                                                                        if (inputVal === '') {
                                                                            delete next[char.code];
                                                                        } else {
                                                                            next[char.code] = inputVal;
                                                                        }
                                                                        return next;
                                                                    });
                                                                }}
                                                                disabled={isSubmitting}
                                                                className={inputClass(false)}
                                                                placeholder={char.name || char.code}
                                                            />
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={val}
                                                                onChange={(e) => {
                                                                    const inputVal = e.target.value;
                                                                    setDynamicAttributes((prev) => {
                                                                        const next = { ...prev };
                                                                        if (!inputVal.trim()) {
                                                                            delete next[char.code];
                                                                        } else {
                                                                            next[char.code] = inputVal;
                                                                        }
                                                                        return next;
                                                                    });
                                                                }}
                                                                disabled={isSubmitting}
                                                                className={inputClass(false)}
                                                                placeholder={char.name || char.code}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </section>

                                    <div className="h-px bg-slate-100" />
                                </>
                            )}

                            {/* Geographic Origin (Optional) — Interactive Map */}
                            <section className="flex flex-col gap-5 p-6 sm:p-8">
                                <SectionHeader
                                    step={characteristics.length > 0 ? 3 : 2}
                                    title={t('beverage.createSectionOrigin', { defaultValue: 'Географічне походження' })}
                                    icon={Globe}
                                    badge={t('competition.createOptional', { defaultValue: 'Опціонально' })}
                                    hint={t('beverage.originHint', { defaultValue: 'Оберіть розташування виноградника або терруару на карті.' })}
                                />

                                <LocationPickerMap
                                    value={originCoords}
                                    onChange={(coords) => setOriginCoords(coords)}
                                    disabled={isSubmitting}
                                />
                            </section>

                            {/* Action Bar */}
                            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                                <div className="min-w-0 flex-1">
                                    {submitError && (
                                        <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-600">
                                            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                                            {submitError}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/myBeverages')}
                                        disabled={isSubmitting}
                                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        {t('competition.cancel', { defaultValue: 'Скасувати' })}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || (authChecked && !currentAuid)}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                <span>{t('beverage.creating', { defaultValue: 'Створення...' })}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                <span>{t('beverage.createSubmitButton', { defaultValue: 'Створити напій' })}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Live Summary Preview */}
                        <aside className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm lg:sticky lg:top-6">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {t('beverage.summaryTitle', { defaultValue: 'Попередній перегляд' })}
                            </h2>

                            <div className="mt-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                                    <Wine className="h-6 w-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-base font-bold break-words ${trimmedName ? 'text-slate-800' : 'text-slate-300'}`}>
                                        {trimmedName || t('beverage.summaryUntitled', { defaultValue: 'Назва напою...' })}
                                    </p>
                                    <span className="inline-block mt-0.5 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
                                        {formatStatus('DRAFT')}
                                    </span>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-50">
                                <SummaryRow
                                    label={t('beverage.typeLabel', { defaultValue: 'Тип напою' })}
                                    value={selectedTypeName || t('common.na', { defaultValue: 'Не обрано' })}
                                    muted={!selectedTypeName}
                                />
                                <SummaryRow
                                    label={t('beverage.producerRoleLabel', { defaultValue: 'Ваша роль' })}
                                    value={role === 'BOTTLER' ? t('beverage.roleBottler', { defaultValue: 'Розливник' }) : t('beverage.roleMaker', { defaultValue: 'Виробник' })}
                                />
                                {characteristics.map((char) => {
                                    const val = dynamicAttributes[char.code];
                                    let displayVal = t('common.na', { defaultValue: 'Не вказано' });
                                    if (val) {
                                        const formatted = formatBeverageType(val);
                                        displayVal = formatted && formatted !== val ? formatted : val;
                                    }
                                    return (
                                        <SummaryRow
                                            key={char.code}
                                            label={char.name || char.code}
                                            value={displayVal}
                                            muted={!val}
                                        />
                                    );
                                })}
                                <SummaryRow
                                    label={t('beverage.originLabel', { defaultValue: 'Координати' })}
                                    value={originCoords ? `${originCoords.latitude}, ${originCoords.longitude}` : t('common.na', { defaultValue: 'Не вказано' })}
                                    muted={!originCoords}
                                />
                                <SummaryRow
                                    label={t('beverage.ownerAuidLabel', { defaultValue: 'Власник (AUID)' })}
                                    value={currentAuid ? `${currentAuid}` : t('common.na', { defaultValue: '—' })}
                                    muted={!currentAuid}
                                />
                            </div>

                            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] font-medium leading-relaxed text-slate-500">
                                <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {t('beverage.createNextSteps', { defaultValue: 'Після створення напій потрапить у стан Чернетка (DRAFT), де ви зможете відправити його на перевірку.' })}
                            </p>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}
