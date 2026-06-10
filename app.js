const STORAGE_KEY = "campaign-log-web-app-v1";
const AUTH_KEY = "campaign-log-login-v1";
const USERS_KEY = "campaign-log-users-v1";
const CLOUD_SYNC_DELAY = 1200;
const CLOUD_REFRESH_INTERVAL = 60000;
const HARDCODED_DRIVE_SYNC_URL = "https://script.google.com/macros/s/AKfycbwwV7Ymr4WLaJ43KlLuhf5XjYI7zSzeNK6wJVotEDPZ1C3YbbivXzMEFW2-7jl935oQPA/exec";
const DEFAULT_ADMIN = {
  username: "admin",
  name: "Admin",
  password: "YWRtaW4xMjM=",
  role: "admin",
  projects: ["All Projects"],
  active: true,
  createdAt: "2026-06-09T00:00:00.000Z",
};
let authMode = "signin";
let cloudSyncTimer;
let cloudRefreshTimer;
let hasLoadedCloudOnOpen = false;
let isLoadingCloud = false;

const platformOptions = ["Meta", "Google", "YouTube", "LinkedIn", "TikTok", "Email", "Other"];
const statusOptions = ["Active", "Learning", "Needs Action", "Paused", "Scaled", "Testing", "Completed", "On Hold"];
const changeTypes = [
  "Image / Creative",
  "Audience / Targeting",
  "Budget",
  "Bid / Optimization",
  "Landing Page",
  "Copy / CTA",
  "Placement",
  "Schedule",
  "Other",
];
const owners = ["Marketing", "Creative", "Performance", "Sales", "Client"];
const nextActions = ["No Change", "Monitor", "Improve Creative", "Change Targeting", "Reduce Budget", "Scale", "Pause"];
const defaultMetrics = [
  { name: "CPA/CPL", direction: "lower" },
  { name: "ROAS", direction: "higher" },
  { name: "CTR", direction: "higher" },
  { name: "CVR", direction: "higher" },
  { name: "Leads", direction: "higher" },
  { name: "SVC", direction: "higher" },
  { name: "SVC %", direction: "higher" },
  { name: "Booked", direction: "higher" },
  { name: "Booked %", direction: "higher" },
];
const defaultTrackerColumnIds = [
  "date", "project", "id", "name", "adsetName", "platform", "objective", "status", "lastEdited", "lastChange",
  "metric", "before", "after", "budget", "spend", "impressions", "clicks", "leads", "svc", "booked",
  "revenue", "ctr", "cvr", "svcRate", "bookedRate", "cpa", "roas", "flag", "performance",
];
const importTemplates = {
  campaigns: [
    "Date", "Project", "Ad Account ID", "Campaign ID", "Name", "Ad Set Name", "Platform", "Placement", "Country", "Age", "Device", "Objective", "Budget",
    "Metric", "Before Value", "After Value", "Spend", "Impressions", "Clicks", "Leads", "SVC", "Booked", "Revenue",
  ],
  changes: [
    "Change ID", "Date", "Project", "Ad Account ID", "Campaign ID", "Ad Set Name", "Campaign Status", "Type", "Changed", "Reason", "Metric",
    "Before Value", "After Value", "Leads", "SVC", "Booked", "Owner", "Follow-up", "Next Action",
  ],
  projects: ["Project", "Ad Account ID"],
  metrics: ["Metric", "Improvement Direction"],
  targets: [
    "Month", "Project", "Medium", "Budget", "Spend",
    "Total Lead Target", "Total Lead Achieved", "Digital Lead Target", "Digital Lead Achieved", "BTL Lead Target", "BTL Lead Achieved",
    "Lead Allocation", "Site Visit", "Booking",
    "Week 1 Spend", "Week 1 Total Lead Achieved", "Week 1 Digital Lead Achieved", "Week 1 BTL Lead Achieved", "Week 1 Lead Allocation", "Week 1 Site Visit", "Week 1 Booking",
    "Week 2 Spend", "Week 2 Total Lead Achieved", "Week 2 Digital Lead Achieved", "Week 2 BTL Lead Achieved", "Week 2 Lead Allocation", "Week 2 Site Visit", "Week 2 Booking",
    "Week 3 Spend", "Week 3 Total Lead Achieved", "Week 3 Digital Lead Achieved", "Week 3 BTL Lead Achieved", "Week 3 Lead Allocation", "Week 3 Site Visit", "Week 3 Booking",
    "Week 4 Spend", "Week 4 Total Lead Achieved", "Week 4 Digital Lead Achieved", "Week 4 BTL Lead Achieved", "Week 4 Lead Allocation", "Week 4 Site Visit", "Week 4 Booking",
    "Week 5 Spend", "Week 5 Total Lead Achieved", "Week 5 Digital Lead Achieved", "Week 5 BTL Lead Achieved", "Week 5 Lead Allocation", "Week 5 Site Visit", "Week 5 Booking",
  ],
  targetWeekly: ["Month", "Week", "Project", "Medium", "Spend", "Total Lead Achieved", "Digital Lead Achieved", "BTL Lead Achieved", "Lead Allocation", "Site Visit", "Booking"],
  portal: ["Date", "Portal", "Project", "Generated", "SVS", "SVC", "Generated Walk-in", "Gross Nos", "Net Nos"],
  creatives: ["Date", "Project", "Campaign ID", "Campaign Name", "Ad Set Name", "Creative Name", "Creative Type", "Image URL", "Platform", "Spend", "Impressions", "Clicks", "Leads", "SVC", "Booked", "Status", "Remarks"],
};

