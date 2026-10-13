"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { divisionLabels, reminderStatusLabels, reminderTypeLabels, requestTypeLabels, statusLabels, weekdays } from "@/lib/labels";
import { formatDate, toISODate } from "@/lib/format";
import { countWorkdaysBetween, levelRules, startOfWeek, weekDates } from "@/lib/schedule";
import { getWeeklyProjectItemsForDate, weeklyStageLabel } from "@/lib/weekly";

const patentStatusLabels = {
  NOT_APPLIED: "未申请",
  APPLIED: "已申请"
} as const;

type Designer = {
  id: string;
  name: string;
  isDesignOwner: boolean;
  isDesigner: boolean;
  isActive: boolean;
};

type ScheduleItem = {
  id: string;
  roundId?: string | null;
  roundIndex: number;
  date: string;
  workdayIndex: number;
  phaseName: string;
  isAlignmentNode: boolean;
  isDeliveryNode: boolean;
  designerIds: string[];
};

type ProjectRound = {
  id: string;
  projectId: string;
  roundIndex: number;
  level: "A" | "B" | "C" | "D";
  status: keyof typeof statusLabels;
  designerIds: string[];
  startDate: string | null;
  targetDeliveryDate: string | null;
  autoDeliveryDate: string | null;
  alignmentDate: string | null;
  deliveryDate: string | null;
  allowReminder: boolean;
  submittedAt: string | null;
  feedbackReceivedAt: string | null;
  notes: string;
};

type FeedbackEvent = {
  id: string;
  projectId: string;
  roundIndex: number;
  submittedAt: string;
  feedbackReceivedAt: string | null;
  notes: string;
};

type ProjectProposal = {
  id: string;
  projectId: string;
  roundIndex: number;
  designerId: string;
  proposalName: string;
  isSelected: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectPatent = {
  id: string;
  projectId: string;
  status: keyof typeof patentStatusLabels | "UNKNOWN";
  applicationNo: string;
  applicationDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function normalizedPatentStatus(patent: ProjectPatent | null): keyof typeof patentStatusLabels {
  return patent?.status === "APPLIED" ? "APPLIED" : "NOT_APPLIED";
}

type Project = {
  id: string;
  name: string;
  level: "A" | "B" | "C" | "D";
  division: keyof typeof divisionLabels;
  requestType: keyof typeof requestTypeLabels;
  status: keyof typeof statusLabels;
  designOwnerId: string | null;
  designerIds: string[];
  startDate: string | null;
  targetDeliveryDate: string | null;
  alignmentDate: string | null;
  deliveryDate: string | null;
  completedAt: string | null;
  scheduleStoppedAt: string | null;
  isUnscheduled: boolean;
  allowReminder: boolean;
  currentRoundIndex: number;
  notes: string;
  scheduleItems: ScheduleItem[];
  rounds: ProjectRound[];
  feedbackEvents: FeedbackEvent[];
  proposals: ProjectProposal[];
  patent: ProjectPatent | null;
};

type Reminder = {
  id: string;
  projectId: string | null;
  type: keyof typeof reminderTypeLabels;
  scheduledAt: string;
  sentAt: string | null;
  channel: string;
  status: keyof typeof reminderStatusLabels;
  messageContent: string;
  errorMessage: string;
  retryCount: number;
  project?: Project;
};

type Settings = {
  wechatWebhookUrl: string;
  reminderTimes: string;
  workdayRule: string;
  levelRules: string;
};

type Bootstrap = {
  projects: Project[];
  designers: Designer[];
  reminders: Reminder[];
  settings: Settings;
};

const manualTaskStorageKey = "industrial-design-week-manual-tasks-v1";

function manualTaskKey(designerId: string, date: string) {
  return `${designerId}__${date}`;
}

const emptyForm = {
  name: "",
  level: "C",
  division: "REFRIGERATION",
  requestType: "B2B",
  status: "NOT_STARTED",
  designOwnerId: "",
  designerIds: [] as string[],
  startDate: "",
  targetDeliveryDate: "",
  allowReminder: true,
  notes: ""
};

function currentWeekStart() {
  return toISODate(startOfWeek(new Date()));
}

export default function OpsApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [route, setRoute] = useState("projects");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState("全部");
  const [weekStart, setWeekStart] = useState(currentWeekStart());

  async function refresh() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    const json = (await response.json()) as Bootstrap;
    setData(json);
    if (!selectedProjectId && json.projects[0]) setSelectedProjectId(json.projects[0].id);
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!data) return <div className="loading-screen">LOADING INDUSTRIAL DESIGN OPS</div>;

  const selectedProject = data.projects.find((item) => item.id === selectedProjectId) || data.projects[0];
  const week = weekDates(weekStart).map(toISODate);
  const weekDeliveryCount = data.projects.filter((item) => item.deliveryDate && week.includes(toISODate(item.deliveryDate))).length;
  const delayedCount = data.projects.filter((item) => item.status === "DELAYED").length;

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <strong>INDUSTRIAL</strong>
            <small>DESIGN OPS</small>
          </div>
        </div>
        <nav>
          {nav("projects", "( 01 ) 项目汇总")}
          {nav("week", "( 02 ) 周工作总览")}
          {nav("reminders", "( 03 ) 提醒记录")}
          {nav("settings", "( 04 ) 基础设置")}
          {nav("stats", "( 05 ) 数据总览")}
          {nav("proposalStats", "( 06 ) 方案统计")}
          {nav("patents", "( 07 ) 设计专利")}
        </nav>
      </aside>
      <main className="shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">TODAY</span> <strong>{formatDate(new Date())}</strong>
            <span className="muted">当前周 {formatDate(week[0], "md")} - {formatDate(week[week.length - 1], "md")}</span>
          </div>
          <div className="top-pills">
            <span>未安排 <b>{data.projects.filter((item) => item.isUnscheduled).length}</b></span>
            <span>本周交付 <b>{weekDeliveryCount}</b></span>
            <span>延期 <b>{delayedCount}</b></span>
          </div>
        </header>
        {route === "projects" && <ProjectsPage data={data} quickFilter={quickFilter} setQuickFilter={setQuickFilter} openProject={openProject} editProject={editProject} newProject={newProject} refresh={refresh} />}
        {route === "week" && <WeekPage data={data} weekStart={weekStart} setWeekStart={setWeekStart} openProject={openProject} />}
        {route === "reminders" && <RemindersPage data={data} refresh={refresh} />}
        {route === "settings" && <SettingsPage data={data} refresh={refresh} />}
        {route === "stats" && <StatsPage data={data} openProject={openProject} />}
        {route === "proposalStats" && <ProposalStatsPage data={data} openProject={openProject} refresh={refresh} />}
        {route === "patents" && <PatentsPage data={data} openProject={openProject} refresh={refresh} />}
        {route === "form" && <ProjectForm data={data} project={editingProjectId ? data.projects.find((item) => item.id === editingProjectId) : undefined} refresh={refresh} openProject={openProject} />}
        {route === "detail" && selectedProject && <ProjectDetail data={data} project={selectedProject} refresh={refresh} />}
      </main>
    </>
  );

  function nav(target: string, label: string) {
    return <button className={`nav-item ${route === target ? "active" : ""}`} onClick={() => { if (target === "week") setWeekStart(currentWeekStart()); setRoute(target); }}>{label}</button>;
  }

  function openProject(id: string) {
    setSelectedProjectId(id);
    setRoute("detail");
  }

  function editProject(id: string) {
    setEditingProjectId(id);
    setRoute("form");
  }

  function newProject() {
    setEditingProjectId(null);
    setRoute("form");
  }
}

