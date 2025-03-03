import { useState, useEffect } from "react";
import { Expense } from "@/types/expense";
import { formatCurrency } from "@/data/currencies";

interface ConfirmDialogProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onConfirm: (expense: Expense) => Promise<void>;
}

export default function ConfirmDialog({ isOpen, expense, onClose, onConfirm }: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!expense) return;

    try {
      setIsSubmitting(true);
      await onConfirm(expense);
      setIsVisible(false);
      setTimeout(onClose, 300);
    } catch (error) {
      console.error("确认支出失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-transform duration-300 ${isVisible ? "translate-y-0" : "translate-y-8"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">确认添加支出</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            请确认以下支出信息是否正确
          </p>
        </div>

        {expense && (
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-gray-600 dark:text-gray-400">金额</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(expense.amount, expense.currency)}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-gray-600 dark:text-gray-400">分类</span>
              <span className="text-gray-900 dark:text-white">{expense.category}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-gray-600 dark:text-gray-400">日期</span>
              <span className="text-gray-900 dark:text-white">{expense.date}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">备注</span>
              <span className="text-gray-900 dark:text-white">{expense.description || "无"}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
} 