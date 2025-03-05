import { useState, useEffect } from "react";
import { getUserCategories, addCategory, updateCategory, deleteCategory, resetCategories } from "@/services/categories";

interface CategoryManagerProps {
  onCategoriesChange?: (categories: string[]) => void;
}

export default function CategoryManager({ onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 加载分类
  useEffect(() => {
    const userCategories = getUserCategories();
    setCategories(userCategories);
    setIsLoading(false);
  }, []);

  // 添加分类
  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      setError("分类名称不能为空");
      return;
    }

    if (categories.includes(newCategory.trim())) {
      setError("该分类已存在");
      return;
    }

    const updatedCategories = addCategory(newCategory.trim());
    setCategories(updatedCategories);
    setNewCategory("");
    setError("");

    if (onCategoriesChange) {
      onCategoriesChange(updatedCategories);
    }
  };

  // 开始编辑分类
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(categories[index]);
  };

  // 保存编辑
  const handleSaveEdit = (index: number) => {
    if (!editValue.trim()) {
      setError("分类名称不能为空");
      return;
    }

    if (editValue.trim() !== categories[index] && categories.includes(editValue.trim())) {
      setError("该分类已存在");
      return;
    }

    const updatedCategories = updateCategory(categories[index], editValue.trim());
    setCategories(updatedCategories);
    setEditingIndex(null);
    setError("");

    if (onCategoriesChange) {
      onCategoriesChange(updatedCategories);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setError("");
  };

  // 删除分类
  const handleDeleteCategory = (category: string) => {
    if (categories.length <= 1) {
      setError("至少需要保留一个分类");
      return;
    }

    if (confirm(`确定要删除"${category}"分类吗？`)) {
      const updatedCategories = deleteCategory(category);
      setCategories(updatedCategories);

      if (onCategoriesChange) {
        onCategoriesChange(updatedCategories);
      }
    }
  };

  // 重置为默认分类
  const handleResetCategories = () => {
    if (confirm("确定要重置为默认分类吗？这将删除所有自定义分类。")) {
      const defaultCategories = resetCategories();
      setCategories(defaultCategories);

      if (onCategoriesChange) {
        onCategoriesChange(defaultCategories);
      }
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {/* 分类列表占位符 */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="添加新分类"
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              添加
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="border dark:border-gray-700 rounded-md overflow-y-auto h-[25vh]">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category, index) => (
                <li key={index} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
                  {editingIndex === index ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(index)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-800 dark:text-gray-200">{category}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          disabled={categories.length <= 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleResetCategories}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              重置为默认分类
            </button>
          </div>
        </>
      )}
    </div>
  );
} 