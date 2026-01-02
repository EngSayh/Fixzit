"use client";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardGridSkeleton } from "@/components/skeletons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useEffect } from "react";
import { DEFAULT_CURRENCY } from "@/config/currencies";

type BudgetData = {
  id?: string;
  name: string;
  department: string;
  allocated: number;
  spent?: number;
  currency: string;
};

export default function BudgetsPage() {
  const auto = useAutoTranslator("fm.finance.budgets");
  const { data: session } = useSession();
  const { hasOrgContext, guard, supportOrg, orgId } = useFmOrgGuard({
    moduleId: "finance",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetData | null>(null);
  const supportOrgTyped = supportOrg as unknown as
    | { orgId?: string }
    | undefined;
  const sessionUserTyped = session?.user as unknown as
    | { orgId?: string }
    | undefined;
  const resolvedOrgId =
    orgId || supportOrgTyped?.orgId || sessionUserTyped?.orgId;

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fm/finance/budgets");
      if (!res.ok) throw new Error("Failed to load budgets");
      const json = await res.json();
      const data = (json?.data || []) as BudgetData[];
      
      // Fetch spent amounts for each budget (aggregate from expenses)
      const budgetsWithSpent = await Promise.all(
        data.map(async (budget) => {
          try {
            const expenseRes = await fetch(`/api/fm/finance/expenses?budgetId=${budget.id}`);
            if (expenseRes.ok) {
              const expenseJson = await expenseRes.json();
              const expenses = expenseJson?.data || [];
              const spent = expenses
                .filter((e: { status?: string }) => e.status === "approved")
                .reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0);
              return { ...budget, spent };
            }
          } catch {
            // Ignore expense fetch errors
          }
          return { ...budget, spent: 0 };
        })
      );
      
      setBudgets(budgetsWithSpent);
    } catch {
      toast.error(auto("Failed to load budgets", "toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [auto]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleBudgetCreated = (budget: BudgetData) => {
    setBudgets((prev) => [{ ...budget, spent: 0 }, ...prev]);
  };

  const handleBudgetUpdated = (updatedBudget: BudgetData) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === updatedBudget.id ? { ...b, ...updatedBudget } : b))
    );
    setEditingBudget(null);
  };

  const handleBudgetDeleted = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleEditBudget = (budget: BudgetData) => {
    setEditingBudget(budget);
  };

  if (!session) {
    return <CardGridSkeleton count={4} />;
  }

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto("Budget Management", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Create and track departmental budgets and spending limits",
              "header.subtitle",
            )}
          </p>
        </div>
        <CreateBudgetDialog
          onCreated={handleBudgetCreated}
          orgId={resolvedOrgId}
        />
      </div>

      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto("Support context: {{name}}", "support.activeOrg", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={auto(
            "Search budgets by name or department...",
            "search.placeholder",
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          variant="secondary"
          onClick={() => {
            /* no-op search button */
          }}
          aria-label={auto("Search budgets", "search.buttonLabel")}
        >
          {auto("Search", "search.button")}
        </Button>
      </div>

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets
            .filter((b) =>
              searchQuery
                ? `${b.name} ${b.department}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
                : true,
            )
            .map((budget) => (
              <BudgetCard 
                key={budget.id} 
                {...budget}
                onEdit={handleEditBudget}
                onDelete={handleBudgetDeleted}
              />
            ))}
          {budgets.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">
                {auto("No budgets found", "empty")}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Budget Dialog */}
      {editingBudget && (
        <EditBudgetDialog
          budget={editingBudget}
          onUpdated={handleBudgetUpdated}
          onClose={() => setEditingBudget(null)}
          orgId={resolvedOrgId}
        />
      )}

      <div className="mt-8 p-6 border border-dashed border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          {auto(
            "Budget data is fetched from /api/fm/finance/budgets",
            "info.apiEndpoint",
          )}
        </p>
      </div>
    </div>
  );
}

type BudgetCardProps = {
  id?: string;
  name: string;
  department: string;
  allocated: number;
  spent?: number;
  currency: string;
  onEdit?: (budget: BudgetData) => void;
  onDelete?: (id: string) => void;
};

function BudgetCard({
  id,
  name,
  department,
  allocated,
  spent = 0,
  currency,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const auto = useAutoTranslator("fm.finance.budgets.card");
  const [isDeleting, setIsDeleting] = useState(false);
  const percentUsed = (spent / allocated) * 100;
  const remaining = allocated - spent;

  const handleEdit = () => {
    onEdit?.({ id, name, department, allocated, spent, currency });
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      auto("Are you sure you want to delete this budget?", "confirm.delete")
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/fm/finance/budgets/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete budget");
      }
      toast.success(auto("Budget deleted successfully", "toast.deleteSuccess"));
      onDelete?.(id);
    } catch (error) {
      const message = error instanceof Error 
        ? error.message 
        : auto("Failed to delete budget", "toast.deleteError");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <p className="text-sm text-muted-foreground">{department}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{auto("Allocated", "allocated")}</span>
            <span className="font-semibold">
              {allocated.toLocaleString()} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{auto("Spent", "spent")}</span>
            <span
              className={
                spent > allocated
                  ? "text-destructive font-semibold"
                  : "font-semibold"
              }
            >
              {spent.toLocaleString()} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{auto("Remaining", "remaining")}</span>
            <span
              className={
                remaining < 0
                  ? "text-destructive font-semibold"
                  : "text-success font-semibold"
              }
            >
              {remaining.toLocaleString()} {currency}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{auto("Usage", "usage")}</span>
            <span>{percentUsed.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                percentUsed > 100
                  ? "bg-destructive"
                  : percentUsed > 80
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleEdit}
            aria-label={auto("Edit budget", "actions.editLabel")}
          >
            {auto("Edit", "actions.edit")}
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={auto("Delete budget", "actions.deleteLabel")}
          >
            {auto("Delete", "actions.delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateBudgetDialog({
  onCreated,
  orgId,
}: {
  onCreated: (budget: BudgetData) => void;
  orgId?: string;
}) {
  const auto = useAutoTranslator("fm.finance.budgets.create");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [amount, setAmount] = useState("");
  const [currency] = useState(DEFAULT_CURRENCY);

  const resetForm = () => {
    setName("");
    setDepartment("");
    setAmount("");
  };

  const handleSubmit = async () => {
    const toastId = toast.loading(auto("Creating budget...", "toast.loading"));
    setSubmitting(true);
    try {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error(
          auto(
            "Allocated amount must be greater than 0",
            "toast.amountInvalid",
          ),
        );
      }

      const payloadOrgId = orgId;
      const res = await fetch("/api/fm/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: payloadOrgId,
          name,
          department,
          allocated: parsedAmount,
          currency,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || "Failed to create budget");
      }

      onCreated(payload.data as BudgetData);
      toast.success(auto("Budget created successfully", "toast.success"), {
        id: toastId,
      });
      resetForm();
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Failed to create budget", "toast.error");
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label={auto("Create a new budget", "triggerLabel")}>{auto("Create Budget", "trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{auto("Create New Budget", "title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="create-budget-name" className="text-sm font-medium">
              {auto("Budget Name", "fields.name")}
            </label>
            <Input
              id="create-budget-name"
              placeholder={auto(
                "e.g. Q1 2024 Operations",
                "fields.namePlaceholder",
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="create-budget-department" className="text-sm font-medium">
              {auto("Department", "fields.department")}
            </label>
            <Input
              id="create-budget-department"
              placeholder={auto(
                "e.g. Facilities Management",
                "fields.departmentPlaceholder",
              )}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="create-budget-amount" className="text-sm font-medium">
              {auto("Allocated Amount (SAR)", "fields.amount")}
            </label>
            <Input
              id="create-budget-amount"
              type="number"
              placeholder="500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !name ||
              !department ||
              !amount ||
              !Number.isFinite(Number(amount)) ||
              Number(amount) <= 0
            }
            className="w-full"
            aria-label={auto("Create budget", "submitLabel")}
          >
            {auto("Create Budget", "submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditBudgetDialog({
  budget,
  onUpdated,
  onClose,
  orgId,
}: {
  budget: BudgetData;
  onUpdated: (budget: BudgetData) => void;
  onClose: () => void;
  orgId?: string;
}) {
  const auto = useAutoTranslator("fm.finance.budgets.edit");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(budget.name);
  const [department, setDepartment] = useState(budget.department);
  const [amount, setAmount] = useState(String(budget.allocated));

  const handleSubmit = async () => {
    if (!budget.id) return;
    
    const toastId = toast.loading(auto("Updating budget...", "toast.loading"));
    setSubmitting(true);
    try {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error(
          auto(
            "Allocated amount must be greater than 0",
            "toast.amountInvalid",
          ),
        );
      }

      const res = await fetch(`/api/fm/finance/budgets/${budget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name,
          department,
          allocated: parsedAmount,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || "Failed to update budget");
      }

      onUpdated({
        ...budget,
        ...payload.data,
      } as BudgetData);
      toast.success(auto("Budget updated successfully", "toast.success"), {
        id: toastId,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Failed to update budget", "toast.error");
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{auto("Edit Budget", "title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-budget-name" className="text-sm font-medium">
              {auto("Budget Name", "fields.name")}
            </label>
            <Input
              id="edit-budget-name"
              placeholder={auto(
                "e.g. Q1 2024 Operations",
                "fields.namePlaceholder",
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="edit-budget-department" className="text-sm font-medium">
              {auto("Department", "fields.department")}
            </label>
            <Input
              id="edit-budget-department"
              placeholder={auto(
                "e.g. Facilities Management",
                "fields.departmentPlaceholder",
              )}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="edit-budget-amount" className="text-sm font-medium">
              {auto("Allocated Amount (SAR)", "fields.amount")}
            </label>
            <Input
              id="edit-budget-amount"
              type="number"
              placeholder="500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
              aria-label={auto("Cancel editing budget", "cancelLabel")}
            >
              {auto("Cancel", "cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !name ||
                !department ||
                !amount ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) <= 0
              }
              className="flex-1"
              aria-label={auto("Save budget changes", "submitLabel")}
            >
              {auto("Save Changes", "submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
