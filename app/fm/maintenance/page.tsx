'use client';

import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {Eye, Edit, Trash2,
  Wrench, Calendar, Clock, AlertTriangle, CheckCircle} from 'lucide-react';

interface MaintenanceTask {
  id: string;
  title: string;
  asset: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue';
  dueDate: string;
  assignedTo: string;
  description: string;
}

export default function MaintenancePage() {
  const { t } = useTranslation();

  const tasks: MaintenanceTask[] = [
    {
      id: 'MT-001',
      title: 'AC Unit Maintenance - Tower A',
      asset: 'AC-001',
      priority: 'Medium',
      status: 'Scheduled',
      dueDate: '2025-10-15',
      assignedTo: 'John Smith',
      description: 'Quarterly maintenance check for AC unit in Tower A lobby'
    },
    {
      id: 'MT-002',
      title: 'Elevator Inspection - Building 1',
      asset: 'ELV-001',
      priority: 'High',
      status: 'In Progress',
      dueDate: '2025-09-25',
      assignedTo: 'Mike Johnson',
      description: 'Annual elevator safety inspection and certification'
    },
    {
      id: 'MT-003',
      title: 'Fire Alarm System Test',
      asset: 'FA-001',
      priority: 'Urgent',
      status: 'Overdue',
      dueDate: '2025-09-20',
      assignedTo: 'Sarah Wilson',
      description: 'Monthly fire alarm system test and battery replacement'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-muted text-foreground border-border';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in progress': return <Clock className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('nav.maintenance', 'Maintenance')}</h1>
        <p className="text-muted-foreground">{t('maintenance.description', 'Manage equipment maintenance schedules and tasks')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--fixzit-primary-lighter)] rounded-2xl">
                <Wrench className="h-6 w-6 text-[var(--fixzit-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground">24</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--fixzit-success-lighter)] rounded-2xl">
                <CheckCircle className="h-6 w-6 text-[var(--fixzit-success)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">18</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--fixzit-accent-lighter)] rounded-2xl">
                <Clock className="h-6 w-6 text-[var(--fixzit-accent)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">4</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--fixzit-danger-lighter)] rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-[var(--fixzit-danger)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t('maintenance.tasks', 'Maintenance Tasks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusIcon(task.status)}
                        <span className="ml-1">{task.status}</span>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{t('maintenance.asset', 'Asset')}:</span>
                        {task.asset}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {t('maintenance.due', 'Due')}: {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{t('maintenance.assigned', 'Assigned to')}:</span>
                        {task.assignedTo}
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm">{task.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common.view', 'View')}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      {t('common.edit', 'Edit')}
                    </Button>
                    <Button variant="outline" size="sm" className="text-[var(--fixzit-danger)] hover:text-[var(--fixzit-danger-dark)]">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete', 'Delete')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

