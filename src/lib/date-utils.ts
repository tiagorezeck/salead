import { 
  addMonths, addYears, differenceInCalendarMonths, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, startOfWeek, endOfWeek, subDays, addDays, startOfDay, endOfDay, format,
  differenceInCalendarDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodType = 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'last30' | 'last12' | 'all' | 'custom';

export function getPreviousPeriodRange(
  startDate: Date | null,
  endDate: Date | null,
  type: 'month' | 'year'
): { prevStartDate: Date | null; prevEndDate: Date | null } {
  if (!startDate || !endDate) {
    return { prevStartDate: null, prevEndDate: null };
  }

  if (type === 'year') {
    const prevYearStart = addYears(startDate, -1);
    const prevYearEnd = addYears(endDate, -1);
    return { prevStartDate: prevYearStart, prevEndDate: prevYearEnd };
  } else {
    const durationInMonths = differenceInCalendarMonths(endDate, startDate) + 1;
    const prevStartDate = addMonths(startDate, -durationInMonths);
    const prevEndDate = addMonths(endDate, -durationInMonths);
    return { prevStartDate, prevEndDate };
  }
}

export function getPeriodLabel(startDate: Date | null, endDate: Date | null): string {
  if (!startDate || !endDate) return 'Período Atual';

  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();

  if (startOfDay(startDate).getTime() === startOfDay(endDate).getTime()) {
    return format(startDate, 'dd/MM/yyyy', { locale: ptBR });
  }

  if (startYear === endYear && startMonth === endMonth) {
    const label = format(startDate, 'MMMM yyyy', { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } 
  
  if (startYear === endYear && startMonth === 0 && endMonth === 11 && 
      startOfDay(startDate).getTime() === startOfYear(startDate).getTime() && 
      endOfDay(endDate).getTime() === endOfYear(endDate).getTime()) {
    return `${startYear}`;
  } 
  
  if (startYear === endYear) {
    return `${format(startDate, 'dd/MM', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
  } else {
    return `${format(startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yy', { locale: ptBR })}`;
  }
}

export function shiftPeriod(
  startDate: Date,
  endDate: Date,
  direction: 'prev' | 'next',
  periodType: PeriodType
): { newStartDate: Date; newEndDate: Date } {
  const multiplier = direction === 'prev' ? -1 : 1;

  if (periodType === 'today') {
    const newDate = addDays(startDate, multiplier);
    return { newStartDate: startOfDay(newDate), newEndDate: endOfDay(newDate) };
  }

  if (periodType === 'thisWeek') {
    const newDate = addDays(startDate, 7 * multiplier);
    return { newStartDate: startOfWeek(newDate, { locale: ptBR }), newEndDate: endOfWeek(newDate, { locale: ptBR }) };
  }

  if (periodType === 'thisMonth') {
    const newDate = addMonths(startDate, multiplier);
    return { newStartDate: startOfMonth(newDate), newEndDate: endOfMonth(newDate) };
  }

  if (periodType === 'thisYear') {
    const newDate = addYears(startDate, multiplier);
    return { newStartDate: startOfYear(newDate), newEndDate: endOfYear(newDate) };
  }

  const durationInDays = differenceInCalendarDays(endDate, startDate) + 1;
  const shiftDays = durationInDays * multiplier;
  
  return { 
    newStartDate: startOfDay(addDays(startDate, shiftDays)), 
    newEndDate: endOfDay(addDays(endDate, shiftDays)) 
  };
}

export function getQuickRange(type: PeriodType, allRecords: any[] = []): { startDate: Date; endDate: Date } | null {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (type) {
        case 'today':
            startDate = startOfDay(now);
            endDate = endOfDay(now);
            break;
        case 'thisWeek':
            startDate = startOfWeek(now, { locale: ptBR });
            endDate = endOfWeek(now, { locale: ptBR });
            break;
        case 'thisMonth':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
        case 'thisYear':
            startDate = startOfYear(now);
            endDate = endOfYear(now);
            break;
        case 'last30':
            endDate = endOfDay(now);
            startDate = startOfDay(subDays(now, 29));
            break;
        case 'last12':
            endDate = endOfMonth(now);
            startDate = startOfMonth(addMonths(now, -11));
            break;
        case 'all':
            startDate = new Date(2020, 0, 1);
            endDate = endOfDay(now);
            break;
        default:
            return null;
    }
    return { startDate, endDate };
}