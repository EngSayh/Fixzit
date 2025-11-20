'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { Trash2 } from 'lucide-react';

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  deliveryNeed: string;
}

export default function MarketplaceNewOrderPage() {
  const auto = useAutoTranslator('fm.marketplace.orders.new');
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ moduleId: 'marketplace' });
  const [requester, setRequester] = useState('');
  const [department, setDepartment] = useState('');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitCost: 0,
      deliveryNeed: '',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unitCost: 0, deliveryNeed: '' },
    ]);

  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const updateItem = (id: string, patch: Partial<OrderItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const canSubmit =
    requester.trim().length > 0 &&
    department.trim().length > 0 &&
    justification.trim().length > 10 &&
    items.every((item) => item.description.trim().length > 0 && item.quantity > 0);

  const submitOrder = async () => {
    setSubmitting(true);
    const toastId = toast.loading(auto('Submitting order...', 'actions.submitting'));
    try {
      const res = await fetch('/api/fm/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          requester,
          department,
          justification,
          items,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || 'Failed to submit order');
      }
      toast.success(auto('Order submitted for approval', 'actions.success'), { id: toastId });
      setRequester('');
      setDepartment('');
      setJustification('');
      setItems([
        {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          unitCost: 0,
          deliveryNeed: '',
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : auto('Failed to submit order', 'actions.error');
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId="marketplace" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {auto('Orders', 'breadcrumbs.scope')}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto('Create Marketplace Order', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              'Bundle sourcing needs, attach line items, and route for approval.',
              'header.subtitle'
            )}
          </p>
        </div>
        <Button onClick={submitOrder} disabled={!canSubmit || submitting}>
          {submitting ? auto('Submitting…', 'actions.submitting') : auto('Submit RFQ', 'actions.submit')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto('Request Details', 'sections.request.title')}</CardTitle>
          <CardDescription>
            {auto('Captured for routing and SLA tracking.', 'sections.request.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="requester">{auto('Requester name', 'fields.requester.label')}</Label>
            <Input
              id="requester"
              value={requester}
              placeholder={auto('Who is requesting the purchase?', 'fields.requester.placeholder')}
              onChange={(event) => setRequester(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="department">{auto('Department', 'fields.department.label')}</Label>
            <Input
              id="department"
              value={department}
              placeholder={auto('Facilities, IT, etc.', 'fields.department.placeholder')}
              onChange={(event) => setDepartment(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="justification">{auto('Business justification', 'fields.justification.label')}</Label>
            <Textarea
              id="justification"
              rows={4}
              value={justification}
              placeholder={auto(
                'Explain the operational impact, budget source, or customer obligation.',
                'fields.justification.placeholder'
              )}
              onChange={(event) => setJustification(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{auto('Line Items', 'sections.items.title')}</CardTitle>
          <CardDescription>
            {auto(
              'Describe the services or goods required and expected delivery dates.',
              'sections.items.desc'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/70 p-4 space-y-3 bg-card/40"
            >
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {auto('Line item', 'sections.items.lineLabel')} #{index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="me-1 h-4 w-4" />
                    {auto('Remove', 'sections.items.remove')}
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>
                    {auto('Description', 'fields.item.description')}
                  </Label>
                  <Textarea
                    rows={3}
                    value={item.description}
                    placeholder={auto('E.g., Annual HVAC preventive maintenance', 'fields.item.descriptionPlaceholder')}
                    onChange={(event) => updateItem(item.id, { description: event.target.value })}
                  />
                </div>
                <div>
                  <Label>
                    {auto('Delivery timeline / SLA', 'fields.item.delivery')}
                  </Label>
                  <Textarea
                    rows={3}
                    value={item.deliveryNeed}
                    placeholder={auto('Requested completion date or milestone', 'fields.item.deliveryPlaceholder')}
                    onChange={(event) => updateItem(item.id, { deliveryNeed: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>{auto('Quantity', 'fields.item.quantity')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <Label>{auto('Unit cost (SAR)', 'fields.item.unitCost')}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitCost}
                    onChange={(event) => updateItem(item.id, { unitCost: Number(event.target.value) })}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-sm text-muted-foreground">
                    {auto('Estimated line total', 'fields.item.total')}
                  </p>
                  <p className="text-2xl font-semibold">
                    SAR {(item.quantity * item.unitCost).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {auto('Need additional materials? Add another line item.', 'sections.items.addHint')}
            </p>
            <Button variant="secondary" onClick={addItem}>
              {auto('Add line item', 'sections.items.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{auto('Summary', 'sections.summary.title')}</CardTitle>
          <CardDescription>
            {auto('Calculated values that approvers will see.', 'sections.summary.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-muted/40 border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">
              {auto('Line items', 'sections.summary.lines')}
            </p>
            <p className="text-3xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">
              {auto('Requested value', 'sections.summary.value')}
            </p>
            <p className="text-3xl font-semibold">SAR {totalValue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">
              {auto('Next step', 'sections.summary.nextStep')}
            </p>
            <p className="text-xl font-semibold">
              {auto('Finance approval', 'sections.summary.approval')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
