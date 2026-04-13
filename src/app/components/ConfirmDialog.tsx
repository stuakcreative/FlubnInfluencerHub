import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = {
    danger: {
      icon: "bg-[#fef2f2] text-[#ef4444]",
      button: "bg-[#ef4444] hover:bg-[#dc2626] shadow-lg shadow-[#ef4444]/25",
    },
    warning: {
      icon: "bg-[#fffbeb] text-[#f59e0b]",
      button: "bg-[#f59e0b] hover:bg-[#d97706] shadow-lg shadow-[#f59e0b]/25",
    },
    info: {
      icon: "bg-[#EBF2FF] text-[#2F6BFF]",
      button: "bg-[#2F6BFF] hover:bg-[#0F3D91] shadow-lg shadow-[#2F6BFF]/25",
    },
  };

  const style = colors[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-6"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#1a1a2e] text-lg">{title}</h3>
                <p className="text-[#64748b] text-sm mt-1">{description}</p>
              </div>
              <button onClick={onCancel} className="text-[#94a3b8] hover:text-[#64748b] shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-[#e2e8f0] text-[#64748b] rounded-xl hover:bg-[#f8f9fc] transition-colors text-sm"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 text-white rounded-xl transition-colors text-sm ${style.button}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}