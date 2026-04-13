import { useState, useEffect } from "react";
import { DollarSign, Plus, Edit2, Trash2, Check, X, Download, Star, Eye, EyeOff, Send, MessageSquare, Infinity, Search, Target } from "lucide-react";
import { type PricingPlan } from "../../data/mock-data";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import {
  getPricingPlans,
  savePricingPlans,
  addPricingPlan,
  updatePricingPlan,
  deletePricingPlan as deletePlan,
} from "../../utils/dataManager";

export default function AdminPricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [formData, setFormData] = useState<Partial<PricingPlan>>({
    name: "",
    price: 0,
    billingCycle: "monthly",
    description: "",
    features: [],
    popular: false,
    featured: false,
    status: "active",
    dailyMessageLimit: 0,
  });
  const [featureInput, setFeatureInput] = useState("");
  const [unlimitedMessages, setUnlimitedMessages] = useState(false);

  useEffect(() => {
    setPlans(getPricingPlans());
  }, []);

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index) || [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      // Update existing plan
      setPlans(plans.map((p) => (p.id === editingPlan.id ? { ...editingPlan, ...formData } : p)));
      updatePricingPlan(editingPlan.id, { ...editingPlan, ...formData });
      broadcastPricingUpdate();
      toast.success("Pricing plan updated successfully!");
    } else {
      // Add new plan
      const newPlan: PricingPlan = {
        id: `p${Date.now()}`,
        name: formData.name || "",
        price: formData.price || 0,
        yearlyPrice: formData.yearlyPrice,
        billingCycle: formData.billingCycle || "monthly",
        description: formData.description || "",
        features: formData.features || [],
        popular: formData.popular || false,
        featured: formData.featured || false,
        status: formData.status || "active",
        collaborationLimit: formData.collaborationLimit,
        dailyMessageLimit: formData.dailyMessageLimit ?? 0,
        activeCampaigns: formData.activeCampaigns,
        createdDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
      setPlans([...plans, newPlan]);
      addPricingPlan(newPlan);
      broadcastPricingUpdate();
      toast.success("New pricing plan added successfully!");
    }
    handleCloseModal();
  };

  const handleEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setUnlimitedMessages(plan.dailyMessageLimit === -1);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this pricing plan?")) {
      setPlans(plans.filter((p) => p.id !== id));
      deletePlan(id);
      broadcastPricingUpdate();
      toast.success("Pricing plan deleted successfully!");
    }
  };

  const broadcastPricingUpdate = () => {
    window.dispatchEvent(new CustomEvent("pricingPlansUpdated"));
  };

  const handleToggleFeatured = (id: string) => {
    const updatedPlans = plans.map((p) =>
      p.id === id ? { ...p, featured: !p.featured } : p
    );
    setPlans(updatedPlans);
    savePricingPlans(updatedPlans);
    broadcastPricingUpdate();
    const toggled = updatedPlans.find((p) => p.id === id);
    toast.success(
      toggled?.featured
        ? "✅ Plan is now featured on Homepage & Pricing page!"
        : "Plan removed from Homepage & Pricing page."
    );
  };

  const handleToggleStatus = (id: string) => {
    const updatedPlans = plans.map((p) => (p.id === id ? { ...p, status: p.status === "active" ? "inactive" as const : "active" as const } : p));
    setPlans(updatedPlans);
    savePricingPlans(updatedPlans);
    broadcastPricingUpdate();
    toast.success("Plan status updated!");
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingPlan(null);
    setFormData({
      name: "",
      price: 0,
      billingCycle: "monthly",
      description: "",
      features: [],
      popular: false,
      featured: false,
      status: "active",
      dailyMessageLimit: 0,
    });
    setFeatureInput("");
    setUnlimitedMessages(false);
  };

  const handleExport = () => {
    const exportData = plans.map((plan) => ({
      Name: plan.name,
      Price: `₹${plan.price}`,
      "Billing Cycle": plan.billingCycle,
      Description: plan.description,
      Features: plan.features.join("; "),
      Popular: plan.popular ? "Yes" : "No",
      Status: plan.status,
      "Daily Chat Limit": plan.dailyMessageLimit === -1 ? "Unlimited" : plan.dailyMessageLimit === 0 ? "No access" : plan.dailyMessageLimit,
      "Active Campaigns": plan.activeCampaigns === undefined ? "Default" : plan.activeCampaigns === -1 ? "Unlimited" : plan.activeCampaigns,
      "Created Date": plan.createdDate,
    }));
    exportToCSV(exportData, "pricing-plans");
    toast.success("Pricing plans exported successfully!");
  };

  const activePlans = plans.filter((p) => p.status === "active");
  const inactivePlans = plans.filter((p) => p.status === "inactive");

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">Pricing Management</h1>
            <p className="text-sm text-[#64748b] mt-1">Manage subscription plans and pricing</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] rounded-xl hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25 text-sm whitespace-nowrap"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add New Plan</span>
              <span className="sm:hidden">Add Plan</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign size={20} className="text-[#2F6BFF]" />
              <span className="text-xs text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{activePlans.length}</p>
            <p className="text-sm text-[#64748b]">Active Plans</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <Star size={20} className="text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded-full">Popular</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{plans.filter((p) => p.popular).length}</p>
            <p className="text-sm text-[#64748b]">Featured Plans</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <EyeOff size={20} className="text-[#94a3b8]" />
              <span className="text-xs text-[#94a3b8] bg-[#f8f9fc] px-2 py-0.5 rounded-full">Inactive</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{inactivePlans.length}</p>
            <p className="text-sm text-[#64748b]">Inactive Plans</p>
          </div>
        </div>

        {/* Pricing Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border-2 p-6 relative flex flex-col ${
                plan.popular ? "border-[#2F6BFF]" : "border-[#e2e8f0]"
              } ${plan.status === "inactive" ? "opacity-60" : ""}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-3 py-1 bg-[#2F6BFF] text-white text-xs rounded-full shadow-lg flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    Popular
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => handleToggleStatus(plan.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 ${
                    plan.status === "active"
                      ? "bg-[#ecfdf5] text-[#10b981]"
                      : "bg-[#f8f9fc] text-[#94a3b8]"
                  }`}
                >
                  {plan.status === "active" ? <Eye size={10} /> : <EyeOff size={10} />}
                  {plan.status}
                </button>
              </div>

              <div className="mt-2 mb-4">
                <h3 className="text-xl text-[#1a1a2e] mb-1">{plan.name}</h3>
                <p className="text-sm text-[#64748b]">{plan.description}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl text-[#1a1a2e]">₹{plan.price.toLocaleString()}</span>
                  <span className="text-sm text-[#64748b]">/mo</span>
                </div>
                {plan.yearlyPrice && (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg text-[#1a1a2e]">₹{Math.round(plan.yearlyPrice / 12).toLocaleString()}</span>
                      <span className="text-xs text-[#64748b]">/mo when billed yearly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">
                        Save ₹{((plan.price * 12) - plan.yearlyPrice).toLocaleString()}/year
                      </span>
                    </div>
                  </div>
                )}
                {plan.collaborationLimit && (
                  <div className="mt-2 px-2 py-1 bg-[#EBF2FF] text-[#2F6BFF] rounded-lg text-xs inline-flex items-center gap-1">
                    <Send size={12} />
                    {plan.collaborationLimit} requests/month
                  </div>
                )}
                {/* Daily Chat Limit badge */}
                <div className={`mt-2 px-2 py-1 rounded-lg text-xs inline-flex items-center gap-1 ml-1 ${
                  plan.dailyMessageLimit === 0
                    ? "bg-[#fef2f2] text-[#ef4444]"
                    : plan.dailyMessageLimit === -1
                    ? "bg-[#ecfdf5] text-[#10b981]"
                    : "bg-[#f5f3ff] text-[#7c3aed]"
                }`}>
                  {plan.dailyMessageLimit === -1 ? <Infinity size={12} /> : <MessageSquare size={12} />}
                  {plan.dailyMessageLimit === -1
                    ? "Unlimited chat"
                    : plan.dailyMessageLimit === 0
                    ? "No chat"
                    : `${plan.dailyMessageLimit} msgs/day`}
                </div>
                {/* Campaign templates badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {plan.campaignTemplates !== undefined && (
                    <span className={`px-2 py-1 rounded-lg text-xs inline-flex items-center gap-1 ${
                      plan.campaignTemplates === -1 ? "bg-[#ecfdf5] text-[#10b981]" : plan.campaignTemplates === 0 ? "bg-[#fef2f2] text-[#ef4444]" : "bg-[#faf5ff] text-[#8b5cf6]"
                    }`}>
                      <Target size={10} />
                      {plan.campaignTemplates === -1 ? "Unlimited" : plan.campaignTemplates === 0 ? "No" : plan.campaignTemplates} templates
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-[#64748b]">
                    <Check size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-[#e2e8f0] mt-auto">
                <button
                  onClick={() => handleEdit(plan)}
                  className="flex-1 py-2 bg-[#f8f9fc] text-[#2F6BFF] rounded-lg hover:bg-[#EBF2FF] transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="flex-1 py-2 bg-[#fef2f2] text-[#ef4444] rounded-lg hover:bg-[#fee2e2] transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

              <p className="text-xs text-[#94a3b8] text-center mt-3">
                Created: {plan.createdDate}
                {plan.updatedDate && (
                  <span className="block text-[#2F6BFF]/70">Updated: {plan.updatedDate}</span>
                )}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl text-[#1a1a2e]">{editingPlan ? "Edit" : "Add New"} Pricing Plan</h2>
                <button onClick={handleCloseModal} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Plan Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Pro"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Collaboration Limit *</label>
                    <input
                      type="number"
                      value={formData.collaborationLimit || ""}
                      onChange={(e) => setFormData({ ...formData, collaborationLimit: Number(e.target.value) })}
                      placeholder="e.g. 50"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                      min="1"
                    />
                  </div>
                </div>

                {/* Daily Chat Message Limit */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-[#7c3aed]" />
                    Daily Chat Message Limit *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={unlimitedMessages ? "" : (formData.dailyMessageLimit ?? 0)}
                      onChange={(e) => setFormData({ ...formData, dailyMessageLimit: Number(e.target.value) })}
                      placeholder="e.g. 100  (0 = no access)"
                      disabled={unlimitedMessages}
                      className="flex-1 px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] disabled:opacity-40 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0"
                    />
                    <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap text-sm text-[#64748b] bg-[#f5f3ff] border border-[#e9d5ff] px-3 py-3 rounded-xl hover:bg-[#ede9fe] transition-colors">
                      <input
                        type="checkbox"
                        checked={unlimitedMessages}
                        onChange={(e) => {
                          setUnlimitedMessages(e.target.checked);
                          setFormData({ ...formData, dailyMessageLimit: e.target.checked ? -1 : 0 });
                        }}
                        className="w-4 h-4 rounded border-[#e2e8f0] text-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 accent-[#7c3aed]"
                      />
                      <Infinity size={14} className="text-[#7c3aed]" />
                      Unlimited
                    </label>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    Number of chat messages brands on this plan can send per day. Set 0 to block chat access entirely. -1 = unlimited.
                  </p>
                </div>

                {/* Campaign Templates */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 flex items-center gap-1.5">
                    <Target size={14} className="text-[#8b5cf6]" />
                    Campaign Templates
                  </label>
                  <input
                    type="number"
                    value={formData.campaignTemplates ?? ""}
                    onChange={(e) => setFormData({ ...formData, campaignTemplates: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Free=0, Basic=3, Pro/Enterprise=-1 (unlimited)"
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="-1"
                  />
                  <p className="text-xs text-[#94a3b8] mt-1">-1 = unlimited, 0 = locked. Leave empty for default.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Monthly Price (₹) *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      placeholder="2999"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                    <p className="text-xs text-[#94a3b8] mt-1">Price per month when billed monthly</p>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Yearly Price (₹)</label>
                    <input
                      type="number"
                      value={formData.yearlyPrice || ""}
                      onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="28788"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-[#94a3b8] mt-1">Total for 12 months (optional discount)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2.5 pt-1">
                    <label className="text-sm text-[#64748b] flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.popular ?? false}
                        onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                        className="w-4 h-4 rounded border-[#e2e8f0] text-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20"
                      />
                      Mark as Popular Plan
                    </label>
                    <label className="text-sm text-[#64748b] flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.featured ?? false}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="w-4 h-4 rounded border-[#e2e8f0] text-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20"
                      />
                      <span className="flex items-center gap-1.5">
                        Feature on Homepage
                        <span className="text-[10px] bg-[#EBF2FF] text-[#2F6BFF] px-1.5 py-0.5 rounded-full">Live</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. For growing brands"
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Features *</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                      placeholder="Enter a feature and click Add"
                      className="flex-1 px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-4 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.features?.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[#f8f9fc] rounded-lg border border-[#e2e8f0]"
                      >
                        <div className="flex items-center gap-2 text-sm text-[#1a1a2e]">
                          <Check size={14} className="text-[#10b981]" />
                          {feature}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="text-[#ef4444] hover:text-[#dc2626]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {(!formData.features || formData.features.length === 0) && (
                    <p className="text-xs text-[#94a3b8] mt-2">No features added yet</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 bg-[#f8f9fc] text-[#64748b] rounded-xl hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors shadow-lg shadow-[#2F6BFF]/25"
                  >
                    {editingPlan ? "Update Plan" : "Create Plan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}