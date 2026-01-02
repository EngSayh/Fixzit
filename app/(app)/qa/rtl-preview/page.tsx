import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

const highlights = [
  "نظام التذاكر يعمل مع مراقبة SLA لحظياً",
  "سياق Souq + FM لتوحيد البيانات عبر الوحدات",
  "تحليلات Aqar للمزايدات والعروض السريعة",
];

export default function RtlPreviewPage() {
  return (
    <div
      data-testid="rtl-preview"
      dir="rtl"
      className="min-h-screen bg-slate-900 text-slate-50 py-10 px-6"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
            RTL Snapshot
          </p>
          <h1 className="text-3xl font-semibold">واجهة Fixzit باللغة العربية</h1>
          <p className="text-sm text-slate-300">
            لقطات بصرية للتحقق من المحاذاة واتجاه النص في Souq + FM + Aqar.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-emerald-200/30 bg-slate-900/40 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>أمر عمل FM</CardTitle>
                  <CardDescription>
                    صيانة تبريد • برج العليا • الرياض
                  </CardDescription>
                </div>
                <StatusPill status="warning" label="قيد المتابعة" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">الفريق</span>
                <span className="font-semibold">فريق تبريد 24/7</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">المستأجر</span>
                <span className="font-semibold">Souq Pro • المستوى الذهبي</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">SLA</span>
                <span className="font-semibold text-amber-400">
                  1س 12د متبقية
                </span>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" aria-label="Update status" title="Update status">تحديث الحالة</Button>
              <Button aria-label="Complete task" title="Complete task">إنهاء المهمة</Button>
            </CardFooter>
          </Card>

          <Card className="bg-slate-900/40 border-indigo-200/30 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>قائمة Aqar مميزة</CardTitle>
                  <CardDescription>
                    فيلا ذكية • 5 غرف • جدة | البحر
                  </CardDescription>
                </div>
                <StatusPill status="success" label="جاهز لـ RNPL" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">السعر</span>
                <span className="font-semibold">2,450,000 ريال</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">الحي</span>
                <span className="font-semibold">الشاطئ • جدة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">الطلبات</span>
                <span className="font-semibold text-emerald-300">
                  +18 مشاهدة • 5 عروض
                </span>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" aria-label="View virtual tour" title="View virtual tour">عرض الجولة الافتراضية</Button>
              <Button aria-label="Send offer" title="Send offer">إرسال عرض</Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="bg-slate-900/40 border border-slate-700">
          <CardHeader className="space-y-1">
            <CardTitle>مؤشرات سريعة</CardTitle>
            <CardDescription>
              التحقق البصري للغة العربية يمر عبر المكونات الأساسية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-3 text-sm text-slate-200">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-slate-700/70 bg-slate-800/40 p-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <StatusPill status="info" label="Souq" />
            <StatusPill status="success" label="FM" />
            <StatusPill status="warning" label="Aqar" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
