"use client";

import { useState, useEffect, useRef } from "react";
import ExpenseList from "@/components/ExpenseList";
import StatisticsSection from "@/components/StatisticsSection";
import ExpenseModal from "@/components/ExpenseModal";
import { Expense } from "@/types/expense";
import {
  getExpenses,
  addExpense as addExpenseToDb,
  updateExpense as updateExpenseInDb,
  deleteExpense as deleteExpenseFromDb,
} from "@/services/supabase";
import { transcribeAudio } from "@/services/whisper";
import { analyzeExpenseText } from "@/services/openai";
import {
  getDefaultCurrency,
  shouldSkipConfirmation,
} from "@/services/settings";
import SettingsModal from "@/components/SettingsModal";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<"input" | "list" | "stats">(
    "input"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});

  // 录音相关引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 添加设置模态框状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 在 Home 组件中添加标签页加载状态
  const [tabLoading, setTabLoading] = useState<{
    list: boolean;
    stats: boolean;
  }>({
    list: false,
    stats: false,
  });

  // 从数据库加载数据
  useEffect(() => {
    async function loadExpenses() {
      try {
        setIsLoading(true);
        const data = await getExpenses();
        setExpenses(data);
        setError(null);
      } catch (err: any) {
        console.error("加载支出记录失败:", err);
        setError("无法加载支出记录，请刷新页面重试");
      } finally {
        setIsLoading(false);
      }
    }

    loadExpenses();
  }, []);

  // 添加支出记录
  const addExpense = async (expense: Expense) => {
    try {
      const newExpense = await addExpenseToDb(expense);
      setExpenses((prev) => [newExpense, ...prev]);
      setIsModalOpen(false);
      setActiveTab("list"); // 自动切换到列表页面
    } catch (err: any) {
      console.error("添加支出记录失败:", err);
      alert("添加支出记录失败，请重试");
    }
  };

  // 更新支出记录
  const updateExpense = async (expense: Expense) => {
    try {
      const updatedExpense = await updateExpenseInDb(expense);
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === updatedExpense.id ? updatedExpense : item
        )
      );
    } catch (err: any) {
      console.error("更新支出记录失败:", err);
      alert("更新支出记录失败，请重试");
    }
  };

  // 删除支出记录
  const deleteExpense = async (id: string) => {
    try {
      await deleteExpenseFromDb(id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error("删除支出记录失败:", err);
      alert("删除支出记录失败，请重试");
    }
  };

  // 开始录音
  const startRecording = async () => {
    setError(null);
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

      mediaRecorder.start();
      setIsRecording(true);

      // 设置最长录音时间（30秒）
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording && mediaRecorderRef.current) {
          stopRecording();
        }
      }, 30000);
    } catch (err) {
      console.error("无法访问麦克风:", err);
      setError("无法访问麦克风，请确保已授予麦克风权限");
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // 清除超时计时器
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      // 处理录音结果
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/aac",
        });

        // 检查是否需要跳过确认
        const skipConfirm = shouldSkipConfirmation();

        // 如果需要跳过确认，直接处理但不显示模态框
        if (skipConfirm) {
          setIsProcessing(true);
          try {
            // 使用Whisper API转录音频
            const text = await transcribeAudio(audioBlob, "aac");
            console.log("转录结果:", text);

            // 使用OpenAI分析文本
            const result = await analyzeExpenseText(text);
            console.log("分析结果:", result);

            // 创建支出记录
            const expense: Expense = {
              id: crypto.randomUUID(),
              amount: Number(result.amount || 0),
              currency: result.currency || getDefaultCurrency(),
              category: result.category || "其他",
              date: result.date || new Date().toISOString().split("T")[0],
              description: result.description || "",
              createdAt: new Date().toISOString(),
            };

            // 直接添加支出
            await addExpense(expense);
          } catch (error: any) {
            console.error("处理录音时出错:", error);
            setError(error.message || "处理录音时出错，请重试");
          } finally {
            setIsProcessing(false);

            // 关闭所有音轨
            const tracks = mediaRecorderRef.current?.stream.getTracks();
            tracks?.forEach((track) => track.stop());
          }
        } else {
          // 打开模态框并开始处理
          setIsModalOpen(true);
          setIsProcessing(true);
          setCurrentExpense({
            currency: getDefaultCurrency(),
            date: new Date().toISOString().split("T")[0],
          });

          try {
            // 使用Whisper API转录音频
            const text = await transcribeAudio(audioBlob, "aac");
            console.log("转录结果:", text);

            // 使用OpenAI分析文本
            const result = await analyzeExpenseText(text);
            console.log("分析结果:", result);

            // 更新当前支出，保留默认货币如果没有识别出货币
            setCurrentExpense({
              ...result,
              currency: result.currency || getDefaultCurrency(),
              date: result.date || new Date().toISOString().split("T")[0],
            });
          } catch (error: any) {
            console.error("处理录音时出错:", error);
            setError(error.message || "处理录音时出错，请重试");
            setIsModalOpen(false);
          } finally {
            setIsProcessing(false);

            // 关闭所有音轨
            const tracks = mediaRecorderRef.current?.stream.getTracks();
            tracks?.forEach((track) => track.stop());
          }
        }
      };
    }
  };

  // 修改标签切换处理函数
  const handleTabChange = (tab: "input" | "list" | "stats") => {
    // 如果点击当前标签，不做任何操作
    if (tab === activeTab) return;

    // 设置加载状态
    if (tab === "list") {
      setTabLoading((prev) => ({ ...prev, list: true }));
    } else if (tab === "stats") {
      setTabLoading((prev) => ({ ...prev, stats: true }));
    }

    // 使用 setTimeout 延迟切换标签，让UI有时间显示加载状态
    setTimeout(() => {
      setActiveTab(tab);

      // 在下一个事件循环中重置加载状态
      setTimeout(() => {
        setTabLoading({
          list: false,
          stats: false,
        });
      }, 100);
    }, 10);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 简化的顶部栏 */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 py-4 px-4 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-medium text-gray-800 dark:text-white">
          {activeTab === "input" && "记录支出"}
          {activeTab === "list" && "支出列表"}
          {activeTab === "stats" && "数据统计"}
        </h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="设置"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600 dark:text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
            />
          </svg>
        </button>
      </header>

      {error && (
        <div className="px-4 py-2 bg-red-100 text-red-700 text-sm">{error}</div>
      )}

      {/* 主要内容区域 - 添加 pb-16 为底部导航栏留出空间 */}
      <main className="flex-1 overflow-y-auto pb-16">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="p-4">
            {activeTab === "input" && (
              <div className="flex flex-col items-center justify-center py-8">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform ${isRecording
                    ? "bg-red-500 scale-110"
                    : "bg-blue-500 hover:bg-blue-600"
                    }`}
                >
                  <div className="text-white text-center">
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
                      {isRecording ? "松开" : "按住"}
                    </span>
                  </div>
                </button>

                <p className="mt-6 text-sm text-gray-600 dark:text-gray-400 text-center">
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
            )}

            {activeTab === "list" && (
              <div className={tabLoading.list ? "opacity-50" : ""}>
                <ExpenseList
                  expenses={expenses}
                  onUpdateExpense={updateExpense}
                  onDeleteExpense={deleteExpense}
                />
              </div>
            )}

            {activeTab === "stats" && (
              <div className={tabLoading.stats ? "opacity-50" : ""}>
                <StatisticsSection expenses={expenses} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部导航栏 - 添加 z-10 确保在内容之上 */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="flex justify-around">
          {[
            { id: "input", icon: "📝", label: "记录" },
            { id: "list", icon: "📋", label: "明细" },
            { id: "stats", icon: "📊", label: "统计" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === tab.id
                ? "text-blue-500"
                : "text-gray-600 dark:text-gray-400"
                }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <ExpenseModal
        isOpen={isModalOpen}
        isProcessing={isProcessing}
        expense={currentExpense}
        onClose={() => setIsModalOpen(false)}
        onSave={addExpense}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