const sampleState = {
  filters: {
    project: "All Projects",
    startDate: "",
    endDate: "",
    portalPeriod: "range",
    portalStartDate: "",
    portalEndDate: "",
    creativeProject: "All Projects",
    creativeCampaign: "All Campaigns",
    creativeType: "All Types",
    creativeStartDate: "",
    creativeEndDate: "",
  },
  trackerColumns: structuredClone(defaultTrackerColumnIds),
  targetMonth: "2026-06",
  targetWeek: "total",
  targetProject: "All Projects",
  targetView: "all",
  targetSearch: "",
  portalMonth: "2026-05",
  portalProject: "All Projects",
  portalFilter: "All Portals",
  users: [structuredClone(DEFAULT_ADMIN)],
  projects: [
    { name: "Main Project", adAccountId: "" },
    { name: "Audience Test", adAccountId: "" },
  ],
  metrics: structuredClone(defaultMetrics),
  settings: {
    targetCpa: 500,
    minRoas: 2.5,
    minCtr: 1.5,
    minCvr: 2,
    reviewDays: 3,
    warningSpend: 1000,
    driveSyncUrl: HARDCODED_DRIVE_SYNC_URL,
    autoCloudSync: true,
  },
  campaigns: [
    {
      date: "2026-06-01",
      project: "Main Project",
      id: "CMP-001",
      name: "Summer Lead Gen",
      adsetName: "Core Lead Audience",
      platform: "Meta",
      placement: "Feed",
      country: "India",
      age: "25-34",
      device: "Mobile",
      objective: "Leads",
      status: "Active",
      metric: "CPA/CPL",
      before: 75,
      after: 61.76,
      budget: 5000,
      spend: 4200,
      impressions: 88000,
      clicks: 1320,
      leads: 68,
      svc: 24,
      booked: 8,
      revenue: 0,
    },
    {
      date: "2026-06-01",
      project: "Main Project",
      id: "CMP-002",
      name: "Retargeting Sales",
      adsetName: "Search Retargeting",
      platform: "Google",
      placement: "Search",
      country: "India",
      age: "35-44",
      device: "Desktop",
      objective: "Sales",
      status: "Active",
      metric: "ROAS",
      before: 2.8,
      after: 3.23,
      budget: 7000,
      spend: 6500,
      impressions: 55000,
      clicks: 2100,
      leads: 120,
      svc: 45,
      booked: 18,
      revenue: 21000,
    },
    {
      date: "2026-06-01",
      project: "Audience Test",
      id: "CMP-003",
      name: "New Audience Test",
      adsetName: "New Audience 18-24",
      platform: "Meta",
      placement: "Stories",
      country: "India",
      age: "18-24",
      device: "Mobile",
      objective: "Leads",
      status: "Learning",
      metric: "CPA/CPL",
      before: 220,
      after: 175,
      budget: 3000,
      spend: 1400,
      impressions: 61000,
      clicks: 430,
      leads: 8,
      svc: 2,
      booked: 0,
      revenue: 0,
    },
  ],
  changes: [
    {
      id: "CHG-001",
      date: "2026-06-02",
      campaignId: "CMP-003",
      adsetName: "New Audience 18-24",
      campaignStatus: "Needs Action",
      type: "Image / Creative",
      changed: "Changed main image to product-use image",
      reason: "Low CTR and high CPL",
      metric: "CPA/CPL",
      before: 175,
      after: 120,
      leads: 8,
      svc: 2,
      booked: 0,
      owner: "Creative",
      followUp: "2026-06-05",
      nextAction: "Monitor",
    },
    {
      id: "CHG-002",
      date: "2026-06-02",
      campaignId: "CMP-001",
      adsetName: "Core Lead Audience",
      campaignStatus: "Active",
      type: "Audience / Targeting",
      changed: "Excluded low-quality age group",
      reason: "Leads not converting",
      metric: "CPA/CPL",
      before: 62,
      after: 0,
      leads: 68,
      svc: 24,
      booked: 8,
      owner: "Performance",
      followUp: "2026-06-05",
      nextAction: "Monitor",
    },
  ],
  targets: [
    { month: "2026-06", project: "One World", medium: "Recovery & Active SV", budget: 0, spend: 0, totalLeadTarget: 0, totalLeadAchieved: 0, digitalLeadTarget: 0, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 0, siteVisit: 0, booking: 8, weeks: {} },
    { month: "2026-06", project: "One World", medium: "Online_Meta", budget: 440000, spend: 0, totalLeadTarget: 400, totalLeadAchieved: 0, digitalLeadTarget: 400, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 120, siteVisit: 30, booking: 3, weeks: {} },
    { month: "2026-06", project: "One World", medium: "Online_Google / Website", budget: 257143, spend: 0, totalLeadTarget: 143, totalLeadAchieved: 0, digitalLeadTarget: 143, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 57, siteVisit: 20, booking: 2, weeks: {} },
    { month: "2026-06", project: "One World", medium: "OOH / Walkin / Fluteboard / Direction signage", budget: 461538, spend: 0, totalLeadTarget: 132, totalLeadAchieved: 0, digitalLeadTarget: 0, digitalLeadAchieved: 0, btlLeadTarget: 132, btlLeadAchieved: 0, leadAllocation: 46, siteVisit: 30, booking: 3, weeks: {} },
    { month: "2026-06", project: "One World", medium: "BTL/Activation / Expos", budget: 204082, spend: 0, totalLeadTarget: 82, totalLeadAchieved: 0, digitalLeadTarget: 0, digitalLeadAchieved: 0, btlLeadTarget: 82, btlLeadAchieved: 0, leadAllocation: 29, siteVisit: 10, booking: 1, weeks: {} },
    { month: "2026-06", project: "One World", medium: "Event", budget: 200000, spend: 0, totalLeadTarget: 0, totalLeadAchieved: 0, digitalLeadTarget: 0, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 0, siteVisit: 10, booking: 1, weeks: {} },
    { month: "2026-06", project: "One World", medium: "Portal", budget: 22222, spend: 0, totalLeadTarget: 56, totalLeadAchieved: 0, digitalLeadTarget: 56, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 25, siteVisit: 10, booking: 1, weeks: {} },
    { month: "2026-06", project: "One World", medium: "Referral", budget: 0, spend: 0, totalLeadTarget: 0, totalLeadAchieved: 0, digitalLeadTarget: 0, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 0, siteVisit: 0, booking: 0, weeks: {} },
    { month: "2026-06", project: "One World", medium: "NRI", budget: 200000, spend: 0, totalLeadTarget: 80, totalLeadAchieved: 0, digitalLeadTarget: 80, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 20, siteVisit: 0, booking: 1, weeks: {} },
  ],
  portalRows: [
    { date: "2026-05-01", month: "2026-05", portal: "Housing", project: "One world", generated: 5, svs: 0, svc: 2, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-01", month: "2026-05", portal: "99 Acres", project: "One world", generated: 6, svs: 0, svc: 1, walkin: 1, gross: 0, net: 0 },
    { date: "2026-05-01", month: "2026-05", portal: "Magicbricks", project: "One world", generated: 5, svs: 3, svc: 3, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-02", month: "2026-05", portal: "Housing", project: "Echo valley", generated: 1, svs: 0, svc: 2, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-02", month: "2026-05", portal: "99 Acres", project: "Echo valley", generated: 6, svs: 0, svc: 0, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-02", month: "2026-05", portal: "Magicbricks", project: "Echo valley", generated: 7, svs: 1, svc: 1, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-02", month: "2026-05", portal: "Roof&floor", project: "Echo valley", generated: 1, svs: 0, svc: 0, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-03", month: "2026-05", portal: "Housing", project: "Vivaana", generated: 3, svs: 0, svc: 1, walkin: 0, gross: 0, net: 0 },
    { date: "2026-05-03", month: "2026-05", portal: "99 Acres", project: "Vivaana", generated: 5, svs: 0, svc: 3, walkin: 1, gross: 0, net: 0 },
    { date: "2026-05-03", month: "2026-05", portal: "Magicbricks", project: "Vivaana", generated: 9, svs: 1, svc: 1, walkin: 0, gross: 0, net: 0 },
  ],
  creatives: [
    { id: "CRT-001", date: "2026-06-01", campaignId: "CMP-001", project: "Main Project", campaignName: "Summer Lead Gen", adsetName: "Core Lead Audience", creativeName: "Blue Offer Static", creativeType: "Static", platform: "Meta", spend: 1800, impressions: 42000, clicks: 710, leads: 36, svc: 12, booked: 4, status: "Active", remarks: "Best CPL so far", imageData: "" },
    { id: "CRT-002", date: "2026-06-02", campaignId: "CMP-002", project: "Main Project", campaignName: "Retargeting Sales", adsetName: "Search Retargeting", creativeName: "Walkthrough Video", creativeType: "Video", platform: "Google", spend: 2600, impressions: 39000, clicks: 620, leads: 28, svc: 10, booked: 3, status: "Testing", remarks: "Needs more spend before decision", imageData: "" },
  ],
};

let state = loadState();
let saveStatusTimer;

function emptyState(preserveUsers = []) {
  const todayMonth = todayIso().slice(0, 7);
  return {
    ...structuredClone(sampleState),
    filters: {
      ...structuredClone(sampleState.filters),
      project: "All Projects",
      startDate: "",
      endDate: "",
      portalPeriod: "range",
      portalStartDate: "",
      portalEndDate: "",
      creativeProject: "All Projects",
      creativeCampaign: "All Campaigns",
      creativeType: "All Types",
      creativeStartDate: "",
      creativeEndDate: "",
    },
    targetMonth: todayMonth,
    targetWeek: "total",
    targetProject: "All Projects",
    targetView: "all",
    targetSearch: "",
    portalMonth: todayMonth,
    portalProject: "All Projects",
    portalFilter: "All Portals",
    users: normalizeUsers(preserveUsers.length ? preserveUsers : [DEFAULT_ADMIN]),
    projects: [],
    campaigns: [],
    changes: [],
    targets: [],
    portalRows: [],
    creatives: [],
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(emptyState());
  try {
    return normalizeState({ ...emptyState(), ...JSON.parse(saved) });
  } catch {
    return normalizeState(emptyState());
  }
}

function normalizeState(nextState) {
  nextState.filters = {
    project: nextState.filters?.project || "All Projects",
    startDate: nextState.filters?.startDate || "",
    endDate: nextState.filters?.endDate || "",
    portalPeriod: nextState.filters?.portalPeriod || "range",
    portalStartDate: nextState.filters?.portalStartDate || "",
    portalEndDate: nextState.filters?.portalEndDate || "",
    creativeProject: nextState.filters?.creativeProject || "All Projects",
    creativeCampaign: nextState.filters?.creativeCampaign || "All Campaigns",
    creativeType: nextState.filters?.creativeType || "All Types",
    creativeStartDate: nextState.filters?.creativeStartDate || "",
    creativeEndDate: nextState.filters?.creativeEndDate || "",
  };
  nextState.trackerColumns = Array.isArray(nextState.trackerColumns) && nextState.trackerColumns.length
    ? nextState.trackerColumns.filter((id) => defaultTrackerColumnIds.includes(id) || id.startsWith("metric:"))
    : structuredClone(defaultTrackerColumnIds);
  nextState.targetMonth = nextState.targetMonth || todayIso().slice(0, 7);
  nextState.targetWeek = nextState.targetWeek || "total";
  nextState.targetProject = nextState.targetProject || "All Projects";
  nextState.targetView = nextState.targetView || "all";
  nextState.targetSearch = nextState.targetSearch || "";
  nextState.portalMonth = nextState.portalMonth || todayIso().slice(0, 7);
  nextState.portalProject = nextState.portalProject || "All Projects";
  nextState.portalFilter = nextState.portalFilter || "All Portals";
  nextState.campaigns = (nextState.campaigns || []).map((row) => ({
    ...row,
    project: row.project || "Main Project",
    adsetName: row.adsetName || "",
    placement: row.placement || "",
    country: row.country || "",
    age: row.age || "",
    device: row.device || "",
    metric: row.metric || "CPA/CPL",
    before: numberValue(row.before),
    after: numberValue(row.after),
    leads: numberValue(row.leads ?? row.conversions),
    svc: numberValue(row.svc),
    booked: numberValue(row.booked),
  }));
  nextState.changes = (nextState.changes || []).map((row) => ({
    ...row,
    project: row.project || nextState.campaigns.find((campaign) => campaign.id === row.campaignId)?.project || "Main Project",
    adsetName: row.adsetName || nextState.campaigns.find((campaign) => campaign.id === row.campaignId)?.adsetName || "",
    campaignStatus: row.campaignStatus || nextState.campaigns.find((campaign) => campaign.id === row.campaignId)?.status || "Active",
    metric: row.metric || "CPA/CPL",
    leads: numberValue(row.leads),
    svc: numberValue(row.svc),
    booked: numberValue(row.booked),
  }));
  const projectNames = new Set([
    ...(nextState.projects || []).map((project) => project.name).filter(Boolean),
    ...nextState.campaigns.map((row) => row.project).filter(Boolean),
    ...nextState.changes.map((row) => row.project).filter(Boolean),
    ...(nextState.creatives || []).map((row) => row.project).filter(Boolean),
  ]);
  const existingProjects = new Map((nextState.projects || []).map((project) => [project.name, project]));
  nextState.projects = [...projectNames].map((name) => ({
    name,
    adAccountId: existingProjects.get(name)?.adAccountId || "",
  }));
  nextState.metrics = (nextState.metrics?.length ? nextState.metrics : structuredClone(defaultMetrics))
    .filter((metric) => metric.name)
    .map((metric) => ({
      name: metric.name,
      direction: metric.direction === "lower" ? "lower" : "higher",
    }));
  nextState.settings = {
    ...structuredClone(sampleState.settings),
    ...(nextState.settings || {}),
    autoCloudSync: HARDCODED_DRIVE_SYNC_URL ? true : Boolean(nextState.settings?.autoCloudSync),
    driveSyncUrl: HARDCODED_DRIVE_SYNC_URL || nextState.settings?.driveSyncUrl || "",
  };
  nextState.users = normalizeUsers(nextState.users);
  const hasOldTargetFormat = (nextState.targets || []).some((row) => row.totalTarget !== undefined && row.medium === undefined);
  if (hasOldTargetFormat) nextState.targets = structuredClone(sampleState.targets);
  nextState.targets = (nextState.targets || []).map((row) => normalizeTargetRow(row));
  nextState.portalRows = (nextState.portalRows || []).map((row) => normalizePortalRow(row));
  nextState.creatives = (nextState.creatives || []).map((row) => {
    const creative = normalizeCreativeRow(row);
    const campaign = findCampaignForCreative(creative, nextState.campaigns);
    if (!campaign) return creative;
    return {
      ...creative,
      campaignId: campaign.id,
      campaignName: campaign.name,
      project: campaign.project,
      adsetName: campaign.adsetName,
      platform: campaign.platform || creative.platform,
    };
  });
  return nextState;
}

function normalizeUsers(users = []) {
  const legacyUsers = getUsers();
  const legacyRows = Object.entries(legacyUsers).map(([username, user]) => ({
    username,
    name: user.name || username,
    password: user.password,
    role: "user",
    projects: [],
    active: true,
    createdAt: user.createdAt || new Date().toISOString(),
  }));
  const rows = [...(Array.isArray(users) ? users : []), ...legacyRows, DEFAULT_ADMIN];
  const seen = new Map();
  rows.forEach((user) => {
    const username = String(user.username || user.name || "").trim().toLowerCase();
    if (!username || seen.has(username)) return;
    seen.set(username, {
      username,
      name: String(user.name || username).trim(),
      password: user.password || "",
      role: user.role === "admin" ? "admin" : "user",
      projects: Array.isArray(user.projects) ? user.projects.filter(Boolean) : [],
      active: user.active !== false,
      createdAt: user.createdAt || new Date().toISOString(),
    });
  });
  const normalized = [...seen.values()];
  if (!normalized.some((user) => user.role === "admin")) normalized.unshift(structuredClone(DEFAULT_ADMIN));
  return normalized;
}

function normalizePortalRow(row) {
  const date = row.date || todayIso();
  return {
    date,
    month: row.month || date.slice(0, 7),
    portal: row.portal || "99 Acres",
    project: row.project || "Project",
    generated: numberValue(row.generated),
    svs: numberValue(row.svs),
    svc: numberValue(row.svc),
    walkin: numberValue(row.walkin),
    gross: numberValue(row.gross),
    net: numberValue(row.net),
  };
}

function normalizeCreativeRow(row) {
  return {
    id: row.id || row.creativeId || `CRT-${crypto.randomUUID().slice(0, 8)}`,
    date: row.date || todayIso(),
    campaignId: row.campaignId || "",
    project: row.project || "Main Project",
    campaignName: row.campaignName || row.name || "",
    adsetName: row.adsetName || "",
    creativeName: row.creativeName || "Creative",
    creativeType: row.creativeType || "Static",
    platform: row.platform || "Meta",
    spend: numberValue(row.spend),
    impressions: numberValue(row.impressions),
    clicks: numberValue(row.clicks),
    leads: numberValue(row.leads),
    svc: numberValue(row.svc),
    booked: numberValue(row.booked),
    status: row.status || "Testing",
    remarks: row.remarks || "",
    imageUrl: row.imageUrl || row["Image URL"] || "",
    imageData: row.imageData || "",
  };
}

function normalizeTargetRow(row) {
  const weeks = row.weeks || {};
  return {
    month: row.month || todayIso().slice(0, 7),
    project: row.project || "Project",
    medium: row.medium || "",
    budget: numberValue(row.budget),
    spend: numberValue(row.spend),
    totalLeadTarget: numberValue(row.totalLeadTarget ?? row.leadGeneration),
    totalLeadAchieved: numberValue(row.totalLeadAchieved),
    digitalLeadTarget: numberValue(row.digitalLeadTarget),
    digitalLeadAchieved: numberValue(row.digitalLeadAchieved),
    btlLeadTarget: numberValue(row.btlLeadTarget),
    btlLeadAchieved: numberValue(row.btlLeadAchieved),
    leadAllocation: numberValue(row.leadAllocation),
    siteVisit: numberValue(row.siteVisit),
    booking: numberValue(row.booking),
    weeks: {
      week1: normalizeTargetWeek(weeks.week1),
      week2: normalizeTargetWeek(weeks.week2),
      week3: normalizeTargetWeek(weeks.week3),
      week4: normalizeTargetWeek(weeks.week4),
      week5: normalizeTargetWeek(weeks.week5),
    },
  };
}

function normalizeTargetWeek(week = {}) {
  return {
    spend: numberValue(week.spend),
    totalLeadAchieved: numberValue(week.totalLeadAchieved ?? week.leadGeneration),
    digitalLeadAchieved: numberValue(week.digitalLeadAchieved),
    btlLeadAchieved: numberValue(week.btlLeadAchieved),
    leadAllocation: numberValue(week.leadAllocation),
    siteVisit: numberValue(week.siteVisit),
    booking: numberValue(week.booking),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showSaveStatus("Saved");
  scheduleCloudSave();
}

function showSaveStatus(message) {
  const status = document.querySelector("#saveStatus");
  if (!status) return;
  status.textContent = message;
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => {
    status.textContent = "Saved";
  }, 1600);
}

function cleanCloudUrl() {
  return (HARDCODED_DRIVE_SYNC_URL || state.settings.driveSyncUrl || "").trim();
}

function isTeamCloudMode() {
  return Boolean(cleanCloudUrl());
}

function canRefreshCloudNow() {
  const activeTag = document.activeElement?.tagName;
  return !["INPUT", "TEXTAREA", "SELECT"].includes(activeTag);
}

function startTeamCloudSync() {
  if (!isTeamCloudMode()) return;
  state.settings.driveSyncUrl = cleanCloudUrl();
  state.settings.autoCloudSync = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderSettings();
  if (!hasLoadedCloudOnOpen) {
    hasLoadedCloudOnOpen = true;
    loadCloudState();
  }
  if (!cloudRefreshTimer) {
    cloudRefreshTimer = setInterval(() => {
      if (!document.body.classList.contains("auth-locked") && canRefreshCloudNow()) {
        loadCloudState();
      }
    }, CLOUD_REFRESH_INTERVAL);
  }
}

function setCloudStatus(message) {
  const status = document.querySelector("#cloudSyncStatus");
  if (status) status.textContent = message;
}

function scheduleCloudSave() {
  if (isLoadingCloud || !state.settings.autoCloudSync || !cleanCloudUrl()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    saveCloudState();
  }, CLOUD_SYNC_DELAY);
}

async function saveCloudState() {
  const url = cleanCloudUrl();
  if (!url) {
    setCloudStatus("Cloud URL is missing.");
    return;
  }
  const payload = {
    action: "save",
    savedAt: new Date().toISOString(),
    data: state,
  };
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    showSaveStatus("Cloud saved");
    setCloudStatus("Cloud save sent. Team data will update for everyone.");
  } catch (error) {
    setCloudStatus(`Cloud save failed: ${error.message}. In Apps Script, deploy as Web app with access set to Anyone or Anyone in adissia.com.`);
  }
}

function loadCloudState(options = {}) {
  const url = cleanCloudUrl();
  if (!url) {
    if (!options.silent) setCloudStatus("Cloud URL is missing.");
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const callbackName = `campaignLogCloudLoad_${Date.now()}`;
    const script = document.createElement("script");
    const joiner = url.includes("?") ? "&" : "?";
    if (!options.silent) setCloudStatus("Loading cloud data...");
    window[callbackName] = (response) => {
      try {
        if (!response?.ok) throw new Error(response?.error || "Cloud data could not be loaded");
        if (!response.data) {
          if (!options.silent) setCloudStatus("Cloud is empty. Creating the first shared team copy now...");
          if (!options.skipSeed) saveCloudState();
          resolve(false);
          return;
        }
        isLoadingCloud = true;
        const currentSettings = { ...state.settings };
        state = normalizeState({ ...emptyState(), ...response.data });
        state.settings = {
          ...state.settings,
          ...currentSettings,
          driveSyncUrl: HARDCODED_DRIVE_SYNC_URL || currentSettings.driveSyncUrl || state.settings.driveSyncUrl,
          autoCloudSync: HARDCODED_DRIVE_SYNC_URL ? true : Boolean(currentSettings.autoCloudSync),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        render();
        if (!options.silent) {
          setCloudStatus(`Loaded cloud data saved on ${response.savedAt || "Drive"}.`);
          showSaveStatus("Cloud loaded");
        }
        resolve(true);
      } catch (error) {
        if (!options.silent) setCloudStatus(`Cloud load failed: ${error.message}`);
        resolve(false);
      } finally {
        isLoadingCloud = false;
        script.remove();
        delete window[callbackName];
      }
    };
    script.onerror = () => {
      if (!options.silent) {
        setCloudStatus("Cloud load failed. In Apps Script, deploy as Web app with access set to Anyone or Anyone in adissia.com, then use the /macros/s/.../exec URL.");
      }
      script.remove();
      delete window[callbackName];
      resolve(false);
    };
    script.src = `${url}${joiner}action=load&callback=${callbackName}&t=${Date.now()}`;
    document.body.append(script);
  });
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function percent(value) {
  if (!Number.isFinite(value)) return "";
  return `${(value * 100).toFixed(2)}%`;
}

function numberValue(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const base = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

function inDateRange(dateString) {
  const start = state.filters?.startDate;
  const end = state.filters?.endDate;
  if (!start && !end) return true;
  if (!dateString) return false;
  if (start && dateString < start) return false;
  if (end && dateString > end) return false;
  return true;
}

function inPortalDashboardDateRange(dateString) {
  const start = state.filters?.portalStartDate || state.filters?.startDate;
  const end = state.filters?.portalEndDate || state.filters?.endDate;
  if (!start && !end) return true;
  if (!dateString) return false;
  if (start && dateString < start) return false;
  if (end && dateString > end) return false;
  return true;
}

function matchesProject(row) {
  const project = state.filters?.project || "All Projects";
  const rowProject = row.project || campaignProject(row.campaignId);
  if (!canAccessProject(rowProject)) return false;
  return project === "All Projects" || rowProject === project;
}

function campaignName(campaignId) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name || "";
}

function campaignById(campaignId, campaigns = state.campaigns) {
  return campaigns.find((campaign) => campaign.id === campaignId);
}

function findCampaignForCreative(row, campaigns = state.campaigns) {
  if (row.campaignId) {
    const byId = campaigns.find((campaign) => campaign.id === row.campaignId);
    if (byId) return byId;
  }
  const name = (row.campaignName || "").trim().toLowerCase();
  if (!name) return campaigns[0];
  return campaigns.find((campaign) => (
    (campaign.name || "").trim().toLowerCase() === name &&
    (!row.project || campaign.project === row.project)
  )) || campaigns.find((campaign) => (campaign.name || "").trim().toLowerCase() === name);
}

function campaignProject(campaignId) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.project || "";
}

function campaignAdsetName(campaignId) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.adsetName || "";
}

function latestChangeDate(campaignId) {
  return state.changes
    .filter((row) => row.campaignId === campaignId && row.date)
    .map((row) => row.date)
    .sort()
    .at(-1) || "";
}

function latestChangeText(campaignId) {
  const latest = state.changes
    .filter((row) => row.campaignId === campaignId && row.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return latest?.changed || "";
}

function latestCampaignStatus(campaignId, fallback = "Active") {
  const latest = state.changes
    .filter((row) => row.campaignId === campaignId && row.date && row.campaignStatus)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return latest?.campaignStatus || fallback || "Active";
}

function calcCampaign(row) {
  const leads = numberValue(row.leads ?? row.conversions);
  const svc = numberValue(row.svc);
  const booked = numberValue(row.booked);
  const ctr = row.impressions ? row.clicks / row.impressions : 0;
  const cvr = row.clicks ? leads / row.clicks : 0;
  const svcRate = leads ? svc / leads : 0;
  const bookedRate = svc ? booked / svc : 0;
  const cpa = leads ? row.spend / leads : row.spend || 0;
  const roas = row.spend ? row.revenue / row.spend : 0;
  const needsFix = leads === 0 && row.spend >= state.settings.warningSpend;
  const needsAction =
    cpa > state.settings.targetCpa ||
    ctr < state.settings.minCtr / 100 ||
    cvr < state.settings.minCvr / 100 ||
    roas < state.settings.minRoas;
  const flag = needsFix ? "Pause / Fix" : needsAction ? "Needs Action" : "Good";
  const performance = performanceIndicator({ ...row, flag });
  return { leads, svc, booked, ctr, cvr, svcRate, bookedRate, cpa, roas, flag, performance };
}

function performanceIndicator(row) {
  if (row.flag === "Pause / Fix") return "Critical";
  const before = numberValue(row.before);
  const after = numberValue(row.after);
  if (!before && !after) return row.flag === "Good" ? "Good" : "Watch";
  if (!after) return "Waiting";
  const lowerIsBetter = metricDirection(row.metric || "CPA/CPL") === "lower";
  const improved = lowerIsBetter ? after < before : after > before;
  if (improved && row.flag === "Good") return "Improving";
  if (improved) return "Recovering";
  if (!improved && row.flag === "Good") return "Stable";
  return "Declining";
}

function calcChange(row) {
  if (!row.before && !row.after) return "Waiting";
  if (!row.after) return "Waiting";
  const before = numberValue(row.before);
  const after = numberValue(row.after);
  const lowerIsBetter = metricDirection(row.metric || "CPA/CPL") === "lower";
  return lowerIsBetter ? (after < before ? "Yes" : "No") : (after > before ? "Yes" : "No");
}

function calcChangeFunnel(row) {
  const leads = numberValue(row.leads);
  const svc = numberValue(row.svc);
  const booked = numberValue(row.booked);
  return {
    leads,
    svc,
    booked,
    svcRate: leads ? svc / leads : 0,
    bookedRate: svc ? booked / svc : 0,
  };
}

function currentTargetRows() {
  const search = String(state.targetSearch || "").trim().toLowerCase();
  const selectedProject = state.targetProject || "All Projects";
  return state.targets.filter((row) => {
    if (!canAccessProject(row.project)) return false;
    if (row.month !== state.targetMonth) return false;
    if (selectedProject !== "All Projects" && row.project !== selectedProject) return false;
    if (state.targetView === "online" && !isOnlineMedium(row)) return false;
    if (state.targetView === "digital" && numberValue(row.digitalLeadTarget) <= 0 && numberValue(row.digitalLeadAchieved) <= 0) return false;
    if (state.targetView === "btl" && numberValue(row.btlLeadTarget) <= 0 && numberValue(row.btlLeadAchieved) <= 0) return false;
    if (search && !`${row.project || ""} ${row.medium || ""}`.toLowerCase().includes(search)) return false;
    return true;
  });
}

function isOnlineMedium(row) {
  const text = `${row.medium || ""}`.toLowerCase();
  return ["online", "meta", "google", "website", "portal", "nri"].some((word) => text.includes(word));
}

function targetValue(row, key) {
  if (state.targetWeek === "total") return numberValue(row[key]);
  return numberValue(row.weeks?.[state.targetWeek]?.[key]);
}

function targetPercent(achieved, target) {
  return target ? achieved / target : 0;
}

function reviewStatus(row) {
  const due = row.followUp && new Date(`${row.followUp}T00:00:00`) <= new Date(`${todayIso()}T00:00:00`);
  return due ? "Review Due" : "Pending Review";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function input(value, type, onInput) {
  const node = document.createElement("input");
  node.type = type;
  node.value = value ?? "";
  node.addEventListener("change", (event) => onInput(event.target.value));
  return node;
}

function textarea(value, onInput) {
  const node = document.createElement("textarea");
  node.value = value ?? "";
  node.addEventListener("change", (event) => onInput(event.target.value));
  return node;
}

function select(value, options, onChange) {
  const node = document.createElement("select");
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    node.append(item);
  });
  node.value = value || options[0];
  node.addEventListener("change", (event) => onChange(event.target.value));
  return node;
}

function selectPairs(value, options, onChange) {
  const node = document.createElement("select");
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    node.append(item);
  });
  node.value = options.some((option) => option.value === value) ? value : options[0]?.value || "";
  node.addEventListener("change", (event) => onChange(event.target.value));
  return node;
}

