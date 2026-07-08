'use client';

import React, { useState } from 'react';
import { CommissionReplicaType } from '@/types/graphql';

interface ReplicaState {
    id: string;
    name: string;
    type: CommissionReplicaType;
}

interface CommissionState {
    id: string;
    name: string;
    wineJumperMiniGameEnabled: boolean;
    voiceCommentsEnabled: boolean;
    propertyCommentsEnabled: boolean;
    beverageOriginDuringEvaluationEnabled: boolean;
    plannedStartDate: string;
    plannedEndDate: string;
    replicas: ReplicaState[];
}

interface CompetitionFormState {
    name: string;
    seriesId: string;
    plannedStartDate: string;
    plannedEndDate: string;
    holders: number[][];
    commissions: CommissionState[];
}

export default function CreateCompetitionPage() {
    const [formData, setFormData] = useState<CompetitionFormState>({
        name: '',
        seriesId: '',
        plannedStartDate: '',
        plannedEndDate: '',
        holders: [[1, 2, 3]],
        commissions: []
    });

    const handleCompetitionChange = (field: keyof CompetitionFormState, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addCommission = () => {
        const newCommission: CommissionState = {
            id: crypto.randomUUID(),
            name: `Commission ${formData.commissions.length + 1}`,
            wineJumperMiniGameEnabled: false,
            voiceCommentsEnabled: false,
            propertyCommentsEnabled: true,
            beverageOriginDuringEvaluationEnabled: false,
            plannedStartDate: formData.plannedStartDate,
            plannedEndDate: formData.plannedEndDate,
            replicas: []
        };
        setFormData(prev => ({ ...prev, commissions: [...prev.commissions, newCommission] }));
    };

    const removeCommission = (commissionId: string) => {
        setFormData(prev => ({ ...prev, commissions: prev.commissions.filter(c => c.id !== commissionId) }));
    };

    const updateCommission = (commissionId: string, field: keyof CommissionState, value: any) => {
        setFormData(prev => ({
            ...prev,
            commissions: prev.commissions.map(c => c.id === commissionId ? { ...c, [field]: value } : c)
        }));
    };

    const addReplica = (commissionId: string) => {
        setFormData(prev => ({
            ...prev,
            commissions: prev.commissions.map(c => {
                if (c.id !== commissionId) return c;
                const newReplica: ReplicaState = {
                    id: crypto.randomUUID(),
                    name: `Replica ${c.replicas.length + 1}`,
                    type: 'STANDARD'
                };
                return { ...c, replicas: [...c.replicas, newReplica] };
            })
        }));
    };

    const removeReplica = (commissionId: string, replicaId: string) => {
        setFormData(prev => ({
            ...prev,
            commissions: prev.commissions.map(c => {
                if (c.id !== commissionId) return c;
                return { ...c, replicas: c.replicas.filter(r => r.id !== replicaId) };
            })
        }));
    };

    const updateReplica = (commissionId: string, replicaId: string, field: keyof ReplicaState, value: any) => {
        setFormData(prev => ({
            ...prev,
            commissions: prev.commissions.map(c => {
                if (c.id !== commissionId) return c;
                return { ...c, replicas: c.replicas.map(r => r.id === replicaId ? { ...r, [field]: value } : r) };
            })
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Mutation data:', formData);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans antialiased">
            {/* Header / Navbar */}
            <header className="bg-white border-b border-[#F1F5F9] px-12 py-4 flex justify-between items-center">
                <div className="text-xl font-bold tracking-tight text-[#0F172A]">WineLore</div>
                <div className="flex items-center gap-4">
                    <button type="button" className="text-sm font-medium text-[#475569] flex items-center gap-1 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
                        🌐 English
                    </button>
                    <button type="button" className="bg-[#5046E5] text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#4338CA] transition-all shadow-sm">
                        Sign In
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-12 py-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: Sidebar Details */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Card 1: Competition Series */}
                        <div className="bg-white p-6 rounded-3xl border border-[#F1F5F9] shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#EEF2FF] text-[#5046E5] rounded-2xl flex items-center justify-center font-bold">
                                    🏆
                                </div>
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Competition Series</h2>
                                    <input
                                        type="text"
                                        placeholder="Enter series title or ID"
                                        className="text-base font-semibold text-[#0F172A] bg-transparent border-b border-transparent hover:border-[#E2E8F0] focus:border-[#5046E5] focus:outline-none w-full mt-0.5 pt-0.5"
                                        value={formData.seriesId}
                                        onChange={e => handleCompetitionChange('seriesId', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Schedule Details */}
                        <div className="bg-white p-6 rounded-3xl border border-[#F1F5F9] shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5">
                            <div className="flex items-center gap-2 text-[#5046E5] font-semibold text-sm">
                                <span>📅</span> Schedule Details
                            </div>

                            <div className="space-y-4">
                                <div className="relative pl-4 border-l-2 border-[#E2E8F0] focus-within:border-[#5046E5] transition-colors">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Planned Start</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full text-xs font-medium text-[#334155] bg-transparent border-none outline-none mt-1"
                                        value={formData.plannedStartDate}
                                        onChange={e => handleCompetitionChange('plannedStartDate', e.target.value)}
                                    />
                                </div>

                                <div className="relative pl-4 border-l-2 border-[#E2E8F0] focus-within:border-[#5046E5] transition-colors">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Planned Completion</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full text-xs font-medium text-[#334155] bg-transparent border-none outline-none mt-1"
                                        value={formData.plannedEndDate}
                                        onChange={e => handleCompetitionChange('plannedEndDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Main Competition Panel */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Card 3: Competition Core Name */}
                        <div className="bg-white p-8 rounded-3xl border border-[#F1F5F9] shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-[#EEF2FF] text-[#5046E5] rounded-2xl flex items-center justify-center text-xl shadow-sm">
                                    🍷
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Competition Dashboard</span>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Wines of the Silver Land 2026"
                                        className="text-2xl font-bold text-[#0F172A] bg-transparent border-b border-transparent hover:border-[#E2E8F0] focus:border-[#5046E5] focus:outline-none w-full mt-1"
                                        value={formData.name}
                                        onChange={e => handleCompetitionChange('name', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card 4: Commissions Management */}
                        <div className="bg-white p-8 rounded-3xl border border-[#F1F5F9] shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                                        <span>👥</span> Commissions
                                    </h3>
                                    <p className="text-xs text-[#94A3B8]">Commissions assigned to this setup</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {formData.commissions.length > 0 && (
                                        <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2.5 py-1 rounded-lg font-medium">
                                            Total: {formData.commissions.length}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={addCommission}
                                        className="bg-[#5046E5] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm"
                                    >
                                        + Add Commission
                                    </button>
                                </div>
                            </div>

                            {/* Commissions List */}
                            {formData.commissions.length === 0 ? (
                                <div className="text-center py-12 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] text-sm text-[#94A3B8]">
                                    No commissions configuration found. Click the button above to add a dynamic node.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.commissions.map((commission) => (
                                        <div key={commission.id} className="p-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl space-y-4 hover:shadow-sm transition-shadow">

                                            {/* Commission Node Header */}
                                            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
                                                <div className="flex items-center gap-3 flex-1 max-w-md">
                                                    <div className="w-8 h-8 bg-white text-[#5046E5] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-sm shadow-sm">
                                                        🔮
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className="font-bold text-[#1E293B] text-sm bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#5046E5] focus:outline-none w-full py-0.5"
                                                        value={commission.name}
                                                        onChange={e => updateCommission(commission.id, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCommission(commission.id)}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            {/* Configuration Checkboxes */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-[#475569]">
                                                <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-[#5046E5] focus:ring-[#5046E5] accent-[#5046E5]"
                                                        checked={commission.wineJumperMiniGameEnabled}
                                                        onChange={e => updateCommission(commission.id, 'wineJumperMiniGameEnabled', e.target.checked)}
                                                    />
                                                    <span>WineJumper Mini-game Interaction</span>
                                                </label>
                                                <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-[#5046E5] focus:ring-[#5046E5] accent-[#5046E5]"
                                                        checked={commission.voiceCommentsEnabled}
                                                        onChange={e => updateCommission(commission.id, 'voiceCommentsEnabled', e.target.checked)}
                                                    />
                                                    <span>Allow Voice Stream Notes</span>
                                                </label>
                                                <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-[#5046E5] focus:ring-[#5046E5] accent-[#5046E5]"
                                                        checked={commission.propertyCommentsEnabled}
                                                        onChange={e => updateCommission(commission.id, 'propertyCommentsEnabled', e.target.checked)}
                                                    />
                                                    <span>Structural Property Annotation</span>
                                                </label>
                                                <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-[#5046E5] focus:ring-[#5046E5] accent-[#5046E5]"
                                                        checked={commission.beverageOriginDuringEvaluationEnabled}
                                                        onChange={e => updateCommission(commission.id, 'beverageOriginDuringEvaluationEnabled', e.target.checked)}
                                                    />
                                                    <span>Expose Beverage Origin Metadata</span>
                                                </label>
                                            </div>

                                            {/* Sub-node Replicas Area */}
                                            <div className="pt-2 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Replicas Structure ({commission.replicas.length})</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => addReplica(commission.id)}
                                                        className="text-[11px] font-bold text-[#5046E5] bg-[#EEF2FF] px-2.5 py-1 rounded-lg hover:bg-[#E0E7FF] transition-colors"
                                                    >
                                                        + Add Replica
                                                    </button>
                                                </div>

                                                {commission.replicas.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {commission.replicas.map((replica) => (
                                                            <div key={replica.id} className="flex items-center gap-2 bg-white p-2.5 border border-[#E2E8F0] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                                                                <div className="flex-1 space-y-1">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full text-xs font-bold text-[#1E293B] bg-transparent border-b border-transparent hover:border-[#E2E8F0] focus:border-[#5046E5] focus:outline-none"
                                                                        value={replica.name}
                                                                        onChange={e => updateReplica(commission.id, replica.id, 'name', e.target.value)}
                                                                    />
                                                                    <select
                                                                        className="w-full text-[11px] bg-transparent text-[#64748B] outline-none cursor-pointer"
                                                                        value={replica.type}
                                                                        onChange={e => updateReplica(commission.id, replica.id, 'type', e.target.value as CommissionReplicaType)}
                                                                    >
                                                                        <option value="STANDARD">STANDARD</option>
                                                                        <option value="TRAINEE">TRAINEE</option>
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeReplica(commission.id, replica.id)}
                                                                    className="text-lg text-[#94A3B8] hover:text-red-500 px-1"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* PERSISTENT FORM ACTION BAR */}
                    <div className="col-span-12 flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                        <button
                            type="button"
                            className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8FAFC] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-[#5046E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-all shadow-[0_4px_12px_rgba(80,70,229,0.2)]"
                        >
                            Save Structure
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}