// resources/js/pages/user/lab-reviews/lab-reviews-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// All static content, types and mock data for the Lab Reviews page.
// Edit values here — no component needs to change.

// ── Lab submission ────────────────────────────────────────────────────────────

export type LabResultStatus = "pending" | "reviewed" | "critical" | "normal";

export interface LabSubmission {
  id:        string;
  name:      string;
  test:      string;
  timeAgo:   string;
  status:    LabResultStatus;
  initials:  string;
  iconColor: string;   // background for the lab-flask avatar
}

export const labSubmissions: LabSubmission[] = [
  { id: "ls1", name: "Sarah Jenkins",  test: "Blood Panel",     timeAgo: "1h ago",  status: "pending",  initials: "SJ", iconColor: "var(--wc-blue-600)"  },
  { id: "ls2", name: "Michael Chen",   test: "ECG Report",      timeAgo: "3h ago",  status: "critical", initials: "MC", iconColor: "#7c3aed"              },
  { id: "ls3", name: "Emma Wilson",    test: "X-Ray Scan",      timeAgo: "5h ago",  status: "pending",  initials: "EW", iconColor: "#16a34a"              },
  { id: "ls4", name: "Robert Taylor",  test: "Urine Analysis",  timeAgo: "8h ago",  status: "reviewed", initials: "RT", iconColor: "#ca8a04"              },
  { id: "ls5", name: "Alice Cooper",   test: "MRI Brain",       timeAgo: "1d ago",  status: "normal",   initials: "AC", iconColor: "#0891b2"              },
  { id: "ls6", name: "James Miller",   test: "Lipid Profile",   timeAgo: "1d ago",  status: "pending",  initials: "JM", iconColor: "#be185d"              },
  { id: "ls7", name: "Maria Santos",   test: "Thyroid Panel",   timeAgo: "2d ago",  status: "reviewed", initials: "MS", iconColor: "#0056b3"              },
  { id: "ls8", name: "Carlos Reyes",   test: "HbA1c Test",      timeAgo: "2d ago",  status: "critical", initials: "CR", iconColor: "#dc2626"              },
];

// ── Page meta ─────────────────────────────────────────────────────────────────

export const labReviewsMeta = {
  // Page header
  pageTitle:        "Lab Reviews",
  pageSubtitle:     "Review and validate patient laboratory test results",
  backHref:         "/dashboard",

  // Search & filter bar
  searchPlaceholder: "Search by patient or test type…",
  filterLabel:       "Filters",

  // Card
  cardTitle:    "Recent Lab Submissions",
  viewAllLabel: "VIEW ALL",
  viewAllHref:  "/lab-reviews/all",
  reviewLabel:  "Review",

  // Active nav id — must match NavItem.id in dashboard-data.ts
  activeNavId: "labreviews",
};