function td(child, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  if (child instanceof Node) cell.append(child);
  else cell.textContent = child ?? "";
  return cell;
}

function updateCampaign(index, key, value) {
  const numeric = ["before", "after", "budget", "spend", "impressions", "clicks", "leads", "svc", "booked", "revenue"];
  if (key === "project" && !canAccessProject(value)) return;
  state.campaigns[index][key] = numeric.includes(key) ? numberValue(value) : value;
  saveState();
  render();
}

function updateChange(index, key, value) {
  const numeric = ["before", "after", "leads", "svc", "booked"];
  if (key === "project" && !canAccessProject(value)) return;
  state.changes[index][key] = numeric.includes(key) ? numberValue(value) : value;
  if (key === "campaignId" && !state.changes[index].project) {
    state.changes[index].project = campaignProject(value);
  }
  if (key === "campaignId") {
    state.changes[index].adsetName = campaignAdsetName(value);
  }
  if (key === "date" && !state.changes[index].followUp) {
    state.changes[index].followUp = addDays(value, state.settings.reviewDays);
  }
  saveState();
  render();
}

function updateTarget(index, key, value) {
  const rows = currentTargetRows();
  const targetRow = rows[index];
  const stateIndex = state.targets.indexOf(targetRow);
  if (stateIndex < 0) return;
  const numeric = [
    "budget", "spend", "totalLeadTarget", "totalLeadAchieved", "digitalLeadTarget", "digitalLeadAchieved",
    "btlLeadTarget", "btlLeadAchieved", "leadAllocation", "siteVisit", "booking",
  ];
  const weeklyFields = ["spend", "totalLeadAchieved", "digitalLeadAchieved", "btlLeadAchieved", "leadAllocation", "siteVisit", "booking"];
  if (key === "project" && !canAccessProject(value)) return;
  if (state.targetWeek !== "total" && weeklyFields.includes(key)) {
    state.targets[stateIndex].weeks[state.targetWeek] = {
      ...normalizeTargetWeek(state.targets[stateIndex].weeks[state.targetWeek]),
      [key]: numberValue(value),
    };
  } else {
    state.targets[stateIndex][key] = numeric.includes(key) ? numberValue(value) : value;
  }
  saveState();
  render();
}

function updateCreative(index, key, value) {
  const numeric = ["spend", "impressions", "clicks", "leads", "svc", "booked"];
  state.creatives[index][key] = numeric.includes(key) ? numberValue(value) : value;
  if (key === "campaignId") {
    const campaign = campaignById(value);
    if (campaign) {
      state.creatives[index].campaignName = campaign.name;
      state.creatives[index].project = campaign.project;
      state.creatives[index].adsetName = campaign.adsetName;
      state.creatives[index].platform = campaign.platform || state.creatives[index].platform;
    }
  }
  saveState();
  render();
}

function trackerColumnDefinitions(row, index, calc) {
  const baseMetricNames = new Set(["CPA/CPL", "ROAS", "CTR", "CVR", "Leads", "SVC", "SVC %", "Booked", "Booked %"]);
  return [
    { id: "date", label: "Date", cell: () => td(input(row.date, "date", (value) => updateCampaign(index, "date", value))) },
    { id: "project", label: "Project", cell: () => td(select(row.project, projectOptions(), (value) => updateCampaign(index, "project", value)), "wide") },
    { id: "id", label: "Campaign ID", cell: () => td(input(row.id, "text", (value) => updateCampaign(index, "id", value))) },
    { id: "name", label: "Name", cell: () => td(input(row.name, "text", (value) => updateCampaign(index, "name", value)), "wide") },
    { id: "adsetName", label: "Ad Set Name", cell: () => td(input(row.adsetName, "text", (value) => updateCampaign(index, "adsetName", value)), "wide") },
    { id: "platform", label: "Platform", cell: () => td(select(row.platform, platformOptions, (value) => updateCampaign(index, "platform", value))) },
    { id: "objective", label: "Objective", cell: () => td(input(row.objective, "text", (value) => updateCampaign(index, "objective", value))) },
    { id: "status", label: "Status", cell: () => td(latestCampaignStatus(row.id, row.status), "calc-cell") },
    { id: "lastEdited", label: "Last Edited", cell: () => td(latestChangeDate(row.id) || "-", "calc-cell") },
    { id: "lastChange", label: "Last Change", cell: () => td(latestChangeText(row.id) || "-", "calc-cell wide") },
    { id: "metric", label: "Metric", cell: () => td(row.metric || "CPA/CPL", "calc-cell") },
    { id: "before", label: "Before Value", cell: () => td(money(row.before), "calc-cell") },
    { id: "after", label: "After Value", cell: () => td(money(row.after), "calc-cell") },
    { id: "budget", label: "Budget", cell: () => td(money(row.budget), "calc-cell") },
    { id: "spend", label: "Spend", cell: () => td(money(row.spend), "calc-cell") },
    { id: "impressions", label: "Impressions", cell: () => td(money(row.impressions), "calc-cell") },
    { id: "clicks", label: "Clicks", cell: () => td(money(row.clicks), "calc-cell") },
    { id: "leads", label: "Leads", cell: () => td(money(calc.leads), "calc-cell") },
    { id: "svc", label: "SVC", cell: () => td(money(calc.svc), "calc-cell") },
    { id: "booked", label: "Booked", cell: () => td(money(calc.booked), "calc-cell") },
    { id: "revenue", label: "Revenue", cell: () => td(money(row.revenue), "calc-cell") },
    { id: "ctr", label: "CTR", cell: () => td(percent(calc.ctr), "calc-cell") },
    { id: "cvr", label: "CVR", cell: () => td(percent(calc.cvr), "calc-cell") },
    { id: "svcRate", label: "SVC %", cell: () => td(percent(calc.svcRate), "calc-cell") },
    { id: "bookedRate", label: "Booked %", cell: () => td(percent(calc.bookedRate), "calc-cell") },
    { id: "cpa", label: "CPA/CPL", cell: () => td(money(calc.cpa), "calc-cell") },
    { id: "roas", label: "ROAS", cell: () => td(calc.roas.toFixed(2), "calc-cell") },
    { id: "flag", label: "Flag", cell: () => td(calc.flag, `calc-cell ${flagClass(calc.flag)}`) },
    { id: "performance", label: "Performance", cell: () => td(calc.performance, `calc-cell ${performanceClass(calc.performance)}`) },
    ...metricOptions().filter((metricName) => !baseMetricNames.has(metricName)).map((metricName) => ({
      id: `metric:${metricName}`,
      label: metricName,
      cell: () => td(metricDisplayValue(metricName, row, calc), "calc-cell"),
    })),
  ];
}

function metricDisplayValue(metricName, row, calc) {
  const map = {
    "CPA/CPL": money(calc.cpa),
    ROAS: calc.roas.toFixed(2),
    CTR: percent(calc.ctr),
    CVR: percent(calc.cvr),
    Leads: money(calc.leads),
    SVC: money(calc.svc),
    "SVC %": percent(calc.svcRate),
    Booked: money(calc.booked),
    "Booked %": percent(calc.bookedRate),
  };
  if (map[metricName] !== undefined) return map[metricName];
  return row.metric === metricName ? money(row.after || row.before) : "";
}

function visibleTrackerColumns(row, index, calc) {
  const selected = new Set(state.trackerColumns || defaultTrackerColumnIds);
  return trackerColumnDefinitions(row, index, calc).filter((column) => selected.has(column.id));
}

function renderCampaignRows() {
  renderCampaignHeaders();
  const body = document.querySelector("#campaignRows");
  body.innerHTML = "";
  state.campaigns.filter(canAccessRow).forEach((row) => {
    const index = state.campaigns.indexOf(row);
    const calc = calcCampaign(row);
    const tr = document.createElement("tr");
    tr.append(...visibleTrackerColumns(row, index, calc).map((column) => column.cell()));
    tr.append(td(deleteButton(() => {
      state.campaigns.splice(index, 1);
      saveState();
      render();
    })));
    body.append(tr);
  });
}

function renderCampaignHeaders() {
  const row = document.querySelector("#campaignHeaderRow");
  if (!row) return;
  const sample = state.campaigns[0] || {};
  const headers = visibleTrackerColumns(sample, 0, calcCampaign(sample)).map((column) => column.label);
  row.innerHTML = headers.map((label) => `<th>${label}</th>`).join("") + "<th></th>";
}

function renderChangeRows() {
  const body = document.querySelector("#changeRows");
  body.innerHTML = "";
  state.changes.filter(canAccessRow).forEach((row) => {
    const index = state.changes.indexOf(row);
    const improved = calcChange(row);
    const funnel = calcChangeFunnel(row);
    const tr = document.createElement("tr");
    tr.append(
      td(input(row.id, "text", (value) => updateChange(index, "id", value))),
      td(input(row.date, "date", (value) => updateChange(index, "date", value))),
      td(select(row.project || campaignProject(row.campaignId), projectOptions(), (value) => updateChange(index, "project", value)), "wide"),
      td(select(row.campaignId, campaignOptions(), (value) => updateChange(index, "campaignId", value))),
      td(campaignName(row.campaignId) || "-", "calc-cell wide"),
      td(input(row.adsetName || campaignAdsetName(row.campaignId), "text", (value) => updateChange(index, "adsetName", value)), "wide"),
      td(select(row.campaignStatus || latestCampaignStatus(row.campaignId), statusOptions, (value) => updateChange(index, "campaignStatus", value))),
      td(select(row.type, changeTypes, (value) => updateChange(index, "type", value))),
      td(textarea(row.changed, (value) => updateChange(index, "changed", value)), "wide"),
      td(textarea(row.reason, (value) => updateChange(index, "reason", value)), "wide"),
      td(select(row.metric || "CPA/CPL", metricOptions(), (value) => updateChange(index, "metric", value))),
      td(input(row.before, "number", (value) => updateChange(index, "before", value)), "number-cell"),
      td(input(row.after, "number", (value) => updateChange(index, "after", value)), "number-cell"),
      td(improved, `calc-cell ${changeClass(improved)}`),
      td(input(funnel.leads, "number", (value) => updateChange(index, "leads", value)), "number-cell"),
      td(input(funnel.svc, "number", (value) => updateChange(index, "svc", value)), "number-cell"),
      td(percent(funnel.svcRate), "calc-cell"),
      td(input(funnel.booked, "number", (value) => updateChange(index, "booked", value)), "number-cell"),
      td(percent(funnel.bookedRate), "calc-cell"),
      td(select(row.owner, owners, (value) => updateChange(index, "owner", value))),
      td(input(row.followUp, "date", (value) => updateChange(index, "followUp", value))),
      td(reviewStatus(row), `calc-cell ${reviewStatus(row) === "Review Due" ? "flag-danger" : "flag-waiting"}`),
      td(select(row.nextAction, nextActions, (value) => updateChange(index, "nextAction", value))),
      td(deleteButton(() => {
        state.changes.splice(index, 1);
        saveState();
        render();
      })),
    );
    body.append(tr);
  });
}

