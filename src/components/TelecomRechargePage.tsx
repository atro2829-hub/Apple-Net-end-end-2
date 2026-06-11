"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Search,
  CreditCard,
  Wifi,
  Zap,
  ChevronRight,
  Check,
  Bookmark,
  Smartphone,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import type { User } from "firebase/auth";

/* ────────────────────────────── Data Types ────────────────────────────── */

interface TelecomPackage {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  description: string;
  descriptionEn: string;
  dataAmount?: string;
  duration?: number;
  durationUnit?: string;
  type: "recharge" | "internet" | "voice";
  isActive: boolean;
  subCategory?: string;
}

interface TelecomNetwork {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  bgColor: string;
  icon: string;
  prefixes: string[];
  isActive: boolean;
  providerId?: string;
}

/* ────────────────────────────── Network Prefix Map ────────────────────────────── */

const YEMEN_NETWORKS: Record<string, Omit<TelecomNetwork, "id" | "prefixes" | "isActive" | "providerId">> = {
  sabafon: { name: "سبافون", nameEn: "Sabafon", color: "#6B21A8", bgColor: "#F3E8FF", icon: "📱" },
  you: { name: "يو", nameEn: "YOU", color: "#CA8A04", bgColor: "#FEF9C3", icon: "💛" },
  mtn: { name: "MTN", nameEn: "MTN", color: "#DC2626", bgColor: "#FEE2E2", icon: "🔴" },
  yemenMobile: { name: "يمن موبايل", nameEn: "Yemen Mobile", color: "#2563EB", bgColor: "#DBEAFE", icon: "🔵" },
};

const DEFAULT_NETWORKS: TelecomNetwork[] = [
  { id: "sabafon", ...YEMEN_NETWORKS.sabafon, prefixes: ["71", "70"], isActive: true },
  { id: "you", ...YEMEN_NETWORKS.you, prefixes: ["73", "77"], isActive: true },
  { id: "mtn", ...YEMEN_NETWORKS.mtn, prefixes: ["78"], isActive: true },
  { id: "yemenMobile", ...YEMEN_NETWORKS.yemenMobile, prefixes: ["700", "701", "702", "703", "704", "705"], isActive: true },
];

