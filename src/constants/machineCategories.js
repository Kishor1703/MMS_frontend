export const MACHINE_CATEGORIES = {
  loom: {
    key: "loom",
    label: "Machines",
    single: "Machine",
    badge: "green",
    icon: "🏭",
    route: "looms",
    layoutRoute: "machines",
    idPrefix: "MCH",
    idExample: "MCH-001",
  },
  compressor: {
    key: "compressor",
    label: "Compressors",
    single: "Compressor",
    badge: "blue",
    icon: "⚙",
    route: "compressors",
    layoutRoute: "compressors",
    idPrefix: "COMP",
    idExample: "COMP-001",
  },
  air_dryer: {
    key: "air_dryer",
    label: "Air Dryers",
    single: "Air Dryer",
    badge: "orange",
    icon: "💨",
    route: "air-dryers",
    layoutRoute: "air-dryers",
    idPrefix: "DRY",
    idExample: "DRY-001",
  },
  other: {
    key: "other",
    label: "Other Machines",
    single: "Other Machine",
    badge: "gray",
    icon: "🛠",
    route: "other-machines",
    layoutRoute: "machines",
    idPrefix: "MCH",
    idExample: "MCH-001",
  },
};

export const CATEGORY_OPTIONS = [
  { value: "", label: "All Types", route: "machines" },
  { value: "loom", label: "Machines", route: "looms" },
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