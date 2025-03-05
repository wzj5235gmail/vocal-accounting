// OpenAI Whisper API 服务
// import { Expense } from "@/types/expense";

// 语音识别响应接口
interface WhisperResponse {
  text: string;
}

// 将语音转换为文本
export async function transcribeAudio(
  audioBlob: Blob,
  ext: string
): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OpenAI API 密钥未设置");
      throw new Error("OpenAI API 密钥未设置");
    }

    // 创建FormData对象
    const formData = new FormData();
    formData.append("file", audioBlob, `recording.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("language", "zh");

    console.log("Using file extension:", ext); // 调试用

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Whisper API error details:", errorData); // 调试用
      throw new Error(
        `Whisper API 错误: ${errorData.error?.message || response.statusText}`
      );
    }

    const data: WhisperResponse = await response.json();
    return data.text;
  } catch (error) {
    console.error("语音转文本时出错:", error);
    throw error;
  }
}
