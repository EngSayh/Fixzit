'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, Users, TrendingUp, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  status: string;
  workType: string;
  location?: string;
  employee: {
    user: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    department: string;
  };
}

interface AttendanceTrackerProps {
  orgId: string;
}

export default function AttendanceTracker({ orgId }: AttendanceTrackerProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, [orgId, selectedDate, selectedDepartment]);

  const fetchAttendanceData = async () => {
    try {
      const params = new URLSearchParams({
        orgId,
        startDate: selectedDate,
        endDate: selectedDate,
        ...(selectedDepartment && { department: selectedDepartment })
      });

      const response = await fetch(`/api/hr/attendance?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAttendanceRecords(data.attendanceRecords);
        setStatistics(data.statistics);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (employeeId: string, location?: string) => {
    try {
      const now = new Date();
      const response = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: selectedDate,
          checkIn: now.toTimeString().slice(0, 5),
          location,
          workType: 'OFFICE'
        })
      });

      if (response.ok) {
        fetchAttendanceData();
        setShowCheckInModal(false);
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'ABSENT':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attendance Tracker</h2>
            <p className="text-gray-600">{getTodayDate()}</p>
          </div>
          <div className="flex space-x-4">
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button 
              onClick={() => setShowCheckInModal(true)}
              className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors"
            >
              Quick Check-In
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Present</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.presentDays || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Total Hours</p>
                <p className="text-2xl font-bold text-green-900">{Math.round(statistics.totalHours || 0)}h</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Average Hours</p>
                <p className="text-2xl font-bold text-yellow-900">{Math.round(statistics.averageHours || 0)}h</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-600">Late Arrivals</p>
                <p className="text-2xl font-bold text-red-900">{statistics.lateDays || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Daily Attendance Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map(record => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#0061A8] rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {record.employee.user.avatar ? (
                          <img 
                            src={record.employee.user.avatar} 
                            alt={`${record.employee.user.firstName} ${record.employee.user.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          `${record.employee.user.firstName[0]}${record.employee.user.lastName[0]}`
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {record.employee.user.firstName} {record.employee.user.lastName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.employee.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(record.checkIn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(record.checkOut)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(record.status)}
                      <span className="ml-2 text-sm text-gray-900">{record.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      {record.location || 'Office'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendanceRecords.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
            <p className="text-gray-500">No attendance data found for the selected date and filters.</p>
          </div>
        )}
      </div>

      {/* Department Summary */}
      {Object.keys(summary.departmentBreakdown || {}).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(summary.departmentBreakdown).map(([dept, data]: [string, any]) => (
              <div key={dept} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{dept}</h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">Present: {data.total}</p>
                  <p className="text-sm text-gray-600">Total Hours: {Math.round(data.hours)}h</p>
                  <p className="text-sm text-gray-600">Avg Hours: {Math.round(data.hours / data.total || 0)}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}