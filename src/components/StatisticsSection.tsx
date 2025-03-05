"use client";

import { useState, useEffect } from "react";
import { Expense } from "@/types/expense";
import { formatCurrency, currencies } from "@/data/currencies";
import { convertExpensesToCurrency } from "@/services/exchange";
import { getDefaultCurrency } from "@/services/settings";

interface StatisticsSectionProps {
  expenses: Expense[];
}

type TimeRange =
  | "all"
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "lastWeek"
  | "lastMonth"
  | "lastYear"
  | "custom";
type GroupBy = "category" | "day" | "month" | "year";

export default function StatisticsSection({
  expenses,
}: StatisticsSectionProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("thisMonth");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [customRange, setCustomRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  const [selectedCurrency, setSelectedCurrency] = useState(
    getDefaultCurrency()
  );
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);

  // 根据时间范围筛选数据
  useEffect(() => {
    let filtered: Expense[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeRange) {
      case "thisWeek": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        filtered = expenses.filter((e) => new Date(e.date) >= startOfWeek);
        break;
      }
      case "thisMonth": {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = expenses.filter((e) => new Date(e.date) >= startOfMonth);
        break;
      }
      case "thisYear": {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        filtered = expenses.filter((e) => new Date(e.date) >= startOfYear);
        break;
      }
      case "lastWeek": {
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
        const startOfLastWeek = new Date(endOfLastWeek);
        startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
        filtered = expenses.filter((e) => {
          const date = new Date(e.date);
          return date >= startOfLastWeek && date <= endOfLastWeek;
        });
        break;
      }
      case "lastMonth": {
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const endOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0
        );
        filtered = expenses.filter((e) => {
          const date = new Date(e.date);
          return date >= lastMonth && date <= endOfLastMonth;
        });
        break;
      }
      case "lastYear": {
        const lastYear = new Date(today.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
        filtered = expenses.filter((e) => {
          const date = new Date(e.date);
          return date >= lastYear && date <= endOfLastYear;
        });
        break;
      }
      case "custom": {
        filtered = expenses.filter((e) => {
          return e.date >= customRange.start && e.date <= customRange.end;
        });
        break;
      }
      default: // 'all'
        filtered = [...expenses];
    }

    setFilteredExpenses(filtered);
  }, [expenses, timeRange, customRange]);

  // 优化统计数据计算
  useEffect(() => {
    // 使用 Web Worker 或分批处理大量数据
    if (filteredExpenses.length === 0) {
      setStats([]);
      setTotalAmount(0);
      return;
    }

    // 限制处理的数据量
    const maxItemsToProcess = 1000;
    const dataToProcess =
      filteredExpenses.length > maxItemsToProcess
        ? filteredExpenses.slice(0, maxItemsToProcess)
        : filteredExpenses;

    // 使用 setTimeout 将计算放在下一个事件循环中
    setTimeout(() => {
      // 计算总金额 - 使用原始货币，后续会转换
      const total = dataToProcess.reduce((sum, e) => {
        // 这里我们先简单地加总，不考虑货币转换
        // 实际货币转换会在另一个 useEffect 中处理
        return sum + e.amount;
      }, 0);

      setTotalAmount(total);

      // 根据分组方式计算统计数据
      const grouped = dataToProcess.reduce((acc, expense) => {
        if (!acc[expense.category]) {
          acc[expense.category] = { amount: 0, count: 0, expenses: [] };
        }
        acc[expense.category].amount += expense.amount;
        acc[expense.category].count += 1;
        acc[expense.category].expenses.push(expense);
        return acc;
      }, {} as Record<string, { amount: number; count: number; expenses: Expense[] }>);

      // 转换为数组并排序
      const statsArray = Object.entries(grouped)
        .map(([label, data]) => ({
          label,
          amount: data.amount,
          count: data.count,
          percentage: (data.amount / total) * 100,
          expenses: data.expenses,
        }))
        .sort((a, b) => b.amount - a.amount);

      setStats(statsArray);
    }, 0);
  }, [filteredExpenses, groupBy]);

  // 修改计算转换后总金额的 useEffect
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function calculateConvertedTotal() {
      if (filteredExpenses.length === 0) {
        if (isMounted) {
          setConvertedTotal(0);
          setStats([]);
        }
        return;
      }

      if (isMounted) setIsConvertingCurrency(true);

      try {
        // 使用批处理来减少API调用
        // 按币种分组并一次性转换
        const total = await convertExpensesToCurrency(
          filteredExpenses,
          selectedCurrency
        );

        if (isMounted) {
          setConvertedTotal(total);

          // 更新统计数据中的金额，保持百分比不变
          if (stats.length > 0) {
            const updatedStats = await Promise.all(
              stats.map(async (item) => {
                // 如果是按分类统计，需要重新计算每个分类的金额
                if (groupBy === "category") {
                  // 找出该分类的所有支出
                  const categoryExpenses = filteredExpenses.filter(
                    (e) => e.category === item.label
                  );
                  // 转换该分类的总金额
                  const categoryTotal = await convertExpensesToCurrency(
                    categoryExpenses,
                    selectedCurrency
                  );

                  return {
                    ...item,
                    amount: categoryTotal,
                    percentage: (categoryTotal / total) * 100,
                  };
                } else {
                  // 对于其他分组方式，保持百分比不变，更新金额
                  const newAmount = (item.percentage / 100) * total;
                  return {
                    ...item,
                    amount: newAmount,
                  };
                }
              })
            );

            setStats(updatedStats);
          }
        }
      } catch (error) {
        console.error("计算转换后的总金额失败:", error);
      } finally {
        if (isMounted) setIsConvertingCurrency(false);
      }
    }

    // 使用延迟加载策略
    if (typeof window !== "undefined") {
      setTimeout(calculateConvertedTotal, 100);
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filteredExpenses, selectedCurrency, stats, totalAmount, groupBy]);

  // 格式化日期标签
  const formatDateLabel = (label: string) => {
    if (groupBy === "day") {
      return new Date(label).toLocaleDateString();
    } else if (groupBy === "month") {
      const [year, month] = label.split("-");
      return `${year}年${month}月`;
    } else if (groupBy === "year") {
      return `${label}年`;
    }
    return label;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          支出统计
        </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              时间范围
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
            >
              <option value="all">全部时间</option>
              <option value="thisWeek">本周</option>
              <option value="thisMonth">本月</option>
              <option value="thisYear">今年</option>
              <option value="lastWeek">上周</option>
              <option value="lastMonth">上月</option>
              <option value="lastYear">去年</option>
              <option value="custom">自定义范围</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分组方式
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
            >
              <option value="category">按分类</option>
              <option value="day">按日</option>
              <option value="month">按月</option>
              <option value="year">按年</option>
            </select>
          </div>
        </div>

        {timeRange === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) =>
                  setCustomRange({ ...customRange, start: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) =>
                  setCustomRange({ ...customRange, end: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
              />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            统计货币
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.name} ({currency.code})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            所有支出将按当前汇率转换为所选货币进行统计
          </p>
        </div>

        <div className="mt-6">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              总支出
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isConvertingCurrency ? (
                <span className="text-gray-400">计算中...</span>
              ) : (
                formatCurrency(convertedTotal || 0, selectedCurrency)
              )}
            </div>
            {selectedCurrency !== getDefaultCurrency() && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                已按当前汇率转换
              </div>
            )}
          </div>

          {stats.length > 0 ? (
            <div className="space-y-4">
              {/* 移动端友好的图表展示 */}
              <div className="overflow-hidden">
                <div className="h-8 w-full flex rounded-full overflow-hidden">
                  {stats.map((item, index) => (
                    <div
                      key={index}
                      className={`h-full ${getColorClass(index)}`}
                      style={{ width: `${item.percentage}%` }}
                      title={`${item.label}: ${formatCurrency(
                        item.amount,
                        selectedCurrency
                      )} (${item.percentage.toFixed(1)}%)`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* 图例和详细数据 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${getColorClass(
                        index
                      )} mr-2`}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {groupBy === "category"
                            ? item.label
                            : formatDateLabel(item.label)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.amount, selectedCurrency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              所选时间范围内没有支出记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 获取颜色类名
function getColorClass(index: number): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  return colors[index % colors.length];
}
