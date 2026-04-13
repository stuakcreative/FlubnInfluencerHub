import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Image, Upload, Trash2, Plus, Save, GripVertical, Link as LinkIcon, X, AlertCircle, Check
} from "lucide-react";
import { toast } from "sonner";
import * as api from "../../utils/api";

interface TrustLogo {
  id: string;
  name: string;
  url: string; // base64 data URL or external URL
}

const STORAGE_KEY = "trust_logos";

function generateId() {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function validateImageFile(file: File): boolean {
  if (!file.type.startsWith("image/")) {
    toast.error("Invalid file type", { description: "Please upload PNG, JPG, SVG, or WebP" });
    return false;
  }
  if (file.size > 1 * 1024 * 1024) {
    toast.error("File too large", { description: "Max 1MB per logo" });
    return false;
  }
  return true;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminTrustLogos() {
  const [logos, setLogos] = useState<TrustLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLogos();
  }, []);

  async function loadLogos() {
    try {
      const data = await api.getData(STORAGE_KEY);
      if (data && Array.isArray(data)) {
        setLogos(data);
      }
    } catch (e) {
      console.error("Failed to load trust logos:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveLogos(updated: TrustLogo[]) {
    setSaving(true);
    try {
      await api.saveData(STORAGE_KEY, updated);
      setLogos(updated);
      toast.success("Trust logos saved!");
    } catch (e) {
      console.error("Failed to save trust logos:", e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newLogos: TrustLogo[] = [];
    for (const file of Array.from(files)) {
      if (!validateImageFile(file)) continue;
      const base64 = await readFileAsBase64(file);
      newLogos.push({
        id: generateId(),
        name: file.name.replace(/\.[^.]+$/, ""),
        url: base64,
      });
    }

    if (newLogos.length > 0) {
      const updated = [...logos, ...newLogos];
      await saveLogos(updated);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAddUrl() {
    if (!urlInput.trim()) return;
    const newLogo: TrustLogo = {
      id: generateId(),
      name: nameInput.trim() || "Partner Logo",
      url: urlInput.trim(),
    };
    const updated = [...logos, newLogo];
    saveLogos(updated);
    setUrlInput("");
    setNameInput("");
    setShowUrlModal(false);
  }

  function handleRemove(id: string) {
    const updated = logos.filter((l) => l.id !== id);
    saveLogos(updated);
  }

  function handleNameChange(id: string, name: string) {
    setLogos((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  }

  function handleNameBlur() {
    saveLogos(logos);
  }

  function moveItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= logos.length) return;
    const updated = [...logos];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    saveLogos(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-3 border-[#2F6BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Trust Logos</h1>
          <p className="text-sm text-[#64748b] mt-1">
            Manage partner/brand logos shown in the landing page marquee. {logos.length} logo{logos.length !== 1 ? "s" : ""} uploaded.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUrlModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] hover:bg-[#f8fafc] transition-colors"
          >
            <LinkIcon size={15} />
            Add by URL
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl text-sm hover:bg-[#2558d4] transition-colors"
          >
            <Upload size={15} />
            Upload Logo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Info card */}
      {logos.length === 0 && (
        <div className="bg-[#f0f7ff] border border-[#d4e5ff] rounded-2xl p-6 text-center">
          <Image size={40} className="mx-auto text-[#2F6BFF] mb-3 opacity-50" />
          <h3 className="text-[#1a1a2e] font-semibold mb-1">No custom logos yet</h3>
          <p className="text-sm text-[#64748b] mb-4">
            The landing page is showing default placeholder logos. Upload your partner/brand logos to replace them.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl text-sm hover:bg-[#2558d4] transition-colors"
          >
            <Upload size={15} />
            Upload Your First Logo
          </button>
        </div>
      )}

      {/* Logo Grid */}
      {logos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {logos.map((logo, index) => (
              <motion.div
                key={logo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden group"
              >
                {/* Preview */}
                <div className="h-[100px] bg-[#f8fafc] flex items-center justify-center p-4 border-b border-[#e8edf5]">
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="max-h-[60px] max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='40'%3E%3Crect fill='%23f1f5f9' width='100' height='40' rx='8'/%3E%3Ctext x='50' y='24' text-anchor='middle' fill='%2394a3b8' font-size='10'%3EError%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={logo.name}
                    onChange={(e) => handleNameChange(logo.id, e.target.value)}
                    onBlur={handleNameBlur}
                    className="w-full px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs text-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]/30"
                    placeholder="Logo name"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 text-[#94a3b8] hover:text-[#1a1a2e] disabled:opacity-30 transition-colors"
                        title="Move left"
                      >
                        <GripVertical size={14} />
                      </button>
                      <span className="text-[10px] text-[#94a3b8] self-center">#{index + 1}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(logo.id)}
                      className="p-1.5 text-[#94a3b8] hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* URL Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Add Logo by URL</h3>
                <button onClick={() => setShowUrlModal(false)} className="p-1.5 text-[#94a3b8] hover:text-[#1a1a2e]">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-[#1a1a2e] mb-1">Logo Name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Google, Nike"
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#1a1a2e] mb-1">Image URL</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                  />
                </div>
                {urlInput && (
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex items-center justify-center h-[80px]">
                    <img src={urlInput} alt="Preview" className="max-h-[50px] max-w-full object-contain" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2.5 bg-[#f1f5f9] text-[#64748b] rounded-xl text-sm hover:bg-[#e2e8f0]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl text-sm hover:bg-[#2558d4] disabled:opacity-40"
                >
                  <span className="flex items-center gap-2"><Plus size={15} /> Add Logo</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {saving && (
        <div className="fixed bottom-6 right-6 bg-[#1a1a2e] text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg z-50">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}