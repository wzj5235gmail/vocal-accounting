"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import CategoryManager from "@/components/CategoryManager";
import {
  getDefaultCurrency,
  setDefaultCurrency,
  shouldSkipConfirmation,
  setSkipConfirmation,
} from "@/services/settings";
import { currencies } from "@/data/currencies";

export default function SettingsPage() {
  const [defaultCurrency, setDefaultCurrencyState] = useState(getDefaultCurrency());
  const [skipConfirm, setSkipConfirm] = useState(shouldSkipConfirmation());

  const handleCurrencyChange = (currency: string) => {
    setDefaultCurrency(currency);
    setDefaultCurrencyState(currency);
  };

  const handleSkipConfirmChange = (skip: boolean) => {
    setSkipConfirmation(skip);
    setSkipConfirm(skip);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          {/* 默认货币设置 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              默认货币
            </h2>
            <select
              value={defaultCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                         focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5
                         dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          {/* 跳过确认设置 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              录音识别设置
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={skipConfirm}
                onChange={(e) => handleSkipConfirmChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full 
                            peer dark:bg-gray-700 peer-checked:after:translate-x-full 
                            peer-checked:after:border-white after:content-[''] after:absolute 
                            after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 
                            after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                            dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                跳过确认直接添加
              </span>
            </label>
          </div>

          {/* 分类管理 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              分类管理
            </h2>
            <CategoryManager />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
} 