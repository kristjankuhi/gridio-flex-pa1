import { useMemo } from 'react';
import { StatCard } from '@/components/StatCard';
import { ComplianceChart } from '@/components/ComplianceChart';
import { UserValueChart } from '@/components/UserValueChart';
import { HeadroomProfile } from '@/components/HeadroomProfile';
import { SoCDistributionChart } from '@/components/SoCDistributionChart';
import { PeriodSelector } from '@/components/PeriodSelector';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import {
  generateDepartureCompliance,
  generateOptInStats,
  generateUserEconomics,
  generateSoCCurve,
} from '@/data/generators';

export function EvUsers() {
  const {
    timeWindow,
    setTimeWindow,
    anchor,
    jumpTo,
    range,
    goNext,
    goPrev,
    isAtPresent,
  } = usePeriodSelector('1M');

  const allCompliance = useMemo(() => generateDepartureCompliance(365), []);
  const complianceFiltered = useMemo(
    () =>
      allCompliance.filter((b) => b.date >= range.start && b.date <= range.end),
    [allCompliance, range]
  );

  const allEconomics = useMemo(() => generateUserEconomics(365), []);
  const economicsFiltered = useMemo(
    () =>
      allEconomics.filter(
        (b) => b.timestamp >= range.start && b.timestamp <= range.end
      ),
    [allEconomics, range]
  );

  const optIn = useMemo(() => generateOptInStats(12), []);
  const latestOptIn = optIn[optIn.length - 1];

  const todaySoC = useMemo(() => generateSoCCurve(new Date()), []);

  const avgCommuter =
    complianceFiltered.length > 0
      ? complianceFiltered.reduce((s, b) => s + b.commuterCompliancePct, 0) /
        complianceFiltered.length
      : 98;
  const avgFlexible =
    complianceFiltered.length > 0
      ? complianceFiltered.reduce((s, b) => s + b.flexibleCompliancePct, 0) /
        complianceFiltered.length
      : 94;
  const nonComplianceTotal = complianceFiltered.reduce(
    (s, b) => s + b.nonComplianceCount,
    0
  );
  const overrideRatePct =
    complianceFiltered.length > 0
      ? Math.round(
          (nonComplianceTotal / (complianceFiltered.length * 847)) * 10000
        ) / 100
      : 2.1;

  const totalCredit = economicsFiltered.reduce(
    (s, b) => s + b.userCreditEur,
    0
  );
  const avgPerEv = totalCredit / 847;

  const bestMonth = optIn.reduce(
    (best, m) => {
      const monthCredit = allEconomics
        .filter(
          (b) =>
            b.timestamp.getFullYear() === m.month.getFullYear() &&
            b.timestamp.getMonth() === m.month.getMonth()
        )
        .reduce((s, b) => s + b.userCreditEur, 0);
      return monthCredit > best.credit
        ? {
            label: m.month.toLocaleString('default', {
              month: 'short',
              year: '2-digit',
            }),
            credit: monthCredit,
          }
        : best;
    },
    { label: '—', credit: 0 }
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold mb-1">EV Users</h1>
        <p className="text-sm text-muted-foreground">
          Fleet user experience, compliance, and value distribution
        </p>
      </div>

      <PeriodSelector
        timeWindow={timeWindow}
        label={range.label}
        anchor={anchor}
        isAtPresent={isAtPresent}
        onWindowChange={setTimeWindow}
        onPrev={goPrev}
        onNext={goNext}
        onJumpTo={jumpTo}
      />

      {/* Panel A — Trust & Compliance */}
      <section className="space-y-4">
        <h2 className="text-base font-medium">Departure Guarantee</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Commuter Compliance"
            value={`${Math.round(avgCommuter * 10) / 10}%`}
            unit=""
            trend="charged by 07:30"
          />
          <StatCard
            label="Flexible Compliance"
            value={`${Math.round(avgFlexible * 10) / 10}%`}
            unit=""
            trend="charged by 08:30"
          />
          <StatCard
            label="Non-compliance Events"
            value={nonComplianceTotal.toString()}
            unit="events"
            trend={`${complianceFiltered.length}-day period`}
          />
          <StatCard
            label="Override Rate"
            value={overrideRatePct.toString()}
            unit="% of sessions"
            trend="user-initiated"
          />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Compliance trend — commuter vs flexible segment
          </p>
          <ComplianceChart blocks={complianceFiltered} />
        </div>
      </section>

      {/* Panel B — User Economics */}
      <section className="space-y-4">
        <h2 className="text-base font-medium">Bill Savings</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Avg. Monthly Credit"
            value={`€${Math.round(avgPerEv)}`}
            unit="/ vehicle"
            trend="bill discount (est.)"
          />
          <StatCard
            label="Total Distributed"
            value={`€${Math.round(totalCredit).toLocaleString()}`}
            unit=""
            trend="this period"
          />
          <StatCard
            label="Best Month"
            value={`€${Math.round(bestMonth.credit).toLocaleString()}`}
            unit=""
            trend={bestMonth.label}
          />
          <StatCard
            label="Active Enrolments"
            value="847"
            unit="EVs"
            trend={`+${latestOptIn?.newEnrollments ?? 0} this month`}
          />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Value split — user credit vs Gridio retained
          </p>
          <UserValueChart blocks={economicsFiltered} timeWindow={timeWindow} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Opt-in rate — last 6 months
          </p>
          <div className="flex items-end gap-6 px-2 pt-2 pb-1">
            {optIn.slice(-6).map((m) => (
              <div key={m.month.toISOString()} className="text-center">
                <p className="text-lg font-semibold tabular-nums text-primary">
                  {m.optInRatePct}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.month.toLocaleString('default', { month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Panel C — Fleet as a Resource */}
      <section className="space-y-4">
        <h2 className="text-base font-medium">Availability Profile</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Avg. headroom by time of day — when the fleet is most dispatchable
          </p>
          <HeadroomProfile blocks={todaySoC} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3">
            SoC distribution — plugged-in fleet right now
          </p>
          <SoCDistributionChart blocks={todaySoC} />
        </div>
      </section>
    </div>
  );
}
