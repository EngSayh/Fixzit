'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { BookCheck, Share2, Shield } from 'lucide-react';

export default function CreatePolicyPage() {
  const auto = useAutoTranslator('fm.administration.policies.new');

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="administration" />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{auto('Policy hub', 'header.kicker')}</p>
        <h1 className="text-3xl font-semibold">{auto('Draft a new policy', 'header.title')}</h1>
        <p className="text-muted-foreground">
          {auto('Publish HR, finance, or compliance policies with review workflows.', 'header.subtitle')}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{auto('Policy details', 'form.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{auto('Policy title', 'form.titleField')}</Label>
              <Input id="title" placeholder={auto('Example: Vendor onboarding', 'form.title.placeholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">{auto('Owner', 'form.owner')}</Label>
              <Input id="owner" placeholder="Corporate Governance" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">{auto('Summary', 'form.summary')}</Label>
            <Textarea id="summary" rows={4} placeholder={auto('Purpose, scope, and applicability…', 'form.summary.placeholder')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">{auto('Policy body', 'form.body')}</Label>
            <Textarea id="body" rows={8} placeholder={auto('Add numbered sections, responsibilities…', 'form.body.placeholder')} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>{auto('Publishing options', 'publishing.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Shield className="h-4 w-4" />
            {auto('Requires compliance approval', 'publishing.compliance')}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Share2 className="h-4 w-4" />
            {auto('Share to FM + HR portals', 'publishing.share')}
          </span>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline">{auto('Save draft', 'actions.save')}</Button>
        <Button>
          <BookCheck className="mr-2 h-4 w-4" />
          {auto('Send for approval', 'actions.submit')}
        </Button>
      </div>
    </div>
  );
}