function renderTargetRows() {
  const body = document.querySelector("#targetRows");
  const monthInput = document.querySelector("#targetMonth");
  const weekSelect = document.querySelector("#targetWeek");
  const projectSelect = document.querySelector("#targetProject");
  const viewSelect = document.querySelector("#targetView");
  const searchInput = document.querySelector("#targetSearch");
  if (!body || !monthInput || !weekSelect || !projectSelect || !viewSelect || !searchInput) return;
  if (document.activeElement !== monthInput) monthInput.value = state.targetMonth || todayIso().slice(0, 7);
  if (document.activeElement !== weekSelect) weekSelect.value = state.targetWeek || "total";
  const projectOptions = targetProjectOptions();
  projectSelect.innerHTML = projectOptions.map((item) => `<option value="${item}">${item}</option>`).join("");
  if (!projectOptions.includes(state.targetProject)) state.targetProject = "All Projects";
  if (document.activeElement !== projectSelect) projectSelect.value = state.targetProject || "All Projects";
  if (document.activeElement !== viewSelect) viewSelect.value = state.targetView || "all";
  if (document.activeElement !== searchInput) searchInput.value = state.targetSearch || "";
  const rows = currentTargetRows();
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="17">No target rows for this month. Add medium rows or import the target template.</td></tr>`;
    return;
  }
  body.innerHTML = "";
  const grouped = new Map();
  rows.forEach((row) => {
    const project = row.project || "Project";
    grouped.set(project, (grouped.get(project) || 0) + 1);
  });
  const seenProject = new Map();
  rows.forEach((row, index) => {
    const projectCount = grouped.get(row.project || "Project") || 1;
    const projectSeen = seenProject.get(row.project || "Project") || 0;
    seenProject.set(row.project || "Project", projectSeen + 1);
    const tr = document.createElement("tr");
    if (projectSeen === 0) {
      const projectCell = td(input(row.project, "text", (value) => updateTarget(index, "project", value)), "wide target-project-cell");
      projectCell.rowSpan = projectCount;
      tr.append(projectCell);
    }
    tr.append(
      td(input(row.medium, "text", (value) => updateTarget(index, "medium", value)), "wide"),
      td(input(row.budget, "number", (value) => updateTarget(index, "budget", value)), "number-cell"),
      td(input(targetValue(row, "spend"), "number", (value) => updateTarget(index, "spend", value)), "number-cell"),
      td(input(row.totalLeadTarget, "number", (value) => updateTarget(index, "totalLeadTarget", value)), "number-cell"),
      td(input(targetValue(row, "totalLeadAchieved"), "number", (value) => updateTarget(index, "totalLeadAchieved", value)), "number-cell"),
      td(percent(targetPercent(targetValue(row, "totalLeadAchieved"), row.totalLeadTarget)), "calc-cell"),
      td(input(row.digitalLeadTarget, "number", (value) => updateTarget(index, "digitalLeadTarget", value)), "number-cell"),
      td(input(targetValue(row, "digitalLeadAchieved"), "number", (value) => updateTarget(index, "digitalLeadAchieved", value)), "number-cell"),
      td(percent(targetPercent(targetValue(row, "digitalLeadAchieved"), row.digitalLeadTarget)), "calc-cell"),
      td(input(row.btlLeadTarget, "number", (value) => updateTarget(index, "btlLeadTarget", value)), "number-cell"),
      td(input(targetValue(row, "btlLeadAchieved"), "number", (value) => updateTarget(index, "btlLeadAchieved", value)), "number-cell"),
      td(percent(targetPercent(targetValue(row, "btlLeadAchieved"), row.btlLeadTarget)), "calc-cell"),
      td(input(targetValue(row, "leadAllocation"), "number", (value) => updateTarget(index, "leadAllocation", value)), "number-cell"),
      td(input(targetValue(row, "siteVisit"), "number", (value) => updateTarget(index, "siteVisit", value)), "number-cell"),
      td(input(targetValue(row, "booking"), "number", (value) => updateTarget(index, "booking", value)), "number-cell"),
      td(deleteButton(() => {
        const stateIndex = state.targets.indexOf(row);
        if (stateIndex >= 0) state.targets.splice(stateIndex, 1);
        saveState();
        render();
      })),
    );
    body.append(tr);
  });
  body.append(renderTargetTotalRow(rows));
}

function renderTargetTotalRow(rows) {
  const totals = rows.reduce((acc, row) => {
    acc.budget += numberValue(row.budget);
    acc.spend += targetValue(row, "spend");
    acc.totalLeadTarget += numberValue(row.totalLeadTarget);
    acc.totalLeadAchieved += targetValue(row, "totalLeadAchieved");
    acc.digitalLeadTarget += numberValue(row.digitalLeadTarget);
    acc.digitalLeadAchieved += targetValue(row, "digitalLeadAchieved");
    acc.btlLeadTarget += numberValue(row.btlLeadTarget);
    acc.btlLeadAchieved += targetValue(row, "btlLeadAchieved");
    acc.leadAllocation += targetValue(row, "leadAllocation");
    acc.siteVisit += targetValue(row, "siteVisit");
    acc.booking += targetValue(row, "booking");
    return acc;
  }, { budget: 0, spend: 0, totalLeadTarget: 0, totalLeadAchieved: 0, digitalLeadTarget: 0, digitalLeadAchieved: 0, btlLeadTarget: 0, btlLeadAchieved: 0, leadAllocation: 0, siteVisit: 0, booking: 0 });
  const tr = document.createElement("tr");
  tr.className = "target-total-row";
  tr.append(
    td("Total"),
    td(""),
    td(money(totals.budget), "number-cell"),
    td(money(totals.spend), "number-cell"),
    td(money(totals.totalLeadTarget), "number-cell"),
    td(money(totals.totalLeadAchieved), "number-cell"),
    td(percent(targetPercent(totals.totalLeadAchieved, totals.totalLeadTarget)), "calc-cell"),
    td(money(totals.digitalLeadTarget), "number-cell"),
    td(money(totals.digitalLeadAchieved), "number-cell"),
    td(percent(targetPercent(totals.digitalLeadAchieved, totals.digitalLeadTarget)), "calc-cell"),
    td(money(totals.btlLeadTarget), "number-cell"),
    td(money(totals.btlLeadAchieved), "number-cell"),
    td(percent(targetPercent(totals.btlLeadAchieved, totals.btlLeadTarget)), "calc-cell"),
    td(money(totals.leadAllocation), "number-cell"),
    td(money(totals.siteVisit), "number-cell"),
    td(money(totals.booking), "number-cell"),
    td(""),
  );
  return tr;
}

function targetProjectOptions() {
  const projects = state.targets
    .filter((row) => canAccessProject(row.project))
    .filter((row) => row.month === state.targetMonth)
    .map((row) => row.project)
    .filter(Boolean);
  return ["All Projects", ...new Set(projects)];
}

function portalRowsForView() {
  return state.portalRows.filter((row) => {
    if (!canAccessProject(row.project)) return false;
    if (row.month !== state.portalMonth) return false;
    if (state.portalProject !== "All Projects" && row.project !== state.portalProject) return false;
    if (state.portalFilter !== "All Portals" && row.portal !== state.portalFilter) return false;
    return true;
  });
}

function portalOptionsForMonth() {
  const rows = state.portalRows.filter((row) => row.month === state.portalMonth && canAccessProject(row.project));
  return {
    projects: ["All Projects", ...new Set(rows.map((row) => row.project).filter(Boolean))],
    portals: ["All Portals", ...new Set(rows.map((row) => row.portal).filter(Boolean))],
  };
}

function portalTotals(rows) {
  return rows.reduce((acc, row) => {
    acc.generated += numberValue(row.generated);
    acc.svs += numberValue(row.svs);
    acc.svc += numberValue(row.svc);
    acc.walkin += numberValue(row.walkin);
    acc.gross += numberValue(row.gross);
    acc.net += numberValue(row.net);
    return acc;
  }, { generated: 0, svs: 0, svc: 0, walkin: 0, gross: 0, net: 0 });
}

function renderPortalRows() {
  const month = document.querySelector("#portalMonth");
  const project = document.querySelector("#portalProject");
  const portal = document.querySelector("#portalFilter");
  const weeklyHead = document.querySelector("#portalWeeklyHead");
  const weeklyBody = document.querySelector("#portalWeeklyRows");
  if (!month || !project || !portal || !weeklyHead || !weeklyBody) return;
  if (document.activeElement !== month) month.value = state.portalMonth || todayIso().slice(0, 7);
  const options = portalOptionsForMonth();
  project.innerHTML = options.projects.map((item) => `<option value="${item}">${item}</option>`).join("");
  portal.innerHTML = options.portals.map((item) => `<option value="${item}">${item}</option>`).join("");
  if (!options.projects.includes(state.portalProject)) state.portalProject = "All Projects";
  if (!options.portals.includes(state.portalFilter)) state.portalFilter = "All Portals";
  if (document.activeElement !== project) project.value = state.portalProject;
  if (document.activeElement !== portal) portal.value = state.portalFilter;

  const rows = portalRowsForView();
  renderPortalWeekly(weeklyHead, weeklyBody, rows);
}

function renderPortalSummary(body, rows) {
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="9">No portal data for this selection.</td></tr>`;
    return;
  }
  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.portal}||${row.project}`;
    if (!grouped.has(key)) grouped.set(key, { month: row.month, portal: row.portal, project: row.project, rows: [] });
    grouped.get(key).rows.push(row);
  });
  const portalGroups = new Map();
  [...grouped.values()].forEach((group) => {
    if (!portalGroups.has(group.portal)) portalGroups.set(group.portal, []);
    portalGroups.get(group.portal).push(group);
  });
  body.innerHTML = "";
  portalGroups.forEach((groups, portalName) => {
    groups.forEach((group, index) => {
      const totals = portalTotals(group.rows);
      const tr = document.createElement("tr");
      tr.append(
        td(index === 0 ? monthName(group.month) : ""),
        td(index === 0 ? portalName : ""),
        td(group.project),
        td(money(totals.generated), "number-cell"),
        td(money(totals.svs), "number-cell"),
        td(money(totals.svc), "number-cell"),
        td(money(totals.walkin), "number-cell"),
        td(money(totals.gross), "number-cell"),
        td(money(totals.net), "number-cell"),
      );
      body.append(tr);
    });
    const portalTotal = portalTotals(groups.flatMap((group) => group.rows));
    const totalRow = document.createElement("tr");
    totalRow.className = "portal-subtotal-row";
    totalRow.append(td(`${portalName} total`, "wide"), td(""), td(""), td(money(portalTotal.generated), "number-cell"), td(money(portalTotal.svs), "number-cell"), td(money(portalTotal.svc), "number-cell"), td(money(portalTotal.walkin), "number-cell"), td(money(portalTotal.gross), "number-cell"), td(money(portalTotal.net), "number-cell"));
    body.append(totalRow);
  });
  const grand = portalTotals(rows);
  const grandRow = document.createElement("tr");
  grandRow.className = "portal-grand-row";
  grandRow.append(td("Grand Total", "wide"), td(""), td(""), td(money(grand.generated), "number-cell"), td(money(grand.svs), "number-cell"), td(money(grand.svc), "number-cell"), td(money(grand.walkin), "number-cell"), td(money(grand.gross), "number-cell"), td(money(grand.net), "number-cell"));
  body.append(grandRow);
}

function renderPortalWeekly(head, body, rows) {
  const portals = ["Housing", "99 Acres", "Magicbricks", "Roof&floor"];
  const visiblePortals = state.portalFilter === "All Portals" ? portals : portals.filter((item) => item === state.portalFilter);
  head.innerHTML = `
    <tr>
      <th rowspan="2">Date</th>
      ${visiblePortals.map((item) => `<th colspan="2">${item}</th>`).join("")}
      <th colspan="2">Total</th>
    </tr>
    <tr>
      ${visiblePortals.map(() => "<th>Leads</th><th>SVC</th>").join("")}
      <th>Leads</th><th>SVC</th>
    </tr>
  `;
  const groupedDates = new Map();
  rows.forEach((row) => {
    if (!groupedDates.has(row.date)) groupedDates.set(row.date, []);
    groupedDates.get(row.date).push(row);
  });
  const dates = [...groupedDates.keys()].sort();
  if (!dates.length) {
    body.innerHTML = `<tr><td colspan="${visiblePortals.length * 2 + 3}">No date-wise portal data.</td></tr>`;
    return;
  }
  body.innerHTML = "";
  let weekRows = [];
  dates.forEach((date, index) => {
    const dayRows = groupedDates.get(date);
    weekRows.push(...dayRows);
    body.append(portalWeeklyRow(formatDate(date), dayRows, visiblePortals, ""));
    const isWeekEnd = (index + 1) % 7 === 0 || index === dates.length - 1;
    if (isWeekEnd) {
      const start = weekRows.map((row) => row.date).sort()[0];
      const end = weekRows.map((row) => row.date).sort().at(-1);
      body.append(portalWeeklyRow(`${formatShortDate(start)} - ${formatShortDate(end)}`, weekRows, visiblePortals, "portal-week-row"));
      weekRows = [];
    }
  });
}

function portalWeeklyRow(label, rows, portals, className) {
  const tr = document.createElement("tr");
  if (className) tr.className = className;
  const cells = [td(label)];
  let totalLeads = 0;
  let totalSvc = 0;
  portals.forEach((portalName) => {
    const portalRows = rows.filter((row) => row.portal === portalName);
    const leads = portalRows.reduce((sum, row) => sum + numberValue(row.generated), 0);
    const svc = portalRows.reduce((sum, row) => sum + numberValue(row.svc), 0);
    totalLeads += leads;
    totalSvc += svc;
    cells.push(td(money(leads), "number-cell"), td(money(svc), "number-cell"));
  });
  cells.push(td(money(totalLeads), "number-cell"), td(money(totalSvc), "number-cell"));
  tr.append(...cells);
  return tr;
}

function creativeStats(row) {
  const spend = numberValue(row.spend);
  const impressions = numberValue(row.impressions);
  const clicks = numberValue(row.clicks);
  const leads = numberValue(row.leads);
  const svc = numberValue(row.svc);
  const booked = numberValue(row.booked);
  const ctr = impressions ? clicks / impressions : 0;
  const cpl = leads ? spend / leads : spend || 0;
  const svcRate = leads ? svc / leads : 0;
  const bookedRate = svc ? booked / svc : 0;
  let status = row.status || "Monitor";
  if (leads === 0 && spend >= state.settings.warningSpend) status = "Replace Creative";
  else if (ctr && ctr < state.settings.minCtr / 100) status = "Low CTR";
  else if (cpl > state.settings.targetCpa) status = "High CPL";
  else if (leads > 0) status = "Good";
  return { spend, impressions, clicks, leads, svc, booked, ctr, cpl, svcRate, bookedRate, status };
}

function creativeFilterOptions() {
  const allowedCampaigns = state.campaigns.filter(canAccessRow);
  const allowedCreatives = state.creatives.filter(canAccessRow);
  const projects = ["All Projects", ...new Set(allowedCampaigns.map((row) => row.project).filter(Boolean))];
  const campaigns = ["All Campaigns", ...new Set(allowedCampaigns.map((row) => row.name).filter(Boolean))];
  const types = ["All Types", ...new Set(allowedCreatives.map((row) => row.creativeType).filter(Boolean))];
  return { projects, campaigns, types };
}

function visibleCreativeRows() {
  const filters = state.filters || {};
  return state.creatives.filter((row) => {
    if (!canAccessProject(row.project)) return false;
    if (filters.creativeProject !== "All Projects" && row.project !== filters.creativeProject) return false;
    if (filters.creativeCampaign !== "All Campaigns" && row.campaignName !== filters.creativeCampaign) return false;
    if (filters.creativeType !== "All Types" && row.creativeType !== filters.creativeType) return false;
    if (filters.creativeStartDate && row.date < filters.creativeStartDate) return false;
    if (filters.creativeEndDate && row.date > filters.creativeEndDate) return false;
    return true;
  });
}

function syncCreativeFilterControls(selectors) {
  const project = document.querySelector(selectors.project);
  const campaign = document.querySelector(selectors.campaign);
  const type = document.querySelector(selectors.type);
  const start = document.querySelector(selectors.start);
  const end = document.querySelector(selectors.end);
  if (!project || !campaign || !type || !start || !end) return false;

  const options = creativeFilterOptions();
  if (!options.projects.includes(state.filters.creativeProject)) state.filters.creativeProject = "All Projects";
  if (!options.campaigns.includes(state.filters.creativeCampaign)) state.filters.creativeCampaign = "All Campaigns";
  if (!options.types.includes(state.filters.creativeType)) state.filters.creativeType = "All Types";
  project.innerHTML = options.projects.map((item) => `<option value="${item}">${item}</option>`).join("");
  campaign.innerHTML = options.campaigns.map((item) => `<option value="${item}">${item}</option>`).join("");
  type.innerHTML = options.types.map((item) => `<option value="${item}">${item}</option>`).join("");
  if (document.activeElement !== project) project.value = state.filters.creativeProject;
  if (document.activeElement !== campaign) campaign.value = state.filters.creativeCampaign;
  if (document.activeElement !== type) type.value = state.filters.creativeType;
  if (document.activeElement !== start) start.value = state.filters.creativeStartDate || "";
  if (document.activeElement !== end) end.value = state.filters.creativeEndDate || "";
  return true;
}

function creativeTotals(rows) {
  return rows.reduce((acc, row) => {
    const stats = creativeStats(row);
    acc.spend += stats.spend;
    acc.impressions += stats.impressions;
    acc.clicks += stats.clicks;
    acc.leads += stats.leads;
    acc.svc += stats.svc;
    acc.booked += stats.booked;
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, leads: 0, svc: 0, booked: 0 });
}

function creativeMetricCards(rows, includeBooked = true) {
  const totals = creativeTotals(rows);
  const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
  const cpl = totals.leads ? totals.spend / totals.leads : 0;
  const svcRate = totals.leads ? totals.svc / totals.leads : 0;
  const bookedRate = totals.svc ? totals.booked / totals.svc : 0;
  const cards = [
    ["Creatives", money(rows.length)],
    ["Spend", money(totals.spend)],
    ["Leads", money(totals.leads)],
    ["CPL", money(cpl)],
    ["CTR", percent(ctr)],
    ["SVC %", percent(svcRate)],
  ];
  if (includeBooked) cards.push(
    ["Booked", money(totals.booked)],
    ["Booked %", percent(bookedRate)],
  );
  return cards.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderCreativeRows() {
  const metrics = document.querySelector("#creativeMetricGrid");
  const body = document.querySelector("#creativeRows");
  if (!metrics || !body || !syncCreativeFilterControls({
    project: "#creativeProject",
    campaign: "#creativeCampaign",
    type: "#creativeType",
    start: "#creativeStart",
    end: "#creativeEnd",
  })) return;

  const rows = visibleCreativeRows();
  metrics.innerHTML = creativeMetricCards(rows, false);

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="20">No creative rows for this selection.</td></tr>`;
    return;
  }
  body.innerHTML = "";
  rows.forEach((row) => {
    const index = state.creatives.indexOf(row);
    const campaign = campaignById(row.campaignId) || findCampaignForCreative(row);
    if (campaign && row.campaignId !== campaign.id) {
      row.campaignId = campaign.id;
      row.campaignName = campaign.name;
      row.project = campaign.project;
      row.adsetName = campaign.adsetName;
      row.platform = campaign.platform || row.platform;
    }
    const stats = creativeStats(row);
    const tr = document.createElement("tr");
    tr.append(
      td(creativeImageControl(row, index), "creative-image-cell"),
      td(input(row.date, "date", (value) => updateCreative(index, "date", value))),
      td(row.project || "-", "calc-cell wide"),
      td(selectPairs(row.campaignId, campaignSelectOptions(), (value) => updateCreative(index, "campaignId", value)), "wide"),
      td(row.adsetName || "-", "calc-cell wide"),
      td(input(row.creativeName, "text", (value) => updateCreative(index, "creativeName", value)), "wide"),
      td(select(row.creativeType, ["Static", "Video", "Carousel", "Reel", "Story", "Banner", "Other"], (value) => updateCreative(index, "creativeType", value))),
      td(input(row.imageUrl, "url", (value) => updateCreative(index, "imageUrl", value)), "wide image-url-cell"),
      td(select(row.platform, platformOptions, (value) => updateCreative(index, "platform", value))),
      td(input(row.spend, "number", (value) => updateCreative(index, "spend", value)), "number-cell"),
      td(input(row.impressions, "number", (value) => updateCreative(index, "impressions", value)), "number-cell"),
      td(input(row.clicks, "number", (value) => updateCreative(index, "clicks", value)), "number-cell"),
      td(percent(stats.ctr), "calc-cell"),
      td(input(row.leads, "number", (value) => updateCreative(index, "leads", value)), "number-cell"),
      td(input(row.svc, "number", (value) => updateCreative(index, "svc", value)), "number-cell"),
      td(input(row.booked, "number", (value) => updateCreative(index, "booked", value)), "number-cell"),
      td(money(stats.cpl), "calc-cell"),
      td(stats.status, `calc-cell ${creativeStatusClass(stats.status)}`),
      td(textarea(row.remarks, (value) => updateCreative(index, "remarks", value)), "wide"),
      td(deleteButton(() => {
        state.creatives.splice(index, 1);
        saveState();
        render();
      })),
    );
    body.append(tr);
  });
}

function renderCreativeDashboard() {
  const metrics = document.querySelector("#creativeReportMetricGrid");
  const topCards = document.querySelector("#creativeTopCards");
  const attentionCards = document.querySelector("#creativeAttentionCards");
  const typeSummary = document.querySelector("#creativeTypeSummary");
  const platformSummary = document.querySelector("#creativePlatformSummary");
  const body = document.querySelector("#creativeReportRows");
  if (!metrics || !topCards || !attentionCards || !typeSummary || !platformSummary || !body || !syncCreativeFilterControls({
    project: "#creativeReportProject",
    campaign: "#creativeReportCampaign",
    type: "#creativeReportType",
    start: "#creativeReportStart",
    end: "#creativeReportEnd",
  })) return;

  const rows = visibleCreativeRows();
  metrics.innerHTML = creativeMetricCards(rows);

  if (!rows.length) {
    topCards.innerHTML = `<div class="empty-state">No creative data for this selection.</div>`;
    attentionCards.innerHTML = `<div class="empty-state">No creative data for this selection.</div>`;
    typeSummary.innerHTML = `<div class="empty-state">No creative data for this selection.</div>`;
    platformSummary.innerHTML = `<div class="empty-state">No creative data for this selection.</div>`;
    body.innerHTML = `<tr><td colspan="14">No creative rows for this selection.</td></tr>`;
    return;
  }

  const ranked = [...rows].sort((a, b) => {
    const aStats = creativeStats(a);
    const bStats = creativeStats(b);
    if (bStats.leads !== aStats.leads) return bStats.leads - aStats.leads;
    return aStats.cpl - bStats.cpl;
  });
  const attention = ranked.filter((row) => {
    const status = creativeStats(row).status;
    return status !== "Good";
  });

  topCards.innerHTML = ranked.slice(0, 4).map(creativeReportCard).join("");
  attentionCards.innerHTML = (attention.length ? attention : ranked.slice(-2)).slice(0, 4).map(creativeReportCard).join("");
  typeSummary.innerHTML = creativeSummaryList(rows, "creativeType");
  platformSummary.innerHTML = creativeSummaryList(rows, "platform");

  body.innerHTML = ranked.map((row) => {
    const stats = creativeStats(row);
    return `
      <tr>
        <td>${creativeReportIdentity(row)}</td>
        <td>${row.project || ""}</td>
        <td>${row.campaignName || ""}</td>
        <td>${row.adsetName || ""}</td>
        <td>${row.creativeType || ""}</td>
        <td>${creativeImageUrlLink(row)}</td>
        <td>${row.platform || ""}</td>
        <td class="number-cell">${money(stats.spend)}</td>
        <td class="number-cell">${money(stats.leads)}</td>
        <td class="number-cell">${money(stats.svc)}</td>
        <td class="number-cell">${money(stats.booked)}</td>
        <td class="number-cell">${percent(stats.ctr)}</td>
        <td class="number-cell">${money(stats.cpl)}</td>
        <td class="${creativeStatusClass(stats.status)}">${stats.status}</td>
      </tr>
    `;
  }).join("");
}

function creativeReportIdentity(row) {
  const imageSource = row.imageUrl || row.imageData;
  const image = imageSource
    ? `<img class="creative-report-thumb" src="${imageSource}" alt="">`
    : `<div class="creative-report-thumb creative-thumb-empty">No image</div>`;
  return `
    <div class="creative-report-identity">
      ${image}
      <div>
        <strong>${row.creativeName || "Untitled creative"}</strong>
        <span>${row.date ? formatShortDate(row.date) : ""}</span>
      </div>
    </div>
  `;
}

