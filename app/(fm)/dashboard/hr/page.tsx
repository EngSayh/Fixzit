"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, BookUser, CalendarOff, Wallet, UserPlus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";

interface HRCounters {
  employees: { total: number; active: number; on_leave: number };
  attendance: { present: number; absent: number; late: number };
}

export default function HRDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.hr");
  const [activeTab, setActiveTab] = useState("modules");
  const [counters, setCounters] = useState<HRCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!orgId) {
      setCounters(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const data = await fetchOrgCounters(orgId, { signal: controller.signal });
        const employees =
          (data.employees as Partial<HRCounters["employees"]>) ?? {};
        const attendance =
          (data.attendance as Partial<HRCounters["attendance"]>) ?? {};
        setCounters({
          employees: {
            total: employees.total ?? 0,
            active: employees.active ?? 0,
            on_leave: employees.on_leave ?? 0,
          },
          attendance: {
            present: attendance.present ?? 0,
            absent: attendance.absent ?? 0,
            late: attendance.late ?? 0,
          },
        });
        setLoading(false);
      } catch (error) {
        logger.error("Failed to load HR data:", error as Error);
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [auto, orgId, status]);

  const tabs = [
    { id: "modules", label: auto("Modules", "tabs.modules") },
    {
      id: "metrics",
      label: auto("Metrics", "tabs.metrics"),
      count: counters?.employees.total,
    },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Employees", "modules.employees"),
      description: auto("Employee management", "modules.employeesDesc"),
      href: "/fm/hr/employees",
      icon: Users,
      iconColor: "text-primary",
      metric: loading ? "..." : counters?.employees.total || 0,
      metricLabel: auto("Total", "metrics.total"),
    },
    {
      title: auto("Directory", "modules.directory"),
      description: auto("Employee directory", "modules.directoryDesc"),
      href: "/fm/hr/directory",
      icon: BookUser,
      iconColor: "text-blue-500",
    },
    {
      title: auto("Leave", "modules.leave"),
      description: auto("Leave management", "modules.leaveDesc"),
      href: "/fm/hr/leave",
      icon: CalendarOff,
      iconColor: "text-orange-500",
      metric: loading ? "..." : counters?.employees.on_leave || 0,
      metricLabel: auto("On Leave", "metrics.onLeave"),
    },
    {
      title: auto("Payroll", "modules.payroll"),
      description: auto("Payroll processing", "modules.payrollDesc"),
      href: "/fm/hr/payroll",
      icon: Wallet,
      iconColor: "text-success",
    },
    {
      title: auto("Recruitment", "modules.recruitment"),
      description: auto("Hiring and recruitment", "modules.recruitmentDesc"),
      href: "/fm/hr/recruitment",
      icon: UserPlus,
      iconColor: "text-purple-500",
    },
  ];

  const plannedFeatures = ["Training", "Performance Reviews"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Human Resources", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto("Manage employees, attendance, and payroll", "header.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => (
          <button type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ms-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "modules" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <HubNavigationCard key={module.href} {...module} />
            ))}
          </div>
          <RoadmapBanner features={plannedFeatures} variant="subtle" />
        </div>
      )}

      {activeTab === "metrics" && (
        <div className="space-y-6">
          <h3 className="font-semibold text-foreground">
            {auto("Employees", "metrics.employeesHeading")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {auto("Total Employees", "metrics.total")}
                </CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : counters?.employees.total || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {auto("Active", "metrics.active")}
                </CardTitle>
                <UserCheck className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {loading ? "..." : counters?.employees.active || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {auto("On Leave", "metrics.onLeave")}
                </CardTitle>
                <UserX className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {loading ? "..." : counters?.employees.on_leave || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <h3 className="font-semibold text-foreground">
            {auto("Attendance Today", "metrics.attendanceHeading")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {auto("Present", "attendance.present")}
                </CardTitle>
                <UserCheck className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {loading ? "..." : counters?.attendance.present || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {auto("Absent", "attendance.absent")}
                </CardTitle>
                <UserX className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {loading ? "..." : counters?.attendance.absent || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {auto("Late", "attendance.late")}
                </CardTitle>
                <UserX className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {loading ? "..." : counters?.attendance.late || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
