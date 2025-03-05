import { useState, useEffect } from "react";
import { Modal, Tabs, TextInput, Label, Select, Button, ToggleSwitch } from 'flowbite-react';
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

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      size="xl"
    >
      <Modal.Header>
        <span className="text-xl font-medium text-gray-900 dark:text-white">
          应用设置
        </span>
      </Modal.Header>

      <Modal.Body>
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
              <li className="mr-2">
                <button
                  className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === 'general'
                      ? 'text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                      : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                    }`}
                  onClick={() => setActiveTab('general')}
                >
                  常规设置
                </button>
              </li>
              <li className="mr-2">
                <button
                  className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === 'categories'
                      ? 'text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                      : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                    }`}
                  onClick={() => setActiveTab('categories')}
                >
                  分类管理
                </button>
              </li>
            </ul>
          </div>

          <div className="pt-4">
            {activeTab === 'general' ? (
              <div className="space-y-6">
                <div>
                  <div className="mb-2">
                    <Label htmlFor="defaultCurrency">默认货币</Label>
                  </div>
                  <Select
                    id="defaultCurrency"
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      defaultCurrency: e.target.value
                    }))}
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <div className="mb-2">
                    <Label htmlFor="theme">主题</Label>
                  </div>
                  <Select
                    id="theme"
                    value={settings.theme}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: e.target.value as "light" | "dark" | "system"
                    }))}
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="system">跟随系统</option>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    自动保存，不需要确认
                  </span>
                  <ToggleSwitch
                    checked={settings.skipConfirmation}
                    onChange={(checked) => setSettings(prev => ({
                      ...prev,
                      skipConfirmation: checked
                    }))}
                  />
                </div>
              </div>
            ) : (
              <CategoryManager />
            )}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div className="flex justify-end space-x-3">
          <Button
            color="gray"
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
          >
            保存设置
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
} 