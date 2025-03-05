"use client";

import { useState, useRef, useEffect } from "react";
import { Button, TextInput, Select, Label, Card, Alert, Spinner } from 'flowbite-react';
import { Expense, ExpenseCategory } from "@/types/expense";
import { analyzeExpenseText } from "@/services/openai";
import { transcribeAudio } from "@/services/whisper";
import { useToast } from "@/components/ToastManager";
import { getUserCategories } from "@/services/categories";
import { getUserSettings } from "@/services/settings";

interface ExpenseInputSectionProps {
  onAddExpense: (expense: Expense) => Promise<void>;
  onAudioProcessed?: (blob: Blob, text: string) => Promise<void>;
  isProcessing?: boolean;
  processingStatus?: string | null;
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
  onAudioProcessed,
  isProcessing = false,
  processingStatus = null
}: ExpenseInputSectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { showToast } = useToast();

  // 表单状态
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [category, setCategory] = useState<ExpenseCategory>("其他");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const recognitionRef = useRef<any>(null);

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
        setIsRecording(false);
        setTranscript(null);
        setError(`语音识别错误: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
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
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
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

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setTranscript(null); // 清除之前的转录结果

        try {
          // 转录音频
          const text = await transcribeAudio(audioBlob, "webm");
          setTranscript(text);
          showToast("录音转录完成", "success");

          // 调用父组件的处理函数
          if (onAudioProcessed) {
            await onAudioProcessed(audioBlob, text);
          }
        } catch (error: any) {
          console.error("处理录音失败:", error);
          showToast(error.message || "处理录音失败", "error");
        }

        // 关闭音轨
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("无法访问麦克风:", err);
      showToast("无法访问麦克风，请确保已授予权限", "error");
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleTranscribe = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      // 使用Whisper API转录音频
      const text = await transcribeAudio(blob, "webm");
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
      <Card>
        <h2 className="text-xl font-semibold">记录新支出</h2>

        <div className="flex flex-col items-center justify-center">
          <Button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            color={isRecording ? "failure" : "primary"}
            size="xl"
            className="w-24 h-24 rounded-full"
          >
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mx-auto"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span className="block mt-1 text-sm">
                {isRecording ? "松开" : isProcessing ? "处理中" : "按住"}
              </span>
            </div>
          </Button>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            {isRecording ? (
              <span className="flex items-center justify-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                正在录音...
              </span>
            ) : (
              `按住按钮说出支出，例如："买咖啡35元"`
            )}
          </p>
        </div>
      </Card>

      {processingStatus && (
        <Alert color="info">
          <Spinner size="sm" className="mr-2" />
          {processingStatus}
        </Alert>
      )}

      {(audioUrl || transcript) && !isProcessing && (
        <Card>
          {audioUrl && (
            <div className="flex items-center justify-between">
              <Label>录音回放：</Label>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-48 h-8"
              />
            </div>
          )}

          {transcript && (
            <div className="space-y-2">
              <Label>转录结果：</Label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {transcript}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2">
              <Label htmlFor="amount">金额</Label>
            </div>
            <div className="flex">
              <Select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-r-none"
              >
                <option value="CNY">¥</option>
                <option value="USD">$</option>
                <option value="EUR">€</option>
              </Select>
              <TextInput
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-l-none flex-1"
              />
            </div>
          </div>

          <div>
            <div className="mb-2">
              <Label htmlFor="date">日期</Label>
            </div>
            <TextInput
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>分类</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                color={category === cat ? "primary" : "gray"}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2">
            <Label htmlFor="description">备注</Label>
          </div>
          <TextInput
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加备注..."
          />
        </div>
      </Card>
    </div>
  );
}
