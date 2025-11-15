'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';

interface EmployeeOption {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'OFF';

interface AttendanceEntry {
  _id: string;
  date: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  overtimeMinutes?: number;
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      void fetchAttendance();
    }
  }, [selectedEmployee, dateRange.from, dateRange.to]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees?limit=200');
      if (response.ok) {
        const data = await response.json();
        const mapped = (data.employees || []).map((employee: any) => ({
          _id: employee._id,
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
        }));
        setEmployees(mapped);
        if (mapped.length > 0) {
          setSelectedEmployee(mapped[0]._id);
        }
      }
    } catch (error) {
      logger.error('Error fetching employee options:', error);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployee,
        from: dateRange.from,
        to: dateRange.to,
      });
      const response = await fetch(`/api/hr/attendance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      logger.error('Error loading attendance entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployeeObj = employees.find((emp) => emp._id === selectedEmployee);

  const formatStatus = (status: AttendanceStatus) =>
    t(`hr.attendance.status.${status.toLowerCase()}`, status.replace('_', ' '));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('hr.attendance.title', 'Attendance & Time Tracking')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('hr.attendance.subtitle', 'Review daily attendance and overtime records')}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              {t('hr.attendance.selectEmployee', 'Select Employee')}
            </p>
            <Select value={selectedEmployee} onValueChange={(value) => setSelectedEmployee(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('hr.attendance.selectPlaceholder', 'Choose employee')} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee._id} value={employee._id}>
                    {employee.employeeCode} — {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 flex-1">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t('hr.attendance.from', 'From')}
              </p>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t('hr.attendance.to', 'To')}
              </p>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">{t('hr.attendance.table.date', 'Date')}</th>
                  <th className="px-4 py-3 text-left">{t('hr.attendance.table.status', 'Status')}</th>
                  <th className="px-4 py-3 text-left">{t('hr.attendance.table.clockIn', 'Clock-in')}</th>
                  <th className="px-4 py-3 text-left">{t('hr.attendance.table.clockOut', 'Clock-out')}</th>
                  <th className="px-4 py-3 text-left">{t('hr.attendance.table.overtime', 'Overtime')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      {t('common.loading', 'Loading...')}
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      {t('hr.attendance.empty', 'No attendance records for this range')}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry._id} className="border-b border-border/60">
                      <td className="px-4 py-3 font-medium">
                        <ClientDate date={entry.date} format="date-only" />
                      </td>
                      <td className="px-4 py-3 capitalize">{formatStatus(entry.status)}</td>
                      <td className="px-4 py-3">
                        {entry.clockIn ? <ClientDate date={entry.clockIn} format="time-only" /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {entry.clockOut ? <ClientDate date={entry.clockOut} format="time-only" /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {entry.overtimeMinutes ? `${entry.overtimeMinutes} ${t('hr.attendance.minutes', 'min')}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
