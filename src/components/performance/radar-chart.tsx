"use client";

import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip 
} from 'recharts';
import { type ICPBreakdown } from '@/lib/performance-score';

interface PerformanceRadarProps {
  breakdown: ICPBreakdown;
}

export function PerformanceRadar({ breakdown }: PerformanceRadarProps) {
  const data = [
    { subject: 'Resultado', value: (breakdown.resultado.total / 400) * 100, fullMark: 100 },
    { subject: 'Eficiência', value: (breakdown.eficiencia.total / 400) * 100, fullMark: 100 },
    { subject: 'Execução', value: (breakdown.execucao.total / 200) * 100, fullMark: 100 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 'bold' }} />
          <Radar
            name="Score %"
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.5}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '10px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}