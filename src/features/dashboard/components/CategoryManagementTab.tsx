import React, { useState, useEffect } from 'react';
import { UserAccount, DocumentCategoryItem, LockerDocument } from '../../../types';
import { getCategories, saveCategory, deleteCategory, DEFAULT_CATEGORIES } from '../../../services/db';
import {
  FolderPlus,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  FileText,
  Shield,
  GraduationCap,
  Award,
  Wallet,
  BookOpen,
  Briefcase,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface CategoryManagementTabProps {
  user: UserAccount;
  onFilterCategory?: (categoryId: string) => void;
}

const COLOR_OPTIONS = [
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Cyan', hex: '#0891b2' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Slate', hex: '#64748b' },
];

export const CategoryManagementTab: React.FC<CategoryManagementTabProps> = ({
  user,
  onFilterCategory,
}) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<DocumentCategoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].hex);

  useEffect(() => {
    loadCategories();
  }, [user.id]);

  const loadCategories = async () => {
    const list = await getCategories(user.id);
    setCategories(list);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast({ type: 'error', title: 'Name Required', message: 'Please enter a category name.' });
      return;
    }

    const catId = newCatName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    // Check if ID already exists
    if (categories.some(c => c.id === catId)) {
      toast({ type: 'error', title: 'Category Exists', message: 'A category with this identifier already exists.' });
      return;
    }

    const newCategory: DocumentCategoryItem = {
      id: catId,
      userId: user.id,
      name: newCatName.trim(),
      label: newCatLabel.trim() || newCatName.trim(),
      description: newCatDesc.trim() || 'Custom student document category',
      color: selectedColor,
      isCustom: true,
      documentCount: 0,
    };

    await saveCategory(newCategory, user.id);
    setShowAddModal(false);
    setNewCatName('');
    setNewCatLabel('');
    setNewCatDesc('');
    await loadCategories();

    toast({
      type: 'success',
      title: 'Category Created',
      message: `"${newCategory.name}" is now ready to organize your locker documents.`,
    });
  };

  const handleDeleteCategory = async (cat: DocumentCategoryItem) => {
    if (!cat.isCustom) return;
    if (!confirm(`Delete custom category "${cat.name}"? Documents in this category will not be deleted.`)) return;

    await deleteCategory(cat.id, user.id);
    await loadCategories();
    toast({
      type: 'info',
      title: 'Category Removed',
      message: `Category "${cat.name}" has been deleted.`,
    });
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'id':
        return Shield;
      case 'academic':
        return GraduationCap;
      case 'marksheet':
        return FileText;
      case 'certificate':
        return Award;
      case 'financial':
        return Wallet;
      case 'project':
        return Briefcase;
      default:
        return Tag;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-500" />
            <span>Document Category Management</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Organize records by standard student labels like Academic, Financial, and Identity, or create custom labels.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const IconComponent = getCategoryIcon(cat.id);

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color || '#4f46e5' }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] font-mono uppercase text-neutral-400">
                        {cat.id}
                      </span>
                    </div>
                  </div>

                  {cat.isCustom ? (
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      title="Delete custom category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      Standard
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                  {cat.description || cat.label}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-neutral-500">
                  {cat.documentCount ?? 0} {cat.documentCount === 1 ? 'document' : 'documents'}
                </span>

                {onFilterCategory && (
                  <button
                    onClick={() => onFilterCategory(cat.id)}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                  >
                    <span>View Documents</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" />
              <span>Create New Document Category</span>
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Name (e.g. Financial, Academic, Medical, Hostel)
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  required
                  placeholder="e.g. Financial"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Label / Title
                </label>
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={e => setNewCatLabel(e.target.value)}
                  placeholder="e.g. Tuition & Financial Receipts"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  placeholder="Brief description of files that belong in this category..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Category Theme Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        selectedColor === c.hex ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-neutral-900' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
