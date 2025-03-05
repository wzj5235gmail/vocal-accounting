"use client";

import { useState, useEffect, useRef } from "react";
import { Expense } from "@/types/expense";
import {
  formatCurrency,
  getCurrencySymbol,
  currencies,
} from "@/data/currencies";
import { convertToDefaultCurrency } from "@/services/exchange";
import { getDefaultCurrency } from "@/services/settings";
import { getUserCategories } from "@/services/categories";

interface ExpenseListProps {
  expenses: Expense[];
  onUpdateExpense: (expense: Expense) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export default function ExpenseList({
  expenses,
  onUpdateExpense,
  onDeleteExpense,
}: ExpenseListProps) {
  const [filter, setFilter] = useState("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("card");
  const [convertedAmounts, setConvertedAmounts] = useState<{
    [id: string]: number;
  }>({});
  const defaultCurrency = getDefaultCurrency();
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const listRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [categories, setCategories] = useState<string[]>([]);

  // 加载用户自定义分类
  useEffect(() => {
    const userCategories = getUserCategories();
    setCategories(["全部", ...userCategories]);
  }, []);

  // 过滤数据
  const filteredExpenses = expenses.filter((expense) => {
    // 按分类筛选
    if (filter && expense.category !== filter) {
      return false;
    }

    // 按日期范围筛选
    if (dateRange.start && expense.date < dateRange.start) {
      return false;
    }
    if (dateRange.end && expense.date > dateRange.end) {
      return false;
    }

    return true;
  });

  // 添加编辑和删除函数
  const handleEdit = (expense: Expense) => {
    setEditingExpense({ ...expense });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("确定要删除这条记录吗？")) {
      setIsDeleting(true);
      try {
        await onDeleteExpense(id);
      } catch (error) {
        console.error("删除失败:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    try {
      await onUpdateExpense(editingExpense);
      setIsEditing(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("更新失败:", error);
    }
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "餐饮":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        );
      case "购物":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        );
      case "交通":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        );
    }
  };

  // 修改 useEffect 来优化汇率转换
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadConvertedAmounts() {
      // 只处理当前页面显示的数据，而不是所有过滤后的数据
      // 这里我们可以实现分页或者只处理前20条记录
      const visibleExpenses = filteredExpenses.slice(0, 20);
      const amounts: { [id: string]: number } = {};

      // 使用 Promise.all 并行处理转换请求
      try {
        const nonDefaultCurrencyExpenses = visibleExpenses.filter(
          (e) => e.currency !== defaultCurrency
        );

        if (nonDefaultCurrencyExpenses.length === 0) {
          if (isMounted) setConvertedAmounts({});
          return;
        }

        const results = await Promise.all(
          nonDefaultCurrencyExpenses.map(async (expense) => {
            try {
              const converted = await convertToDefaultCurrency(
                expense.amount,
                expense.currency
              );
              return { id: expense.id, amount: converted };
            } catch (error) {
              console.error(`转换货币失败 (${expense.id}):`, error);
              return { id: expense.id, amount: null };
            }
          })
        );

        // 更新状态
        if (isMounted) {
          const newAmounts = results.reduce((acc, item) => {
            if (item.amount !== null) {
              acc[item.id] = item.amount;
            }
            return acc;
          }, {} as { [id: string]: number });

          setConvertedAmounts(newAmounts);
        }
      } catch (error) {
        console.error("批量转换货币失败:", error);
      }
    }

    // 使用 requestIdleCallback 或 setTimeout 延迟加载转换金额
    // 这样可以确保UI先渲染出来，然后再进行耗时操作
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          loadConvertedAmounts();
        });
      } else {
        setTimeout(loadConvertedAmounts, 100);
      }
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filteredExpenses, defaultCurrency]);

  // 分页显示数据
  const paginatedExpenses = filteredExpenses.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);

  // 加载更多数据
  const loadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // 监听滚动事件，实现无限滚动
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = listRef.current;

      // 当滚动到底部附近时加载更多数据
      if (scrollTop + clientHeight >= scrollHeight - 100 && page < totalPages) {
        loadMore();
      }
    };

    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (listElement) {
        listElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, [page, totalPages]);

  // 重置页码当筛选条件变化时
  useEffect(() => {
    setPage(1);
  }, [filter, dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            支出记录
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {filteredExpenses.length} 条记录
          </p>
        </div>

        <div className="flex space-x-2">
          {/* 视图切换按钮 */}
          <button
            onClick={() => setViewMode("card")}
            className={`p-2 rounded-md ${
              viewMode === "card"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
            title="卡片视图"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md ${
              viewMode === "list"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
            title="列表视图"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <details className="mb-4">
        <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
          筛选选项
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分类筛选
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat === "全部" ? "" : cat)}
                  className={`py-1 px-3 rounded-full text-xs ${
                    (cat === "全部" && !filter) || filter === cat
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              日期范围
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2 text-sm"
                placeholder="开始日期"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2 text-sm"
                placeholder="结束日期"
              />
            </div>
          </div>
        </div>
      </details>

      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          没有找到符合条件的支出记录
        </div>
      ) : viewMode === "card" ? (
        // 卡片视图 - 移动端友好
        <div ref={listRef} className="overflow-y-auto max-h-[70vh] space-y-4">
          {paginatedExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      expense.category === "餐饮"
                        ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200"
                        : expense.category === "购物"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                        : expense.category === "交通"
                        ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200"
                        : expense.category === "住房"
                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200"
                        : expense.category === "娱乐"
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200"
                        : expense.category === "医疗"
                        ? "bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-200"
                        : expense.category === "教育"
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200"
                        : expense.category === "旅行"
                        ? "bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {expense.description || expense.category}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {expense.date}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(expense.amount, expense.currency)}
                    {expense.currency !== defaultCurrency &&
                      convertedAmounts[expense.id] && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          约{" "}
                          {formatCurrency(
                            convertedAmounts[expense.id],
                            defaultCurrency
                          )}
                        </div>
                      )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {expense.currency}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleEdit(expense)}
                  className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  disabled={isDeleting}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {page < totalPages && (
            <div className="text-center py-4">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      ) : (
        // 列表视图
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  日期
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  分类
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  描述
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  金额
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        expense.category === "餐饮"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : expense.category === "购物"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : expense.category === "交通"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : expense.category === "住房"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : expense.category === "娱乐"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : expense.category === "医疗"
                          ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                          : expense.category === "教育"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                          : expense.category === "旅行"
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {expense.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(expense.amount, expense.currency)}
                    {expense.currency !== defaultCurrency &&
                      convertedAmounts[expense.id] && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          约{" "}
                          {formatCurrency(
                            convertedAmounts[expense.id],
                            defaultCurrency
                          )}
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      disabled={isDeleting}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑模态框 */}
      {isEditing && editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md animate-slideUp shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              编辑支出
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  金额
                </label>
                <div className="flex">
                  <select
                    value={editingExpense.currency}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        currency: e.target.value,
                      })
                    }
                    className="rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {getCurrencySymbol(currency.code)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editingExpense.amount}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        amount: Number(e.target.value),
                      })
                    }
                    className="flex-1 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  日期
                </label>
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      date: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分类
                </label>
                <select
                  value={editingExpense.category}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                >
                  {categories.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  备注
                </label>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingExpense(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