const DEFAULT_PACKAGES: Record<string, TelecomPackage[]> = {
  sabafon: [
    { id: "sab-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true },
    { id: "sab-2", name: "شحن 1000 ريال", nameEn: "Recharge 1000 YER", price: 1000, description: "شحن رصيد فوري 1000 ريال", descriptionEn: "Instant recharge 1000 YER", type: "recharge", isActive: true },
    { id: "sab-3", name: "باقة 1 جيجا", nameEn: "1 GB Package", price: 800, description: "باقة إنترنت 1 جيجابايت - يومين", descriptionEn: "1 GB Internet - 2 days", dataAmount: "1GB", duration: 2, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "sab-4", name: "باقة 3 جيجا", nameEn: "3 GB Package", price: 2000, description: "باقة إنترنت 3 جيجابايت - أسبوع", descriptionEn: "3 GB Internet - 1 week", dataAmount: "3GB", duration: 7, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "sab-5", name: "باقة مكالمات 60 دقيقة", nameEn: "60 Min Calls", price: 600, description: "60 دقيقة مكالمات - 3 أيام", descriptionEn: "60 minutes calls - 3 days", duration: 3, durationUnit: "يوم", type: "voice", isActive: true },
  ],
  you: [
    { id: "you-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true },
    { id: "you-2", name: "شحن 1000 ريال", nameEn: "Recharge 1000 YER", price: 1000, description: "شحن رصيد فوري 1000 ريال", descriptionEn: "Instant recharge 1000 YER", type: "recharge", isActive: true },
    { id: "you-3", name: "باقة 2 جيجا", nameEn: "2 GB Package", price: 1200, description: "باقة إنترنت 2 جيجابايت - 3 أيام", descriptionEn: "2 GB Internet - 3 days", dataAmount: "2GB", duration: 3, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "you-4", name: "باقة 5 جيجا", nameEn: "5 GB Package", price: 3000, description: "باقة إنترنت 5 جيجابايت - أسبوع", descriptionEn: "5 GB Internet - 1 week", dataAmount: "5GB", duration: 7, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "you-5", name: "باقة مكالمات 120 دقيقة", nameEn: "120 Min Calls", price: 1000, description: "120 دقيقة مكالمات - أسبوع", descriptionEn: "120 minutes calls - 1 week", duration: 7, durationUnit: "يوم", type: "voice", isActive: true },
  ],
  mtn: [
    { id: "mtn-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true },
    { id: "mtn-2", name: "شحن 2000 ريال", nameEn: "Recharge 2000 YER", price: 2000, description: "شحن رصيد فوري 2000 ريال", descriptionEn: "Instant recharge 2000 YER", type: "recharge", isActive: true },
    { id: "mtn-3", name: "باقة 1.5 جيجا", nameEn: "1.5 GB Package", price: 1000, description: "باقة إنترنت 1.5 جيجابايت - يومين", descriptionEn: "1.5 GB Internet - 2 days", dataAmount: "1.5GB", duration: 2, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "mtn-4", name: "باقة مكالمات 90 دقيقة", nameEn: "90 Min Calls", price: 800, description: "90 دقيقة مكالمات - 3 أيام", descriptionEn: "90 minutes calls - 3 days", duration: 3, durationUnit: "يوم", type: "voice", isActive: true },
  ],
  yemenMobile: [
    { id: "ym-1", name: "شحن 500 ريال", nameEn: "Recharge 500 YER", price: 500, description: "شحن رصيد فوري 500 ريال", descriptionEn: "Instant recharge 500 YER", type: "recharge", isActive: true },
    { id: "ym-2", name: "شحن 1000 ريال", nameEn: "Recharge 1000 YER", price: 1000, description: "شحن رصيد فوري 1000 ريال", descriptionEn: "Instant recharge 1000 YER", type: "recharge", isActive: true },
    { id: "ym-3", name: "باقة 2 جيجا", nameEn: "2 GB Package", price: 1500, description: "باقة إنترنت 2 جيجابايت - 3 أيام", descriptionEn: "2 GB Internet - 3 days", dataAmount: "2GB", duration: 3, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "ym-4", name: "باقة 10 جيجا", nameEn: "10 GB Package", price: 5000, description: "باقة إنترنت 10 جيجابايت - شهر", descriptionEn: "10 GB Internet - 1 month", dataAmount: "10GB", duration: 30, durationUnit: "يوم", type: "internet", isActive: true },
    { id: "ym-5", name: "باقة مكالمات 200 دقيقة", nameEn: "200 Min Calls", price: 1500, description: "200 دقيقة مكالمات - أسبوع", descriptionEn: "200 minutes calls - 1 week", duration: 7, durationUnit: "يوم", type: "voice", isActive: true },
  ],
};

/* ────────────────────────────── Helper ────────────────────────────── */

function detectNetwork(phone: string): TelecomNetwork | null {
  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned.startsWith("7") || cleaned.length < 2) return null;

  const after7 = cleaned.slice(1); // digits after the leading 7
  if (!after7) return null;

  // Check 3-digit prefixes first: 700-705 → Yemen Mobile
  if (after7.length >= 2) {
    const first2 = after7.slice(0, 2);
    const first3 = after7.length >= 3 ? after7.slice(0, 3) : null;

    // Yemen Mobile: 700-705
    if (first3 && ["700", "701", "702", "703", "704", "705"].includes(first3)) {
      return DEFAULT_NETWORKS.find((n) => n.id === "yemenMobile") || null;
    }

    // 2-digit matching
    if (first2 === "71") return DEFAULT_NETWORKS.find((n) => n.id === "sabafon") || null;
    if (first2 === "73") return DEFAULT_NETWORKS.find((n) => n.id === "you") || null;
    if (first2 === "77") return DEFAULT_NETWORKS.find((n) => n.id === "you") || null;
    if (first2 === "78") return DEFAULT_NETWORKS.find((n) => n.id === "mtn") || null;

    // 70 without 700-705 → Sabafon
    if (first2 === "70") return DEFAULT_NETWORKS.find((n) => n.id === "sabafon") || null;
  }

  return null;
}

/* ────────────────────────────── Service Tabs ────────────────────────────── */

type ServiceTab = "recharge" | "internet" | "voice";

const SERVICE_TABS: { id: ServiceTab; labelAr: string; labelEn: string; icon: React.ElementType }[] = [
  { id: "recharge", labelAr: "شحن رصيد فوري", labelEn: "Instant Recharge", icon: Zap },
  { id: "internet", labelAr: "باقات الإنترنت", labelEn: "Internet Packages", icon: Wifi },
  { id: "voice", labelAr: "باقات المكالمات", labelEn: "Call Packages", icon: Phone },
];

/* ────────────────────────────── Component ────────────────────────────── */

interface TelecomRechargePageProps {
  user: User | null;
  onAuthClick: () => void;
  onExecute?: (data: { phoneNumber: string; packageId: string; networkId: string; amount: number }) => void;
}

export function TelecomRechargePage({ user, onAuthClick, onExecute }: TelecomRechargePageProps) {
  const { t, isRTL, lang } = useLanguage();
  const isAr = lang === "ar";

  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("applenet_telecom_phone") || "";
    }
    return "";
  });
  const [selectedTab, setSelectedTab] = useState<ServiceTab>("recharge");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [saveNumber, setSaveNumber] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("applenet_telecom_phone");
    }
    return false;
  });
  const [packages, setPackages] = useState<Record<string, TelecomPackage[]>>(DEFAULT_PACKAGES);
  const [networks, setNetworks] = useState<TelecomNetwork[]>(DEFAULT_NETWORKS);

  // Detect network from phone number
  const detectedNetwork = useMemo(() => detectNetwork(phoneNumber), [phoneNumber]);
  const activeNetworkId = selectedNetwork || detectedNetwork?.id || null;

  // Save phone number when toggled
  useEffect(() => {
    if (saveNumber && phoneNumber) {
      localStorage.setItem("applenet_telecom_phone", phoneNumber);
    } else {
      localStorage.removeItem("applenet_telecom_phone");
    }
  }, [saveNumber, phoneNumber]);

  // Load networks from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "telecomNetworks"), (snap) => {
      const data = snap.val();
      if (data) {
        const loaded: TelecomNetwork[] = Object.entries(data)
          .map(([id, val]: [string, unknown]) => ({ id, ...(val as Record<string, unknown>) }))
          .filter((n: Record<string, unknown>) => n.isActive) as TelecomNetwork[];
        if (loaded.length > 0) setNetworks(loaded);
      }
    });
    return () => unsub();
  }, []);

  // Load packages from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "telecomPackages"), (snap) => {
      const data = snap.val();
      if (data) {
        const loaded: Record<string, TelecomPackage[]> = {};
        Object.entries(data).forEach(([networkId, netPkgs]: [string, unknown]) => {
          if (netPkgs && typeof netPkgs === "object") {
            const pkgList = Object.entries(netPkgs as Record<string, unknown>)
              .map(([id, val]: [string, unknown]) => ({ id, ...(val as Record<string, unknown>) }))
              .filter((p: Record<string, unknown>) => p.isActive) as TelecomPackage[];
            if (pkgList.length > 0) loaded[networkId] = pkgList;
          }
        });
        if (Object.keys(loaded).length > 0) setPackages(loaded);
      }
    });
    return () => unsub();
  }, []);

  // Filter packages by network and tab
  const filteredPackages = useMemo(() => {
    if (!activeNetworkId) return [];
    const netPkgs = packages[activeNetworkId] || [];
    return netPkgs.filter((p) => p.type === selectedTab);
  }, [activeNetworkId, packages, selectedTab]);

  // Reset selected package when tab or network changes
  const handleTabChange = (tab: ServiceTab) => {
    setSelectedTab(tab);
    setSelectedPackage(null);
  };

  const handleNetworkClick = (networkId: string) => {
    setSelectedNetwork((prev) => (prev === networkId ? null : networkId));
    setSelectedPackage(null);
  };

  const handleBuy = () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9) {
      toast.error(isAr ? "أدخل رقم هاتف صحيح" : "Enter a valid phone number");
      return;
    }
    if (!selectedPackage) {
      toast.error(isAr ? "اختر باقة أولاً" : "Select a package first");
      return;
    }
    if (!user) {
      onAuthClick();
      return;
    }

    const pkg = filteredPackages.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    const payload = {
      phoneNumber: phoneNumber.replace(/\D/g, ""),
      packageId: selectedPackage,
      networkId: activeNetworkId || "",
      amount: pkg.price,
    };

    if (onExecute) {
      onExecute(payload);
    } else {
      toast.success(isAr ? "سيتم تنفيذ الطلب عبر API" : "The request will be executed via API");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, "");
    if (val.length <= 10) setPhoneNumber(val);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="px-4 pt-4 pb-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#1B7A3D] to-[#22A24D] rounded-2xl p-5 mb-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black">{isAr ? "سداد الاتصالات" : "Telecom Recharge"}</h2>
            <p className="text-sm text-white/80">{isAr ? "شحن رصيد وباقات جميع الشبكات" : "Recharge & packages for all networks"}</p>
          </div>
        </div>
      </div>

      {/* ── Network Logos Row ── */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {networks.map((net) => {
          const isActive = activeNetworkId === net.id;
          return (
            <motion.button
              key={net.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNetworkClick(net.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${isActive ? "scale-110" : "opacity-70"}`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all duration-200"
                style={{
                  backgroundColor: isActive ? net.color : net.bgColor,
                  boxShadow: isActive ? `0 4px 14px ${net.color}40` : "none",
                }}
              >
                <span className={isActive ? "text-white" : ""}>{net.icon}</span>
              </div>
              <span className={`text-[10px] font-bold ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                {isAr ? net.name : net.nameEn}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Phone Input ── */}
      <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
        <div className="relative">
          <div className="absolute top-1/2 -translate-y-1/2 start-3 z-10">
            <Phone className="w-5 h-5 text-gray-400" />
          </div>
          <Input
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={isAr ? "7XXXXXXXX" : "7XXXXXXXX"}
            dir="ltr"
            className="ps-10 pe-20 h-12 text-lg font-mono rounded-xl border-2 focus:border-[#1B7A3D] transition-colors"
            maxLength={10}
          />
          {/* Dynamic network badge */}
          <AnimatePresence mode="wait">
            {(detectedNetwork || (selectedNetwork && networks.find((n) => n.id === selectedNetwork))) && (
              <motion.div
                key={activeNetworkId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/2 -translate-y-1/2 end-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.bgColor,
                }}
              >
                <span className="text-sm">{(detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.icon}</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.color }}
                >
                  {isAr
                    ? (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.name
                    : (detectedNetwork || networks.find((n) => n.id === selectedNetwork))!.nameEn}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save number checkbox */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              saveNumber ? "bg-[#1B7A3D] border-[#1B7A3D]" : "border-gray-300 bg-white"
            }`}
            onClick={() => setSaveNumber(!saveNumber)}
          >
            {saveNumber && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-gray-500">{isAr ? "حفظ الرقم للمرة القادمة" : "Save number for next time"}</span>
        </label>
      </div>

      {/* ── Service Tabs ── */}
      <div className="bg-white rounded-2xl card-shadow p-3 mb-4">
        <div className="flex gap-2">
          {SERVICE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-br from-[#1B7A3D] to-[#22A24D] text-white shadow-md"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Package List ── */}
      <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#1B7A3D]" />
          {selectedTab === "recharge" && (isAr ? "شحن رصيد فوري" : "Instant Recharge")}
          {selectedTab === "internet" && (isAr ? "باقات الإنترنت" : "Internet Packages")}
          {selectedTab === "voice" && (isAr ? "باقات المكالمات" : "Call Packages")}
        </h3>

        <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredPackages.length > 0 ? (
              filteredPackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                return (
                  <motion.button
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => setSelectedPackage(isSelected ? null : pkg.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-l from-[#1B7A3D] to-[#22A24D] text-white shadow-lg"
                        : "bg-gray-50 hover:bg-gray-100 active:scale-[0.98]"
                    }`}
                  >
                    {/* Price badge */}
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${
                        isSelected ? "bg-white/20" : "bg-yellow-400"
                      }`}
                    >
                      <span className={`text-sm font-black ${isSelected ? "text-white" : "text-yellow-900"}`}>
                        {pkg.price}
                      </span>
                      <span className={`text-[9px] font-bold ${isSelected ? "text-white/80" : "text-yellow-800"}`}>
                        {isAr ? "ريال" : "YER"}
                      </span>
                    </div>

                    {/* Package info */}
                    <div className="flex-1 text-start min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-gray-900"}`}>
                        {isAr ? pkg.name : pkg.nameEn}
                      </p>
                      <p className={`text-xs truncate ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                        {isAr ? pkg.description : pkg.descriptionEn}
                      </p>
                      {pkg.duration && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                            {pkg.duration} {pkg.durationUnit || (isAr ? "يوم" : "days")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Check icon for selected */}
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </motion.div>
                    )}

                    {/* Chevron for unselected */}
                    {!isSelected && (
                      <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 ${isRTL ? "rotate-180" : ""}`} />
                    )}
                  </motion.button>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-bold">
                  {activeNetworkId
                    ? isAr
                      ? "لا توجد باقات متاحة"
                      : "No packages available"
                    : isAr
                      ? "أدخل رقم الهاتف لعرض الباقات"
                      : "Enter phone number to see packages"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Buy Button ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={handleBuy}
          disabled={!selectedPackage || !phoneNumber}
          className="w-full h-13 text-base font-black rounded-2xl bg-gradient-to-l from-[#1B7A3D] to-[#22A24D] hover:from-[#166B34] hover:to-[#1E9444] text-white shadow-lg shadow-green-200 disabled:opacity-40 disabled:shadow-none transition-all duration-200"
        >
          <Bookmark className="w-5 h-5 me-2" />
          {isAr ? "شراء" : "Buy"}
          {selectedPackage && filteredPackages.find((p) => p.id === selectedPackage) && (
            <span className="ms-2 opacity-80">
              — {filteredPackages.find((p) => p.id === selectedPackage)!.price} {isAr ? "ريال" : "YER"}
            </span>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
