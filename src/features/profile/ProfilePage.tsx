import React, { useState, useEffect } from 'react';
import { UserAccount, ProfileVaultField } from '../../types';
import { getProfileFields, saveProfileField, deleteProfileField } from './db/profileDb';
import { Copy, Check, Plus, Trash2, Edit3, Shield, KeyRound, User, BookOpen, MapPin, Phone, Mail } from 'lucide-react';
import { useToast } from '../../components/Toast';

interface ProfilePageProps {
  user: UserAccount;
  onUserUpdated: (user: UserAccount) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const { toast } = useToast();
  const [fields, setFields] = useState<ProfileVaultField[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // New custom field modal/inline form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<ProfileVaultField['category']>('academic');

  useEffect(() => {
    loadFields();
  }, [user.id]);

  const loadFields = async () => {
    const list = await getProfileFields(user.id);
    setFields(list);
  };

  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ type: 'success', title: 'Copied to Clipboard', message: `${label} has been copied.` });
    setTimeout(() => {
      setCopiedId(prev => (prev === id ? null : prev));
    }, 2000);
  };

  const startEdit = (field: ProfileVaultField) => {
    setEditingFieldId(field.id);
    setEditValue(field.value);
  };

  const saveEdit = async (field: ProfileVaultField) => {
    const updated = { ...field, value: editValue.trim() };
    await saveProfileField(updated, user.id);
    setEditingFieldId(null);
    await loadFields();
    toast({ type: 'success', title: 'Vault Updated', message: `${field.label} updated successfully.` });
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete field "${label}" from your personal vault?`)) return;
    await deleteProfileField(id);
    await loadFields();
    toast({ type: 'info', title: 'Field Removed', message: `${label} removed from vault.` });
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim()) return;

    const newField: ProfileVaultField = {
      id: 'field_' + Math.random().toString(36).substring(2, 9),
      label: newLabel.trim(),
      value: newValue.trim(),
      category: newCategory,
    };

    await saveProfileField(newField, user.id);
    setShowAddModal(false);
    setNewLabel('');
    setNewValue('');
    await loadFields();
    toast({ type: 'success', title: 'Vault Field Added', message: `Added ${newField.label} to your profile vault.` });
  };

  // Group fields by category
  const categories: { id: ProfileVaultField['category']; label: string; icon: any }[] = [
    { id: 'academic', label: 'Academic & Institute Identifiers', icon: BookOpen },
    { id: 'contact', label: 'Addresses & Direct Contact', icon: MapPin },
    { id: 'personal', label: 'Personal & Vital Information', icon: User },
    { id: 'identification', label: 'Identity Documents & Passes', icon: Shield },
    { id: 'custom', label: 'Custom & Application Attributes', icon: Plus },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Top Profile Summary Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xl">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {user.name}
                </h1>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 rounded">
                  PASSKEY PROTECTED
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {user.college} · <span className="font-mono text-neutral-700 dark:text-neutral-300">{user.rollNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Field</span>
            </button>
          </div>
        </div>

        {/* Account Metadata Row */}
        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-neutral-400 block">Locker ID</span>
            <span className="font-mono text-neutral-800 dark:text-neutral-200">{user.id}</span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">Account Status</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Owner-Only Active</span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">Biometric Credentials</span>
            <span className="text-neutral-700 dark:text-neutral-300">TouchID / Passkey</span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">Storage Allocated</span>
            <span className="font-mono text-neutral-800 dark:text-neutral-200">100 MB Quota</span>
          </div>
        </div>
      </div>

      {/* Personal Info Vault Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Personal Information Vault
            </h2>
            <p className="text-xs text-neutral-500">
              Instant 1-click copy for job forms, scholarship applications, and verification.
            </p>
          </div>
        </div>

        {categories.map(cat => {
          const categoryFields = fields.filter(f => f.category === cat.id);
          if (categoryFields.length === 0 && cat.id === 'custom') return null;

          const CategoryIcon = cat.icon;

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs"
            >
              {/* Category Header */}
              <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <CategoryIcon className="w-4 h-4 text-indigo-500" />
                  <span>{cat.label}</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                  {categoryFields.length} {categoryFields.length === 1 ? 'field' : 'fields'}
                </span>
              </div>

              {/* Category Fields List */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {categoryFields.map(field => {
                  const isCopied = copiedId === field.id;
                  const isEditing = editingFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-medium text-neutral-400 block mb-0.5">
                          {field.label}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              autoFocus
                              className="w-full px-2.5 py-1 text-xs rounded border border-indigo-500 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none"
                            />
                            <button
                              onClick={() => saveEdit(field)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFieldId(null)}
                              className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 select-all font-mono break-all">
                            {field.isSensitive ? '••••••••' + field.value.slice(-4) : field.value}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleCopy(field.value, field.id, field.label)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                              isCopied
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                            }`}
                            title="Copy to clipboard"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => startEdit(field)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Edit value"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {field.category === 'custom' && (
                            <button
                              onClick={() => handleDelete(field.id, field.label)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                              title="Delete field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
              Add Personal Vault Field
            </h3>

            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Field Label
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  required
                  placeholder="e.g. LinkedIn URL, GitHub Profile, Passport"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Field Value
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  required
                  placeholder="e.g. https://linkedin.com/in/student-profile"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Section
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="academic">Academic & Institute</option>
                  <option value="contact">Addresses & Contact</option>
                  <option value="personal">Personal Info</option>
                  <option value="identification">Identification</option>
                  <option value="custom">Custom Application</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Add Field to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
