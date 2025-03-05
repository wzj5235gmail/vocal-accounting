"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, Card, Spinner, Alert, Button } from 'flowbite-react';
import ExpenseInputSection from "@/components/ExpenseInputSection";
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
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface ProcessingStatus {
  isProcessing: boolean;
  message?: string;
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<"input" | "list" | "stats">(
    "input"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false
  });
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});

  // 录音相关引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 在 Home 组件中添加标签页加载状态
  const [tabLoading, setTabLoading] = useState<{
    list: boolean;
    stats: boolean;
  }>({
    list: false,
    stats: false,
  });

  // Add new state for audio playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Add new state for transcription result
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);

  const router = useRouter();

  // 在组件内添加 FFmpeg 实例
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  // 修改 FFmpeg 加载函数
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        if (!ffmpegRef.current) {
          ffmpegRef.current = new FFmpeg();
        }
        await ffmpegRef.current.load();
        setFfmpegLoaded(true);
      } catch (error) {
        console.error('Failed to load FFmpeg:', error);
      }
    };

    // 只在客户端执行
    if (typeof window !== 'undefined') {
      loadFFmpeg();
    }
  }, []);

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
      setIsExpenseModalOpen(false);
      setActiveTab("list"); // 自动切换到列表页面
    } catch (err: any) {
      console.error("添加支出记录失败:", err);
      setError("添加支出记录失败，请重试");
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
      setError("更新支出记录失败，请重试");
    }
  };

  // 删除支出记录
  const deleteExpense = async (id: string) => {
    try {
      await deleteExpenseFromDb(id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error("删除支出记录失败:", err);
      setError("删除支出记录失败，请重试");
    }
  };

  const getMimeType = (): string => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod|mac/.test(ua) && !/chrome/.test(ua)) {
        return "audio/mp4";
      } else {
        return "audio/webm";
      }
    }
    return "audio/mp4";
  };

  const mimeType = getMimeType()
  console.log(`mimeType:${mimeType}`);

  // 修改音频处理逻辑
  const convertAudioFormat = async (audioBlob: Blob): Promise<Blob> => {
    if (mimeType !== 'audio/mp4' || !ffmpegLoaded || !ffmpegRef.current) {
      return audioBlob;
    }

    try {
      const ffmpeg = ffmpegRef.current;
      const inputFileName = 'input.m4a';
      const outputFileName = 'output.wav';

      // 写入输入文件
      ffmpeg.writeFile(inputFileName, await fetchFile(audioBlob));

      // 转换格式
      await ffmpeg.exec(['-i', inputFileName, outputFileName]);

      // 读取输出文件
      const data = await ffmpeg.readFile(outputFileName);
      return new Blob([data], { type: 'audio/wav' });
    } catch (error) {
      console.error('Audio conversion failed:', error);
      return audioBlob;
    }
  };

  // 开始录音
  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
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
          stopRecording(new Event('timeout') as unknown as React.MouseEvent);
        }
      }, 30000);
    } catch (err) {
      console.error("无法访问麦克风:", err);
      setError("无法访问麦克风，请确保已授予麦克风权限");
    }
  };

  // 停止录音
  const stopRecording = async (e: React.MouseEvent | React.TouchEvent | Event) => {
    e.preventDefault();
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        setProcessingStatus({ isProcessing: true, message: "正在处理录音..." });
        try {
          const convertedBlob = await convertAudioFormat(audioBlob);
          const text = await transcribeAudio(convertedBlob, 'wav');
          setTranscriptionResult(text);
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

          if (shouldSkipConfirmation()) {
            await addExpense(expense);
          } else {
            setCurrentExpense(expense);
            setIsExpenseModalOpen(true);
          }
        } catch (error: any) {
          console.error("处理录音时出错:", error);
          setError(error.message || "处理录音时出错，请重试");
        } finally {
          setProcessingStatus({ isProcessing: false });

          // 关闭所有音轨
          const tracks = mediaRecorderRef.current?.stream.getTracks();
          tracks?.forEach((track) => track.stop());
        }
      };
    }
  };

  // Add cleanup function for audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20 flex flex-col">
      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* 录音按钮 */}
        <button
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg 
                     transition-all duration-200 transform hover:scale-105 active:scale-95 mb-20
                     select-none touch-none
                     [-webkit-touch-callout:none] [-webkit-user-select:none] 
                     [user-select:none] [-webkit-tap-highlight-color:transparent]
                     ${isRecording
              ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}`}
          disabled={processingStatus.isProcessing}
        >
          {/* {processingStatus.isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          ) : ( */}
          <svg
            className="w-16 h-16 text-white pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isRecording ? (
              // 录音中图标（波形动画）
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              >
                <animate
                  attributeName="opacity"
                  values="1;0.5;1"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </path>
            ) : (
              // 麦克风图标
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            )}
          </svg>
          {/* )} */}
        </button>

        {/* 录音提示文字 */}
        <div className="text-gray-600 dark:text-gray-400 mb-8 text-center
                      select-none touch-none
                      [-webkit-touch-callout:none] [-webkit-user-select:none] 
                      [user-select:none] [-webkit-tap-highlight-color:transparent]">
          {isRecording ? (
            <span className="animate-pulse">松开结束录音</span>
          ) : (
            <>
              <p>按住开始录音</p><br></br>
              <p>如："今天在costco花了150加币"</p>
            </>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="fixed top-4 left-4 right-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {processingStatus.isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg flex flex-col items-center">
            <Spinner size="xl" className="mx-auto" />
            <p className="mt-4 text-base text-gray-700 dark:text-gray-300">{processingStatus.message || "处理中..."}</p>
          </div>
        </div>
      )}

      {/* 模态框 */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        isProcessing={processingStatus.isProcessing}
        expense={currentExpense}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={addExpense}
      />

      <BottomNav />

      {/* <ExpenseInputSection
        onAddExpense={addExpense}
        isProcessing={processingStatus.isProcessing}
        processingStatus={processingStatus}
        setProcessingStatus={setProcessingStatus}
      /> */}
    </div>
  );
}