function SidebarStats({ data, weekDeliveryCount, openProject }: { data: Bootstrap; weekDeliveryCount: number; openProject: (id: string) => void }) {
  const [activePanel, setActivePanel] = useState<"overview" | "division" | "level" | "designers">("overview");
  const [expandedDesignerId, setExpandedDesignerId] = useState<string | null>(null);
  const total = data.projects.length;
  const activeProjects = data.projects.filter((item) => item.status === "IN_PROGRESS").length;
  const delayedProjects = data.projects.filter((item) => item.status === "DELAYED").length;
  const divisionRows = (Object.keys(divisionLabels) as Project["division"][]).map((division) => ({
    label: divisionLabels[division],
    value: data.projects.filter((project) => project.division === division).length
  }));
  const levelRows = (["A", "B", "C", "D"] as Project["level"][]).map((level) => ({
    label: `[${level}]`,
    value: data.projects.filter((project) => project.level === level).length
  }));
  const maxDivision = Math.max(1, ...divisionRows.map((row) => row.value));
  const maxLevel = Math.max(1, ...levelRows.map((row) => row.value));
  const designerRows = data.designers
    .filter((designer) => designer.isDesigner && designer.isActive)
    .map((designer) => ({
      designer,
      projects: data.projects.filter((project) => project.status !== "COMPLETED" && project.designerIds.includes(designer.id))
    }))
    .sort((a, b) => b.projects.length - a.projects.length || a.designer.name.localeCompare(b.designer.name, "zh-Hans-CN"));

  const panels = [
    { key: "overview", label: "总览" },
    { key: "division", label: "事业" },
    { key: "level", label: "等级" },
    { key: "designers", label: "人员" }
  ] as const;

  return <section className="sidebar-stats"><div className="sidebar-stats-title"><span>PROJECT STATS</span><b>{total}</b></div><div className="stats-split"><div className="stats-tabs">{panels.map((panel) => <button className={activePanel === panel.key ? "active" : ""} key={panel.key} type="button" onClick={() => setActivePanel(panel.key)}>{panel.label}</button>)}</div><div className="stats-detail">{activePanel === "overview" && <div className="stats-mini-grid"><div><span>TOTAL</span><strong>{total}</strong></div><div><span>ACTIVE</span><strong>{activeProjects}</strong></div><div><span>DUE</span><strong>{weekDeliveryCount}</strong></div><div><span>DELAY</span><strong className={delayedProjects ? "risk-text" : ""}>{delayedProjects}</strong></div></div>}{activePanel === "division" && <div className="sidebar-chart"><strong>DIVISION</strong>{divisionRows.map((row) => <div className="chart-row" key={row.label}><div><span>{row.label}</span><b>{String(row.value).padStart(2, "0")}</b></div><i><em style={{ width: `${Math.max(6, (row.value / maxDivision) * 100)}%` }} /></i></div>)}</div>}{activePanel === "level" && <div className="sidebar-chart level-chart"><strong>LEVEL</strong>{levelRows.map((row) => <div className="chart-row" key={row.label}><div><span>{row.label}</span><b>{String(row.value).padStart(2, "0")}</b></div><i><em style={{ width: `${Math.max(6, (row.value / maxLevel) * 100)}%` }} /></i></div>)}</div>}{activePanel === "designers" && <div className="sidebar-designers"><strong>DESIGNERS</strong>{designerRows.map(({ designer, projects }) => { const expanded = expandedDesignerId === designer.id; return <div className="designer-stat" key={designer.id}><button type="button" onClick={() => setExpandedDesignerId(expanded ? null : designer.id)}><span>{designer.name}</span><b>{String(projects.length).padStart(2, "0")}</b></button>{expanded && <div className="designer-projects">{projects.slice(0, 4).map((project) => <button type="button" key={project.id} onClick={() => openProject(project.id)}>[{project.level}] {project.name}</button>)}{projects.length > 4 && <span>+{projects.length - 4} MORE</span>}{projects.length === 0 && <span>暂无当前项目</span>}</div>}</div>; })}</div>}</div></div></section>;
}

function getProjectStatsDate(project: Project) {
  const value = project.startDate || project.rounds[0]?.startDate || project.deliveryDate || new Date().toISOString();
  return new Date(value);
}

