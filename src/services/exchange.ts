// 汇率服务
import { getDefaultCurrency } from "./settings";

// 汇率缓存接口
interface ExchangeRateCache {
  [key: string]: {
    rates: { [currency: string]: number };
    timestamp: number;
  };
}

// 缓存过期时间（24小时）
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// 汇率缓存
let rateCache: ExchangeRateCache = {};

// 从本地存储加载缓存
const loadCache = () => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('exchangeRateCache');
    if (cached) {
      try {
        rateCache = JSON.parse(cached);
      } catch (e) {
        console.error('无法解析汇率缓存:', e);
        rateCache = {};
      }
    }
  }
};

// 保存缓存到本地存储
const saveCache = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('exchangeRateCache', JSON.stringify(rateCache));
  }
};

// 初始化加载缓存
loadCache();

// 添加防抖，避免短时间内多次请求同一汇率
const pendingRequests: { [key: string]: Promise<number> } = {};

/**
 * 获取汇率
 * @param from 源货币
 * @param to 目标货币
 * @returns 汇率
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  // 如果源货币和目标货币相同，返回1
  if (from === to) return 1;

  // 检查缓存
  const cacheKey = from;
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (
    rateCache[cacheKey] && 
    rateCache[cacheKey].rates[to] && 
    now - rateCache[cacheKey].timestamp < CACHE_EXPIRY
  ) {
    return rateCache[cacheKey].rates[to];
  }
  
  // 添加防抖，避免短时间内多次请求同一汇率
  const pendingRequestsKey = `${from}_${to}`;
  if (pendingRequests[pendingRequestsKey]) {
    return pendingRequests[pendingRequestsKey];
  }
  
  try {
    // 创建一个Promise并存储在pendingRequests中
    pendingRequests[pendingRequestsKey] = new Promise(async (resolve, reject) => {
      try {
        // 使用ExchangeRate-API获取汇率
        const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        
        if (!response.ok) {
          throw new Error(`汇率API错误: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 更新缓存
        rateCache[cacheKey] = {
          rates: data.rates,
          timestamp: now
        };
        
        // 保存缓存
        saveCache();
        
        resolve(data.rates[to]);
      } catch (error) {
        console.error('获取汇率失败:', error);
        
        // 如果有旧缓存，即使过期也返回
        if (rateCache[cacheKey] && rateCache[cacheKey].rates[to]) {
          console.log('使用过期的汇率缓存');
          resolve(rateCache[cacheKey].rates[to]);
        } else {
          // 无法获取汇率，返回1（不转换）
          resolve(1);
        }
      } finally {
        // 请求完成后，删除挂起的请求
        delete pendingRequests[pendingRequestsKey];
      }
    });
    
    return pendingRequests[pendingRequestsKey];
  } catch (error) {
    console.error('获取汇率失败:', error);
    
    // 如果有旧缓存，即使过期也返回
    if (rateCache[cacheKey] && rateCache[cacheKey].rates[to]) {
      console.log('使用过期的汇率缓存');
      return rateCache[cacheKey].rates[to];
    }
    
    // 无法获取汇率，返回1（不转换）
    return 1;
  }
}

/**
 * 转换货币金额
 * @param amount 金额
 * @param from 源货币
 * @param to 目标货币
 * @returns 转换后的金额
 */
export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return amount * rate;
}

/**
 * 转换为默认货币
 * @param amount 金额
 * @param currency 源货币
 * @returns 转换后的金额
 */
export async function convertToDefaultCurrency(amount: number, currency: string): Promise<number> {
  const defaultCurrency = getDefaultCurrency();
  return await convertCurrency(amount, currency, defaultCurrency);
}

/**
 * 批量转换为指定货币
 * @param expenses 支出记录
 * @param targetCurrency 目标货币
 * @returns 转换后的总金额
 */
export async function convertExpensesToCurrency(expenses: { amount: number; currency: string }[], targetCurrency: string): Promise<number> {
  // 如果数据量太大，分批处理
  const BATCH_SIZE = 100;
  let total = 0;
  
  // 按币种分组
  const expensesByGroup: { [currency: string]: number } = {};
  
  expenses.forEach(expense => {
    if (!expensesByGroup[expense.currency]) {
      expensesByGroup[expense.currency] = 0;
    }
    expensesByGroup[expense.currency] += expense.amount;
  });
  
  // 转换每组金额
  const entries = Object.entries(expensesByGroup);
  const batches = [];
  
  // 将转换请求分成多个批次
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    batches.push(entries.slice(i, i + BATCH_SIZE));
  }
  
  // 逐批处理
  for (const batch of batches) {
    const conversions = await Promise.all(
      batch.map(async ([currency, amount]) => {
        const converted = await convertCurrency(amount, currency, targetCurrency);
        return converted;
      })
    );
    
    // 累加结果
    total += conversions.reduce((sum, amount) => sum + amount, 0);
  }
  
  return total;
} 