function creativeImageUrlLink(row) {
  const url = row.imageUrl || "";
  if (!url) return row.imageData ? "Uploaded image" : "-";
  return `<a class="creative-url-link" href="${url}" target="_blank" rel="noopener">Open image</a>`;
}

function creativeReportCard(row) {
  const stats = creativeStats(row);
  return `
    <article class="creative-report-card">
      ${creativeReportIdentity(row)}
      <div class="creative-report-kpis">
        <span>Spend <strong>${money(stats.spend)}</strong></span>
        <span>Leads <strong>${money(stats.leads)}</strong></span>
        <span>CPL <strong>${money(stats.cpl)}</strong></span>
        <span>CTR <strong>${percent(stats.ctr)}</strong></span>
      </div>
      <div class="creative-report-meta">
        <span>${row.project || ""}</span>
        <span class="${creativeStatusClass(stats.status)}">${stats.status}</span>
      </div>
    </article>
  `;
}

function creativeSummaryList(rows, key) {
  const groups = new Map();
  rows.forEach((row) => {
    const label = row[key] || "Not set";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  });
  const ranked = [...groups.entries()].map(([label, groupRows]) => {
    const totals = creativeTotals(groupRows);
    const cpl = totals.leads ? totals.spend / totals.leads : 0;
    return { label, rows: groupRows.length, totals, cpl };
  }).sort((a, b) => b.totals.leads - a.totals.leads);
  const maxLeads = Math.max(...ranked.map((item) => item.totals.leads), 1);
  return ranked.map((item) => `
    <div class="summary-row creative-summary-row">
      <span>${item.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.totals.leads / maxLeads) * 100)}%"></div></div>
      <strong>${money(item.totals.leads)}</strong>
      <small>${money(item.rows)} creatives | CPL ${money(item.cpl)}</small>
    </div>
  `).join("");
}

function creativeImageControl(row, index) {
  const wrap = el("div", "creative-upload");
  const imageSource = row.imageUrl || row.imageData;
  if (imageSource) {
    const img = document.createElement("img");
    img.className = "creative-thumb";
    img.src = imageSource;
    img.alt = row.creativeName || "Creative image";
    wrap.append(img);
  } else {
    wrap.append(el("div", "creative-thumb creative-thumb-empty", "No image"));
  }
  const label = el("label", "file-button compact-file-button", "Upload Image");
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.addEventListener("change", (event) => handleCreativeImage(index, event.target.files?.[0]));
  label.append(file);
  wrap.append(label);
  if (row.imageData || row.imageUrl) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-light-button compact-action";
    remove.textContent = "Remove Image";
    remove.addEventListener("click", () => {
      state.creatives[index].imageData = "";
      state.creatives[index].imageUrl = "";
      saveState();
      render();
    });
    wrap.append(remove);
  }
  return wrap;
}

function creativeStatusClass(status) {
  if (status === "Good") return "flag-good";
  if (status === "Replace Creative" || status === "High CPL") return "flag-danger";
  return "flag-warning";
}

function monthName(month) {
  const date = new Date(`${month || todayIso().slice(0, 7)}-01T00:00:00`);
  return date.toLocaleDateString("en-IN", { month: "short" });
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");
}

function formatShortDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatMonthYear(month) {
  return new Date(`${month || todayIso().slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function portalPeriodDetails(date, view) {
  if (view === "day") {
    return { key: date || "No date", label: date ? formatDate(date) : "No date" };
  }
  if (view === "week") {
    if (!date) return { key: "No date", label: "No date" };
    const month = date.slice(0, 7);
    const day = Number(date.slice(8, 10));
    const week = Math.max(1, Math.ceil(day / 7));
    const startDay = ((week - 1) * 7) + 1;
    const endDay = Math.min(week * 7, new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate());
    const start = `${month}-${String(startDay).padStart(2, "0")}`;
    const end = `${month}-${String(endDay).padStart(2, "0")}`;
    return { key: `${month}-week-${week}`, label: `${formatShortDate(start)} - ${formatShortDate(end)}` };
  }
  if (view === "month") {
    const month = (date || todayIso()).slice(0, 7);
    return { key: month, label: formatMonthYear(month) };
  }
  return { key: "range", label: "Selected Range" };
}

function campaignOptions() {
  const ids = state.campaigns.filter(canAccessRow).map((row) => row.id).filter(Boolean);
  return ids.length ? ids : ["No Campaign"];
}

function campaignSelectOptions() {
  const options = state.campaigns
    .filter(canAccessRow)
    .filter((row) => row.id)
    .map((row) => ({
      value: row.id,
      label: `${row.id} - ${row.name || "Unnamed campaign"}`,
    }));
  return options.length ? options : [{ value: "", label: "Add campaign in Campaign Tracker first" }];
}

function projectOptions() {
  const allowed = userProjectList();
  return allowed.length ? allowed : ["Main Project"];
}

function adAccountForProject(projectName) {
  return state.projects.find((project) => project.name === projectName)?.adAccountId || "";
}

function metricOptions() {
  const names = state.metrics.map((metric) => metric.name).filter(Boolean);
  return names.length ? names : defaultMetrics.map((metric) => metric.name);
}

function metricDirection(metricName) {
  return state.metrics.find((metric) => metric.name === metricName)?.direction || "higher";
}

function deleteButton(onClick) {
  const button = el("button", "icon-button", "x");
  button.type = "button";
  button.title = "Delete row";
  button.addEventListener("click", onClick);
  return button;
}

function flagClass(flag) {
  if (flag === "Good") return "flag-good";
  if (flag === "Pause / Fix") return "flag-danger";
  return "flag-warning";
}

function changeClass(value) {
  if (value === "Yes") return "flag-improved";
  if (value === "No") return "flag-not";
  return "flag-waiting";
}

function performanceClass(value) {
  if (["Good", "Improving", "Recovering", "Stable"].includes(value)) return "flag-good";
  if (["Critical", "Declining"].includes(value)) return "flag-danger";
  return "flag-warning";
}

function renderDashboard() {
  const dateCampaignRows = state.campaigns.filter((row) => inDateRange(row.date) && canAccessRow(row));
  const dateChangeRows = state.changes.filter((row) => inDateRange(row.date) && canAccessRow(row));
  const portalDashboardRows = state.portalRows
    .filter((row) => canAccessProject(row.project))
    .filter((row) => inPortalDashboardDateRange(row.date))
    .filter((row) => state.filters.project === "All Projects" || row.project === state.filters.project);
  const campaignRows = dateCampaignRows.filter(matchesProject);
  const changeRows = dateChangeRows.filter(matchesProject);
  const totals = campaignRows.reduce(
    (acc, row) => {
      const calc = calcCampaign(row);
      acc.spend += numberValue(row.spend);
      acc.leads += calc.leads;
      acc.svc += calc.svc;
      acc.booked += calc.booked;
      acc.needsAction += calc.flag === "Needs Action" || calc.flag === "Pause / Fix" ? 1 : 0;
      acc.good += calc.flag === "Good" ? 1 : 0;
      acc.warning += calc.flag === "Needs Action" ? 1 : 0;
      acc.danger += calc.flag === "Pause / Fix" ? 1 : 0;
      acc.performance[calc.performance] = (acc.performance[calc.performance] || 0) + 1;
      return acc;
    },
    { spend: 0, leads: 0, svc: 0, booked: 0, needsAction: 0, good: 0, warning: 0, danger: 0, performance: {} },
  );
  const due = changeRows.filter((row) => reviewStatus(row) === "Review Due").length;
  const avgCpa = totals.leads ? totals.spend / totals.leads : 0;
  const svcRate = totals.leads ? totals.svc / totals.leads : 0;
  const bookedRate = totals.svc ? totals.booked / totals.svc : 0;
  const projectCount = new Set(campaignRows.map((row) => row.project).filter(Boolean)).size;
  const portalDashboardTotal = portalTotals(portalDashboardRows);

  const metrics = [
    ["Projects", projectCount],
    ["Campaign Rows", campaignRows.length],
    ["Total Spend", money(totals.spend)],
    ["Leads", money(totals.leads)],
    ["SVC", money(totals.svc)],
    ["Booked", money(totals.booked)],
    ["SVC %", percent(svcRate)],
    ["Booked %", percent(bookedRate)],
    ["Avg CPA / CPL", money(avgCpa)],
    ["Need Action", totals.needsAction],
    ["Reviews Due", due],
    ["Portal Generated", money(portalDashboardTotal.generated)],
    ["Portal SVC", money(portalDashboardTotal.svc)],
    ["Portal Gross Nos", money(portalDashboardTotal.gross)],
    ["Portal Net Nos", money(portalDashboardTotal.net)],
  ];
  document.querySelector("#metricGrid").innerHTML = metrics
    .map((item) => `<article class="metric"><span>${item[0]}</span><strong>${item[1]}</strong></article>`)
    .join("");

  renderBars("#decisionBars", [
    ["Good", totals.good, "var(--green)"],
    ["Needs Action", totals.warning, "var(--amber)"],
    ["Pause / Fix", totals.danger, "var(--red)"],
  ]);

  const results = changeRows.reduce(
    (acc, row) => {
      acc[calcChange(row)] += 1;
      return acc;
    },
    { Yes: 0, No: 0, Waiting: 0 },
  );
  renderBars("#resultList", [
    ["Improving", (totals.performance.Improving || 0) + (totals.performance.Recovering || 0), "var(--green)"],
    ["Stable / Good", (totals.performance.Stable || 0) + (totals.performance.Good || 0), "var(--teal)"],
    ["Declining", totals.performance.Declining || 0, "var(--red)"],
    ["Critical", totals.performance.Critical || 0, "var(--red)"],
    ["Waiting / Watch", (totals.performance.Waiting || 0) + (totals.performance.Watch || 0), "var(--amber)"],
  ]);
  renderProjectSummary(dateCampaignRows);
  renderPortalDashboardSummary(portalDashboardRows);
}

function renderProjectSummary(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const project = row.project || "Main Project";
    if (!grouped.has(project)) {
      grouped.set(project, { project, rows: 0, spend: 0, leads: 0, svc: 0, booked: 0, needsAction: 0, indicators: {} });
    }
    const item = grouped.get(project);
    const calc = calcCampaign(row);
    item.rows += 1;
    item.spend += numberValue(row.spend);
    item.leads += calc.leads;
    item.svc += calc.svc;
    item.booked += calc.booked;
    item.needsAction += calc.flag === "Needs Action" || calc.flag === "Pause / Fix" ? 1 : 0;
    item.indicators[calc.performance] = (item.indicators[calc.performance] || 0) + 1;
  });

  const tbody = document.querySelector("#projectSummaryRows");
  const items = [...grouped.values()].sort((a, b) => a.project.localeCompare(b.project));
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="11">No project data in this date range.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map((item) => {
      const svcRate = item.leads ? item.svc / item.leads : 0;
      const bookedRate = item.svc ? item.booked / item.svc : 0;
      const mainIndicator = mainProjectIndicator(item.indicators);
      return `
        <tr>
          <td>${item.project}</td>
          <td>${adAccountForProject(item.project)}</td>
          <td class="number-cell">${item.rows}</td>
          <td class="number-cell">${money(item.spend)}</td>
          <td class="number-cell">${money(item.leads)}</td>
          <td class="number-cell">${money(item.svc)}</td>
          <td class="number-cell">${percent(svcRate)}</td>
          <td class="number-cell">${money(item.booked)}</td>
          <td class="number-cell">${percent(bookedRate)}</td>
          <td class="number-cell">${item.needsAction}</td>
          <td class="${performanceClass(mainIndicator)}">${mainIndicator}</td>
        </tr>
      `;
    })
    .join("");
}

function mainProjectIndicator(indicators) {
  const priority = ["Critical", "Declining", "Watch", "Waiting", "Recovering", "Improving", "Stable", "Good"];
  return priority.find((item) => indicators[item]) || "Good";
}

function renderPortalDashboardSummary(rows) {
  const head = document.querySelector("#portalDashboardHead");
  const tbody = document.querySelector("#portalDashboardRows");
  if (!tbody) return;
  const view = state.filters?.portalPeriod || "range";
  if (head) {
    const periodLabel = view === "day" ? "Date" : view === "week" ? "Week" : view === "month" ? "Month" : "Period";
    head.innerHTML = `
      <tr>
        <th>${periodLabel}</th>
        <th>Portal</th>
        <th>Projects</th>
        <th>Days</th>
        <th>Generated</th>
        <th>SVS</th>
        <th>SVC</th>
        <th>SVC %</th>
        <th>Generated Walk-in</th>
        <th>Gross Nos</th>
        <th>Net Nos</th>
      </tr>
    `;
  }
  const grouped = new Map();
  rows.forEach((row) => {
    const portal = row.portal || "Portal";
    const period = portalPeriodDetails(row.date, view);
    const key = `${period.key}::${portal}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        periodKey: period.key,
        periodLabel: period.label,
        portal,
        projects: new Set(),
        dates: new Set(),
        generated: 0,
        svs: 0,
        svc: 0,
        walkin: 0,
        gross: 0,
        net: 0,
      });
    }
    const item = grouped.get(key);
    item.projects.add(row.project || "Project");
    item.dates.add(row.date || "");
    item.generated += numberValue(row.generated);
    item.svs += numberValue(row.svs);
    item.svc += numberValue(row.svc);
    item.walkin += numberValue(row.walkin);
    item.gross += numberValue(row.gross);
    item.net += numberValue(row.net);
  });
  const items = [...grouped.values()].sort((a, b) => {
    if (a.periodKey !== b.periodKey) return a.periodKey.localeCompare(b.periodKey);
    return a.portal.localeCompare(b.portal);
  });
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="11">No portal data in this date range.</td></tr>`;
    return;
  }
  const total = items.reduce((acc, item) => {
    acc.projects += item.projects.size;
    acc.days += item.dates.size;
    acc.generated += item.generated;
    acc.svs += item.svs;
    acc.svc += item.svc;
    acc.walkin += item.walkin;
    acc.gross += item.gross;
    acc.net += item.net;
    return acc;
  }, { projects: 0, days: 0, generated: 0, svs: 0, svc: 0, walkin: 0, gross: 0, net: 0 });
  tbody.innerHTML = [
    ...items.map((item) => {
      const svcRate = item.generated ? item.svc / item.generated : 0;
      return `
        <tr>
          <td>${item.periodLabel}</td>
          <td>${item.portal}</td>
          <td class="number-cell">${item.projects.size}</td>
          <td class="number-cell">${item.dates.size}</td>
          <td class="number-cell">${money(item.generated)}</td>
          <td class="number-cell">${money(item.svs)}</td>
          <td class="number-cell">${money(item.svc)}</td>
          <td class="number-cell">${percent(svcRate)}</td>
          <td class="number-cell">${money(item.walkin)}</td>
          <td class="number-cell">${money(item.gross)}</td>
          <td class="number-cell">${money(item.net)}</td>
        </tr>
      `;
    }),
    `
      <tr class="target-total-row">
        <td>Total</td>
        <td></td>
        <td class="number-cell">${money(total.projects)}</td>
        <td class="number-cell">${money(total.days)}</td>
        <td class="number-cell">${money(total.generated)}</td>
        <td class="number-cell">${money(total.svs)}</td>
        <td class="number-cell">${money(total.svc)}</td>
        <td class="number-cell">${percent(total.generated ? total.svc / total.generated : 0)}</td>
        <td class="number-cell">${money(total.walkin)}</td>
        <td class="number-cell">${money(total.gross)}</td>
        <td class="number-cell">${money(total.net)}</td>
      </tr>
    `,
  ].join("");
}

function renderBars(selector, rows) {
  const max = Math.max(1, ...rows.map((row) => row[1]));
  document.querySelector(selector).innerHTML = rows
    .map(
      ([label, count, color]) => `
        <div class="summary-row">
          <strong>${label}</strong>
          <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%; background:${color}"></div></div>
          <span>${count}</span>
        </div>
      `,
    )
    .join("");
}

function renderReviews() {
  const list = document.querySelector("#reviewList");
  const rows = state.changes
    .filter(canAccessRow)
    .filter((row) => row.followUp)
    .sort((a, b) => a.followUp.localeCompare(b.followUp));
  document.querySelector("#reviewCount").textContent = `${rows.length} scheduled`;

  if (!rows.length) {
    list.innerHTML = document.querySelector("#emptyState").innerHTML;
    return;
  }

  list.innerHTML = rows
    .map((row) => {
      const due = reviewStatus(row) === "Review Due";
      return `
        <article class="review-card ${due ? "is-due" : ""}">
          <div>
            <strong>${row.project || campaignProject(row.campaignId)} - ${row.id}</strong>
            <span>${campaignName(row.campaignId) || row.campaignId}</span>
            <span>${row.type} - ${row.changed || "No change detail entered"}</span>
          </div>
          <span class="status-pill ${due ? "flag-danger" : "flag-waiting"}">${reviewStatus(row)} - ${row.followUp}</span>
        </article>
      `;
    })
    .join("");
}

function renderSettings() {
  Object.entries(state.settings).forEach(([key, value]) => {
    const field = document.querySelector(`#${key}`);
    if (!field || document.activeElement === field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });
  const syncField = document.querySelector("#driveSyncUrl");
  if (syncField && HARDCODED_DRIVE_SYNC_URL) {
    syncField.value = HARDCODED_DRIVE_SYNC_URL;
    syncField.readOnly = true;
    syncField.placeholder = "Cloud URL is built into this app";
  }
  const autoField = document.querySelector("#autoCloudSync");
  if (autoField && HARDCODED_DRIVE_SYNC_URL) {
    autoField.checked = true;
    autoField.disabled = true;
  }
  renderProjectSettings();
  renderMetricSettings();
  renderTrackerColumnSettings();
  renderTrackerToolbarMenus();
}

