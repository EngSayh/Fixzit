'use client';

import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/src/components/ui/tabs&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2,
  Wrench, Calendar, Clock, AlertTriangle, CheckCircle, XCircle
} from &apos;lucide-react&apos;;

interface MaintenanceTask {
  id: string;
  title: string;
  asset: string;
  priority: &apos;Low&apos; | &apos;Medium&apos; | &apos;High&apos; | &apos;Urgent&apos;;
  status: &apos;Scheduled&apos; | &apos;In Progress&apos; | &apos;Completed&apos; | &apos;Overdue&apos;;
  dueDate: string;
  assignedTo: string;
  description: string;
}

export default function MaintenancePage() {
  const { t } = useTranslation();

  const tasks: MaintenanceTask[] = [
    {
      id: &apos;MT-001&apos;,
      title: &apos;AC Unit Maintenance - Tower A&apos;,
      asset: &apos;AC-001&apos;,
      priority: &apos;Medium&apos;,
      status: &apos;Scheduled&apos;,
      dueDate: &apos;2025-10-15&apos;,
      assignedTo: &apos;John Smith&apos;,
      description: &apos;Quarterly maintenance check for AC unit in Tower A lobby&apos;
    },
    {
      id: &apos;MT-002&apos;,
      title: &apos;Elevator Inspection - Building 1&apos;,
      asset: &apos;ELV-001&apos;,
      priority: &apos;High&apos;,
      status: &apos;In Progress&apos;,
      dueDate: &apos;2025-09-25&apos;,
      assignedTo: &apos;Mike Johnson&apos;,
      description: &apos;Annual elevator safety inspection and certification&apos;
    },
    {
      id: &apos;MT-003&apos;,
      title: &apos;Fire Alarm System Test&apos;,
      asset: &apos;FA-001&apos;,
      priority: &apos;Urgent&apos;,
      status: &apos;Overdue&apos;,
      dueDate: &apos;2025-09-20&apos;,
      assignedTo: &apos;Sarah Wilson&apos;,
      description: &apos;Monthly fire alarm system test and battery replacement&apos;
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case &apos;urgent&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;high&apos;: return &apos;bg-orange-100 text-orange-800 border-orange-200&apos;;
      case &apos;medium&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;low&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case &apos;completed&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;in progress&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case 'scheduled&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      case &apos;overdue&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case &apos;completed&apos;: return <CheckCircle className="h-4 w-4" />;
      case 'in progress&apos;: return <Clock className="h-4 w-4" />;
      case 'scheduled&apos;: return <Calendar className="h-4 w-4" />;
      case 'overdue&apos;: return <AlertTriangle className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('nav.maintenance&apos;, &apos;Maintenance&apos;)}</h1>
        <p className="text-gray-600">{t('maintenance.description&apos;, &apos;Manage equipment maintenance schedules and tasks&apos;)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">18</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">4</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
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
            {t('maintenance.tasks&apos;, &apos;Maintenance Tasks&apos;)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusIcon(task.status)}
                        <span className="ml-1">{task.status}</span>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">{t('maintenance.asset&apos;, &apos;Asset&apos;)}:</span>
                        {task.asset}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {t('maintenance.due&apos;, &apos;Due&apos;)}: {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">{t('maintenance.assigned&apos;, &apos;Assigned to&apos;)}:</span>
                        {task.assignedTo}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm">{task.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common.view&apos;, &apos;View&apos;)}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      {t('common.edit&apos;, &apos;Edit&apos;)}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t(&apos;common.delete&apos;, &apos;Delete&apos;)}
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
