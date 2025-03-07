// OpenAI API 服务
import { Expense } from "@/types/expense";
import { getUserCategories } from "./categories";
// import { ExpenseCategory } from "@/types/expense";
// import { getDefaultCurrency } from "./settings";

// const DEFAULT_CURRENCY = getDefaultCurrency();

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

const categories = getUserCategories()

// 分析支出文本
export async function analyzeExpenseText(
  text: string
): Promise<Partial<Expense>> {
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
        content: `你是一个支出分析助手。请分析用户的语音输入，提取以下信息：
          1. amount: 金额数字（不带货币符号）
          2. currency: 货币代码（如CNY、USD等）
          3. category: 支出类别（${categories.toString()}等）
          4. date: 相对天数（数字）
             - "今天"：0
             - "昨天"：1
             - "前天"：2
             - 如果没有提到日期，则输出0
          5. description: 支出描述（简短文本）
          
          请以JSON格式返回，只返回这些字段。`
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3, // 较低的温度使输出更加确定性
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API 错误: ${errorData.error?.message || response.statusText}`
      );
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI 返回了空响应");
    }

    // 解析 JSON 响应
    try {
      console.log(content);
      const processedData = JSON.parse(content || "{}");
      const dateStr = processedData.date?.toString() || "0";

      // 如果是数字（相对天数），转换为具体日期
      if (/^\d+$/.test(dateStr)) {
        const daysAgo = parseInt(dateStr);
        const date = new Date();
        // 使用用户本地时区
        const today = new Date(date.toLocaleDateString());
        today.setDate(today.getDate() - daysAgo);
        processedData.date = today.toISOString().split('T')[0];
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // 如果已经是 YYYY-MM-DD 格式，直接使用
        processedData.date = dateStr;
      } else {
        // 如果格式不正确，使用今天的日期（本地时区）
        processedData.date = new Date().toLocaleDateString('sv').split('T')[0];
      }

      return processedData;
    } catch (parseError) {
      console.error("无法解析 OpenAI 响应:", content);
      throw new Error("无法解析 AI 返回的数据");
    }
  } catch (error) {
    console.error("分析支出文本时出错:", error);
    throw error;
  }
}