function renderAdminPanel() {
  state.users = normalizeUsers(state.users);
  const admin = isAdminUser();
  document.querySelectorAll(".admin-only").forEach((item) => item.classList.toggle("is-hidden", !admin));
  if (!admin) {
    if (document.querySelector("#admin")?.classList.contains("is-active")) setActiveTab("dashboard");
    return;
  }
  const count = document.querySelector("#adminUserCount");
  if (count) count.textContent = `${state.users.length} users`;
  const body = document.querySelector("#adminUserRows");
  if (!body) return;
  const projects = allProjectOptions();
  body.innerHTML = "";
  if (!state.users.length) {
    const tr = document.createElement("tr");
    const cell = td("No users found. Use admin / admin123 to sign in and add your team.", "wide");
    cell.colSpan = 6;
    tr.append(cell);
    body.append(tr);
    return;
  }
  state.users.forEach((user, index) => {
    const userProjects = Array.isArray(user.projects) ? user.projects : [];
    const tr = document.createElement("tr");
    const nameCell = el("div", "user-cell");
    const displayName = document.createElement("strong");
    displayName.textContent = user.name || user.username;
    const userName = document.createElement("span");
    userName.textContent = user.username;
    nameCell.append(displayName, userName);
    const projectBox = el("div", "project-checklist");
    const allLabel = document.createElement("label");
    const allInput = document.createElement("input");
    allInput.type = "checkbox";
    allInput.checked = user.role === "admin" || userProjects.includes("All Projects");
    allInput.addEventListener("change", () => {
      state.users[index].projects = allInput.checked ? ["All Projects"] : [];
      saveState();
      render();
    });
    allLabel.append(allInput, "All Projects");
    projectBox.append(allLabel);
    projects.forEach((project) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = userProjects.includes("All Projects") || user.role === "admin";
      checkbox.checked = userProjects.includes(project) || userProjects.includes("All Projects") || user.role === "admin";
      checkbox.addEventListener("change", () => toggleUserProject(index, project, checkbox.checked));
      label.append(checkbox, project);
      projectBox.append(label);
    });
    tr.append(
      td(nameCell, "wide"),
      td(select(user.role || "user", ["user", "admin"], (value) => updateTeamUser(index, "role", value))),
      td(select(user.active === false ? "Inactive" : "Active", ["Active", "Inactive"], (value) => updateTeamUser(index, "active", value === "Active"))),
      td(input("", "text", (value) => updateTeamPassword(index, value)), "wide"),
      td(projectBox, "wide"),
      td(deleteButton(() => deleteTeamUser(index))),
    );
    body.append(tr);
  });
}

function updateTeamUser(index, key, value) {
  if (!state.users[index]) return;
  if (key === "role" && state.users[index].username === currentUserKey() && value !== "admin") {
    document.querySelector("#adminStatus").textContent = "You cannot remove your own admin access while logged in.";
    return;
  }
  state.users[index][key] = value;
  if (key === "role" && value === "admin") state.users[index].projects = ["All Projects"];
  saveState();
  render();
}

function updateTeamPassword(index, value) {
  const password = String(value || "").trim();
  if (!password) return;
  if (password.length < 4) {
    document.querySelector("#adminStatus").textContent = "Password must be at least 4 characters.";
    return;
  }
  state.users[index].password = passwordHash(password);
  document.querySelector("#adminStatus").textContent = `Password updated for ${state.users[index].username}.`;
  saveState();
  render();
}

function toggleUserProject(index, project, checked) {
  const user = state.users[index];
  if (!user) return;
  const projects = new Set((user.projects || []).filter((item) => item !== "All Projects"));
  if (checked) projects.add(project);
  else projects.delete(project);
  user.projects = [...projects];
  saveState();
  render();
}

function addTeamUser() {
  const username = document.querySelector("#adminNewUsername").value.trim().toLowerCase();
  const name = document.querySelector("#adminNewName").value.trim() || username;
  const password = document.querySelector("#adminNewPassword").value.trim();
  const role = document.querySelector("#adminNewRole").value || "user";
  const status = document.querySelector("#adminStatus");
  if (!username || !password) {
    status.textContent = "Enter user name and password.";
    return;
  }
  if (password.length < 4) {
    status.textContent = "Password must be at least 4 characters.";
    return;
  }
  if (state.users.some((user) => user.username === username)) {
    status.textContent = "This user already exists.";
    return;
  }
  state.users.push({
    username,
    name,
    password: passwordHash(password),
    role,
    projects: role === "admin" ? ["All Projects"] : [],
    active: true,
    createdAt: new Date().toISOString(),
  });
  document.querySelector("#adminNewUsername").value = "";
  document.querySelector("#adminNewName").value = "";
  document.querySelector("#adminNewPassword").value = "";
  status.textContent = "User added. Tick the projects they can manage.";
  saveState();
  render();
}

function deleteTeamUser(index) {
  const user = state.users[index];
  if (!user) return;
  if (user.username === currentUserKey()) {
    document.querySelector("#adminStatus").textContent = "You cannot delete your own login while logged in.";
    return;
  }
  const activeAdmins = state.users.filter((item) => item.role === "admin" && item.active !== false);
  if (user.role === "admin" && activeAdmins.length <= 1) {
    document.querySelector("#adminStatus").textContent = "Keep at least one active admin.";
    return;
  }
  state.users.splice(index, 1);
  saveState();
  render();
}

function updateProjectSetting(index, key, value) {
  const oldName = state.projects[index]?.name;
  state.projects[index][key] = value;
  if (key === "name" && oldName && value) {
    state.campaigns.forEach((row) => {
      if (row.project === oldName) row.project = value;
    });
    state.changes.forEach((row) => {
      if (row.project === oldName) row.project = value;
    });
    state.users.forEach((user) => {
      user.projects = (user.projects || []).map((project) => project === oldName ? value : project);
    });
    if (state.filters.project === oldName) state.filters.project = value;
  }
  saveState();
  render();
}

function renderProjectSettings() {
  const body = document.querySelector("#projectSettingRows");
  if (!body) return;
  body.innerHTML = "";
  state.projects.forEach((project, index) => {
    const tr = document.createElement("tr");
    tr.append(
      td(input(project.name, "text", (value) => updateProjectSetting(index, "name", value)), "wide"),
      td(input(project.adAccountId, "text", (value) => updateProjectSetting(index, "adAccountId", value)), "wide"),
      td(deleteButton(() => {
        if (state.projects.length <= 1) return;
        state.projects.splice(index, 1);
        saveState();
        render();
      })),
    );
    body.append(tr);
  });
}

function updateMetricSetting(index, key, value) {
  const oldName = state.metrics[index]?.name;
  state.metrics[index][key] = value;
  if (key === "name" && oldName && value) {
    state.campaigns.forEach((row) => {
      if (row.metric === oldName) row.metric = value;
    });
    state.changes.forEach((row) => {
      if (row.metric === oldName) row.metric = value;
    });
  }
  saveState();
  render();
}

function renderMetricSettings() {
  const body = document.querySelector("#metricSettingRows");
  if (!body) return;
  body.innerHTML = "";
  state.metrics.forEach((metric, index) => {
    const tr = document.createElement("tr");
    tr.append(
      td(input(metric.name, "text", (value) => updateMetricSetting(index, "name", value)), "wide"),
      td(select(metric.direction || "higher", ["higher", "lower"], (value) => updateMetricSetting(index, "direction", value))),
      td(deleteButton(() => {
        if (state.metrics.length <= 1) return;
        const removed = state.metrics[index].name;
        state.metrics.splice(index, 1);
        const fallback = metricOptions()[0] || "CPA/CPL";
        state.campaigns.forEach((row) => {
          if (row.metric === removed) row.metric = fallback;
        });
        state.changes.forEach((row) => {
          if (row.metric === removed) row.metric = fallback;
        });
        saveState();
        render();
      })),
    );
    body.append(tr);
  });
}

function renderTrackerColumnSettings() {
  const container = document.querySelector("#trackerColumnSettings");
  if (!container) return;
  renderColumnCheckboxes(container, "tracker");
}

function renderTrackerToolbarMenus() {
  const columnMenu = document.querySelector("#trackerColumnMenu");
  if (columnMenu) renderColumnCheckboxes(columnMenu, "tracker");
}

function renderColumnCheckboxes(container, mode) {
  const sample = state.campaigns[0] || {};
  const columns = trackerColumnDefinitions(sample, 0, calcCampaign(sample));
  const selected = new Set(state.trackerColumns || defaultTrackerColumnIds);
  container.innerHTML = "";
  columns.forEach((column) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.has(column.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.trackerColumns = [...new Set([...(state.trackerColumns || []), column.id])];
      } else {
        state.trackerColumns = (state.trackerColumns || []).filter((id) => id !== column.id);
      }
      saveState();
      render();
    });
    label.append(checkbox, column.label);
    container.append(label);
  });
}

function renderFilters() {
  const start = document.querySelector("#filterStart");
  const end = document.querySelector("#filterEnd");
  const project = document.querySelector("#filterProject");
  const portalPeriod = document.querySelector("#portalDashboardPeriod");
  const portalStart = document.querySelector("#portalDashboardStart");
  const portalEnd = document.querySelector("#portalDashboardEnd");
  if (project) {
    const current = state.filters?.project || "All Projects";
    const projects = ["All Projects", ...projectOptions()];
    project.innerHTML = projects.map((item) => `<option value="${item}">${item}</option>`).join("");
    project.value = projects.includes(current) ? current : "All Projects";
  }
  if (start && document.activeElement !== start) start.value = state.filters?.startDate || "";
  if (end && document.activeElement !== end) end.value = state.filters?.endDate || "";
  if (portalPeriod && document.activeElement !== portalPeriod) portalPeriod.value = state.filters?.portalPeriod || "range";
  if (portalStart && document.activeElement !== portalStart) portalStart.value = state.filters?.portalStartDate || "";
  if (portalEnd && document.activeElement !== portalEnd) portalEnd.value = state.filters?.portalEndDate || "";
}

function render() {
  document.querySelector("#todayChip").textContent = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  renderCampaignRows();
  renderTargetRows();
  renderPortalRows();
  renderCreativeRows();
  renderCreativeDashboard();
  renderChangeRows();
  renderDashboard();
  renderReviews();
  renderSettings();
  renderAdminPanel();
  renderFilters();
}

function setActiveTab(tabId) {
  const button = document.querySelector(`.tab[data-tab="${tabId}"]`);
  const panel = document.querySelector(`#${tabId}`);
  if (!panel) return;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
  document.querySelectorAll(".tab-menu").forEach((menu) => {
    menu.classList.remove("is-active");
    menu.removeAttribute("open");
  });
  document.querySelectorAll(".panel").forEach((item) => item.classList.remove("is-active"));
  if (button) button.classList.add("is-active");
  document.querySelector(`.tab-menu button[data-tab="${tabId}"]`)?.closest(".tab-menu")?.classList.add("is-active");
  panel.classList.add("is-active");
}

function showLogin() {
  document.body.classList.add("auth-locked");
  document.querySelector("#loginPassword").value = "";
  document.querySelector("#confirmPassword").value = "";
  document.querySelector("#loginName").focus();
}

function showApp() {
  document.body.classList.remove("auth-locked");
  setTimeout(startTeamCloudSync, 100);
}

function initLogin() {
  if (localStorage.getItem(AUTH_KEY)) {
    showApp();
    return;
  }
  showLogin();
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function currentUserKey() {
  return String(localStorage.getItem(AUTH_KEY) || "").trim().toLowerCase();
}

function currentUser() {
  const key = currentUserKey();
  return state.users.find((user) => user.username === key) || null;
}

function isAdminUser(user = currentUser()) {
  return user?.role === "admin";
}

function findLoginUser(name) {
  const key = String(name || "").trim().toLowerCase();
  return state.users.find((user) => user.username === key && user.active !== false);
}

function passwordHash(password) {
  return btoa(password);
}

function allProjectOptions() {
  const names = [
    ...state.projects.map((project) => project.name).filter(Boolean),
    ...state.campaigns.map((row) => row.project).filter(Boolean),
    ...state.targets.map((row) => row.project).filter(Boolean),
    ...state.portalRows.map((row) => row.project).filter(Boolean),
    ...state.creatives.map((row) => row.project).filter(Boolean),
  ];
  const unique = [...new Set(names)];
  return unique.length ? unique : ["Main Project"];
}

function userProjectList(user = currentUser()) {
  if (!user) return allProjectOptions();
  if (isAdminUser(user) || user.projects?.includes("All Projects")) return allProjectOptions();
  return (user.projects || []).filter((project) => allProjectOptions().includes(project));
}

function canAccessProject(projectName) {
  const user = currentUser();
  if (!user || isAdminUser(user) || user.projects?.includes("All Projects")) return true;
  return Boolean(projectName && user.projects?.includes(projectName));
}

function canAccessRow(row) {
  const project = row?.project || campaignProject(row?.campaignId);
  return canAccessProject(project);
}

function firstAllowedProject() {
  return userProjectList()[0] || allProjectOptions()[0] || "Main Project";
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  document.body.classList.toggle("auth-signup", isSignup);
  document.querySelector("#signinMode").classList.toggle("is-active", !isSignup);
  document.querySelector("#signupMode").classList.toggle("is-active", isSignup);
  document.querySelector("#loginTitle").textContent = isSignup ? "Create account" : "Performance Hub";
  document.querySelector("#loginCopy").textContent = isSignup
    ? "Sign up once on this browser, then use Sign in."
    : "Sign in to open your campaign dashboard.";
  document.querySelector("#loginSubmit").textContent = isSignup ? "Sign up" : "Sign in";
  document.querySelector("#loginPassword").autocomplete = isSignup ? "new-password" : "current-password";
  document.querySelector("#loginError").textContent = "";
}

async function login(event) {
  event.preventDefault();
  const name = document.querySelector("#loginName").value.trim();
  const password = document.querySelector("#loginPassword").value.trim();
  const confirmPassword = document.querySelector("#confirmPassword").value.trim();
  const error = document.querySelector("#loginError");
  if (!name || !password) {
    error.textContent = "Enter user name and password.";
    return;
  }
  const userKey = name.toLowerCase();
  if (authMode === "signup") {
    if (password.length < 4) {
      error.textContent = "Use at least 4 characters for password.";
      return;
    }
    if (password !== confirmPassword) {
      error.textContent = "Passwords do not match.";
      return;
    }
    if (findLoginUser(userKey)) {
      error.textContent = "This user already exists. Please sign in.";
      return;
    }
    state.users.push({
      username: userKey,
      name,
      password: passwordHash(password),
      role: "user",
      projects: [],
      active: true,
      createdAt: new Date().toISOString(),
    });
    saveState();
  } else {
    let user = findLoginUser(userKey);
    if (!user || user.password !== passwordHash(password)) {
      error.textContent = "Checking team data...";
      await loadCloudState({ silent: true, skipSeed: true });
      user = findLoginUser(userKey);
    }
    if (!user || user.password !== passwordHash(password)) {
      error.textContent = "Account not found, inactive, or password is wrong.";
      return;
    }
  }
  error.textContent = "";
  localStorage.setItem(AUTH_KEY, userKey);
  showApp();
  setActiveTab("dashboard");
  await loadCloudState({ silent: true, skipSeed: true });
  render();
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  setActiveTab("dashboard");
  showLogin();
}

function addCampaign() {
  const next = String(state.campaigns.length + 1).padStart(3, "0");
  const project = firstAllowedProject();
  state.campaigns.push({
    date: todayIso(),
    project,
    id: `CMP-${next}`,
    name: "",
    adsetName: "",
    platform: "Meta",
    placement: "",
    country: "",
    age: "",
    device: "",
    objective: "Leads",
    status: "Testing",
    metric: "CPA/CPL",
    before: 0,
    after: 0,
    budget: 0,
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    svc: 0,
    booked: 0,
    revenue: 0,
  });
  saveState();
  render();
}

function addChange() {
  const next = String(state.changes.length + 1).padStart(3, "0");
  const campaignId = state.campaigns.find(canAccessRow)?.id || "CMP-001";
  state.changes.push({
    id: `CHG-${next}`,
    date: todayIso(),
    campaignId,
    project: campaignProject(campaignId) || firstAllowedProject(),
    adsetName: campaignAdsetName(campaignId),
    campaignStatus: latestCampaignStatus(campaignId, "Active"),
    type: "Image / Creative",
    changed: "",
    reason: "",
    metric: "CPA/CPL",
    before: 0,
    after: 0,
    leads: 0,
    svc: 0,
    booked: 0,
    owner: "Performance",
    followUp: addDays(todayIso(), state.settings.reviewDays),
    nextAction: "Monitor",
  });
  saveState();
  render();
}

function addTargetProject() {
  state.targets.push(normalizeTargetRow({
    month: state.targetMonth || todayIso().slice(0, 7),
    project: state.targetProject !== "All Projects" && canAccessProject(state.targetProject) ? state.targetProject : firstAllowedProject(),
    medium: `Medium ${currentTargetRows().length + 1}`,
    budget: 0,
  }));
  saveState();
  render();
}

function addPortalRow() {
  const date = `${state.portalMonth || todayIso().slice(0, 7)}-01`;
  state.portalRows.push(normalizePortalRow({
    date,
    month: state.portalMonth || date.slice(0, 7),
    portal: state.portalFilter !== "All Portals" ? state.portalFilter : "99 Acres",
    project: state.portalProject !== "All Projects" && canAccessProject(state.portalProject) ? state.portalProject : firstAllowedProject(),
  }));
  saveState();
  render();
}

function resetPortalRows() {
  if (!confirm("Reset only Portal Report data? Campaign Tracker and Change Log will not change.")) return;
  state.portalRows = structuredClone(sampleState.portalRows).map((row) => normalizePortalRow(row));
  state.portalMonth = sampleState.portalMonth;
  state.portalProject = "All Projects";
  state.portalFilter = "All Portals";
  saveState();
  render();
}

function addCreativeRow() {
  const next = String(state.creatives.length + 1).padStart(3, "0");
  const campaign = state.campaigns.find((row) => (
    canAccessRow(row) &&
    (state.filters.creativeProject === "All Projects" || row.project === state.filters.creativeProject) &&
    (state.filters.creativeCampaign === "All Campaigns" || row.name === state.filters.creativeCampaign)
  )) || state.campaigns.find(canAccessRow);
  state.creatives.push(normalizeCreativeRow({
    id: `CRT-${next}`,
    date: todayIso(),
    campaignId: campaign?.id || "",
    project: campaign?.project || firstAllowedProject(),
    campaignName: campaign?.name || "",
    adsetName: campaign?.adsetName || "",
    creativeType: state.filters.creativeType !== "All Types" ? state.filters.creativeType : "Static",
    platform: campaign?.platform || "Meta",
  }));
  saveState();
  render();
}

function handleCreativeImage(index, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const img = new Image();
    img.addEventListener("load", () => {
      const maxSide = 700;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      state.creatives[index].imageData = canvas.toDataURL("image/jpeg", 0.78);
      saveState();
      render();
    });
    img.src = reader.result;
  });
  reader.readAsDataURL(file);
}

