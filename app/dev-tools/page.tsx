'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { seedCompetitionScenarioAction, getCompetitionsListAction, SeederFormData, CommissionConfig } from './actions';
import { Loader2, Plus, Terminal, Trash2, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

export default function DevToolsPage() {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Default commission to be added
  const defaultCommission: CommissionConfig = {
    name: 'Нова комісія',
    type: 'NOT_STARTED',
    panels: [{ name: 'Панель 1', winesCount: 5 }],
    replicas: [
      { name: 'Репліка 1', expertsCount: 3 },
      { name: 'Репліка 2', expertsCount: 3 }
    ],
    evaluatedWinesCount: 0
  };

  // Form State
  const [formData, setFormData] = useState<SeederFormData>({
    competitionName: 'TEST 1',
    seriesName: 'Червоне вино 2026',
    commissions: [
      { 
        name: 'Комісія 1', type: 'NOT_STARTED', 
        panels: [{ name: 'Панель 1', winesCount: 5 }],
        replicas: [{ name: 'Репліка 1', expertsCount: 3 }, { name: 'Репліка 2', expertsCount: 3 }]
      },
      { 
        name: 'Комісія 2', type: 'IN_PROGRESS', evaluatedWinesCount: 2,
        panels: [{ name: 'Панель 1', winesCount: 5 }],
        replicas: [{ name: 'Репліка 1', expertsCount: 3 }, { name: 'Репліка 2', expertsCount: 3 }]
      },
      { 
        name: 'Комісія 3', type: 'FINISHED',
        panels: [{ name: 'Панель 1', winesCount: 5 }],
        replicas: [{ name: 'Репліка 1', expertsCount: 3 }, { name: 'Репліка 2', expertsCount: 3 }]
      }
    ]
  });

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [existingCompetitions, setExistingCompetitions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchCompetitions = async () => {
    setLoadingList(true);
    try {
      const res = await getCompetitionsListAction();
      if (res.success && res.data) {
        setExistingCompetitions(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    // Reset AUID to the default tester account (ID 2) when visiting dev-tools
    document.cookie = 'auid=2; path=/';
    fetchCompetitions();
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setLogs([]);

    try {
      const response = await fetch('/api/dev-tools/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            if (line.startsWith('__DONE__')) {
              // Generation completed successfully
              continue;
            } else if (line.startsWith('__ERROR__')) {
              // Next line contains error JSON if we want to parse it, but we can just ignore for logs
              continue;
            } else if (line.startsWith('{"error":')) {
                // Ignore raw error json string
                continue;
            } else if (line.startsWith('{"success":')) {
                // Ignore raw success json string
                continue;
            } else {
              setLogs((prev) => [...prev, line]);
            }
          }
        }
      }
    } catch (e: any) {
      addLog(`[${new Date().toLocaleTimeString()}] ❌ Критична помилка: ${e.message}`);
    } finally {
      setLoading(false);
      setIsFormOpen(false); // Collapse form after success
      fetchCompetitions(); // Refresh the list
    }
  };

  const handleLoginAs = (auid: number, commissionId?: string, replicaId?: string) => {
    document.cookie = `auid=${auid}; path=/`;
    document.cookie = `actor=${auid}; path=/`;
    
    if (commissionId) {
      // Append replicaId if available
        router.push(`/commission/${commissionId}`);
    } else {
      alert(`Ви успішно увійшли як експерт з AUID ${auid}.`);
    }
  };

  const updateCommission = (idx: number, updates: Partial<CommissionConfig>) => {
    const newCommissions = [...formData.commissions];
    newCommissions[idx] = { ...newCommissions[idx], ...updates };
    setFormData({ ...formData, commissions: newCommissions });
  };

  const addCommission = () => {
    setFormData({
      ...formData,
      commissions: [...formData.commissions, { ...defaultCommission, name: `Комісія ${formData.commissions.length + 1}` }]
    });
  };

  const removeCommission = (idx: number) => {
    const newCommissions = formData.commissions.filter((_, i) => i !== idx);
    setFormData({ ...formData, commissions: newCommissions });
  };

  const updatePanel = (cIdx: number, pIdx: number, updates: Partial<PanelConfig>) => {
    const comms = [...formData.commissions];
    const panels = [...comms[cIdx].panels];
    panels[pIdx] = { ...panels[pIdx], ...updates };
    comms[cIdx] = { ...comms[cIdx], panels };
    setFormData({ ...formData, commissions: comms });
  };

  const addPanel = (cIdx: number) => {
    const comms = [...formData.commissions];
    comms[cIdx].panels.push({ name: `Панель ${comms[cIdx].panels.length + 1}`, winesCount: 5 });
    setFormData({ ...formData, commissions: comms });
  };

  const removePanel = (cIdx: number, pIdx: number) => {
    const comms = [...formData.commissions];
    comms[cIdx].panels = comms[cIdx].panels.filter((_, i) => i !== pIdx);
    setFormData({ ...formData, commissions: comms });
  };

  const updateReplica = (cIdx: number, rIdx: number, updates: Partial<ReplicaConfig>) => {
    const comms = [...formData.commissions];
    const replicas = [...comms[cIdx].replicas];
    replicas[rIdx] = { ...replicas[rIdx], ...updates };
    comms[cIdx] = { ...comms[cIdx], replicas };
    setFormData({ ...formData, commissions: comms });
  };

  const addReplica = (cIdx: number) => {
    const comms = [...formData.commissions];
    comms[cIdx].replicas.push({ name: `Репліка ${comms[cIdx].replicas.length + 1}`, expertsCount: 3 });
    setFormData({ ...formData, commissions: comms });
  };

  const removeReplica = (cIdx: number, rIdx: number) => {
    const comms = [...formData.commissions];
    comms[cIdx].replicas = comms[cIdx].replicas.filter((_, i) => i !== rIdx);
    setFormData({ ...formData, commissions: comms });
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form & Results */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Data Seeder</h1>
                <p className="text-gray-500 mt-1">Інтерактивний генератор тестових сценаріїв</p>
              </div>
            </div>

          {!isFormOpen && (
            <div className="flex justify-center items-center h-64 border-2 border-dashed border-gray-300 rounded-xl bg-white transition-all duration-300">
              <Button 
                onClick={() => setIsFormOpen(true)}
                size="lg"
                className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="mr-2 h-6 w-6" /> Додати змагання
              </Button>
            </div>
          )}

          {isFormOpen && (
            <Card className="bg-white shadow-sm border-gray-200 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
              <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                <CardTitle className="text-xl">Конфігурація Змагання</CardTitle>
                <CardDescription>Заповніть параметри для генерації тестового оточення</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {/* Competition Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Назва змагання</label>
                    <Input 
                      value={formData.competitionName}
                      onChange={e => setFormData({...formData, competitionName: e.target.value})}
                      placeholder="напр. TEST 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Назва серії</label>
                    <Input 
                      value={formData.seriesName}
                      onChange={e => setFormData({...formData, seriesName: e.target.value})}
                      placeholder="напр. Червоне вино 2026"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-medium">Комісії</h3>
                    <Button variant="outline" size="sm" onClick={addCommission}>
                      <Plus className="h-4 w-4 mr-2" /> Додати комісію
                    </Button>
                  </div>
                  
                  {formData.commissions.map((comm, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${comm.type === 'NOT_STARTED' ? 'bg-gray-50 border-gray-200' : comm.type === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} transition-all`}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center flex-1 gap-4">
                          <span className={`w-2 h-2 rounded-full ${comm.type === 'NOT_STARTED' ? 'bg-gray-400' : comm.type === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
                          <Input 
                            value={comm.name} 
                            onChange={e => updateCommission(idx, { name: e.target.value })} 
                            className="h-8 max-w-[200px] font-medium"
                          />
                          <Select 
                            value={comm.type} 
                            onValueChange={(val: any) => updateCommission(idx, { type: val })}
                          >
                            <SelectTrigger className="w-[180px] h-8 bg-white">
                              <SelectValue placeholder="Оберіть статус" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOT_STARTED">Не розпочата</SelectItem>
                              <SelectItem value="IN_PROGRESS">В процесі</SelectItem>
                              <SelectItem value="FINISHED">Завершена</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0" onClick={() => removeCommission(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-col gap-4 mt-4">
                        <div className="flex gap-4 p-3 bg-white rounded-md border items-center">
                          <span className="text-sm font-semibold text-gray-700">Всього Вин (m):</span>
                          <span className="text-lg font-bold">{comm.panels.reduce((sum, p) => sum + p.winesCount, 0)}</span>
                          {comm.type === 'IN_PROGRESS' && (
                            <div className="ml-auto flex items-center gap-2">
                              <label className="text-xs font-bold text-blue-700">Оцінено (k)</label>
                              <Input type="number" value={comm.evaluatedWinesCount} onChange={e => updateCommission(idx, { evaluatedWinesCount: Number(e.target.value) })} className="w-24 bg-white border-blue-400" />
                            </div>
                          )}
                        </div>

                        {/* Panels */}
                        <div className="border rounded-md p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold">Панелі (Розподіл вин)</h4>
                            <Button variant="outline" size="sm" onClick={() => addPanel(idx)}>
                              <Plus className="h-4 w-4 mr-1" /> Додати панель
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {comm.panels.map((panel, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-3 bg-white p-3 rounded border">
                                <Input value={panel.name} onChange={e => updatePanel(idx, pIdx, { name: e.target.value })} className="max-w-[150px] h-8 text-sm font-medium" />
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-600">Кількість вин:</label>
                                  <Input type="number" value={panel.winesCount} onChange={e => updatePanel(idx, pIdx, { winesCount: Number(e.target.value) })} className="w-20 h-8" />
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0 ml-auto" onClick={() => removePanel(idx, pIdx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Replicas */}
                        <div className="border rounded-md p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold">Репліки</h4>
                            <Button variant="outline" size="sm" onClick={() => addReplica(idx)}>
                              <Plus className="h-4 w-4 mr-1" /> Додати репліку
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {comm.replicas.map((replica, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-3 bg-white p-3 rounded border">
                                <Input value={replica.name} onChange={e => updateReplica(idx, rIdx, { name: e.target.value })} className="max-w-[150px] h-8 text-sm font-medium" />
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-600">Експертів (n):</label>
                                  <Input type="number" value={replica.expertsCount} onChange={e => updateReplica(idx, rIdx, { expertsCount: Number(e.target.value) })} className="w-20 h-8" />
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0 ml-auto" onClick={() => removeReplica(idx, rIdx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formData.commissions.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      Немає комісій. Додайте хоча б одну.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" className="mr-4" onClick={() => setIsFormOpen(false)}>Скасувати</Button>
                  <Button onClick={handleGenerate} disabled={loading || formData.commissions.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Згенерувати'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}


          {!isFormOpen && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center text-gray-700 font-medium mb-4">
                <Database className="w-5 h-5 mr-2" /> Існуючі змагання
              </div>
              {loadingList ? (
                <div className="text-gray-500 text-sm">Завантаження...</div>
              ) : (
                <Accordion type="single" collapsible className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
                  {existingCompetitions.map((comp) => (
                    <AccordionItem key={comp.id} value={comp.id} className="border-b last:border-b-0 px-4">
                      <AccordionTrigger className="text-left font-semibold hover:no-underline">
                        {comp.name || `Competition ${comp.id.substring(0, 8)}`} <span className="text-xs text-gray-400 font-mono ml-2">#{comp.id.split('-')[0]}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-6 space-y-6">
                        {comp.commissions?.map((comm: any) => (
                          <div key={comm.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                            <h4 className="font-medium text-gray-800 mb-4">{comm.name || 'Комісія'}</h4>
                            <div className="space-y-4">
                              {[...(comm.replicas || [])].sort((a: any, b: any) => (a.members?.length || 0) - (b.members?.length || 0)).map((replica: any) => (
                                <div key={replica.id} className="bg-white border border-gray-200 rounded p-3">
                                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    {replica.name || `Репліка: ${replica.type || 'STANDARD'}`}
                                  </div>
                                  <div className="space-y-2 divide-y divide-gray-100">
                                    {[...(replica.members || [])].sort((a: any, b: any) => (a.role === 'HEAD' ? -1 : (b.role === 'HEAD' ? 1 : 0))).map((member: any) => (
                                      <div key={member.id} className="flex items-center justify-between pt-2 first:pt-0">
                                        <div>
                                          <div className="font-medium text-sm text-gray-800">
                                            {member.role === 'HEAD' ? '👑 Голова' : 'Експерт'}
                                          </div>
                                          <div className="text-xs text-gray-500 font-mono">AUID: {member.auid}</div>
                                        </div>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleLoginAs(member.auid, comm.id, replica.id)}
                                          className="h-8 text-xs"
                                        >
                                          Увійти як...
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="lg:col-span-1">
          <Card className="bg-[#1e1e1e] border-gray-800 text-gray-300 h-[calc(100vh-64px)] flex flex-col shadow-xl sticky top-8">
            <CardHeader className="border-b border-gray-800 bg-[#252526] py-3">
              <CardTitle className="text-sm font-mono flex items-center text-gray-400">
                <Terminal className="w-4 h-4 mr-2" />
                terminal // seeder-logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative">
              <ScrollArea className="h-full w-full">
                <div className="p-4 font-mono text-xs space-y-1.5">
                  {logs.length === 0 ? (
                    <div className="text-gray-600 italic">Waiting for generator task...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`break-words whitespace-pre-wrap ${log.includes('❌') ? 'text-red-400' : log.includes('✅') || log.includes('🎉') ? 'text-green-400' : 'text-gray-300'}`}>
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}
