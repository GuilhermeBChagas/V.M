
import React, { useMemo } from 'react';
import { Incident, Building, Sector } from '../types';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import {
    FileText, Activity, MapPin, AlertTriangle, TrendingUp, CheckCircle, Clock, ArrowLeft
} from 'lucide-react';
import { getTodayLocalDate } from '../utils/dateUtils';

interface ChartsViewProps {
    incidents: Incident[];
    buildings: Building[];
    sectors: Sector[];
    onBack?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const ChartsView: React.FC<ChartsViewProps> = ({ incidents, buildings, sectors, onBack }) => {

    // Filtra ocorrências válidas (exclui canceladas)
    const activeIncidents = useMemo(() => incidents.filter(i => i.status !== 'CANCELLED'), [incidents]);

    // --- DADOS PARA OS GRÁFICOS ---

    // 1. Dados por Setor (Top 5)
    const sectorData = useMemo(() => {
        const data = sectors.map(sector => {
            const sectorBuildingIds = buildings.filter(b => b.sectorId === sector.id).map(b => b.id);
            const count = activeIncidents.filter(i => sectorBuildingIds.includes(i.buildingId)).length;
            return { name: sector.name, value: count };
        })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Apenas top 5
        return data;
    }, [sectors, buildings, activeIncidents]);

    // 2. Dados por Tipo de Alteração (Top 7)
    const typeData = useMemo(() => {
        const counts: Record<string, number> = {};
        activeIncidents.forEach(i => {
            const type = i.alterationType || 'Não Classificado';
            counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
    }, [activeIncidents]);

    // 3. Tendência nos últimos 7 dias
    const trendData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            const count = activeIncidents.filter(inc => inc.date === dateStr).length;
            data.push({ name: label, value: count });
        }
        return data;
    }, [activeIncidents]);

    // 4. Status Geral
    const statusData = useMemo(() => {
        const approved = incidents.filter(i => i.status === 'APPROVED').length;
        const pending = incidents.filter(i => i.status === 'PENDING').length;
        return [
            { name: 'Validados', value: approved, color: '#10b981' },
            { name: 'Pendentes', value: pending, color: '#f59e0b' }
        ].filter(d => d.value > 0);
    }, [incidents]);

