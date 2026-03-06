import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  trend?: string;
}

export function StatCard({ label, value, unit, trend }: StatCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {trend && <p className="text-xs text-primary mt-2">{trend}</p>}
      </CardContent>
    </Card>
  );
}