function bindEvents() {
  document.querySelector("#loginForm").addEventListener("submit", login);
  document.querySelector("#signinMode").addEventListener("click", () => setAuthMode("signin"));
  document.querySelector("#signupMode").addEventListener("click", () => setAuthMode("signup"));
  document.querySelector("#logoutButton").addEventListener("click", logout);
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  document.querySelectorAll(".tab-menu button").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  document.querySelectorAll(".tab-menu").forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      document.querySelectorAll(".tab-menu").forEach((other) => {
        if (other !== menu) other.removeAttribute("open");
      });
    });
  });

  document.querySelector("#addCampaign").addEventListener("click", addCampaign);
  document.querySelector("#addChange").addEventListener("click", addChange);
  document.querySelector("#addTargetProject").addEventListener("click", addTargetProject);
  document.querySelector("#addPortalRow").addEventListener("click", addPortalRow);
  document.querySelector("#resetPortalRows").addEventListener("click", resetPortalRows);
  document.querySelector("#addCreativeRow").addEventListener("click", addCreativeRow);
  document.querySelector("#downloadCreativeTemplate").addEventListener("click", () => {
    document.querySelector("#importType").value = "creatives";
    downloadImportTemplate();
  });
  document.querySelector("#goCreativeEntry").addEventListener("click", () => setActiveTab("creatives"));
  document.querySelector("#targetMonth").addEventListener("change", (event) => {
    state.targetMonth = event.target.value || todayIso().slice(0, 7);
    saveState();
    render();
  });
  document.querySelector("#targetWeek").addEventListener("change", (event) => {
    state.targetWeek = event.target.value || "total";
    saveState();
    render();
  });
  document.querySelector("#targetProject").addEventListener("change", (event) => {
    state.targetProject = event.target.value || "All Projects";
    saveState();
    render();
  });
  document.querySelector("#targetView").addEventListener("change", (event) => {
    state.targetView = event.target.value || "all";
    saveState();
    render();
  });
  document.querySelector("#targetSearch").addEventListener("input", (event) => {
    state.targetSearch = event.target.value || "";
    saveState();
    render();
  });
  document.querySelector("#downloadTargetTemplate").addEventListener("click", () => {
    document.querySelector("#importType").value = "targets";
    downloadImportTemplate();
  });
  document.querySelector("#portalMonth").addEventListener("change", (event) => {
    state.portalMonth = event.target.value || todayIso().slice(0, 7);
    state.portalProject = "All Projects";
    state.portalFilter = "All Portals";
    saveState();
    render();
  });
  document.querySelector("#portalProject").addEventListener("change", (event) => {
    state.portalProject = event.target.value || "All Projects";
    saveState();
    render();
  });
  document.querySelector("#portalFilter").addEventListener("change", (event) => {
    state.portalFilter = event.target.value || "All Portals";
    saveState();
    render();
  });
  document.querySelector("#saveData").addEventListener("click", () => {
    saveState();
    showSaveStatus("Saved now");
  });
  document.querySelector("#addProjectSetting").addEventListener("click", () => {
    const next = state.projects.length + 1;
    state.projects.push({ name: `Project ${next}`, adAccountId: "" });
    saveState();
    render();
  });
  document.querySelector("#addMetricSetting").addEventListener("click", () => {
    const next = state.metrics.length + 1;
    state.metrics.push({ name: `Metric ${next}`, direction: "higher" });
    saveState();
    render();
  });
  document.querySelector("#adminAddUser")?.addEventListener("click", addTeamUser);
  document.querySelector("#downloadTemplate").addEventListener("click", downloadImportTemplate);
  document.querySelector("#importFile").addEventListener("change", importCsvFile);
  document.querySelector("#filterProject").addEventListener("change", (event) => {
    state.filters.project = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#filterStart").addEventListener("change", (event) => {
    state.filters.startDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#filterEnd").addEventListener("change", (event) => {
    state.filters.endDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#portalDashboardPeriod").addEventListener("change", (event) => {
    state.filters.portalPeriod = event.target.value || "range";
    saveState();
    render();
  });
  document.querySelector("#portalDashboardStart").addEventListener("change", (event) => {
    state.filters.portalStartDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#portalDashboardEnd").addEventListener("change", (event) => {
    state.filters.portalEndDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#clearPortalDashboardRange").addEventListener("click", () => {
    state.filters.portalStartDate = "";
    state.filters.portalEndDate = "";
    saveState();
    render();
  });
  document.querySelector("#creativeProject").addEventListener("change", (event) => {
    state.filters.creativeProject = event.target.value || "All Projects";
    saveState();
    render();
  });
  document.querySelector("#creativeCampaign").addEventListener("change", (event) => {
    state.filters.creativeCampaign = event.target.value || "All Campaigns";
    saveState();
    render();
  });
  document.querySelector("#creativeType").addEventListener("change", (event) => {
    state.filters.creativeType = event.target.value || "All Types";
    saveState();
    render();
  });
  document.querySelector("#creativeStart").addEventListener("change", (event) => {
    state.filters.creativeStartDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#creativeEnd").addEventListener("change", (event) => {
    state.filters.creativeEndDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#clearCreativeFilters").addEventListener("click", () => {
    state.filters.creativeProject = "All Projects";
    state.filters.creativeCampaign = "All Campaigns";
    state.filters.creativeType = "All Types";
    state.filters.creativeStartDate = "";
    state.filters.creativeEndDate = "";
    saveState();
    render();
  });
  document.querySelector("#creativeReportProject").addEventListener("change", (event) => {
    state.filters.creativeProject = event.target.value || "All Projects";
    saveState();
    render();
  });
  document.querySelector("#creativeReportCampaign").addEventListener("change", (event) => {
    state.filters.creativeCampaign = event.target.value || "All Campaigns";
    saveState();
    render();
  });
  document.querySelector("#creativeReportType").addEventListener("change", (event) => {
    state.filters.creativeType = event.target.value || "All Types";
    saveState();
    render();
  });
  document.querySelector("#creativeReportStart").addEventListener("change", (event) => {
    state.filters.creativeStartDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#creativeReportEnd").addEventListener("change", (event) => {
    state.filters.creativeEndDate = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#clearCreativeReportFilters").addEventListener("click", () => {
    state.filters.creativeProject = "All Projects";
    state.filters.creativeCampaign = "All Campaigns";
    state.filters.creativeType = "All Types";
    state.filters.creativeStartDate = "";
    state.filters.creativeEndDate = "";
    saveState();
    render();
  });
  document.querySelector("#clearDateRange").addEventListener("click", () => {
    state.filters.project = "All Projects";
    state.filters.startDate = "";
    state.filters.endDate = "";
    saveState();
    render();
  });
  document.querySelector("#resetData").addEventListener("click", () => {
    if (!confirm("Reset all report data? Campaigns, targets, portal rows, creatives, and changes will be removed for everyone after cloud save.")) return;
    state = normalizeState(emptyState(state.users));
    saveState();
    saveCloudState();
    showSaveStatus("All data reset");
    setCloudStatus("Reset saved. Team data will be empty after cloud sync.");
    render();
  });
  document.querySelector("#saveSettings").addEventListener("click", () => {
    ["targetCpa", "minRoas", "minCtr", "minCvr", "reviewDays", "warningSpend"].forEach((key) => {
      state.settings[key] = numberValue(document.querySelector(`#${key}`).value);
    });
    state.settings.driveSyncUrl = HARDCODED_DRIVE_SYNC_URL || document.querySelector("#driveSyncUrl").value.trim();
    state.settings.autoCloudSync = HARDCODED_DRIVE_SYNC_URL ? true : document.querySelector("#autoCloudSync").checked;
    saveState();
    showSaveStatus("Rules saved");
    setCloudStatus("Settings saved.");
    render();
  });
  document.querySelector("#driveSyncUrl").addEventListener("change", (event) => {
    state.settings.driveSyncUrl = HARDCODED_DRIVE_SYNC_URL || event.target.value.trim();
    saveState();
  });
  document.querySelector("#autoCloudSync").addEventListener("change", (event) => {
    state.settings.autoCloudSync = HARDCODED_DRIVE_SYNC_URL ? true : event.target.checked;
    saveState();
  });
  document.querySelector("#saveCloudData").addEventListener("click", () => {
    state.settings.driveSyncUrl = HARDCODED_DRIVE_SYNC_URL || document.querySelector("#driveSyncUrl").value.trim();
    state.settings.autoCloudSync = HARDCODED_DRIVE_SYNC_URL ? true : document.querySelector("#autoCloudSync").checked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveCloudState();
  });
  document.querySelector("#loadCloudData").addEventListener("click", () => {
    state.settings.driveSyncUrl = HARDCODED_DRIVE_SYNC_URL || document.querySelector("#driveSyncUrl").value.trim();
    state.settings.autoCloudSync = HARDCODED_DRIVE_SYNC_URL ? true : document.querySelector("#autoCloudSync").checked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    loadCloudState();
  });
  document.querySelector("#exportCsv").addEventListener("click", exportCsv);
}

function downloadImportTemplate() {
  const type = document.querySelector("#importType").value;
  const headers = importTemplates[type];
  const firstMetric = metricOptions()[0] || "CPA/CPL";
  const exampleRows = {
    campaigns: [[todayIso(), "Main Project", "act_123456789", "CMP-001", "Campaign Name", "Ad Set A", "Meta", "Feed", "India", "25-34", "Mobile", "Leads", 5000, firstMetric, 500, 420, 0, 0, 0, 0, 0, 0, 0]],
    changes: [["CHG-001", todayIso(), "Main Project", "act_123456789", "CMP-001", "Ad Set A", "Needs Action", "Image / Creative", "Changed image", "Low CPL", firstMetric, 500, 420, 0, 0, 0, "Performance", addDays(todayIso(), state.settings.reviewDays), "Monitor"]],
    projects: [["Main Project", "act_123456789"]],
    metrics: state.metrics.map((metric) => [metric.name, metric.direction || "higher"]),
    targets: [
      [state.targetMonth || todayIso().slice(0, 7), "One World", "Online_Meta", 440000, 0, 400, 0, 400, 0, 0, 0, 120, 30, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
      [state.targetMonth || todayIso().slice(0, 7), "One World", "BTL/Activation / Expos", 204082, 0, 82, 0, 0, 0, 82, 0, 29, 10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
    ],
    targetWeekly: [
      [state.targetMonth || todayIso().slice(0, 7), "Week 1", "One World", "Online_Meta", 120000, 110, 110, 0, 35, 8, 1],
      [state.targetMonth || todayIso().slice(0, 7), "Week 1", "One World", "BTL/Activation / Expos", 50000, 20, 0, 20, 8, 3, 0],
    ],
    portal: [
      ["2026-05-01", "Housing", "One world", 5, 0, 2, 0, 0, 0],
      ["2026-05-01", "99 Acres", "One world", 6, 0, 1, 1, 0, 0],
      ["2026-05-01", "Magicbricks", "One world", 5, 3, 3, 0, 0, 0],
      ["2026-05-01", "Roof&floor", "One world", 0, 0, 0, 0, 0, 0],
    ],
    creatives: [
      [todayIso(), "Main Project", "CMP-001", "Summer Lead Gen", "Core Lead Audience", "Blue Offer Static", "Static", "https://example.com/creative-image.jpg", "Meta", 1800, 42000, 710, 36, 12, 4, "Active", "Upload image after import"],
      [todayIso(), "Main Project", "CMP-002", "Retargeting Sales", "Search Retargeting", "Walkthrough Video", "Video", "", "Google", 2600, 39000, 620, 28, 10, 3, "Testing", "Compare with static creative"],
    ],
  };
  download(`${type}-import-template.csv`, [headers, ...exampleRows[type]]);
}

async function importCsvFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const type = document.querySelector("#importType").value;
  const status = document.querySelector("#importStatus");
  try {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      status.textContent = "Import file has no data rows.";
      return;
    }
    const headers = rows[0].map((header) => header.trim());
    const records = rows.slice(1).filter((row) => row.some((cell) => String(cell || "").trim())).map((row) => rowToObject(headers, row));
    if (type === "campaigns") importCampaigns(records);
    if (type === "changes") importChanges(records);
    if (type === "projects") importProjects(records);
    if (type === "metrics") importMetrics(records);
    if (type === "targets") importTargets(records);
    if (type === "targetWeekly") importTargetWeekly(records);
    if (type === "portal") importPortalRows(records);
    if (type === "creatives") importCreativeRows(records);
    state = normalizeState(state);
    saveState();
    render();
    status.textContent = `Imported ${records.length} ${type} row${records.length === 1 ? "" : "s"}.`;
  } catch (error) {
    status.textContent = `Import failed: ${error.message}`;
  } finally {
    event.target.value = "";
  }
}

function rowToObject(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index] ?? "";
    return record;
  }, {});
}

function importProjectAllowed(projectName) {
  const project = projectName || firstAllowedProject();
  return canAccessProject(project);
}

function importCampaigns(records) {
  records.forEach((record) => {
    if (!importProjectAllowed(record.Project)) return;
    upsertProject(record.Project, record["Ad Account ID"]);
    state.campaigns.push({
      date: record.Date || todayIso(),
      project: record.Project || "Main Project",
      id: record["Campaign ID"] || `CMP-${String(state.campaigns.length + 1).padStart(3, "0")}`,
      name: record.Name || "",
      adsetName: record["Ad Set Name"] || "",
      platform: record.Platform || "Meta",
      placement: record.Placement || "",
      country: record.Country || "",
      age: record.Age || "",
      device: record.Device || "",
      objective: record.Objective || "Leads",
      status: "Active",
      metric: record.Metric || "CPA/CPL",
      before: numberValue(record["Before Value"]),
      after: numberValue(record["After Value"]),
      budget: numberValue(record.Budget),
      spend: numberValue(record.Spend),
      impressions: numberValue(record.Impressions),
      clicks: numberValue(record.Clicks),
      leads: numberValue(record.Leads),
      svc: numberValue(record.SVC),
      booked: numberValue(record.Booked),
      revenue: numberValue(record.Revenue),
    });
  });
}

function importChanges(records) {
  records.forEach((record) => {
    if (!importProjectAllowed(record.Project || campaignProject(record["Campaign ID"]))) return;
    upsertProject(record.Project, record["Ad Account ID"]);
    state.changes.push({
      id: record["Change ID"] || `CHG-${String(state.changes.length + 1).padStart(3, "0")}`,
      date: record.Date || todayIso(),
      project: record.Project || "Main Project",
      campaignId: record["Campaign ID"] || campaignOptions()[0],
      adsetName: record["Ad Set Name"] || campaignAdsetName(record["Campaign ID"]) || "",
      campaignStatus: record["Campaign Status"] || "Active",
      type: record.Type || "Other",
      changed: record.Changed || "",
      reason: record.Reason || "",
      metric: record.Metric || "CPA/CPL",
      before: numberValue(record["Before Value"]),
      after: numberValue(record["After Value"]),
      leads: numberValue(record.Leads),
      svc: numberValue(record.SVC),
      booked: numberValue(record.Booked),
      owner: record.Owner || "Performance",
      followUp: record["Follow-up"] || addDays(record.Date || todayIso(), state.settings.reviewDays),
      nextAction: record["Next Action"] || "Monitor",
    });
  });
}

function importProjects(records) {
  records.forEach((record) => {
    if (!isAdminUser() && !canAccessProject(record.Project)) return;
    upsertProject(record.Project, record["Ad Account ID"]);
  });
}

function importMetrics(records) {
  const imported = records
    .map((record) => ({
      name: record.Metric || "",
      direction: String(record["Improvement Direction"] || "higher").toLowerCase() === "lower" ? "lower" : "higher",
    }))
    .filter((metric) => metric.name);
  if (!imported.length) return;
  state.metrics = imported;
  const fallback = metricOptions()[0] || "CPA/CPL";
  state.campaigns.forEach((row) => {
    if (!state.metrics.some((metric) => metric.name === row.metric)) row.metric = fallback;
  });
  state.changes.forEach((row) => {
    if (!state.metrics.some((metric) => metric.name === row.metric)) row.metric = fallback;
  });
}

