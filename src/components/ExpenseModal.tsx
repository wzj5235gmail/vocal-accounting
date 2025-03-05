import { useState, useEffect } from "react";
import { Expense, ExpenseCategory } from "@/types/expense";
import { currencies } from "@/data/currencies";
import {
  getDefaultCurrency,
  setDefaultCurrency,
  setSkipConfirmation,
} from "@/services/settings";

interface ExpenseModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  expense: Partial<Expense>;
  onClose: () => void;
  onSave: (expense: Expense) => void;
}

export default function ExpenseModal({
  isOpen,
  isProcessing,
  expense,
  onClose,
  onSave,
}: ExpenseModalProps) {
  const [editedExpense, setEditedExpense] = useState<Partial<Expense>>(expense);
  const [showDetails, setShowDetails] = useState(false);
  const [isDefaultCurrency, setIsDefaultCurrency] = useState(false);
  const [skipFutureConfirmations, setSkipFutureConfirmations] = useState(false);

  // 当传入的expense变化时更新状态
  useEffect(() => {
    setEditedExpense({
      ...expense,
      currency: expense.currency || getDefaultCurrency(),
    });
    setShowDetails(false);
    setIsDefaultCurrency(false);
  }, [expense]);

  const categories: ExpenseCategory[] = [
    "餐饮",
    "购物",
    "交通",
    "住房",
    "娱乐",
    "医疗",
    "教育",
    "旅行",
    "其他",
  ];

  const handleSave = () => {
    if (!editedExpense.amount || isNaN(Number(editedExpense.amount))) {
      alert("请输入有效金额");
      return;
    }

    // 如果用户选择了设为默认货币
    if (isDefaultCurrency && editedExpense.currency) {
      setDefaultCurrency(editedExpense.currency);
    }

    // 如果用户选择了不再确认
    if (skipFutureConfirmations) {
      setSkipConfirmation(true);
    }

    // 创建完整的Expense对象
    const completeExpense: Expense = {
      id: editedExpense.id || crypto.randomUUID(),
      amount: Number(editedExpense.amount),
      currency: editedExpense.currency || getDefaultCurrency(),
      category: editedExpense.category || "其他",
      date: editedExpense.date || new Date().toISOString().split("T")[0],
      description: editedExpense.description || "",
      createdAt: editedExpense.createdAt || new Date().toISOString(),
    };

    onSave(completeExpense);
  };

  // 获取货币符号
  const getCurrencySymbol = (code: string) => {
    const currency = currencies.find((c) => c.code === code);
    return currency?.symbol || code;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md animate-slideUp shadow-xl">
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              分析中...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              正在处理您的语音内容
            </p>
          </div>
        ) : !showDetails ? (
          // 简化的确认界面
          <>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              确认支出
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 dark:text-gray-400">金额:</span>
                <div className="flex items-center">
                  <select
                    value={editedExpense.currency || getDefaultCurrency()}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        currency: e.target.value,
                      })
                    }
                    className="mr-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-1"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editedExpense.amount || ""}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        amount: Number(e.target.value),
                      })
                    }
                    className="w-24 text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 dark:text-gray-400">分类:</span>
                <select
                  value={editedExpense.category || "其他"}
                  onChange={(e) =>
                    setEditedExpense({
                      ...editedExpense,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-1"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 dark:text-gray-400">日期:</span>
                <input
                  type="date"
                  value={
                    editedExpense.date || new Date().toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    setEditedExpense({ ...editedExpense, date: e.target.value })
                  }
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-1"
                />
              </div>

              <div className="mt-2">
                <span className="text-gray-500 dark:text-gray-400">备注:</span>
                <input
                  type="text"
                  value={editedExpense.description || ""}
                  onChange={(e) =>
                    setEditedExpense({
                      ...editedExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-1"
                  placeholder="添加备注..."
                />
              </div>
            </div>

            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="skipConfirmation"
                checked={skipFutureConfirmations}
                onChange={(e) => setSkipFutureConfirmations(e.target.checked)}
                className="mr-2"
              />
              <label
                htmlFor="skipConfirmation"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                下次自动保存，不再确认
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              {/* <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                修改详情
              </button> */}

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </>
        ) : (
          // 详细编辑界面
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                编辑支出
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                返回简化视图
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  金额
                </label>
                <div className="flex">
                  <select
                    value={editedExpense.currency || getDefaultCurrency()}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        currency: e.target.value,
                      })
                    }
                    className="rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} ({currency.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editedExpense.amount || ""}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        amount: Number(e.target.value),
                      })
                    }
                    className="flex-1 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="mt-1 flex items-center">
                  <input
                    type="checkbox"
                    id="defaultCurrency"
                    checked={isDefaultCurrency}
                    onChange={(e) => setIsDefaultCurrency(e.target.checked)}
                    className="mr-2"
                  />
                  <label
                    htmlFor="defaultCurrency"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    设为默认货币
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  日期
                </label>
                <input
                  type="date"
                  value={
                    editedExpense.date || new Date().toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    setEditedExpense({ ...editedExpense, date: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分类
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setEditedExpense({ ...editedExpense, category: cat })
                      }
                      className={`py-2 px-3 rounded-md text-sm ${
                        editedExpense.category === cat
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-2 border-blue-500"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  备注
                </label>
                <input
                  type="text"
                  value={editedExpense.description || ""}
                  onChange={(e) =>
                    setEditedExpense({
                      ...editedExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
                  placeholder="添加备注..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
