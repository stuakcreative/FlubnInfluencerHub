// IP Tracking and Fraud Prevention Utility
import * as api from "./api";

export interface IPRecord {
  ip: string;
  accounts: {
    email: string;
    userId: string;
    createdAt: string;
    plan: "free" | "paid";
  }[];
  firstSeen: string;
  lastSeen: string;
  blocked: boolean;
}

const IP_TRACKING_KEY = "flubn_ip_tracking";
const IP_SETTINGS_KEY = "flubn_ip_settings";

// Simulate getting user's IP address (in production, this would be done server-side)
export function getSimulatedIP(): string {
  // Check if IP is already stored in sessionStorage
  let ip = sessionStorage.getItem("user_ip");
  
  if (!ip) {
    // Generate a simulated IP for demo purposes
    // In production, get this from the server
    ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    sessionStorage.setItem("user_ip", ip);
  }
  
  return ip;
}

// Get IP tracking settings
export function getIPSettings() {
  const settings = localStorage.getItem(IP_SETTINGS_KEY);
  if (settings) {
    return JSON.parse(settings);
  }
  
  // Default settings
  return {
    maxFreeAccountsPerIP: 2, // Maximum free accounts allowed per IP
    enableIPTracking: true,
    autoBlockAfterLimit: true,
  };
}

// Update IP settings
export function updateIPSettings(settings: any) {
  localStorage.setItem(IP_SETTINGS_KEY, JSON.stringify(settings));
  api.saveIPSettings(settings).catch(() => {});
}

// Get all IP records
export function getAllIPRecords(): IPRecord[] {
  const data = localStorage.getItem(IP_TRACKING_KEY);
  return data ? JSON.parse(data) : [];
}

// Get IP record for specific IP
export function getIPRecord(ip: string): IPRecord | null {
  const records = getAllIPRecords();
  return records.find((record) => record.ip === ip) || null;
}

// Track new account creation
export function trackAccountCreation(email: string, userId: string, plan: "free" | "paid"): boolean {
  const settings = getIPSettings();
  
  if (!settings.enableIPTracking) {
    return true; // IP tracking disabled, allow signup
  }
  
  const ip = getSimulatedIP();
  const records = getAllIPRecords();
  const now = new Date().toISOString();
  
  let ipRecord = records.find((record) => record.ip === ip);
  
  if (!ipRecord) {
    // New IP, create record
    ipRecord = {
      ip,
      accounts: [],
      firstSeen: now,
      lastSeen: now,
      blocked: false,
    };
    records.push(ipRecord);
  } else {
    ipRecord.lastSeen = now;
  }
  
  // Check if IP is blocked
  if (ipRecord.blocked) {
    return false;
  }
  
  // Check if this IP has exceeded the free account limit
  if (plan === "free") {
    const freeAccountCount = ipRecord.accounts.filter((acc) => acc.plan === "free").length;
    
    if (freeAccountCount >= settings.maxFreeAccountsPerIP) {
      // Auto-block if enabled
      if (settings.autoBlockAfterLimit) {
        ipRecord.blocked = true;
      }
      localStorage.setItem(IP_TRACKING_KEY, JSON.stringify(records));
      api.saveIPRecords(records).catch(() => {});
      return false;
    }
  }
  
  // Add account to IP record
  ipRecord.accounts.push({
    email,
    userId,
    createdAt: now,
    plan,
  });
  
  // Save updated records
  localStorage.setItem(IP_TRACKING_KEY, JSON.stringify(records));
  api.saveIPRecords(records).catch(() => {});
  
  return true;
}

// Check if IP can create free account
export function canCreateFreeAccount(ip?: string): { allowed: boolean; reason?: string; currentCount?: number; maxCount?: number } {
  const settings = getIPSettings();
  
  if (!settings.enableIPTracking) {
    return { allowed: true };
  }
  
  const userIP = ip || getSimulatedIP();
  const ipRecord = getIPRecord(userIP);
  
  if (!ipRecord) {
    return { allowed: true };
  }
  
  if (ipRecord.blocked) {
    return { 
      allowed: false, 
      reason: "This IP address has been blocked due to suspicious activity." 
    };
  }
  
  const freeAccountCount = ipRecord.accounts.filter((acc) => acc.plan === "free").length;
  
  if (freeAccountCount >= settings.maxFreeAccountsPerIP) {
    return {
      allowed: false,
      reason: `Maximum free accounts (${settings.maxFreeAccountsPerIP}) reached for this IP address.`,
      currentCount: freeAccountCount,
      maxCount: settings.maxFreeAccountsPerIP,
    };
  }
  
  return { 
    allowed: true,
    currentCount: freeAccountCount,
    maxCount: settings.maxFreeAccountsPerIP,
  };
}

// Block/Unblock IP
export function toggleIPBlock(ip: string): void {
  const records = getAllIPRecords();
  const ipRecord = records.find((record) => record.ip === ip);
  
  if (ipRecord) {
    ipRecord.blocked = !ipRecord.blocked;
    localStorage.setItem(IP_TRACKING_KEY, JSON.stringify(records));
    api.saveIPRecords(records).catch(() => {});
  }
}

// Delete IP record
export function deleteIPRecord(ip: string): void {
  const records = getAllIPRecords();
  const filtered = records.filter((record) => record.ip !== ip);
  localStorage.setItem(IP_TRACKING_KEY, JSON.stringify(filtered));
  api.saveIPRecords(filtered).catch(() => {});
}

// Get statistics
export function getIPStatistics() {
  const records = getAllIPRecords();
  const settings = getIPSettings();
  
  const totalIPs = records.length;
  const blockedIPs = records.filter((r) => r.blocked).length;
  const suspiciousIPs = records.filter((r) => {
    const freeCount = r.accounts.filter((a) => a.plan === "free").length;
    return freeCount >= settings.maxFreeAccountsPerIP;
  }).length;
  
  let totalAccounts = 0;
  let freeAccounts = 0;
  let paidAccounts = 0;
  
  records.forEach((record) => {
    totalAccounts += record.accounts.length;
    freeAccounts += record.accounts.filter((a) => a.plan === "free").length;
    paidAccounts += record.accounts.filter((a) => a.plan === "paid").length;
  });
  
  return {
    totalIPs,
    blockedIPs,
    suspiciousIPs,
    totalAccounts,
    freeAccounts,
    paidAccounts,
  };
}