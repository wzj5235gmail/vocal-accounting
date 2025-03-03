import { useState, useEffect } from "react";
import { getUserSettings, saveUserSettings } from "@/services/settings";
import { currencies } from "@/data/currencies";
import CategoryManager from "@/components/CategoryManager";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState({
    defaultCurrency: "CNY",
    skipConfirmation: false,
    theme: "system" as "light" | "dark" | "system"
  });

  const [activeTab, setActiveTab] = useState<'general' | 'categories'>('general');

  // 加载设置
  useEffect(() => {
    if (isOpen) {
      const userSettings = getUserSettings();
      setSettings({
        ...userSettings,
        skipConfirmation: userSettings.skipConfirmation || false
      });
    }
  }, [isOpen]);

  // 保存设置
  const handleSave = () => {
    saveUserSettings(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md animate-slideUp shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">应用设置</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'general'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('general')}
          >
            常规设置
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'categories'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('categories')}
          >
            分类管理
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                默认货币
              </label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                录音识别后
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="skipConfirmation"
                  checked={settings.skipConfirmation}
                  onChange={(e) => setSettings({ ...settings, skipConfirmation: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="skipConfirmation" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  自动保存，不需要确认
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                启用后，语音识别结果将自动保存，不再显示确认对话框
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主题
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["light", "dark", "system"].map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSettings({ ...settings, theme: theme as any })}
                    className={`py-2 px-3 rounded-md text-sm ${settings.theme === theme
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                      }`}
                  >
                    {theme === "light" && "浅色"}
                    {theme === "dark" && "深色"}
                    {theme === "system" && "跟随系统"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <CategoryManager />
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
} 