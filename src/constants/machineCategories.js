export const MACHINE_CATEGORIES = {
  loom: { key: "loom", label: "Looms", single: "Loom", badge: "green", icon: "🪡", route: "looms" },
  compressor: { key: "compressor", label: "Compressors", single: "Compressor", badge: "blue", icon: "⚙", route: "compressors" },
  air_dryer: { key: "air_dryer", label: "Air Dryers", single: "Air Dryer", badge: "orange", icon: "💨", route: "air-dryers" },
  other: { key: "other", label: "Other Machines", single: "Other Machine", badge: "gray", icon: "🛠", route: "other-machines" },
};

export const CATEGORY_OPTIONS = [
  { value: "", label: "All Types", route: "machines" },
  { value: "loom", label: "Looms", route: "looms" },
  { value: "compressor", label: "Compressors", route: "compressors" },
  { value: "air_dryer", label: "Air Dryers", route: "air-dryers" },
];

export const MACHINE_TYPE_OPTIONS = CATEGORY_OPTIONS.filter((option) => option.value !== "");

export const MACHINE_STATUSES = [
  "Running",
  "Stopped",
  "Under Maintenance",
  "Breakdown",
  "Idle",
];

export const STATUS_META = {
  Running: { label: "Running", dot: "green", color: "#3f7a54" },
  Stopped: { label: "Stopped", dot: "blue", color: "#2f6fbf" },
  "Under Maintenance": { label: "Maintenance", dot: "orange", color: "#c98a2b" },
  Breakdown: { label: "Breakdown", dot: "red", color: "#b23a2e" },
  Idle: { label: "Idle", dot: "gray", color: "#8a7f6c" },
};

export const categoryLabel = (category) =>
  MACHINE_CATEGORIES[category]?.label || "Machine";

export const categoryBadge = (category) =>
  MACHINE_CATEGORIES[category]?.badge || "gray";

// N/A-safe display helper: real values only, "Not Available" otherwise.
export const orNa = (value) =>
  value === null || value === undefined || value === "" ? "Not Available" : value;