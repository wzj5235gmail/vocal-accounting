// 用户设置服务
interface UserSettings {
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  skipConfirmation?: boolean;
  categories?: string[];
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultCurrency: 'CNY',
  theme: 'system',
  skipConfirmation: false,
  categories: ["餐饮", "购物", "交通", "住房", "娱乐", "医疗", "教育", "旅行", "其他"]
};

// 获取用户设置
export function getUserSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  
  const savedSettings = localStorage.getItem('userSettings');
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch (e) {
      console.error('无法解析用户设置:', e);
    }
  }
  
  return DEFAULT_SETTINGS;
}

// 保存用户设置
export function saveUserSettings(settings: UserSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }
}

// 获取默认货币
export function getDefaultCurrency(): string {
  return getUserSettings().defaultCurrency;
}

// 设置默认货币
export function setDefaultCurrency(currency: string): void {
  const settings = getUserSettings();
  settings.defaultCurrency = currency;
  saveUserSettings(settings);
}

// 检查是否跳过确认
export function shouldSkipConfirmation(): boolean {
  return getUserSettings().skipConfirmation || false;
}

// 设置是否跳过确认
export function setSkipConfirmation(skip: boolean): void {
  const settings = getUserSettings();
  settings.skipConfirmation = skip;
  saveUserSettings(settings);
} 