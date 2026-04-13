// resources/js/types/index.ts

import type { NotificationItem } from "@/design-system/components/notification-bell";

export interface PageProps {
  auth: {
    user: {
      id:         number;
      email:      string;
      name:       string;
      first_name: string;
      last_name:  string;
      roles:      string[];
    } | null;
  };
  // Shared on every page via HandleInertiaRequests middleware
  notifications: NotificationItem[];
  unreadCount:   number;
  flash?: {
    success?: string;
    error?:   string;
  };
  // Required by Inertia's usePage<T> constraint
  [key: string]: unknown;
}

export interface User {
  id:         number;
  email:      string;
  name:       string;
  first_name: string;
  last_name:  string;
  roles:      string[];
}

export interface Appointment {
  id:     number;
  date:   string;
  status: "requested" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";
}