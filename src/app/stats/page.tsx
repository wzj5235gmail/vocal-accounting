"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StatisticsSection from "@/components/StatisticsSection";
import { getExpenses } from "@/services/supabase";
import { Expense } from "@/types/expense";
import BottomNav from "@/components/BottomNav";
import { Spinner } from 'flowbite-react';

export default function StatsPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">支出统计</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {/* 总支出卡片占位符 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
              <div className="flex flex-col items-center">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>

            {/* 筛选器占位符 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>

            {/* 图表占位符 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <StatisticsSection expenses={expenses} />
        )}
      </div>

      <BottomNav />
    </div>
  );
} 