function StatsPage({ data, openProject }: { data: Bootstrap; openProject: (id: string) => void }) {
  const [activePanel, setActivePanel] = useState<"overview" | "division" | "level" | "designers">("overview");
  const years = Array.from(new Set(data.projects.map((project) => getProjectStatsDate(project).getFullYear()))).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<"ALL" | "Q1" | "Q2" | "Q3" | "Q4">("ALL");
  const quarterIndex = selectedQuarter === "ALL" ? null : Number(selectedQuarter.slice(1));
  const yearProjects = data.projects.filter((project) => getProjectStatsDate(project).getFullYear() === selectedYear);
  const scopedProjects = yearProjects.filter((project) => {
    if (!quarterIndex) return true;
    return Math.floor(getProjectStatsDate(project).getMonth() / 3) + 1 === quarterIndex;
  });
  const total = scopedProjects.length;
  const week = weekDates(startOfWeek(new Date())).map(toISODate);
  const quarterRows = (["Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => {
    const index = Number(quarter.slice(1));
    const projects = yearProjects.filter((project) => Math.floor(getProjectStatsDate(project).getMonth() / 3) + 1 === index);
    return { quarter, projects };
  });
  const maxQuarter = Math.max(1, ...quarterRows.map((row) => row.projects.length));
  const statusItems: [string, number][] = [
    ["全部", total],
    ["未开始", scopedProjects.filter((item) => item.status === "NOT_STARTED").length],
    ["进行中", scopedProjects.filter((item) => item.status === "IN_PROGRESS").length],
    ["跟进", scopedProjects.filter((item) => item.status === "WAITING_ALIGNMENT").length],
    ["待反馈", scopedProjects.filter((item) => item.status === "WAITING_FEEDBACK").length],
    ["本周交付", scopedProjects.filter((item) => item.deliveryDate && week.includes(toISODate(item.deliveryDate))).length],
    ["已完成", scopedProjects.filter((item) => item.status === "COMPLETED").length],
    ["已延期", scopedProjects.filter((item) => item.status === "DELAYED").length],
    ["已暂停", scopedProjects.filter((item) => item.status === "PAUSED").length]
  ];
  const divisionRows = (Object.keys(divisionLabels) as Project["division"][]).map((division) => ({
    key: division,
    label: divisionLabels[division],
    projects: scopedProjects.filter((project) => project.division === division)
  }));
  const levelRows = (["A", "B", "C", "D"] as Project["level"][]).map((level) => ({
    key: level,
    label: `[${level}]`,
    projects: scopedProjects.filter((project) => project.level === level)
  }));
  const designerRows = data.designers
    .filter((designer) => designer.isDesigner && designer.isActive)
    .map((designer) => ({
      designer,
      projects: scopedProjects.filter((project) => project.status !== "COMPLETED" && project.designerIds.includes(designer.id))
    }))
    .sort((a, b) => b.projects.length - a.projects.length || a.designer.name.localeCompare(b.designer.name, "zh-Hans-CN"));
  const maxDivision = Math.max(1, ...divisionRows.map((row) => row.projects.length));
  const maxLevel = Math.max(1, ...levelRows.map((row) => row.projects.length));
  const panels = [
    { key: "overview", label: "项目总览" },
    { key: "division", label: "事业部" },
    { key: "level", label: "项目等级" },
    { key: "designers", label: "设计师" }
  ] as const;

  return (
    <>
      <section className="page-head"><div><span className="eyebrow">DATA ( OVERVIEW )</span><h1>数据总览</h1></div></section>
      <section className="period-bar">
        <label>年度 <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <div>{(["ALL", "Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => <button key={quarter} type="button" className={selectedQuarter === quarter ? "active" : ""} onClick={() => setSelectedQuarter(quarter)}>{quarter === "ALL" ? "全年" : quarter}</button>)}</div>
      </section>
      <section className="data-overview-layout">
        <aside className="data-option-panel">
          {panels.map((panel) => <button key={panel.key} className={activePanel === panel.key ? "active" : ""} type="button" onClick={() => setActivePanel(panel.key)}>{panel.label}</button>)}
        </aside>
        <section className="panel data-detail-panel">
          {activePanel === "overview" && <StatsOverviewDashboard selectedYear={selectedYear} selectedQuarter={selectedQuarter} setSelectedQuarter={setSelectedQuarter} total={total} yearTotal={yearProjects.length} quarterRows={quarterRows} maxQuarter={maxQuarter} statusItems={statusItems} levelRows={levelRows} />}
          {activePanel === "division" && <StatsBarList title="DIVISION" rows={divisionRows.map((row) => ({ label: row.label, value: row.projects.length, max: maxDivision, projects: row.projects }))} openProject={openProject} />}
          {activePanel === "level" && <StatsBarList title="LEVEL" rows={levelRows.map((row) => ({ label: row.label, value: row.projects.length, max: maxLevel, projects: row.projects }))} openProject={openProject} />}
          {activePanel === "designers" && <div><div className="panel-title"><span>DESIGNERS</span><b>{designerRows.length}</b></div><div className="designer-data-list">{designerRows.map(({ designer, projects }) => <article key={designer.id}><div><strong>{designer.name}</strong><span>{projects.length} 个当前项目</span></div><div>{projects.length ? projects.map((project) => <button type="button" key={project.id} onClick={() => openProject(project.id)}>[{project.level}] {project.name}</button>) : <span>暂无当前项目</span>}</div></article>)}</div></div>}
        </section>
      </section>
    </>
  );
}

function StatsOverviewDashboard({ selectedYear, selectedQuarter, setSelectedQuarter, total, yearTotal, quarterRows, maxQuarter, statusItems, levelRows }: {
  selectedYear: number;
  selectedQuarter: "ALL" | "Q1" | "Q2" | "Q3" | "Q4";
  setSelectedQuarter: (value: "ALL" | "Q1" | "Q2" | "Q3" | "Q4") => void;
  total: number;
  yearTotal: number;
  quarterRows: { quarter: "Q1" | "Q2" | "Q3" | "Q4"; projects: Project[] }[];
  maxQuarter: number;
  statusItems: [string, number][];
  levelRows: { key: Project["level"]; label: string; projects: Project[] }[];
}) {
  const statusTotal = Math.max(1, total);
  const statusRows = statusItems.filter(([label]) => !["全部", "本周交付"].includes(label));
  return (
    <div className="overview-dashboard">
      <div className="panel-title"><span>PROJECT DASHBOARD</span><b>{total}</b></div>
      <section className="dashboard-quarter-grid">
        {quarterRows.map((row) => <button key={row.quarter} type="button" className={selectedQuarter === row.quarter ? "active" : ""} onClick={() => setSelectedQuarter(row.quarter)}><strong>{row.quarter}</strong><span>项目数</span><b>{row.projects.length}</b><small>占全年 {yearTotal ? Math.round(row.projects.length / yearTotal * 100) : 0}%</small><i><em style={{ width: `${Math.max(4, (row.projects.length / maxQuarter) * 100)}%` }} /></i></button>)}
      </section>
      <section className="dashboard-grid">
        <article className="dashboard-card project-trend-card">
          <div className="dashboard-card-head"><strong>项目总览</strong><span>项目数量</span></div>
          <QuarterTrendChart rows={quarterRows} max={maxQuarter} />
        </article>
        <article className="dashboard-card status-summary-card">
          <div className="dashboard-card-head"><strong>状态总览</strong><span>{selectedQuarter === "ALL" ? "全年" : selectedQuarter}</span></div>
          <div className="status-summary-list">{statusRows.map(([label, value]) => <div key={label} className={statusToneClass(label)}><div><span>{label}</span><strong>{value}</strong><small>{Math.round(value / statusTotal * 100)}%</small></div><i><em style={{ width: `${Math.max(4, value / statusTotal * 100)}%` }} /></i></div>)}</div>
        </article>
        <article className="dashboard-card level-distribution-card">
          <div className="dashboard-card-head"><strong>项目等级分布</strong><span>{total} 总项目数</span></div>
          <div className="level-donut-wrap"><LevelDonut rows={levelRows} total={total} /><div className="level-legend">{levelRows.map((row) => <div key={row.key}><span className={`level-dot level-dot-${row.key}`} />{row.label}<b>{row.projects.length}</b><small>{total ? Math.round(row.projects.length / total * 100) : 0}%</small></div>)}</div></div>
        </article>
      </section>
    </div>
  );
}

function QuarterTrendChart({ rows, max }: { rows: { quarter: "Q1" | "Q2" | "Q3" | "Q4"; projects: Project[] }[]; max: number }) {
  const points = rows.map((row, index) => {
    const x = 52 + index * 88;
    const y = 126 - (row.projects.length / Math.max(1, max)) * 82;
    return `${x},${y}`;
  }).join(" ");
  const axisValues = [max, Math.ceil(max / 2), 0];
  return <svg className="quarter-trend-chart" viewBox="0 0 340 170" role="img" aria-label="季度项目趋势"><g>{[44, 85, 126].map((y, index) => <g key={y}><line x1="40" x2="320" y1={y} y2={y} /><text className="axis-label" x="24" y={y + 4}>{axisValues[index]}</text></g>)}</g><polyline points={points} /><g>{rows.map((row, index) => { const x = 52 + index * 88; const y = 126 - (row.projects.length / Math.max(1, max)) * 82; return <g key={row.quarter}><circle cx={x} cy={y} r="4" /><text className="point-label" x={x} y={Math.max(18, y - 12)}>{row.projects.length}</text></g>; })}</g><g>{rows.map((row, index) => <text key={row.quarter} className="quarter-label" x={52 + index * 88} y="156">{row.quarter}</text>)}</g></svg>;
}

function LevelDonut({ rows, total }: { rows: { key: Project["level"]; label: string; projects: Project[] }[]; total: number }) {
  let current = 0;
  const colors: Record<Project["level"], string> = { A: "#002FA7", B: "#7F9CFF", C: "#F79009", D: "#DADAD2" };
  const segments = rows.map((row) => {
    const start = current;
    const value = total ? row.projects.length / total * 100 : 0;
    current += value;
    return `${colors[row.key]} ${start}% ${current}%`;
  });
  return <div className="level-donut" style={{ background: `conic-gradient(${segments.join(", ") || "#DADAD2 0% 100%"})` }}><div><strong>{total}</strong><span>总项目数</span></div></div>;
}

function StatsBarList({ title, rows, openProject }: { title: string; rows: { label: string; value: number; max: number; projects: Project[] }[]; openProject: (id: string) => void }) {
  return <div><div className="panel-title"><span>{title}</span><b>{rows.reduce((sum, row) => sum + row.value, 0)}</b></div><div className="data-bar-list">{rows.map((row) => <article key={row.label}><div className="data-bar-head"><strong>{row.label}</strong><b>{String(row.value).padStart(2, "0")}</b></div><i><em style={{ width: `${Math.max(4, (row.value / row.max) * 100)}%` }} /></i><div className="data-project-links">{row.projects.slice(0, 8).map((project) => <button type="button" key={project.id} onClick={() => openProject(project.id)}>[{project.level}] {project.name}</button>)}{row.projects.length > 8 && <span>+{row.projects.length - 8} MORE</span>}{row.projects.length === 0 && <span>暂无项目</span>}</div></article>)}</div></div>;
}

function ProposalStatsPage({ data, openProject, refresh }: { data: Bootstrap; openProject: (id: string) => void; refresh: () => Promise<void> }) {
  const years = Array.from(new Set(data.projects.map((project) => getProjectStatsDate(project).getFullYear()))).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<"ALL" | "Q1" | "Q2" | "Q3" | "Q4">("ALL");
  const quarterIndex = selectedQuarter === "ALL" ? null : Number(selectedQuarter.slice(1));
  const yearProjects = data.projects.filter((project) => getProjectStatsDate(project).getFullYear() === selectedYear);
  const scopedProjects = yearProjects.filter((project) => {
    if (!quarterIndex) return true;
    return Math.floor(getProjectStatsDate(project).getMonth() / 3) + 1 === quarterIndex;
  });
  const scopedProjectIds = new Set(scopedProjects.map((project) => project.id));
  const scoped = data.projects.flatMap((project) => project.proposals.map((proposal) => ({ project, proposal }))).filter(({ project }) => scopedProjectIds.has(project.id));
  const selectedCount = scoped.filter((item) => item.proposal.isSelected).length;
  const designerIds = new Set(scopedProjects.flatMap((project) => project.designerIds));
  const quarterRows = (["Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => {
    const index = Number(quarter.slice(1));
    const projects = yearProjects.filter((project) => Math.floor(getProjectStatsDate(project).getMonth() / 3) + 1 === index);
    const proposalCount = projects.reduce((sum, project) => sum + project.proposals.length, 0);
    return { quarter, value: projects.length, proposalCount };
  });
  const projectRows = scopedProjects
    .map((project) => ({
      project,
      proposals: project.proposals
    }))
    .sort((a, b) => b.proposals.length - a.proposals.length || new Date(getProjectStatsDate(b.project)).getTime() - new Date(getProjectStatsDate(a.project)).getTime());
  const designerRows = data.designers
    .filter((designer) => designer.isDesigner && designer.isActive)
    .map((designer) => {
      const designerProjects = scopedProjects.filter((project) => project.designerIds.includes(designer.id));
      const designerProposals = scoped.filter((item) => item.proposal.designerId === designer.id);
      return {
        designer,
        proposals: designerProposals,
        projectCount: designerProjects.length,
        selectedCount: designerProposals.filter((item) => item.proposal.isSelected).length
      };
    })
    .filter((row) => row.projectCount > 0 || row.proposals.length > 0)
    .sort((a, b) => b.proposals.length - a.proposals.length || b.projectCount - a.projectCount || a.designer.name.localeCompare(b.designer.name, "zh-Hans-CN"));
  const maxDesignerProposals = Math.max(1, ...designerRows.map((row) => Math.max(row.proposals.length, row.projectCount)));
  const maxQuarterValue = Math.max(1, ...quarterRows.map((item) => item.value));

  return (
    <>
      <section className="page-head"><div><span className="eyebrow">PROPOSALS ( STATS )</span><h1>方案统计</h1></div></section>
      <section className="period-bar proposal-period-bar">
        <label>年度 <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.length ? years.map((year) => <option key={year} value={year}>{year}</option>) : <option value={selectedYear}>{selectedYear}</option>}</select></label>
        <div>{(["ALL", "Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => <button key={quarter} type="button" className={selectedQuarter === quarter ? "active" : ""} onClick={() => setSelectedQuarter(quarter)}>{quarter === "ALL" ? "全年" : quarter}</button>)}</div>
      </section>
      <section className="proposal-stats-page">
        <div className="proposal-stat-grid">
          <article><span>项目总数</span><strong>{scopedProjects.length}</strong></article>
          <article><span>方案总数</span><strong>{scoped.length}</strong></article>
          <article><span>中选方案</span><strong>{selectedCount}</strong></article>
          <article><span>参与设计师</span><strong>{designerIds.size}</strong></article>
        </div>
        <section className="proposal-insight-grid">
          <article className="panel proposal-dashboard">
            <div className="panel-title"><span>QUARTER PROJECTS</span><b>{selectedYear}</b></div>
            <div className="proposal-quarter-chart">{quarterRows.map((row) => <button type="button" key={row.quarter} className={selectedQuarter === row.quarter ? "active" : ""} onClick={() => setSelectedQuarter(row.quarter)}><strong>{row.quarter}</strong><i><em style={{ height: `${Math.max(8, row.value / maxQuarterValue * 100)}%` }} /></i><span>{row.value} 个项目 · {row.proposalCount} 个方案</span></button>)}</div>
          </article>
          <article className="panel proposal-designer-board">
            <div className="panel-title"><span>DESIGNER OUTPUT</span><b>{designerRows.length}</b></div>
            <div className="proposal-designer-list">{designerRows.length ? designerRows.map((row) => <div key={row.designer.id} className="proposal-designer-row"><div><strong>{row.designer.name}</strong><span>{row.projectCount} 个项目 · 输出 {row.proposals.length} 个方案 · {row.selectedCount} 个中选</span></div><b>{row.proposals.length}</b><i><em style={{ width: `${Math.max(4, Math.max(row.proposals.length, row.projectCount) / maxDesignerProposals * 100)}%` }} /></i></div>) : <span className="empty">当前周期暂无设计师项目</span>}</div>
          </article>
        </section>
        <section className="panel proposal-project-board">
          <div className="panel-title"><span>PROJECT PROPOSALS</span><b>{projectRows.length}</b></div>
          <div className="proposal-project-list">{projectRows.length ? projectRows.map(({ project, proposals: projectProposals }) => <ProposalProjectCard key={project.id} data={data} project={project} proposals={projectProposals} openProject={openProject} refresh={refresh} />) : <span className="empty">当前周期暂无项目</span>}</div>
        </section>
      </section>
    </>
  );
}

function ProposalProjectCard({ data, project, proposals, openProject, refresh }: { data: Bootstrap; project: Project; proposals: ProjectProposal[]; openProject: (id: string) => void; refresh: () => Promise<void> }) {
  const rounds = (project.rounds.length ? [...project.rounds] : [{ roundIndex: project.currentRoundIndex || 1, designerIds: project.designerIds }] as Pick<ProjectRound, "roundIndex" | "designerIds">[]).sort((a, b) => b.roundIndex - a.roundIndex);
  const selectedProjectProposals = proposals.filter((proposal) => proposal.isSelected);

  async function adjustDesignerProposalCount(roundIndex: number, designerId: string, nextCount: number) {
    const current = proposals
      .filter((proposal) => proposal.roundIndex === roundIndex && proposal.designerId === designerId)
      .sort((a, b) => Number(a.isSelected) - Number(b.isSelected) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const target = Math.max(0, Math.min(99, Math.floor(nextCount || 0)));
    if (target === current.length) return;
    if (target > current.length) {
      for (let index = current.length + 1; index <= target; index += 1) {
        await fetch(`/api/projects/${project.id}/proposals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundIndex, designerId, proposalName: `${nameOf(data.designers, designerId)} 方案 ${String(index).padStart(2, "0")}`, isSelected: false, notes: "" })
        });
      }
    } else {
      for (const proposal of current.slice(0, current.length - target)) {
        await fetch(`/api/projects/${project.id}/proposals/${proposal.id}`, { method: "DELETE" });
      }
    }
    await refresh();
  }

  async function updateRoundSelected(roundProposals: ProjectProposal[], selectedId: string) {
    await Promise.all(roundProposals.map((proposal) => {
      const shouldSelect = proposal.id === selectedId;
      if (proposal.isSelected === shouldSelect) return Promise.resolve();
      return fetch(`/api/projects/${project.id}/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSelected: shouldSelect })
      });
    }));
    await refresh();
  }

  return (
    <article className={`proposal-project-card ${proposals.length ? "" : "empty-proposal-card"}`}>
      <div className="proposal-project-main">
        <button type="button" className="proposal-project-title" onClick={() => openProject(project.id)}>[{project.level}] {project.name}</button>
        <div className="proposal-project-meta"><span>{divisionLabels[project.division]} / {requestTypeLabels[project.requestType]}</span><span>{statusLabels[project.status]}</span></div>
      </div>
      <div className="proposal-project-counts">
        <b>{proposals.length} 方案</b>
        {selectedProjectProposals.length ? <b>{selectedProjectProposals.length} 中选</b> : <span>未中选</span>}
      </div>
      <div className="proposal-round-matrix">
        {rounds.map((round) => {
          const roundProposals = proposals.filter((proposal) => proposal.roundIndex === round.roundIndex);
          const selected = roundProposals.filter((proposal) => proposal.isSelected);
          const designerIds = Array.from(new Set([...(round.designerIds || []), ...roundProposals.map((proposal) => proposal.designerId)]));
          return (
            <div className="proposal-round-cell" key={`${project.id}-R${round.roundIndex}`}>
              <strong>R{round.roundIndex}</strong>
              <div>
                {designerIds.length ? designerIds.map((designerId) => {
                  const count = roundProposals.filter((proposal) => proposal.designerId === designerId).length;
                  return <label key={`${project.id}-${round.roundIndex}-${designerId}`}><span>{nameOf(data.designers, designerId)}</span><input type="number" min={0} max={99} defaultValue={count} onBlur={(event) => adjustDesignerProposalCount(round.roundIndex, designerId, Number(event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
                }) : <span>暂无设计师</span>}
              </div>
              <select value={selected[0]?.id || ""} disabled={!roundProposals.length} onChange={(event) => updateRoundSelected(roundProposals, event.target.value)}>
                <option value="">未中选</option>
                {roundProposals.map((proposal) => <option key={proposal.id} value={proposal.id}>{nameOf(data.designers, proposal.designerId)} / {proposal.proposalName}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PatentsPage({ data, openProject, refresh }: { data: Bootstrap; openProject: (id: string) => void; refresh: () => Promise<void> }) {
  const applied = data.projects.filter((project) => normalizedPatentStatus(project.patent) === "APPLIED").length;
  const notApplied = data.projects.length - applied;

  return (
    <>
      <section className="page-head"><div><span className="eyebrow">PATENT ( DESIGN )</span><h1>设计专利</h1></div></section>
      <section className="proposal-stat-grid patent-stat-grid">
        <article><span>项目总数</span><strong>{data.projects.length}</strong></article>
        <article><span>已申请</span><strong>{applied}</strong></article>
        <article><span>未申请</span><strong>{notApplied}</strong></article>
      </section>
      <section className="panel patent-board">
        <div className="panel-title"><span>PATENT LIST</span><b>{data.projects.length}</b></div>
        <div className="patent-list">
          {data.projects.map((project) => <PatentProjectRow key={project.id} project={project} openProject={openProject} refresh={refresh} />)}
        </div>
      </section>
    </>
  );
}

function PatentProjectRow({ project, openProject, refresh }: { project: Project; openProject: (id: string) => void; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({
    status: normalizedPatentStatus(project.patent),
    applicationNo: project.patent?.applicationNo || "",
    applicationDate: project.patent?.applicationDate ? toISODate(project.patent.applicationDate) : "",
    notes: project.patent?.notes || ""
  });

  useEffect(() => {
    setForm({
      status: normalizedPatentStatus(project.patent),
      applicationNo: project.patent?.applicationNo || "",
      applicationDate: project.patent?.applicationDate ? toISODate(project.patent.applicationDate) : "",
      notes: project.patent?.notes || ""
    });
  }, [project.id, project.patent?.status, project.patent?.applicationNo, project.patent?.applicationDate, project.patent?.notes]);

  async function save(next = form) {
    await fetch(`/api/projects/${project.id}/patent`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    await refresh();
  }

  return (
    <article className={`patent-row patent-${form.status}`}>
      <div className="patent-project">
        <button type="button" onClick={() => openProject(project.id)}>[{project.level}] {project.name}</button>
        <span>{divisionLabels[project.division]} / {requestTypeLabels[project.requestType]} · {statusLabels[project.status]}</span>
      </div>
      <select value={form.status} onChange={(event) => { const next = { ...form, status: event.target.value as keyof typeof patentStatusLabels }; setForm(next); save(next); }}>
        {Object.entries(patentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <input type="date" value={form.applicationDate} onChange={(event) => { const next = { ...form, applicationDate: event.target.value }; setForm(next); save(next); }} />
      <input value={form.notes} placeholder="备注，可不填" onChange={(event) => setForm({ ...form, notes: event.target.value })} onBlur={() => save()} />
    </article>
  );
}

function ProjectsPage({ data, quickFilter, setQuickFilter, openProject, editProject, newProject, refresh }: {
  data: Bootstrap;
  quickFilter: string;
  setQuickFilter: (value: string) => void;
  openProject: (id: string) => void;
  editProject: (id: string) => void;
  newProject: () => void;
  refresh: () => Promise<void>;
}) {
  const years = Array.from(new Set(data.projects.map((project) => getProjectStatsDate(project).getFullYear()))).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(years.includes(currentYear) ? currentYear : years[0] || currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<"ALL" | "Q1" | "Q2" | "Q3" | "Q4">("ALL");
  const quarterIndex = selectedQuarter === "ALL" ? null : Number(selectedQuarter.slice(1));
  const yearProjects = data.projects.filter((project) => getProjectStatsDate(project).getFullYear() === selectedYear);
  const scopedProjects = yearProjects.filter((project) => {
    if (!quarterIndex) return true;
    return Math.floor(getProjectStatsDate(project).getMonth() / 3) + 1 === quarterIndex;
  });
  const quarterCounts = (["Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => {
    const index = Number(quarter.slice(1));
    return {
      quarter,
      count: yearProjects.filter((project) => Math.floor(getProjectStatsDate(project).getMonth() / 3) + 1 === index).length
    };
  });
  const week = weekDates(startOfWeek(new Date())).map(toISODate);
  const projects = scopedProjects.filter((item) => {
    if (quickFilter === "全部") return true;
    if (quickFilter === "未开始") return item.status === "NOT_STARTED";
    if (quickFilter === "设计中") return !item.isUnscheduled && item.status === "IN_PROGRESS";
    if (quickFilter === "跟进") return item.status === "WAITING_ALIGNMENT";
    return statusLabels[item.status] === quickFilter;
  });
  const statFilterTarget = (label: string) => {
    if (label === "未开始") return "未开始";
    if (label === "进行中" || label === "本周交付") return "设计中";
    if (label === "跟进") return "跟进";
    return label.replace("项目", "").replace("全部", "全部");
  };
  const statItems = [
    ["全部", scopedProjects.length],
    ["未开始", scopedProjects.filter((item) => item.status === "NOT_STARTED").length],
    ["进行中", scopedProjects.filter((item) => item.status === "IN_PROGRESS").length],
    ["跟进", scopedProjects.filter((item) => item.status === "WAITING_ALIGNMENT").length],
    ["待反馈", scopedProjects.filter((item) => item.status === "WAITING_FEEDBACK").length],
    ["本周交付", scopedProjects.filter((item) => item.deliveryDate && week.includes(toISODate(item.deliveryDate))).length],
    ["已完成", scopedProjects.filter((item) => item.status === "COMPLETED").length],
    ["已延期", scopedProjects.filter((item) => item.status === "DELAYED").length],
    ["已暂停", scopedProjects.filter((item) => item.status === "PAUSED").length]
  ];
  const quick = ["全部", "未开始", "设计中", "跟进", "待反馈", "已延期", "已暂停", "已完成"];
  return (
    <>
      <section className="page-head"><div><span className="eyebrow">PROJECTS ( OVERVIEW )</span><h1>项目汇总</h1></div><button className="primary" onClick={newProject}>新建项目</button></section>
      <section className="period-bar project-period-bar">
        <label>年度 <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{years.length ? years.map((year) => <option key={year} value={year}>{year}</option>) : <option value={selectedYear}>{selectedYear}</option>}</select></label>
        <div>
          <button type="button" className={selectedQuarter === "ALL" ? "active" : ""} onClick={() => setSelectedQuarter("ALL")}>全年 <b>{yearProjects.length}</b></button>
          {quarterCounts.map((item) => <button key={item.quarter} type="button" className={selectedQuarter === item.quarter ? "active" : ""} onClick={() => setSelectedQuarter(item.quarter)}>{item.quarter} <b>{item.count}</b></button>)}
        </div>
      </section>
      <section className="stats-grid">{statItems.map(([label, value]) => <button className={`stat-card ${statusToneClass(String(label))}`} key={label} onClick={() => setQuickFilter(statFilterTarget(String(label)))}><span>{label}</span><strong>{value}</strong></button>)}</section>
      <section className="filter-bar"><div className="segmented">{quick.map((item) => <button key={item} className={`${quickFilter === item ? "active" : ""} ${statusToneClass(item)}`} onClick={() => setQuickFilter(item)}>{item}</button>)}</div></section>
      <section className="panel">
        <div className="panel-title"><span>PROJECT LIST</span><b>{projects.length}</b></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>项目名称</th><th>等级</th><th>轮数</th><th>事业部</th><th>需求方</th><th>状态</th><th>设计负责人</th><th>设计师</th><th>开始</th><th>对齐</th><th>交付</th><th>操作</th></tr></thead>
            <tbody>{projects.map((project) => <ProjectRow key={project.id} data={data} project={project} openProject={openProject} editProject={editProject} refresh={refresh} />)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ProjectRow({ data, project, openProject, editProject, refresh }: { data: Bootstrap; project: Project; openProject: (id: string) => void; editProject: (id: string) => void; refresh: () => Promise<void> }) {
  return (
    <tr>
      <td><button className="link" onClick={() => openProject(project.id)}>{project.name}</button></td>
      <td><span className="level">[{project.level}]</span></td>
      <td><span className="level">R{project.currentRoundIndex || 1} / {Math.max(project.rounds?.length || 1, project.currentRoundIndex || 1)}</span></td>
      <td>{divisionLabels[project.division]}</td>
      <td>{requestTypeLabels[project.requestType]}</td>
      <td>{badge(project.status)}</td>
      <td>{nameOf(data.designers, project.designOwnerId)}</td>
      <td>{namesOf(data.designers, project.designerIds)}</td>
      <td>{formatDate(project.startDate, "md")}</td>
      <td>{formatDate(project.alignmentDate, "md")}</td>
      <td>{formatDate(project.deliveryDate, "md")}</td>
      <td className="actions"><div className="action-cluster">
        <button onClick={() => openProject(project.id)}>查看</button>
        <button onClick={() => editProject(project.id)}>编辑</button>
      </div></td>
    </tr>
  );
}

function WeekPage({ data, weekStart, setWeekStart, openProject }: { data: Bootstrap; weekStart: string; setWeekStart: (value: string) => void; openProject: (id: string) => void }) {
  const dates = weekDates(weekStart).map(toISODate);
  const designers = data.designers.filter((item) => item.isDesigner && item.isActive);
  const [manualTasks, setManualTasks] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(manualTaskStorageKey);
      if (saved) setManualTasks(JSON.parse(saved));
    } catch {
      setManualTasks({});
    }
  }, []);

  function updateManualTask(designerId: string, date: string, value: string) {
    setManualTasks((current) => {
      const next = { ...current };
      const key = manualTaskKey(designerId, date);
      if (value.trim()) next[key] = value;
      else delete next[key];
      window.localStorage.setItem(manualTaskStorageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <>
      <section className="page-head">
        <div><span className="eyebrow">WEEK ( VIEW )</span><h1>每周设计师工作总览</h1></div>
        <div className="week-switch">
          <button onClick={() => setWeekStart(toISODate(addWeek(weekStart, -1)))}>上一周</button>
          <button onClick={() => setWeekStart(toISODate(startOfWeek(new Date())))}>本周</button>
          <input type="date" value={weekStart} onChange={(event) => setWeekStart(toISODate(startOfWeek(event.target.value)))} />
          <button onClick={() => setWeekStart(toISODate(addWeek(weekStart, 1)))}>下一周</button>
        </div>
      </section>
      <section className="week-board">
        <div className="week-grid week-head"><div>设计师</div>{dates.map((date) => <div key={date}>{weekdays[new Date(date).getDay()]} {formatDate(date, "md")}</div>)}<div>本周负载</div></div>
        {designers.map((designer) => <WeekRow key={designer.id} data={data} designer={designer} dates={dates} manualTasks={manualTasks} onManualTaskChange={updateManualTask} openProject={openProject} />)}
      </section>
    </>
  );
}

function WeekRow({ data, designer, dates, manualTasks, onManualTaskChange, openProject }: { data: Bootstrap; designer: Designer; dates: string[]; manualTasks: Record<string, string>; onManualTaskChange: (designerId: string, date: string, value: string) => void; openProject: (id: string) => void }) {
  const dayItems = dates.map((date) => data.projects.flatMap((project) => getWeeklyProjectItemsForDate(project, date).filter((item) => item.designerIds.includes(designer.id)).map((item) => ({ project, item }))));
  const occupied = dayItems.reduce((sum, items) => sum + items.length, 0);
  const percent = Math.round((occupied / 6) * 100);
  const level = percent === 0 ? "空闲" : percent <= 80 ? "有余量" : percent <= 100 ? "正常" : percent <= 150 ? "偏满" : "过载";
  return (
    <div className="week-grid week-row">
      <div className="designer-cell"><strong>{designer.name}</strong><span>{designer.isDesignOwner ? "负责人 / 设计师" : "设计师"}</span></div>
      {dayItems.map((items, index) => {
        const date = dates[index];
        const taskKey = manualTaskKey(designer.id, date);
        const manualTask = manualTasks[taskKey] || "";
        return <div className="day-cell" key={date}>{items.length ? items.map(({ project, item }) => <button className="project-card" key={item.id} onClick={() => openProject(project.id)}><strong>[{project.level}] {project.name}</strong><span>R{item.roundIndex || 1} · {divisionLabels[project.division]} / {requestTypeLabels[project.requestType]}</span><em>DAY {String(item.workdayIndex).padStart(2, "0")} · {weeklyStageLabel(project, item)}</em></button>) : <span className="empty-day">空闲</span>}<textarea className={`manual-task-input ${manualTask ? "filled" : ""}`} value={manualTask} aria-label={`${designer.name} ${date} 手动任务`} onChange={(event) => onManualTaskChange(designer.id, date, event.target.value)} /></div>;
      })}
      <div className={`load-cell ${percent > 150 ? "over" : ""}`}><strong>{percent}%</strong><span>{level} · {occupied}/6</span><div className="loadbar"><i style={{ width: `${Math.min(percent, 180) / 1.8}%` }} /></div></div>
    </div>
  );
}

function RemindersPage({ data, refresh }: { data: Bootstrap; refresh: () => Promise<void> }) {
  const [statusFilter, setStatusFilter] = useState<Reminder["status"] | "ALL">("ALL");
  const activeReminders = data.reminders.filter((item) => item.status !== "SENT");
  const counts = {
    PENDING: activeReminders.filter((item) => item.status === "PENDING").length,
    SENT: data.reminders.filter((item) => item.status === "SENT").length,
    FAILED: activeReminders.filter((item) => item.status === "FAILED").length,
    REVOKED: activeReminders.filter((item) => item.status === "REVOKED").length
  };
  const visible = statusFilter === "ALL" ? activeReminders : activeReminders.filter((item) => item.status === statusFilter);
  const send = async (id: string) => {
    await fetch(`/api/reminders/${id}/send`, { method: "POST" });
    await refresh();
  };
  const deleteReminder = async (id: string) => {
    if (!confirm("确认删除这条提醒记录？此操作只清理系统记录，不会撤回企业微信群里的消息。")) return;
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    await refresh();
  };
  const groups = groupRemindersByProject(visible, data.projects);
  return (
    <>
      <section className="page-head"><div><span className="eyebrow">ALERTS ( LOG )</span><h1>提醒记录</h1></div></section>
      <section className="reminder-toolbar">
        {(["ALL", "PENDING", "SENT"] as const).map((status) => <button className={statusFilter === status ? "active" : ""} key={status} onClick={() => setStatusFilter(status)}>{status === "ALL" ? "全部" : reminderStatusLabels[status]} <b>{status === "ALL" ? activeReminders.length : counts[status]}</b></button>)}
      </section>
      <section className="panel log-list project-log">{groups.length ? groups.map((group) => <article className="log-item project-reminder-card" key={group.key}><div className="log-main"><div><strong>{group.title}</strong><span>{group.items.length} 条待处理提醒</span></div><b>{group.items.length}</b></div><div className="project-reminder-items">{group.items.map((item) => <div className={`project-reminder-row ${item.status.toLowerCase()}`} key={item.id}><div><strong>{reminderTypeLabels[item.type]}</strong><span>计划 {formatDate(item.scheduledAt)} · {item.sentAt ? `发送 ${formatDate(item.sentAt)}` : item.channel} · 重试 {item.retryCount} 次</span>{item.errorMessage && <em>{item.errorMessage}</em>}</div><b className={`send-status ${item.status.toLowerCase()}`}>{reminderStatusLabels[item.status]}</b><pre>{item.messageContent}</pre><div className="actions log-actions">{item.status !== "SENT" && item.status !== "REVOKED" && <button onClick={() => send(item.id)}>{item.status === "FAILED" ? "重试发送" : "发送"}</button>}<button className="danger-action" onClick={() => deleteReminder(item.id)}>删除</button></div></div>)}</div></article>) : <div className="empty-state">当前没有需要处理的提醒记录。</div>}</section>
    </>
  );
}

function ProjectDetail({ data, project, refresh }: { data: Bootstrap; project: Project; refresh: () => Promise<void> }) {
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);
  const firstRound = project.rounds[0];
  const currentRound = project.rounds.find((round) => round.roundIndex === project.currentRoundIndex) || project.rounds[project.rounds.length - 1];
  const editingRound = editingRoundIndex ? project.rounds.find((round) => round.roundIndex === editingRoundIndex) : undefined;
  const displayRounds = [...project.rounds].sort((a, b) => b.roundIndex - a.roundIndex);
  const currentFeedback = [...project.feedbackEvents].reverse().find((event) => event.roundIndex === (project.currentRoundIndex || 1) && !event.feedbackReceivedAt);
  const delayedDays = calculateProjectDelayedDays(project);
  const feedbackStart = project.status === "WAITING_FEEDBACK" ? project.scheduleStoppedAt || currentRound?.submittedAt || currentFeedback?.submittedAt : currentFeedback?.submittedAt;
  const waitingDays = feedbackStart ? Math.max(0, calendarDiffDays(feedbackStart, new Date())) : 0;
  const submitFeedback = async () => {
    await fetch(`/api/projects/${project.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: "已提交，等待需求方反馈。" }) });
    await refresh();
  };
  const deleteRound = async (roundIndex: number) => {
    if (project.rounds.length <= 1) return;
    if (!window.confirm(`确认删除 R${roundIndex}？该轮时间线也会一并删除。`)) return;
    const response = await fetch(`/api/projects/${project.id}/rounds/${roundIndex}`, { method: "DELETE" });
    if (response.ok) {
      if (editingRoundIndex === roundIndex) setEditingRoundIndex(null);
      await refresh();
    }
  };
  return <><section className="page-head"><div><span className="eyebrow">PROJECT ( DETAIL )</span><h1>[{project.level}] {project.name}</h1></div><div className="head-actions"><button className="primary" onClick={() => { setShowRoundForm(!showRoundForm); setEditingRoundIndex(null); }}>开启下一轮</button><button className="danger-action" onClick={() => deleteProject(project.id, refresh)}>删除项目</button></div></section>{project.isUnscheduled && <section className="notice">该项目尚未完成安排，请补充设计师和开始时间。</section>}{showRoundForm && <RoundForm data={data} project={project} refresh={refresh} onDone={() => setShowRoundForm(false)} />}{editingRound && <RoundForm data={data} project={project} round={editingRound} refresh={refresh} onDone={() => setEditingRoundIndex(null)} />}<section className="round-summary"><div><span>当前轮次</span><strong>R{project.currentRoundIndex || 1}</strong></div><div><span>首次开始</span><strong>{formatDate(firstRound?.startDate || project.startDate)}</strong></div><div><span>当前交付</span><strong>{formatDate(currentRound?.deliveryDate || project.deliveryDate)}</strong></div><div><span>总体延期</span><strong>{delayedDays} 天</strong></div><div><span>反馈等待</span><strong>{waitingDays} 天</strong></div></section><section className="detail-layout"><div className="panel"><div className="panel-title"><span>ROUND TIMELINE</span><b>{project.rounds.length}</b></div><div className="round-list">{displayRounds.map((round) => <article className={`round-card ${round.roundIndex === project.currentRoundIndex ? "active" : ""}`} key={round.id}><div className="round-card-head"><strong>R{round.roundIndex} · [{round.level}]</strong><div className="round-head-actions">{round.roundIndex === project.currentRoundIndex ? badge(project.status) : null}<button className="ghost tiny" onClick={() => { setEditingRoundIndex(round.roundIndex); setShowRoundForm(false); }}>编辑本轮</button><button className="danger-action tiny" disabled={project.rounds.length <= 1} onClick={() => deleteRound(round.roundIndex)}>删除本轮</button></div></div><div className="round-meta"><span>开始 {formatDate(round.startDate)}</span><span>对齐 {formatDate(round.alignmentDate)}</span><span>交付 {formatDate(round.deliveryDate)}</span><span>设计师 {namesOf(data.designers, round.designerIds)}</span></div><div className="timeline compact-timeline">{project.scheduleItems.filter((item) => item.roundIndex === round.roundIndex).map((item) => <div className={`timeline-node ${item.isAlignmentNode ? "align" : ""} ${item.isDeliveryNode ? "delivery" : ""}`} key={item.id}><div className="node-index">R{round.roundIndex} D{String(item.workdayIndex).padStart(2, "0")}</div><div><strong>{timelineStageLabel(item)}</strong><span>{formatDate(item.date)} {weekdays[new Date(item.date).getDay()]}</span></div><div className="node-tags">{item.isAlignmentNode && <em>ALIGN</em>}{item.isDeliveryNode && <em>DELIVERY</em>}</div></div>)}</div></article>)}</div></div><aside className="panel meta-panel"><div className="panel-title"><span>BASIC INFO</span><select className={`status-picker badge-${project.status}`} value={project.status} onChange={async (event) => setStatus(project.id, event.target.value, refresh)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{meta("事业部", divisionLabels[project.division])}{meta("需求方", requestTypeLabels[project.requestType])}{meta("设计负责人", nameOf(data.designers, project.designOwnerId))}{meta("当前设计师", namesOf(data.designers, project.designerIds))}{meta("项目首次开始", formatDate(firstRound?.startDate || project.startDate))}{meta("当前中途对齐", formatDate(currentRound?.alignmentDate || project.alignmentDate))}{meta("当前交付", formatDate(currentRound?.deliveryDate || project.deliveryDate))}{meta("项目提醒", project.allowReminder ? "提醒" : "不提醒")}<div className="feedback-list"><strong>反馈记录</strong>{project.feedbackEvents.length ? project.feedbackEvents.map((event) => <span key={event.id}>R{event.roundIndex} 提交：{formatDate(event.submittedAt)} · 反馈：{formatDate(event.feedbackReceivedAt)}</span>) : <span>暂无反馈等待记录</span>}</div><ProjectProposalPanel data={data} project={project} refresh={refresh} /><ProjectNotesEditor project={project} refresh={refresh} /></aside></section></>;
}

function ProjectProposalPanel({ data, project, refresh }: { data: Bootstrap; project: Project; refresh: () => Promise<void> }) {
  const currentRound = project.rounds.find((round) => round.roundIndex === project.currentRoundIndex) || project.rounds[project.rounds.length - 1];
  const availableDesigners = data.designers.filter((designer) => designer.isDesigner && designer.isActive && (currentRound?.designerIds.includes(designer.id) || project.designerIds.includes(designer.id)));
  const [roundIndex, setRoundIndex] = useState(project.currentRoundIndex || 1);
  const [designerId, setDesignerId] = useState(availableDesigners[0]?.id || project.designerIds[0] || "");
  const [proposalName, setProposalName] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const [notes, setNotes] = useState("");
  const proposalsByRound = [...project.proposals].sort((a, b) => b.roundIndex - a.roundIndex || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    setRoundIndex(project.currentRoundIndex || 1);
    setDesignerId(availableDesigners[0]?.id || project.designerIds[0] || "");
  }, [project.id, project.currentRoundIndex]);

  async function createProposal() {
    if (!proposalName.trim() || !designerId) return;
    await fetch(`/api/projects/${project.id}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundIndex, designerId, proposalName, isSelected, notes })
    });
    setProposalName("");
    setIsSelected(false);
    setNotes("");
    await refresh();
  }

  async function toggleSelected(proposal: ProjectProposal) {
    await fetch(`/api/projects/${project.id}/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSelected: !proposal.isSelected })
    });
    await refresh();
  }

  async function deleteProposal(proposal: ProjectProposal) {
    if (!window.confirm("确认删除这条方案记录？")) return;
    await fetch(`/api/projects/${project.id}/proposals/${proposal.id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <section className="proposal-panel">
      <div className="project-notes-head"><strong>方案记录</strong><span>{project.proposals.length} 条</span></div>
      <div className="proposal-form">
        <select value={roundIndex} onChange={(event) => setRoundIndex(Number(event.target.value))}>{project.rounds.map((round) => <option key={round.id} value={round.roundIndex}>R{round.roundIndex}</option>)}</select>
        <select value={designerId} onChange={(event) => setDesignerId(event.target.value)}>{availableDesigners.map((designer) => <option key={designer.id} value={designer.id}>{designer.name}</option>)}</select>
        <input value={proposalName} onChange={(event) => setProposalName(event.target.value)} placeholder="方案名称 / 编号" />
        <label><input type="checkbox" checked={isSelected} onChange={(event) => setIsSelected(event.target.checked)} /> 中选</label>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="备注，可不填" />
        <button className="primary tiny" type="button" onClick={createProposal}>新增</button>
      </div>
      <div className="proposal-list">{proposalsByRound.length ? groupProjectProposals(proposalsByRound).map((round) => <article className="proposal-round" key={round.roundIndex}><div className="proposal-round-head"><strong>R{round.roundIndex}</strong><span>{round.items.length} 个方案</span></div>{round.designers.map((designer) => <div className="proposal-designer" key={`${round.roundIndex}-${designer.designerId}`}><div><b>{nameOf(data.designers, designer.designerId)}</b><span>{designer.items.length} 个</span></div>{designer.items.map((proposal) => <div className={`proposal-item ${proposal.isSelected ? "selected" : ""}`} key={proposal.id}><span>{proposal.proposalName}</span>{proposal.isSelected && <em>中选</em>}<button type="button" onClick={() => toggleSelected(proposal)}>{proposal.isSelected ? "取消" : "中选"}</button><button type="button" onClick={() => deleteProposal(proposal)}>删除</button></div>)}</div>)}</article>) : <span className="empty">暂无方案记录</span>}</div>
    </section>
  );
}

function ProjectNotesEditor({ project, refresh }: { project: Project; refresh: () => Promise<void> }) {
  const [notes, setNotes] = useState(project.notes || "");
  const [saving, setSaving] = useState(false);
  const changed = notes !== (project.notes || "");

  useEffect(() => {
    setNotes(project.notes || "");
  }, [project.id, project.notes]);

  async function saveNotes() {
    setSaving(true);
    const response = await fetch(`/api/projects/${project.id}/notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes })
    });
    if (response.ok) await refresh();
    setSaving(false);
  }

  return <div className="project-notes"><div className="project-notes-head"><strong>项目备注</strong>{changed && <button className="ghost tiny" disabled={saving} onClick={saveNotes}>{saving ? "保存中" : "保存"}</button>}</div><textarea value={notes} placeholder="点击填写项目备注。" onChange={(event) => setNotes(event.target.value)} /></div>;
}

function RoundForm({ data, project, round, refresh, onDone }: { data: Bootstrap; project: Project; round?: ProjectRound; refresh: () => Promise<void>; onDone: () => void }) {
  const designers = data.designers.filter((item) => item.isDesigner && item.isActive);
  const isEditing = !!round;
  const roundIndex = round?.roundIndex ?? (project.currentRoundIndex || 1) + 1;
  const [form, setForm] = useState({
    level: round?.level ?? "D" as Project["level"],
    status: round?.status ?? "IN_PROGRESS" as keyof typeof statusLabels,
    designerIds: round?.designerIds ?? project.designerIds,
    startDate: round?.startDate ? toISODate(round.startDate) : toISODate(new Date()),
    targetDeliveryDate: round?.targetDeliveryDate ? toISODate(round.targetDeliveryDate) : "",
    allowReminder: round?.allowReminder ?? project.allowReminder,
    notes: round?.notes ?? ""
  });
  return <section className="panel next-round-panel"><div className="panel-title"><span>{isEditing ? "EDIT ROUND" : "NEXT ROUND"}</span><b>R{roundIndex}</b></div><label className="field switch-field"><span>本轮提醒</span><label><input type="checkbox" checked={form.allowReminder} onChange={(event) => setForm({ ...form, allowReminder: event.target.checked })} /> 发送本轮开始与节点提醒</label></label>{!form.allowReminder && <div className="notice">本轮提醒已关闭，本轮不会发送企业微信提醒。</div>}<div className="form-grid"><Select label="本轮等级" value={form.level} onChange={(level) => setForm({ ...form, level })} options={["A", "B", "C", "D"]} /><Select label="本轮状态" value={form.status} onChange={(status) => setForm({ ...form, status })} options={Object.keys(statusLabels)} labels={statusLabels} /><label className="field"><span>本轮开始时间</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="field"><span>本轮目标交付</span><input type="date" value={form.targetDeliveryDate} onChange={(event) => setForm({ ...form, targetDeliveryDate: event.target.value })} /></label></div><label className="field"><span>本轮设计师（最多 4 人）</span><div className="check-grid">{designers.map((item) => <label key={item.id}><input type="checkbox" checked={form.designerIds.includes(item.id)} onChange={(event) => setForm({ ...form, designerIds: event.target.checked ? [...form.designerIds, item.id].slice(0, 4) : form.designerIds.filter((id) => id !== item.id) })} />{item.name}</label>)}</div></label><label className="field"><span>本轮备注</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="form-actions"><button className="ghost" type="button" onClick={onDone}>取消</button><button className="primary" onClick={async () => { const response = await fetch(isEditing ? `/api/projects/${project.id}/rounds/${roundIndex}` : `/api/projects/${project.id}/rounds`, { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (response.ok) { await refresh(); onDone(); } }}>{isEditing ? "保存本轮修改" : "生成下一轮排期"}</button></div></section>;
}

function ProjectForm({ data, project, refresh, openProject }: { data: Bootstrap; project?: Project; refresh: () => Promise<void>; openProject: (id: string) => void }) {
  const [form, setForm] = useState({ ...emptyForm, ...project, startDate: project?.startDate ? toISODate(project.startDate) : "", targetDeliveryDate: project?.targetDeliveryDate ? toISODate(project.targetDeliveryDate) : "" });
  const owners = data.designers.filter((item) => item.isDesignOwner && item.isActive);
  const designers = data.designers.filter((item) => item.isDesigner && item.isActive);
  const formLevel = form.level as keyof typeof levelRules;
  const defaultWorkdays = levelRules[formLevel].workdays;
  const targetWindowWorkdays = form.startDate && form.targetDeliveryDate ? countWorkdaysBetween(form.startDate, form.targetDeliveryDate) : 0;
  const plannedWorkdays = targetWindowWorkdays > 0 ? targetWindowWorkdays : defaultWorkdays;
  const scheduleMode = targetWindowWorkdays > 0 && targetWindowWorkdays !== defaultWorkdays ? `已按目标交付重排：默认 ${defaultWorkdays} 天` : "使用项目等级默认周期";
  const alignPreviewDay = formLevel === "D" || plannedWorkdays < 2 ? null : Math.min(3, plannedWorkdays - 1);
  return <><section className="page-head"><div><span className="eyebrow">PROJECT ( {project ? "EDIT" : "CREATE"} )</span><h1>{project ? "编辑项目" : "新建项目"}</h1></div></section><section className="form-layout"><form className="panel form-panel" onSubmit={async (event) => { event.preventDefault(); const response = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", { method: project ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const saved = await response.json(); await refresh(); openProject(saved.id); }}><label className="field"><span>项目名称</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><div className="form-grid"><Select label="项目等级" value={form.level} onChange={(level) => setForm({ ...form, level })} options={["A", "B", "C", "D"]} /><Select label="事业部" value={form.division} onChange={(division) => setForm({ ...form, division })} options={Object.keys(divisionLabels)} labels={divisionLabels} /><Select label="需求方" value={form.requestType} onChange={(requestType) => setForm({ ...form, requestType })} options={Object.keys(requestTypeLabels)} labels={requestTypeLabels} /><Select label="项目状态" value={form.status} onChange={(status) => setForm({ ...form, status })} options={Object.keys(statusLabels)} labels={statusLabels} /></div><label className="field"><span>设计负责人</span><select value={form.designOwnerId || ""} onChange={(event) => setForm({ ...form, designOwnerId: event.target.value })}>{owners.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field"><span>设计师（最多 4 人）</span><div className="check-grid">{designers.map((item) => <label key={item.id}><input type="checkbox" checked={form.designerIds.includes(item.id)} onChange={(event) => setForm({ ...form, designerIds: event.target.checked ? [...form.designerIds, item.id].slice(0, 4) : form.designerIds.filter((id) => id !== item.id) })} />{item.name}</label>)}</div></label><label className="field switch-field"><span>项目提醒</span><label><input type="checkbox" checked={form.allowReminder} onChange={(event) => setForm({ ...form, allowReminder: event.target.checked })} /> 生成项目提醒计划</label></label><div className="form-grid"><label className="field"><span>开始时间</span><input type="date" value={form.startDate || ""} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="field"><span>目标交付时间</span><input type="date" value={form.targetDeliveryDate || ""} onChange={(event) => setForm({ ...form, targetDeliveryDate: event.target.value })} /></label></div><label className="field"><span>项目备注</span><textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="form-actions"><button className="primary">保存项目</button></div></form><aside className="panel preview"><div className="panel-title"><span>AUTO SCHEDULE</span><b>[{form.level}]</b></div><div className="preview-hero"><span className="level-big">[{form.level}]</span><strong>{plannedWorkdays} WORKDAYS</strong><p>{alignPreviewDay ? `ALIGN：第 ${alignPreviewDay} 个工作日` : "不强制设置中途对齐"}</p><p>{scheduleMode}</p></div></aside></section></>;
}

function SettingsPage({ data, refresh }: { data: Bootstrap; refresh: () => Promise<void> }) {
  const [ownerNames, setOwnerNames] = useState(data.designers.filter((item) => item.isDesignOwner && item.isActive).map((item) => item.name).join("\n"));
  const [designerNames, setDesignerNames] = useState(data.designers.filter((item) => item.isDesigner && item.isActive).map((item) => item.name).join("\n"));
  const [webhook, setWebhook] = useState(data.settings.wechatWebhookUrl || "");
  const [reminderTimes, setReminderTimes] = useState(data.settings.reminderTimes || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transferMessage, setTransferMessage] = useState("");

  async function exportAllData() {
    setTransferMessage("正在生成备份文件...");
    const response = await fetch("/api/data-transfer");
    if (!response.ok) {
      setTransferMessage("导出失败，请稍后再试。");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `industrial-design-ops-backup-${toISODate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setTransferMessage("已导出完整数据备份。");
  }

  async function importAllData(file: File | undefined) {
    if (!file) return;
    if (!window.confirm("导入会用备份文件覆盖当前系统数据。确认继续？")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setTransferMessage("正在导入备份数据...");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const response = await fetch("/api/data-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "导入失败。" }));
        setTransferMessage(error.error || "导入失败，请检查备份文件。");
        return;
      }
      await refresh();
      setTransferMessage("导入完成，当前系统数据已刷新。");
    } catch {
      setTransferMessage("导入失败，请确认选择的是系统导出的 JSON 备份文件。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return <><section className="page-head"><div><span className="eyebrow">SETTINGS</span><h1>基础设置</h1></div></section><section className="settings-grid"><form className="panel form-panel" onSubmit={async (event) => { event.preventDefault(); await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerNames, designerNames, wechatWebhookUrl: webhook, reminderTimes }) }); await refresh(); }}><label className="field"><span>企业微信群机器人 Webhook</span><input value={webhook} onChange={(event) => setWebhook(event.target.value)} /></label><div className="form-grid"><label className="field"><span>设计负责人名单（每行一个）</span><textarea value={ownerNames} onChange={(event) => setOwnerNames(event.target.value)} /></label><label className="field"><span>设计师名单（每行一个）</span><textarea value={designerNames} onChange={(event) => setDesignerNames(event.target.value)} /></label></div><label className="field"><span>提醒时间</span><textarea value={reminderTimes} onChange={(event) => setReminderTimes(event.target.value)} /></label><button className="primary">保存设置</button></form><aside className="panel data-transfer-panel"><div className="panel-title"><span>DATA TRANSFER</span><b>JSON</b></div><div className="transfer-copy"><strong>数据备份与迁移</strong><p>导出文件包含项目、轮次、排期、设计师、提醒、方案、专利和基础设置，可在另一台电脑的新系统中导入恢复。</p></div><div className="transfer-actions"><button className="primary" type="button" onClick={exportAllData}>一键导出所有数据</button><button className="ghost" type="button" onClick={() => fileInputRef.current?.click()}>一键导入所有数据</button><input ref={fileInputRef} type="file" accept="application/json,.json" onChange={(event) => importAllData(event.target.files?.[0])} /></div>{transferMessage && <div className="notice">{transferMessage}</div>}</aside></section></>;
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: any) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item} value={item}>{labels?.[item] || item}</option>)}</select></label>;
}

function timelineStageLabel(item: ScheduleItem) {
  if (item.isDeliveryNode) return "\u8bbe\u8ba1\u4ea4\u4ed8";
  if (item.isAlignmentNode) return "\u4e2d\u9014\u5bf9\u9f50";
  if (item.workdayIndex === 1) return "\u9700\u6c42\u7406\u89e3";
  return "\u8bbe\u8ba1\u4e2d";
}

function getProposalStatsDate(project: Project, proposal: ProjectProposal) {
  const round = project.rounds.find((item) => item.roundIndex === proposal.roundIndex);
  return new Date(round?.startDate || project.startDate || proposal.createdAt);
}

function groupProjectProposals(proposals: ProjectProposal[]) {
  const roundMap = new Map<number, ProjectProposal[]>();
  proposals.forEach((proposal) => {
    roundMap.set(proposal.roundIndex, [...(roundMap.get(proposal.roundIndex) || []), proposal]);
  });
  return [...roundMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([roundIndex, items]) => {
      const designerMap = new Map<string, ProjectProposal[]>();
      items.forEach((proposal) => {
        designerMap.set(proposal.designerId, [...(designerMap.get(proposal.designerId) || []), proposal]);
      });
      return {
        roundIndex,
        items,
        designers: [...designerMap.entries()].map(([designerId, designerItems]) => ({
          designerId,
          items: designerItems
        }))
      };
    });
}

function badge(status: keyof typeof statusLabels) {
  return <span className={`badge badge-${status}`}>{statusLabels[status]}</span>;
}

function statusToneClass(label: string) {
  if (["未开始", "已延期", "已暂停"].includes(label)) return "tone-red";
  if (["进行中", "设计中", "跟进", "本周交付"].includes(label)) return "tone-green";
  if (["待反馈"].includes(label)) return "tone-orange";
  if (["已完成"].includes(label)) return "tone-gray";
  return "";
}

function meta(label: string, value: string | ReactNode) {
  return <div className="meta"><span>{label}</span><strong>{value}</strong></div>;
}

function calendarDiffDays(start: string | Date, end: string | Date) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  return Math.floor((endMidnight - startMidnight) / 86400000);
}

function calculateProjectDelayedDays(project: Project) {
  const rounds = [...project.rounds].sort((a, b) => a.roundIndex - b.roundIndex);
  const today = new Date();
  return rounds.reduce((sum, round, index) => {
    if (!round.deliveryDate) return sum;
    const nextRound = rounds[index + 1];
    const roundFeedbackEvents = project.feedbackEvents
      .filter((event) => event.roundIndex === round.roundIndex)
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const latestFeedback = roundFeedbackEvents[roundFeedbackEvents.length - 1];
    const latestClosedFeedback = [...roundFeedbackEvents].reverse().find((event) => event.feedbackReceivedAt);
    const isCurrentRound = round.roundIndex === project.currentRoundIndex;
    const roundEnd =
      round.submittedAt ||
      latestFeedback?.submittedAt ||
      round.feedbackReceivedAt ||
      latestClosedFeedback?.feedbackReceivedAt ||
      nextRound?.startDate ||
      (isCurrentRound && project.status === "COMPLETED" ? project.completedAt || project.scheduleStoppedAt : null) ||
      (isCurrentRound && ["WAITING_FEEDBACK", "PAUSED"].includes(project.status) ? project.scheduleStoppedAt : null) ||
      (isCurrentRound ? today : null);
    if (!roundEnd) return sum;
    return sum + Math.max(0, calendarDiffDays(round.deliveryDate, roundEnd));
  }, 0);
}

function nameOf(designers: Designer[], id: string | null) {
  return designers.find((item) => item.id === id)?.name || "-";
}

function namesOf(designers: Designer[], ids: string[]) {
  return ids.map((id) => nameOf(designers, id)).filter((name) => name !== "-").join("、") || "-";
}

function projectName(projects: Project[], id: string | null) {
  if (!id) return "全局提醒";
  const project = projects.find((item) => item.id === id);
  return project ? `[${project.level}] ${project.name}` : "项目提醒";
}

function groupRemindersByProject(reminders: Reminder[], projects: Project[]) {
  const groups = new Map<string, { key: string; title: string; items: Reminder[] }>();
  reminders.forEach((item) => {
    const key = item.projectId || "GLOBAL";
    const group = groups.get(key) || { key, title: projectName(projects, item.projectId), items: [] };
    group.items.push(item);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({
    ...group,
    items: group.items.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }));
}

function addWeek(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount * 7);
  return date;
}

async function setStatus(id: string, status: string, refresh: () => Promise<void>) {
  await fetch(`/api/projects/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  await refresh();
}

async function deleteProject(id: string, refresh: () => Promise<void>) {
  if (!window.confirm("确认删除该项目？")) return;
  await fetch(`/api/projects/${id}`, { method: "DELETE" });
  await refresh();
}