function importTargets(records) {
  records.forEach((record) => {
    if (!importProjectAllowed(record.Project)) return;
    const month = record.Month || state.targetMonth || todayIso().slice(0, 7);
    const row = normalizeTargetRow({
      month,
      project: record.Project || "Project",
      medium: record.Medium || "",
      budget: record.Budget,
      spend: record.Spend,
      totalLeadTarget: record["Total Lead Target"],
      totalLeadAchieved: record["Total Lead Achieved"],
      digitalLeadTarget: record["Digital Lead Target"],
      digitalLeadAchieved: record["Digital Lead Achieved"],
      btlLeadTarget: record["BTL Lead Target"],
      btlLeadAchieved: record["BTL Lead Achieved"],
      leadAllocation: record["Lead Allocation"],
      siteVisit: record["Site Visit"],
      booking: record.Booking,
      weeks: {
        week1: {
          spend: record["Week 1 Spend"],
          totalLeadAchieved: record["Week 1 Total Lead Achieved"],
          digitalLeadAchieved: record["Week 1 Digital Lead Achieved"],
          btlLeadAchieved: record["Week 1 BTL Lead Achieved"],
          leadAllocation: record["Week 1 Lead Allocation"],
          siteVisit: record["Week 1 Site Visit"],
          booking: record["Week 1 Booking"],
        },
        week2: {
          spend: record["Week 2 Spend"],
          totalLeadAchieved: record["Week 2 Total Lead Achieved"],
          digitalLeadAchieved: record["Week 2 Digital Lead Achieved"],
          btlLeadAchieved: record["Week 2 BTL Lead Achieved"],
          leadAllocation: record["Week 2 Lead Allocation"],
          siteVisit: record["Week 2 Site Visit"],
          booking: record["Week 2 Booking"],
        },
        week3: {
          spend: record["Week 3 Spend"],
          totalLeadAchieved: record["Week 3 Total Lead Achieved"],
          digitalLeadAchieved: record["Week 3 Digital Lead Achieved"],
          btlLeadAchieved: record["Week 3 BTL Lead Achieved"],
          leadAllocation: record["Week 3 Lead Allocation"],
          siteVisit: record["Week 3 Site Visit"],
          booking: record["Week 3 Booking"],
        },
        week4: {
          spend: record["Week 4 Spend"],
          totalLeadAchieved: record["Week 4 Total Lead Achieved"],
          digitalLeadAchieved: record["Week 4 Digital Lead Achieved"],
          btlLeadAchieved: record["Week 4 BTL Lead Achieved"],
          leadAllocation: record["Week 4 Lead Allocation"],
          siteVisit: record["Week 4 Site Visit"],
          booking: record["Week 4 Booking"],
        },
        week5: {
          spend: record["Week 5 Spend"],
          totalLeadAchieved: record["Week 5 Total Lead Achieved"],
          digitalLeadAchieved: record["Week 5 Digital Lead Achieved"],
          btlLeadAchieved: record["Week 5 BTL Lead Achieved"],
          leadAllocation: record["Week 5 Lead Allocation"],
          siteVisit: record["Week 5 Site Visit"],
          booking: record["Week 5 Booking"],
        },
      },
    });
    const existingIndex = state.targets.findIndex((item) => item.month === row.month && item.project === row.project && item.medium === row.medium);
    if (existingIndex >= 0) state.targets[existingIndex] = row;
    else state.targets.push(row);
    state.targetMonth = month;
  });
}

function importTargetWeekly(records) {
  records.forEach((record) => {
    const month = record.Month || state.targetMonth || todayIso().slice(0, 7);
    const project = record.Project || "Project";
    if (!importProjectAllowed(project)) return;
    const medium = record.Medium || "";
    const week = weekKey(record.Week || state.targetWeek || "Week 1");
    let targetRow = state.targets.find((item) => item.month === month && item.project === project && item.medium === medium);
    if (!targetRow) {
      targetRow = normalizeTargetRow({ month, project, medium });
      state.targets.push(targetRow);
    }
    targetRow.weeks[week] = {
      ...normalizeTargetWeek(targetRow.weeks[week]),
      spend: numberValue(record.Spend),
      totalLeadAchieved: numberValue(record["Total Lead Achieved"]),
      digitalLeadAchieved: numberValue(record["Digital Lead Achieved"]),
      btlLeadAchieved: numberValue(record["BTL Lead Achieved"]),
      leadAllocation: numberValue(record["Lead Allocation"]),
      siteVisit: numberValue(record["Site Visit"]),
      booking: numberValue(record.Booking),
    };
    state.targetMonth = month;
    state.targetWeek = week;
  });
}

function importPortalRows(records) {
  records.forEach((record) => {
    if (!importProjectAllowed(record.Project)) return;
    const date = record.Date || todayIso();
    const row = normalizePortalRow({
      date,
      month: record.Month || date.slice(0, 7),
      portal: record.Portal || "99 Acres",
      project: record.Project || "Project",
      generated: record.Generated,
      svs: record.SVS,
      svc: record.SVC,
      walkin: record["Generated Walk-in"] || record["Generated walk-in"],
      gross: record["Gross Nos"] || record["Gross nos"],
      net: record["Net Nos"] || record["Net nos"],
    });
    const existingIndex = state.portalRows.findIndex((item) => (
      item.date === row.date && item.portal === row.portal && item.project === row.project
    ));
    if (existingIndex >= 0) state.portalRows[existingIndex] = row;
    else state.portalRows.push(row);
    state.portalMonth = row.month;
    if (!state.projects.some((project) => project.name === row.project)) {
      state.projects.push({ name: row.project, adAccountId: "" });
    }
  });
}

function importCreativeRows(records) {
  records.forEach((record) => {
    const importedCampaignId = record["Campaign ID"] || "";
    const importedCampaignName = (record["Campaign Name"] || record.Campaign || "").trim().toLowerCase();
    const matchedCampaign = importedCampaignId
      ? campaignById(importedCampaignId)
      : state.campaigns.find((campaign) => (
        (campaign.name || "").trim().toLowerCase() === importedCampaignName &&
        (!record.Project || campaign.project === record.Project)
      )) || state.campaigns.find((campaign) => (campaign.name || "").trim().toLowerCase() === importedCampaignName);
    if (!matchedCampaign || !canAccessProject(matchedCampaign.project)) return;
    const row = normalizeCreativeRow({
      id: record["Creative ID"] || "",
      date: record.Date || todayIso(),
      campaignId: matchedCampaign.id,
      project: matchedCampaign.project,
      campaignName: matchedCampaign.name,
      adsetName: matchedCampaign.adsetName,
      creativeName: record["Creative Name"] || "Creative",
      creativeType: record["Creative Type"] || record.Type || "Static",
      imageUrl: record["Image URL"] || record.Image || record["Creative Image"] || "",
      platform: matchedCampaign.platform || record.Platform || "Meta",
      spend: record.Spend,
      impressions: record.Impressions,
      clicks: record.Clicks,
      leads: record.Leads,
      svc: record.SVC,
      booked: record.Booked,
      status: record.Status || "Testing",
      remarks: record.Remarks || "",
    });
    const existingIndex = state.creatives.findIndex((item) => (
      item.date === row.date &&
      item.project === row.project &&
      item.campaignName === row.campaignName &&
      item.adsetName === row.adsetName &&
      item.creativeName === row.creativeName
    ));
    if (existingIndex >= 0) state.creatives[existingIndex] = {
      ...row,
      imageData: state.creatives[existingIndex].imageData || "",
      imageUrl: row.imageUrl || state.creatives[existingIndex].imageUrl || "",
    };
    else state.creatives.push(row);
    if (!state.projects.some((project) => project.name === row.project)) {
      state.projects.push({ name: row.project, adAccountId: "" });
    }
  });
}

function weekKey(value) {
  const text = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["1", "week1", "w1"].includes(text)) return "week1";
  if (["2", "week2", "w2"].includes(text)) return "week2";
  if (["3", "week3", "w3"].includes(text)) return "week3";
  if (["4", "week4", "w4"].includes(text)) return "week4";
  if (["5", "week5", "w5"].includes(text)) return "week5";
  return "week1";
}

function upsertProject(name, adAccountId = "") {
  const projectName = name || "Main Project";
  const existing = state.projects.find((project) => project.name === projectName);
  if (existing) {
    if (adAccountId) existing.adAccountId = adAccountId;
    return;
  }
  state.projects.push({ name: projectName, adAccountId: adAccountId || "" });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function campaignTrackerExportRows() {
  return [
    ["Date", "Project", "Ad Account ID", "Campaign ID", "Name", "Ad Set Name", "Platform", "Placement", "Country", "Age", "Device", "Objective", "Status", "Last Edited", "Last Change", "Metric", "Before Value", "After Value", "Budget", "Spend", "Impressions", "Clicks", "Leads", "SVC", "Booked", "Revenue", "CTR", "CVR", "SVC %", "Booked %", "CPA/CPL", "ROAS", "Flag", "Performance"],
    ...state.campaigns.filter(canAccessRow).map((row) => {
      const calc = calcCampaign(row);
      return [row.date, row.project, adAccountForProject(row.project), row.id, row.name, row.adsetName, row.platform, row.placement, row.country, row.age, row.device, row.objective, latestCampaignStatus(row.id, row.status), latestChangeDate(row.id), latestChangeText(row.id), row.metric || "CPA/CPL", row.before, row.after, row.budget, row.spend, row.impressions, row.clicks, calc.leads, calc.svc, calc.booked, row.revenue, percent(calc.ctr), percent(calc.cvr), percent(calc.svcRate), percent(calc.bookedRate), calc.cpa.toFixed(2), calc.roas.toFixed(2), calc.flag, calc.performance];
    }),
  ];
}

function changeLogExportRows() {
  return [
    ["Change ID", "Date", "Project", "Ad Account ID", "Campaign ID", "Campaign Name", "Ad Set Name", "Campaign Status", "Type", "Changed", "Reason", "Metric", "Before Value", "After Value", "Improved", "Leads", "SVC", "SVC %", "Booked", "Booked %", "Owner", "Follow-up", "Status", "Next Action"],
    ...state.changes.filter(canAccessRow).map((row) => {
      const funnel = calcChangeFunnel(row);
      const project = row.project || campaignProject(row.campaignId);
      return [row.id, row.date, project, adAccountForProject(project), row.campaignId, campaignName(row.campaignId), row.adsetName || campaignAdsetName(row.campaignId), row.campaignStatus || latestCampaignStatus(row.campaignId), row.type, row.changed, row.reason, row.metric || "CPA/CPL", row.before, row.after, calcChange(row), funnel.leads, funnel.svc, percent(funnel.svcRate), funnel.booked, percent(funnel.bookedRate), row.owner, row.followUp, reviewStatus(row), row.nextAction];
    }),
  ];
}

function targetExportRows() {
  return [
    importTemplates.targets,
    ...state.targets.filter((row) => canAccessProject(row.project)).map((row) => [
      row.month,
      row.project,
      row.medium,
      row.budget,
      row.spend,
      row.totalLeadTarget,
      row.totalLeadAchieved,
      row.digitalLeadTarget,
      row.digitalLeadAchieved,
      row.btlLeadTarget,
      row.btlLeadAchieved,
      row.leadAllocation,
      row.siteVisit,
      row.booking,
      row.weeks.week1.spend,
      row.weeks.week1.totalLeadAchieved,
      row.weeks.week1.digitalLeadAchieved,
      row.weeks.week1.btlLeadAchieved,
      row.weeks.week1.leadAllocation,
      row.weeks.week1.siteVisit,
      row.weeks.week1.booking,
      row.weeks.week2.spend,
      row.weeks.week2.totalLeadAchieved,
      row.weeks.week2.digitalLeadAchieved,
      row.weeks.week2.btlLeadAchieved,
      row.weeks.week2.leadAllocation,
      row.weeks.week2.siteVisit,
      row.weeks.week2.booking,
      row.weeks.week3.spend,
      row.weeks.week3.totalLeadAchieved,
      row.weeks.week3.digitalLeadAchieved,
      row.weeks.week3.btlLeadAchieved,
      row.weeks.week3.leadAllocation,
      row.weeks.week3.siteVisit,
      row.weeks.week3.booking,
      row.weeks.week4.spend,
      row.weeks.week4.totalLeadAchieved,
      row.weeks.week4.digitalLeadAchieved,
      row.weeks.week4.btlLeadAchieved,
      row.weeks.week4.leadAllocation,
      row.weeks.week4.siteVisit,
      row.weeks.week4.booking,
      row.weeks.week5.spend,
      row.weeks.week5.totalLeadAchieved,
      row.weeks.week5.digitalLeadAchieved,
      row.weeks.week5.btlLeadAchieved,
      row.weeks.week5.leadAllocation,
      row.weeks.week5.siteVisit,
      row.weeks.week5.booking,
    ]),
  ];
}

function portalExportRows() {
  return [
    importTemplates.portal,
    ...state.portalRows.filter((row) => canAccessProject(row.project)).map((row) => [
      row.date,
      row.portal,
      row.project,
      row.generated,
      row.svs,
      row.svc,
      row.walkin,
      row.gross,
      row.net,
    ]),
  ];
}

function creativeExportRows() {
  return [
    [...importTemplates.creatives, "CTR", "CPL", "SVC %", "Booked %", "Calculated Status", "Has Image"],
    ...state.creatives.filter(canAccessRow).map((row) => {
      const stats = creativeStats(row);
      return [
        row.date,
        row.project,
        row.campaignId,
        row.campaignName,
        row.adsetName,
        row.creativeName,
        row.creativeType,
        row.imageUrl || "",
        row.platform,
        row.spend,
        row.impressions,
        row.clicks,
        row.leads,
        row.svc,
        row.booked,
        row.status,
        row.remarks,
        percent(stats.ctr),
        stats.cpl.toFixed(2),
        percent(stats.svcRate),
        percent(stats.bookedRate),
        stats.status,
        row.imageData || row.imageUrl ? "Yes" : "No",
      ];
    }),
  ];
}

function projectSummaryExportRows() {
  const rows = state.campaigns.filter((row) => inDateRange(row.date) && matchesProject(row));
  const grouped = new Map();
  rows.forEach((row) => {
    const project = row.project || "Main Project";
    if (!grouped.has(project)) grouped.set(project, { project, rows: 0, spend: 0, leads: 0, svc: 0, booked: 0, needsAction: 0, indicators: {} });
    const item = grouped.get(project);
    const calc = calcCampaign(row);
    item.rows += 1;
    item.spend += numberValue(row.spend);
    item.leads += calc.leads;
    item.svc += calc.svc;
    item.booked += calc.booked;
    item.needsAction += calc.flag === "Needs Action" || calc.flag === "Pause / Fix" ? 1 : 0;
    item.indicators[calc.performance] = (item.indicators[calc.performance] || 0) + 1;
  });
  return [
    ["Project", "Ad Account ID", "Campaign Rows", "Spend", "Leads", "SVC", "SVC %", "Booked", "Booked %", "Need Action", "Main Indicator"],
    ...[...grouped.values()].sort((a, b) => a.project.localeCompare(b.project)).map((item) => [
      item.project,
      adAccountForProject(item.project),
      item.rows,
      item.spend,
      item.leads,
      item.svc,
      percent(item.leads ? item.svc / item.leads : 0),
      item.booked,
      percent(item.svc ? item.booked / item.svc : 0),
      item.needsAction,
      mainProjectIndicator(item.indicators),
    ]),
  ];
}

function portalSummaryExportRows() {
  const view = state.filters?.portalPeriod || "range";
  const rows = state.portalRows
    .filter((row) => canAccessProject(row.project))
    .filter((row) => inPortalDashboardDateRange(row.date))
    .filter((row) => state.filters.project === "All Projects" || row.project === state.filters.project);
  const grouped = new Map();
  rows.forEach((row) => {
    const period = portalPeriodDetails(row.date, view);
    const key = `${period.key}::${row.portal || "Portal"}`;
    if (!grouped.has(key)) {
      grouped.set(key, { periodKey: period.key, periodLabel: period.label, portal: row.portal || "Portal", projects: new Set(), dates: new Set(), generated: 0, svs: 0, svc: 0, walkin: 0, gross: 0, net: 0 });
    }
    const item = grouped.get(key);
    item.projects.add(row.project || "Project");
    item.dates.add(row.date || "");
    item.generated += numberValue(row.generated);
    item.svs += numberValue(row.svs);
    item.svc += numberValue(row.svc);
    item.walkin += numberValue(row.walkin);
    item.gross += numberValue(row.gross);
    item.net += numberValue(row.net);
  });
  return [
    ["Period", "Portal", "Projects", "Days", "Generated", "SVS", "SVC", "SVC %", "Generated Walk-in", "Gross Nos", "Net Nos"],
    ...[...grouped.values()].sort((a, b) => a.periodKey === b.periodKey ? a.portal.localeCompare(b.portal) : a.periodKey.localeCompare(b.periodKey)).map((item) => [
      item.periodLabel,
      item.portal,
      item.projects.size,
      item.dates.size,
      item.generated,
      item.svs,
      item.svc,
      percent(item.generated ? item.svc / item.generated : 0),
      item.walkin,
      item.gross,
      item.net,
    ]),
  ];
}

function exportCsv() {
  const type = document.querySelector("#exportReportType")?.value || "all";
  const reports = {
    campaigns: ["campaign-tracker.csv", campaignTrackerExportRows],
    changes: ["campaign-change-log.csv", changeLogExportRows],
    targets: ["campaign-target-vs-achieved.csv", targetExportRows],
    portal: ["portal-report.csv", portalExportRows],
    creatives: ["creative-performance-report.csv", creativeExportRows],
    projectSummary: ["project-summary-report.csv", projectSummaryExportRows],
    portalSummary: ["portal-wise-summary-report.csv", portalSummaryExportRows],
  };
  if (type === "all") {
    Object.values(reports).forEach(([filename, builder]) => download(filename, builder()));
    return;
  }
  const report = reports[type];
  if (report) download(report[0], report[1]());
}

function download(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

bindEvents();
render();
const params = new URLSearchParams(window.location.search);
const requestedTab = params.get("tab");
if (requestedTab) setActiveTab(requestedTab);
else if (params.get("creative") === "1") setActiveTab("creativePerformance");
initLogin();
