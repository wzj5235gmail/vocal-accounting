"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ExpenseList from "@/components/ExpenseList";
import { getExpenses, updateExpense as updateExpenseInDb, deleteExpense as deleteExpenseFromDb } from "@/services/supabase";
import { Expense } from "@/types/expense";
import BottomNav from "@/components/BottomNav";
import { Spinner } from 'flowbite-react';

export default function ListPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadExpenses() {
      try {
        setIsLoading(true);
        const data = await getExpenses();
        setExpenses(data);
        setError(null);
      } catch (err: any) {
        console.error("加载支出记录失败:", err);
        setError("无法加载支出记录，请刷新页面重试");
      } finally {
        setIsLoading(false);
      }
    }

    loadExpenses();
  }, []);

  const updateExpense = async (expense: Expense) => {
    try {
      const updatedExpense = await updateExpenseInDb(expense);
      setExpenses(prev => prev.map(item =>
        item.id === updatedExpense.id ? updatedExpense : item
      ));
    } catch (err) {
      console.error("更新支出记录失败:", err);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteExpenseFromDb(id);
      setExpenses(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("删除支出记录失败:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">支出记录</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ExpenseList
            expenses={expenses}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
} 