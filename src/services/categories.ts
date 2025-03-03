// 分类管理服务
import { getUserSettings, saveUserSettings } from "./settings";

// 默认分类
export const DEFAULT_CATEGORIES = [
  "餐饮", "购物", "交通", "住房", "娱乐", "医疗", "教育", "旅行", "其他"
];

// 获取用户自定义分类
export function getUserCategories(): string[] {
  const settings = getUserSettings();
  
  // 如果用户没有自定义分类，返回默认分类
  if (!settings.categories || !Array.isArray(settings.categories) || settings.categories.length === 0) {
    return DEFAULT_CATEGORIES;
  }
  
  return settings.categories;
}

// 保存用户自定义分类
export function saveUserCategories(categories: string[]): void {
  const settings = getUserSettings();
  settings.categories = categories;
  saveUserSettings(settings);
}

// 添加分类
export function addCategory(category: string): string[] {
  const categories = getUserCategories();
  
  // 检查分类是否已存在
  if (categories.includes(category)) {
    return categories;
  }
  
  // 添加新分类
  const newCategories = [...categories, category];
  saveUserCategories(newCategories);
  return newCategories;
}

// 更新分类
export function updateCategory(oldCategory: string, newCategory: string): string[] {
  const categories = getUserCategories();
  
  // 检查旧分类是否存在
  const index = categories.indexOf(oldCategory);
  if (index === -1) {
    return categories;
  }
  
  // 检查新分类是否已存在
  if (categories.includes(newCategory) && oldCategory !== newCategory) {
    return categories;
  }
  
  // 更新分类
  const newCategories = [...categories];
  newCategories[index] = newCategory;
  saveUserCategories(newCategories);
  return newCategories;
}

// 删除分类
export function deleteCategory(category: string): string[] {
  const categories = getUserCategories();
  
  // 检查分类是否存在
  const index = categories.indexOf(category);
  if (index === -1) {
    return categories;
  }
  
  // 删除分类
  const newCategories = categories.filter(c => c !== category);
  
  // 确保至少保留一个分类
  if (newCategories.length === 0) {
    newCategories.push("其他");
  }
  
  saveUserCategories(newCategories);
  return newCategories;
}

// 重置为默认分类
export function resetCategories(): string[] {
  saveUserCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
} 