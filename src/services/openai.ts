// OpenAI API 服务
import { Expense, ExpenseCategory } from "@/types/expense";

// OpenAI API 请求接口
interface OpenAIRequest {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature?: number;
}

// OpenAI API 响应接口
interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// 分析支出文本
export async function analyzeExpenseText(text: string): Promise<Partial<Expense>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error("OpenAI API 密钥未设置");
      throw new Error("OpenAI API 密钥未设置");
    }
    
    const requestBody: OpenAIRequest = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `你是一个财务分析助手，负责从用户的描述中提取支出信息。
          请从用户输入中提取以下信息：
          1. amount: 金额（数字）
          2. currency: 货币类型（默认为CAD，支持的货币代码包括：CNY, USD, EUR, JPY, GBP, AUD, CAD, HKD, SGD, CHF, KRW, RUB, INR, BRL, MXN, THB, MYR, IDR, PHP, TWD）
          3. category: 支出类别（从以下选项中选择最匹配的一个：餐饮、购物、交通、住房、娱乐、医疗、教育、旅行、其他）
          4. date: 日期（如果提到了日期，格式为YYYY-MM-DD；如果没有提到或者日期是今天，则不输出此项）
          5. description: 描述（简短描述这笔支出）
          
          请以JSON格式返回结果，不要包含任何其他解释。`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3 // 较低的温度使输出更加确定性
    };
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 错误: ${errorData.error?.message || response.statusText}`);
    }
    
    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("OpenAI 返回了空响应");
    }
    
    // 解析 JSON 响应
    try {
      console.log(content);
      
      const parsedResult = JSON.parse(content);
      
      // 确保日期格式正确
      if (parsedResult.date && !/^\d{4}-\d{2}-\d{2}$/.test(parsedResult.date)) {
        parsedResult.date = new Date().toISOString().split('T')[0];
      }
      
      return parsedResult;
    } catch (parseError) {
      console.error("无法解析 OpenAI 响应:", content);
      throw new Error("无法解析 AI 返回的数据");
    }
  } catch (error) {
    console.error("分析支出文本时出错:", error);
    throw error;
  }
} 