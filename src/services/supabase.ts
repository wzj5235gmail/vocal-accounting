import { createClient } from '@supabase/supabase-js';
import { Expense } from '@/types/expense';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL和密钥必须在环境变量中设置');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 获取所有支出记录
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('createdAt', { ascending: false });
  
  if (error) {
    console.error('获取支出记录失败:', error);
    throw error;
  }
  console.log(data);
  
  return data || [];
}

// 添加支出记录
export async function addExpense(expense: Expense): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expense])
    .select()
    .single();
  
  if (error) {
    console.error('添加支出记录失败:', error);
    throw error;
  }
  
  return data;
}

// 更新支出记录
export async function updateExpense(expense: Expense): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', expense.id)
    .select()
    .single();
  
  if (error) {
    console.error('更新支出记录失败:', error);
    throw error;
  }
  
  return data;
}

// 删除支出记录
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除支出记录失败:', error);
    throw error;
  }
} 