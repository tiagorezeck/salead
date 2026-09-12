"use client";

export function calculateCPL(totalInvested: number, leadsCount: number): number {
  if (leadsCount <= 0) return 0;
  return totalInvested / leadsCount;
}

export function calculateCAC(totalInvested: number, wonLeadsCount: number): number {
  if (wonLeadsCount <= 0) return 0;
  return totalInvested / wonLeadsCount;
}

export function calculateROI(revenue: number, totalInvested: number): number {
  if (totalInvested <= 0) return 0;
  return ((revenue - totalInvested) / totalInvested) * 100;
}

export function calculateROAS(revenue: number, totalInvested: number): number {
  if (totalInvested <= 0) return 0;
  return revenue / totalInvested;
}