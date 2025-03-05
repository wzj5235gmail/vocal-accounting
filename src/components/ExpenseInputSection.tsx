"use client";

import { useState, useRef, useEffect } from "react";
import { Expense, ExpenseCategory } from "@/types/expense";
import { analyzeExpenseText } from "@/services/openai";
import { transcribeAudio } from "@/services/whisper";
import { useToast } from "@/components/ToastManager";
import { getUserCategories } from "@/services/categories";
import { getUserSettings } from "@/services/settings";

interface ExpenseInputSectionProps {
  onAddExpense: (expense: Expense) => void;
}

// 添加 SpeechRecognition 类型声明
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function ExpenseInputSection({
  onAddExpense,
}: ExpenseInputSectionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [category, setCategory] = useState<ExpenseCategory>("其他");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const recognitionRef = useRef<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { showToast } = useToast();
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  // 初始化语音识别
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "zh-CN";

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        if (event.results[current].isFinal) {
          setTranscript(
            (prev) => prev + event.results[current][0].transcript + " "
          );
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("语音识别错误:", event.error);
        setIsListening(false);
        setError(`语音识别错误: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError("您的浏览器不支持语音识别功能");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // 语音识别开关
  const toggleListening = () => {
    setError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("启动语音识别失败:", err);
        setError("启动语音识别失败，请刷新页面重试");
      }
    }
  };

  // 检测支持的音频格式
  const getSupportedMimeType = () => {
    const types = [
      { mimeType: "audio/webm;codecs=opus", ext: "webm" },
      { mimeType: "audio/mp4;codecs=mp4a", ext: "m4a" },
      { mimeType: "audio/ogg;codecs=opus", ext: "ogg" },
      { mimeType: "audio/wav", ext: "wav" },
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type.mimeType)) {
        return type;
      }
    }

    return { mimeType: "", ext: "webm" }; // 默认格式
  };

  // 添加录音功能
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, ext } = getSupportedMimeType();

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current);
        setIsRecording(false);

        // 自动转录
        try {
          setIsProcessing(true);
          setProcessingStatus("正在转录录音...");

          const transcription = await transcribeAudio(audioBlob, ext);
          setTranscript(transcription);

          // 自动处理文本
          await handleProcessTranscript(transcription);
        } catch (error) {
          console.error("转录失败:", error);
          showToast("录音转录失败，请重试", "error");
          setIsProcessing(false);
        }
      };

      // 设置较短的时间间隔来获取数据
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("录音失败:", err);
      setError("录音失败，请重试");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      // 使用Whisper API转录音频
      const text = await transcribeAudio(blob);
      setTranscript(text);

      // 自动分析文本
      await handleProcessTranscript(text);
    } catch (error: any) {
      console.error("转录音频时出错:", error);
      setError(error.message || "无法转录音频，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  // 修改handleProcessTranscript函数，使其可以接受参数
  const handleProcessTranscript = async (
    textOrEvent?: string | React.MouseEvent
  ) => {
    try {
      const transcriptToProcess =
        typeof textOrEvent === "string" ? textOrEvent : transcript;
      if (!transcriptToProcess.trim()) return;

      setIsProcessing(true);
      setProcessingStatus("正在分析录音内容...");

      // 分析文本
      const result = await analyzeExpenseText(transcriptToProcess);

      // 获取用户自定义分类
      const userCategories = getUserCategories();

      // 如果分析出的分类不在用户分类中，设为"其他"
      if (result.category && !userCategories.includes(result.category)) {
        result.category = "其他";
      }

      // 创建支出对象
      const expense: Expense = {
        id: Date.now().toString(),
        amount: result.amount || 0,
        currency: result.currency || "CNY",
        category: result.category || "其他",
        description: result.description || "",
        date: result.date || new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      };

      // 如果用户选择了跳过确认，直接保存
      if (shouldSkipConfirmation()) {
        setProcessingStatus("正在保存支出记录...");
        await onAddExpense(expense);
        setTranscript("");
        showToast("支出已成功添加", "success");
      } else {
        // 否则打开确认对话框
        setAmount(expense.amount.toString());
        setCurrency(expense.currency);
        setCategory(expense.category);
        setDescription(expense.description);
        setDate(expense.date);
      }
    } catch (error) {
      console.error("处理录音失败:", error);
      showToast("处理录音失败，请重试", "error");
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // 保存支出记录
  const handleSaveExpense = async () => {
    if (!amount || isNaN(Number(amount))) return;

    try {
      setIsProcessing(true);
      setProcessingStatus("正在保存支出记录...");

      const expense: Expense = {
        id: Date.now().toString(),
        amount: Number(amount),
        currency,
        category,
        description,
        date,
        createdAt: new Date().toISOString(),
      };

      await onAddExpense(expense);

      // 重置表单
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);

      showToast("支出已成功添加", "success");
    } catch (error) {
      console.error("保存支出失败:", error);
      showToast("保存支出失败，请重试", "error");
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  const categories: ExpenseCategory[] = [
    "餐饮",
    "购物",
    "交通",
    "住房",
    "娱乐",
    "医疗",
    "教育",
    "旅行",
    "其他",
  ];

  // 修改 shouldSkipConfirmation 函数
  const shouldSkipConfirmation = () => {
    const settings = getUserSettings();
    return settings.skipConfirmation || false;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          记录新支出
        </h2>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
        )}

        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center mb-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white transition-colors`}
              aria-label={isRecording ? "停止录音" : "开始录音"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            <div className="ml-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {isRecording ? "正在录音..." : "点击按钮开始录音"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                例如: "今天在星巴克花了35元买咖啡"
              </div>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            rows={3}
            placeholder="语音内容将显示在这里，您也可以直接输入..."
          />

          <div className="mt-2 flex justify-end space-x-2">
            <button
              onClick={() => setTranscript("")}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              清除
            </button>
            <button
              onClick={() => handleProcessTranscript()}
              disabled={isProcessing || !transcript.trim()}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "处理中..." : "分析文本"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            金额
          </label>
          <div className="flex">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3"
            >
              <option value="CNY">¥</option>
              <option value="USD">$</option>
              <option value="EUR">€</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            日期
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          分类
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`py-2 px-3 rounded-md text-sm ${
                category === cat
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-2 border-blue-500"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          备注
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
          placeholder="添加备注..."
        />
      </div>

      <div className="pt-4">
        <button
          onClick={handleSaveExpense}
          disabled={!amount || isNaN(Number(amount))}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存记录
        </button>
      </div>

      {(isProcessing || processingStatus) && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {processingStatus || "处理中..."}
          </span>
        </div>
      )}
    </div>
  );
}
