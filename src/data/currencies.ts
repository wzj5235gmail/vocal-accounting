// 货币数据
export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const currencies: Currency[] = [
  { code: "CNY", symbol: "¥", name: "人民币" },
  { code: "USD", symbol: "$", name: "美元" },
  { code: "EUR", symbol: "€", name: "欧元" },
  { code: "JPY", symbol: "¥", name: "日元" },
  { code: "GBP", symbol: "£", name: "英镑" },
  { code: "AUD", symbol: "A$", name: "澳元" },
  { code: "CAD", symbol: "C$", name: "加元" },
  { code: "HKD", symbol: "HK$", name: "港币" },
  { code: "SGD", symbol: "S$", name: "新加坡元" },
  { code: "CHF", symbol: "Fr", name: "瑞士法郎" },
  { code: "KRW", symbol: "₩", name: "韩元" },
  { code: "RUB", symbol: "₽", name: "俄罗斯卢布" },
  { code: "INR", symbol: "₹", name: "印度卢比" },
  { code: "BRL", symbol: "R$", name: "巴西雷亚尔" },
  { code: "MXN", symbol: "Mex$", name: "墨西哥比索" },
  { code: "THB", symbol: "฿", name: "泰铢" },
  { code: "MYR", symbol: "RM", name: "马来西亚林吉特" },
  { code: "IDR", symbol: "Rp", name: "印尼盾" },
  { code: "PHP", symbol: "₱", name: "菲律宾比索" },
  { code: "TWD", symbol: "NT$", name: "新台币" }
];

// 获取货币符号
export function getCurrencySymbol(code: string): string {
  const currency = currencies.find(c => c.code === code);
  return currency?.symbol || code;
}

// 获取货币名称
export function getCurrencyName(code: string): string {
  const currency = currencies.find(c => c.code === code);
  return currency?.name || code;
}

// 格式化货币显示
export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
} 