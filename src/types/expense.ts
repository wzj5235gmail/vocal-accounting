export type ExpenseCategory = 
  | "餐饮"
  | "购物"
  | "交通"
  | "住房"
  | "娱乐"
  | "医疗"
  | "教育"
  | "旅行"
  | "其他";

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string; // ISO 格式日期字符串
  description: string;
  createdAt: string; // ISO 格式日期时间字符串
} 