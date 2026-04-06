import { IconUser, IconBell, IconShield, IconCreditCard } from "../icons";
import { ReactElement } from "react";

export interface SettingsTab {
  id: string;
  label: string;
  // Binago natin ito para tanggapin ang Component function
  icon: () => ReactElement; 
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'profile', label: 'Profile Information', icon: IconUser },
  { id: 'notifications', label: 'Notifications', icon: IconBell },
  { id: 'security', label: 'Password & Security', icon: IconShield },
  { id: 'billing', label: 'Billing & Subscription', icon: IconCreditCard },
];

export const USER_MOCK = {
  name: "Dr. Danilo M. Vicera",
  role: "Cardiologist • General Hospital",
  email: "danilo.vicera@wellcare.com",
  phone: "+63 912 345 6789",
  initials: "DM"
};