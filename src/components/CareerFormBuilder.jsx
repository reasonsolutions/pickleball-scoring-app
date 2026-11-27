import React, { useState } from 'react';

// Supported field types for the fully custom application form builder
const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Multiple Choice (Radio)' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'Link / URL' },
  { value: 'file', label: 'File Upload (Resume, Portfolio, etc.)' }
];

// Quick-add templates to speed up building common questions.
// These simply pre-fill a new field draft — admins can edit or delete freely.
const QUICK_TEMPLATES = [
  { label: 'Full Name', type: 'text', placeholder: 'Your full name', required: true },
  { label: 'Email Address', type: 'email', placeholder: 'you@example.com', required: true },
  { label: 'Phone Number', type: 'phone', placeholder: '+91 9876543210', required: true },
  { label: 'Resume / CV', type: 'file', placeholder: '', required: true },
  { label: 'LinkedIn Profile', type: 'url', placeholder: 'https://linkedin.com/in/...', required: false },
  { label: 'Portfolio Link', type: 'url', placeholder: 'https://...', required: false },
  { label: 'Cover Letter', type: 'textarea', placeholder: 'Tell us why you are a great fit...', required: false },
  { label: 'Years of Experience', type: 'number', placeholder: 'e.g., 3', required: false }
];

const needsOptions = (type) => ['select', 'radio', 'checkbox'].includes(type);

const emptyField = (overrides = {}) => ({
  id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  type: 'text',
  label: '',
  placeholder: '',
  required: false,
  options: [''],
  ...overrides
});

export default function CareerFormBuilder({ fields = [], onChange }) {
  const [draft, setDraft] = useState(null); // field currently being added/edited
  const [editingId, setEditingId] = useState(null);

  const startAddField = (template = null) => {
    setDraft(emptyField(template ? { ...template, options: needsOptions(template.type) ? [''] : [] } : {}));
    setEditingId(null);
  };

  const startEditField = (field) => {
    setDraft({ ...field, options: field.options?.length ? [...field.options] : [''] });
    setEditingId(field.id);
  };

  const cancelDraft = () => {
    setDraft(null);
    setEditingId(null);
  };

  const saveDraft = () => {
    if (!draft.label.trim()) {
      alert('Please enter a field label/question.');
      return;
    }

    const cleanField = {
      ...draft,
      label: draft.label.trim(),
      placeholder: draft.placeholder?.trim() || '',
      options: needsOptions(draft.type)
        ? draft.options.map(o => o.trim()).filter(Boolean)
        : []
    };

    if (needsOptions(cleanField.type) && cleanField.options.length === 0) {
      alert('Please add at least one option.');
      return;
    }

    if (editingId) {
      onChange(fields.map(f => (f.id === editingId ? cleanField : f)));
    } else {
      onChange([...fields, cleanField]);
    }

    setDraft(null);
    setEditingId(null);
  };

  const removeField = (id) => {
    if (!confirm('Remove this field from the application form?')) return;
    onChange(fields.filter(f => f.id !== id));
  };

  const moveField = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    onChange(updated);
  };

  const updateDraftOption = (index, value) => {
    const options = [...draft.options];
    options[index] = value;
    setDraft({ ...draft, options });
  };

  const addDraftOption = () => {
    setDraft({ ...draft, options: [...draft.options, ''] });
  };

  const removeDraftOption = (index) => {
    const options = draft.options.filter((_, i) => i !== index);
    setDraft({ ...draft, options: options.length ? options : [''] });
  };

  const fieldTypeLabel = (type) => FIELD_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Build your application form from scratch. Add any fields you need — nothing is pre-set or mandatory.
        </p>
        <p className="text-xs text-gray-500 mb-2">Quick add common fields:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => startAddField(tpl)}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-white border border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-600 transition-colors"
            >
              + {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Existing fields list */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{field.label}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {fieldTypeLabel(field.type)}
                    </span>
                    {field.required && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        Required
                      </span>
                    )}
                  </div>
                  {field.placeholder && (
                    <p className="text-xs text-gray-500">Placeholder: {field.placeholder}</p>
                  )}
                  {needsOptions(field.type) && field.options?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Options: {field.options.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditField(field)}
                    className="p-1.5 text-blue-500 hover:text-blue-700"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="p-1.5 text-red-500 hover:text-red-700"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && !draft && (
        <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          No fields added yet. Use a quick-add button above or create a custom field below.
        </div>
      )}

      {/* Draft field editor */}
      {draft ? (
        <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50 space-y-4">
          <h4 className="font-semibold text-gray-900">{editingId ? 'Edit Field' : 'New Field'}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value, options: draft.options?.length ? draft.options : [''] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question / Label *
            </label>
            <input
              type="text"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Why do you want to join our team?"
            />
          </div>

          {!needsOptions(draft.type) && draft.type !== 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder (optional)</label>
              <input
                type="text"
                value={draft.placeholder}
                onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Hint text shown inside the input"
              />
            </div>
          )}

          {needsOptions(draft.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options *</label>
              <div className="space-y-2">
                {draft.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateDraftOption(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeDraftOption(idx)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDraftOption}
                className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Option
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={saveDraft}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium text-sm"
            >
              {editingId ? 'Save Changes' : 'Add Field'}
            </button>
            <button
              type="button"
              onClick={cancelDraft}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => startAddField()}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Question
        </button>
      )}
    </div>
  );
}
