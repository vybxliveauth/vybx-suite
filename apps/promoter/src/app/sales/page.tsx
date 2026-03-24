"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";

const MONTHLY_DATA = [
  { month: "Oct", revenue: 12400, tickets: 320 },
  { month: "Nov", revenue: 18600, tickets: 481 },
  { month: "Dic", revenue: 24100, tickets: 621 },
  { month: "Ene", revenue: 19800, tickets: 510 },
  { month: "Feb", revenue: 22300, tickets: 575 },
  { month: "Mar", revenue: 31200, tickets: 803 },
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

export default function SalesPage() {
  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Ventas" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">Historial de ventas e ingresos mensuales</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos mensuales</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={MONTHLY_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 16.9%)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(217.9 10.6% 54.9%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "hsl(217.9 10.6% 54.9%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "revenue" ? [fmtCurrency(v), "Ingresos"] : [v, "Boletos"]
                  }
                  contentStyle={{
                    background: "hsl(224 71.4% 6%)",
                    border: "1px solid hsl(215 27.9% 16.9%)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Legend
                  formatter={(v) => (v === "revenue" ? "Ingresos" : "Boletos")}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="hsl(262.1 83.3% 57.8%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tickets" fill="hsl(262.1 83.3% 57.8% / 0.4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MONTHLY_DATA.slice().reverse().map((row) => (
                <div key={row.month} className="rounded-lg border border-border p-4 space-y-1">
                  <p className="text-sm font-medium">{row.month}</p>
                  <p className="text-xl font-bold font-mono">{fmtCurrency(row.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{row.tickets} boletos</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
