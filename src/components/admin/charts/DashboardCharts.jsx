import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import SalesTrendChart from '@/components/admin/charts/SalesTrendChart';
import OrderStatusChart from '@/components/admin/charts/OrderStatusChart';
import { AdminEmptyState } from '@/components/admin/AdminUi';
import { buildDailySeries, percentChange, previousPeriodTotal, statusBreakdown, sumSeries } from '@/utils/dashboardMetrics';
import { formatPrice, cn } from '@/utils/formatPrice';
import { ShoppingBag } from 'lucide-react';

const RANGES = [7, 30, 90];
const STORAGE_KEY = 'chikit-dashboard-range';

const readRange = () => {
    try {
        const saved = Number(localStorage.getItem(STORAGE_KEY));
        return RANGES.includes(saved) ? saved : 30;
    } catch {
        return 30;
    }
};

function Segmented({ label, options, value, onChange }) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-admin-border bg-admin-surface-alt p-0.5">
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={cn('rounded-md px-3 py-1 text-small font-medium transition-colors', selected ? 'bg-admin-surface text-primary-deep shadow-xs' : 'text-admin-muted hover:text-ink')}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** Sales trend + order status breakdown, both scoped to one date-range filter. */
export default function DashboardCharts({ orders }) {
    const [days, setDays] = useState(readRange);
    const [metric, setMetric] = useState('revenue');

    const changeRange = (next) => {
        setDays(next);
        try {
            localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
            /* preference simply isn't remembered */
        }
    };

    const series = useMemo(() => buildDailySeries(orders, days), [orders, days]);
    const current = sumSeries(series, metric);
    const previous = useMemo(() => previousPeriodTotal(orders, days, metric), [orders, days, metric]);
    const change = percentChange(current, previous);
    const status = useMemo(() => statusBreakdown(orders, days), [orders, days]);
    const isMoney = metric === 'revenue';

    return (
        <section aria-labelledby="dashboard-charts" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="dashboard-charts" className="font-sans text-body font-semibold">Performance</h2>
                <Segmented label="Date range" value={days} onChange={changeRange} options={RANGES.map((d) => ({ value: d, label: `${d} days` }))} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="admin-table-shell p-4 sm:p-5 lg:col-span-2">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-small text-admin-muted">{isMoney ? 'Revenue' : 'Orders'} · last {days} days</p>
                            <p className="mt-1 font-sans text-[2rem] font-semibold leading-none text-ink">{isMoney ? formatPrice(current) : current}</p>
                            <p className="mt-2 min-h-5 text-caption">
                                {change === null ? (
                                    <span className="text-admin-muted">No sales in the previous {days} days to compare</span>
                                ) : (
                                    <span className={cn('inline-flex items-center gap-1 font-medium', change >= 0 ? 'text-success' : 'text-danger')}>
                                        {change >= 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                                        {change >= 0 ? '+' : '−'}{Math.abs(change).toFixed(1)}%
                                        <span className="font-normal text-admin-muted">vs previous {days} days</span>
                                    </span>
                                )}
                            </p>
                        </div>
                        <Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: 'revenue', label: 'Revenue' }, { value: 'orders', label: 'Orders' }]} />
                    </div>
                    <SalesTrendChart series={series} metric={metric} />
                </div>

                <div className="admin-table-shell p-4 sm:p-5 lg:self-start">
                    <p className="text-small text-admin-muted">Orders by status · last {days} days</p>
                    <p className="mb-4 mt-1 font-sans text-[2rem] font-semibold leading-none text-ink">{status.total}<span className="ml-2 text-small font-normal text-admin-muted">orders</span></p>
                    {status.total === 0 ? (
                        <AdminEmptyState icon={ShoppingBag} title="No orders in this period" />
                    ) : (
                        <OrderStatusChart rows={status.rows} total={status.total} />
                    )}
                </div>
            </div>
        </section>
    );
}