    // --- KPIs ---
    const totalIncidents = activeIncidents.length;
    const pendingCount = incidents.filter(i => i.status === 'PENDING').length;
    const topSector = sectorData.length > 0 ? sectorData[0].name : '---';
    const incidentsToday = activeIncidents.filter(i => i.date === getTodayLocalDate()).length;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl ring-1 ring-black/5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-700 pb-1">{label}</p>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || entry.fill }}></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[80px] md:max-w-none">{entry.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                    {entry.value} {entry.unit || ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    // --- NOVOS DADOS MENSAIS ---

    const monthsLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Auxiliar para pegar o mês (0-11) de uma data YYYY-MM-DD
    const getMonthIndex = (dateStr: string) => {
        const parts = dateStr.split('-');
        return parseInt(parts[1]) - 1;
    };

    // 5. Evolução de Horas PB (Mensal)
    const pbHoursMonthlyData = useMemo(() => {
        const monthlyHours = new Array(12).fill(0);

        activeIncidents.forEach(inc => {
            if (inc.alterationType.toUpperCase().includes('PB')) {
                const [hS, mS] = inc.startTime.split(':').map(Number);
                const [hE, mE] = inc.endTime.split(':').map(Number);
                let startMin = hS * 60 + (mS || 0);
                let endMin = hE * 60 + (mE || 0);
                if (endMin < startMin) endMin += 1440;
                const hours = (endMin - startMin) / 60;

                const mIdx = getMonthIndex(inc.date);
                if (mIdx >= 0 && mIdx < 12) {
                    monthlyHours[mIdx] += hours;
                }
            }
        });

        return monthsLabels.map((name, i) => ({
            name,
            horas: parseFloat(monthlyHours[i].toFixed(1))
        }));
    }, [activeIncidents]);

    // 6. Vistorias Prediais por Setor (Mensal)
    const inspectionsMonthlyData = useMemo(() => {
        const data: any[] = monthsLabels.map(name => ({ name }));
        const sectorNames = sectors.map(s => s.name);

        activeIncidents.forEach(inc => {
            if (inc.alterationType.toUpperCase().includes('VISTORIA')) {
                const mIdx = getMonthIndex(inc.date);
                const building = buildings.find(b => b.id === inc.buildingId);
                const sector = sectors.find(s => s.id === building?.sectorId);

                if (mIdx >= 0 && mIdx < 12 && sector) {
                    data[mIdx][sector.name] = (data[mIdx][sector.name] || 0) + 1;
                }
            }
        });

        return data;
    }, [activeIncidents, sectors, buildings]);

    // 7. Volume de Atendimentos por Setor (Mensal)
    const incidentsMonthlyData = useMemo(() => {
        const data: any[] = monthsLabels.map(name => ({ name }));

        activeIncidents.forEach(inc => {
            const mIdx = getMonthIndex(inc.date);
            const building = buildings.find(b => b.id === inc.buildingId);
            const sector = sectors.find(s => s.id === building?.sectorId);

            if (mIdx >= 0 && mIdx < 12 && sector) {
                data[mIdx][sector.name] = (data[mIdx][sector.name] || 0) + 1;
            }
        });

        return data;
    }, [activeIncidents, sectors, buildings]);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {onBack && (
                <div className="flex px-1 no-print">
                    <button type="button" onClick={onBack} className="btn-back">
                        <ArrowLeft size={18} />
                        <span>VOLTAR</span>
                    </button>
                </div>
            )}

            {/* Unified Header Section */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <Activity size={22} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                            Painel Estatístico
                        </h2>
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Análise de dados operacionais e indicadores
                        </p>
                    </div>
                </div>
            </div>


            {/* ROW 2: TIPOS E SETORES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Barras (Tipos) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 flex items-center gap-2">
                        <Activity size={16} className="text-purple-500" /> Atendimentos por Tipo
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={typeData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={120}
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    {typeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Barras (Setores) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 flex items-center gap-2">
                        <MapPin size={16} className="text-amber-500" /> Top 5 Setores
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sectorData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ROW 3: EVOLUÇÃO MENSAL PB */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                            <Clock size={16} className="text-blue-500" /> Evolução Mensal de Horas PB
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total de Horas</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={pbHoursMonthlyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPB" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    interval={window.innerWidth < 640 ? 1 : 0}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="horas"
                                    name="Horas"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPB)"
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ROW 4: VISTORIAS E ATENDIMENTOS POR SETOR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vistorias por Setor */}
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 md:mb-8 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-500" /> Vistorias Prediais por Setor (Mensal)
                    </h3>
                    <div className="h-[300px] md:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inspectionsMonthlyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    interval={window.innerWidth < 640 ? 1 : 0}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="top"
                                    height={window.innerWidth < 640 ? 48 : 36}
                                    iconType="circle"
                                    wrapperStyle={{
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        paddingBottom: window.innerWidth < 640 ? '10px' : '20px',
                                        overflow: 'hidden'
                                    }}
                                    layout={window.innerWidth < 640 ? 'horizontal' : 'horizontal'}
                                />
                                {sectors.map((sector, index) => (
                                    <Bar
                                        key={sector.id}
                                        dataKey={sector.name}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                        radius={0}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Atendimentos por Setor */}
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase mb-6 md:mb-8 flex items-center gap-2">
                        <Activity size={16} className="text-purple-500" /> Atendimentos por Setor (Mensal)
                    </h3>
                    <div className="h-[300px] md:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incidentsMonthlyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    interval={window.innerWidth < 640 ? 1 : 0}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="top"
                                    height={window.innerWidth < 640 ? 48 : 36}
                                    iconType="circle"
                                    wrapperStyle={{
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        paddingBottom: window.innerWidth < 640 ? '10px' : '20px'
                                    }}
                                />
                                {sectors.map((sector, index) => (
                                    <Bar
                                        key={sector.id}
                                        dataKey={sector.name}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                        radius={0}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
