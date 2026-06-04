"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { divisionLabels, reminderStatusLabels, reminderTypeLabels, requestTypeLabels, statusLabels, weekdays } from "@/lib/labels";
import { formatDate, toISODate } from "@/lib/format";
import { countWorkdaysBetween, levelRules, startOfWeek, weekDates } from "@/lib/schedule";
import { getWeeklyProjectItemsForDate, weeklyStageLabel } from "@/lib/weekly";

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

export default function OpsApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [route, setRoute] = useState("projects");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState("全部");
  const [weekStart, setWeekStart] = useState(toISODate(startOfWeek(new Date("2026-06-01"))));

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
        </nav>
      </aside>
      <main className="shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">TODAY</span> <strong>{formatDate(new Date())}</strong>
            <span className="muted">当前周 {formatDate(week[0], "md")} - {formatDate(week[4], "md")}</span>
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
        {route === "form" && <ProjectForm data={data} project={editingProjectId ? data.projects.find((item) => item.id === editingProjectId) : undefined} refresh={refresh} openProject={openProject} />}
        {route === "detail" && selectedProject && <ProjectDetail data={data} project={selectedProject} editProject={editProject} refresh={refresh} />}
      </main>
    </>
  );

  function nav(target: string, label: string) {
    return <button className={`nav-item ${route === target ? "active" : ""}`} onClick={() => setRoute(target)}>{label}</button>;
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

function ProjectsPage({ data, quickFilter, setQuickFilter, openProject, editProject, newProject, refresh }: {
  data: Bootstrap;
  quickFilter: string;
  setQuickFilter: (value: string) => void;
  openProject: (id: string) => void;
  editProject: (id: string) => void;
  newProject: () => void;
  refresh: () => Promise<void>;
}) {
  const week = weekDates(startOfWeek(new Date())).map(toISODate);
  const projects = data.projects.filter((item) => {
    if (quickFilter === "全部") return true;
    if (quickFilter === "未安排") return item.isUnscheduled;
    if (quickFilter === "设计中") return !item.isUnscheduled && ["NOT_STARTED", "IN_PROGRESS"].includes(item.status);
    if (quickFilter === "对齐") return item.status === "WAITING_ALIGNMENT";
    return statusLabels[item.status] === quickFilter;
  });
  const statFilterTarget = (label: string) => {
    if (label === "未开始项目" || label === "进行中项目" || label === "本周交付项目") return "设计中";
    if (label === "待对齐项目") return "对齐";
    return label.replace("项目", "").replace("全部", "全部");
  };
  const statItems = [
    ["全部项目", data.projects.length],
    ["未安排项目", data.projects.filter((item) => item.isUnscheduled).length],
    ["未开始项目", data.projects.filter((item) => item.status === "NOT_STARTED").length],
    ["进行中项目", data.projects.filter((item) => item.status === "IN_PROGRESS").length],
    ["待对齐项目", data.projects.filter((item) => item.status === "WAITING_ALIGNMENT").length],
    ["待反馈项目", data.projects.filter((item) => item.status === "WAITING_FEEDBACK").length],
    ["本周交付项目", data.projects.filter((item) => item.deliveryDate && week.includes(toISODate(item.deliveryDate))).length],
    ["已完成项目", data.projects.filter((item) => item.status === "COMPLETED").length],
    ["已延期项目", data.projects.filter((item) => item.status === "DELAYED").length],
    ["已暂停项目", data.projects.filter((item) => item.status === "PAUSED").length]
  ];
  const quick = ["全部", "未安排", "设计中", "对齐", "待反馈", "已延期", "已暂停", "已完成"];
  return (
    <>
      <section className="page-head"><div><span className="eyebrow">PROJECTS ( OVERVIEW )</span><h1>项目汇总</h1></div><button className="primary" onClick={newProject}>新建项目</button></section>
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
        {designers.map((designer) => <WeekRow key={designer.id} data={data} designer={designer} dates={dates} openProject={openProject} />)}
      </section>
    </>
  );
}

function WeekRow({ data, designer, dates, openProject }: { data: Bootstrap; designer: Designer; dates: string[]; openProject: (id: string) => void }) {
  const dayItems = dates.map((date) => data.projects.flatMap((project) => getWeeklyProjectItemsForDate(project, date).filter((item) => item.designerIds.includes(designer.id)).map((item) => ({ project, item }))));
  const occupied = dayItems.reduce((sum, items) => sum + items.length, 0);
  const percent = Math.round((occupied / 5) * 100);
  const level = percent === 0 ? "空闲" : percent <= 80 ? "有余量" : percent <= 100 ? "正常" : percent <= 150 ? "偏满" : "过载";
  return (
    <div className="week-grid week-row">
      <div className="designer-cell"><strong>{designer.name}</strong><span>{designer.isDesignOwner ? "负责人 / 设计师" : "设计师"}</span></div>
      {dayItems.map((items, index) => <div className="day-cell" key={dates[index]}>{items.length ? items.map(({ project, item }) => <button className="project-card" key={item.id} onClick={() => openProject(project.id)}><strong>[{project.level}] {project.name}</strong><span>R{item.roundIndex || 1} · {divisionLabels[project.division]} / {requestTypeLabels[project.requestType]}</span><em>DAY {String(item.workdayIndex).padStart(2, "0")} · {weeklyStageLabel(project, item)}</em></button>) : <span className="empty-day">空闲</span>}</div>)}
      <div className={`load-cell ${percent > 150 ? "over" : ""}`}><strong>{percent}%</strong><span>{level} · {occupied}/5</span><div className="loadbar"><i style={{ width: `${Math.min(percent, 180) / 1.8}%` }} /></div></div>
    </div>
  );
}

function RemindersPage({ data, refresh }: { data: Bootstrap; refresh: () => Promise<void> }) {
  const [statusFilter, setStatusFilter] = useState<Reminder["status"] | "ALL">("ALL");
  const counts = {
    PENDING: data.reminders.filter((item) => item.status === "PENDING").length,
    SENT: data.reminders.filter((item) => item.status === "SENT").length,
    FAILED: data.reminders.filter((item) => item.status === "FAILED").length,
    REVOKED: data.reminders.filter((item) => item.status === "REVOKED").length
  };
  const visible = statusFilter === "ALL" ? data.reminders : data.reminders.filter((item) => item.status === statusFilter);
  const send = async (id: string) => {
    await fetch(`/api/reminders/${id}/send`, { method: "POST" });
    await refresh();
  };
  const revoke = async (id: string) => {
    if (!confirm("确认作废这条提醒？已发送到群里的消息无法真正删除，系统会发送一条作废通知。")) return;
    await fetch(`/api/reminders/${id}/revoke`, { method: "POST" });
    await refresh();
  };
  const clearReminders = async () => {
    const label = statusFilter === "ALL" ? "全部提醒记录" : reminderStatusLabels[statusFilter];
    if (!confirm(`确认删除${label}？此操作只清理系统日志，不会撤回企业微信群里已发送的消息。`)) return;
    await fetch(`/api/reminders?status=${statusFilter}`, { method: "DELETE" });
    await refresh();
  };
  return (
    <>
      <section className="page-head"><div><span className="eyebrow">ALERTS ( LOG )</span><h1>提醒记录</h1></div><div className="head-actions"><button className="ghost" onClick={async () => { await fetch("/api/reminders/rebuild", { method: "POST" }); await refresh(); }}>重建提醒计划</button><button className="danger-action" disabled={!visible.length} onClick={clearReminders}>删除当前记录</button></div></section>
      <section className="reminder-toolbar">
        {(["ALL", "PENDING", "SENT", "FAILED", "REVOKED"] as const).map((status) => <button className={statusFilter === status ? "active" : ""} key={status} onClick={() => setStatusFilter(status)}>{status === "ALL" ? "全部" : reminderStatusLabels[status]} <b>{status === "ALL" ? data.reminders.length : counts[status]}</b></button>)}
      </section>
      <section className="panel log-list compact-log">{visible.map((item) => <article className={`log-item ${item.status.toLowerCase()}`} key={item.id}><div className="log-main"><div><strong>{reminderTypeLabels[item.type]}</strong><span>{projectName(data.projects, item.projectId)}</span></div><b className={`send-status ${item.status.toLowerCase()}`}>{reminderStatusLabels[item.status]}</b></div><div className="log-meta"><span>计划 {formatDate(item.scheduledAt)}</span><span>{item.sentAt ? `发送 ${formatDate(item.sentAt)}` : item.channel}</span><span>重试 {item.retryCount} 次</span></div>{item.errorMessage && <div className="log-error">{item.errorMessage}</div>}<pre>{item.messageContent}</pre><div className="actions log-actions">{item.status !== "SENT" && item.status !== "REVOKED" && <button onClick={() => send(item.id)}>{item.status === "FAILED" ? "重试发送" : "发送"}</button>}{item.status !== "REVOKED" && <button className="danger-action" onClick={() => revoke(item.id)}>{item.status === "SENT" ? "作废并通知" : "作废"}</button>}</div></article>)}</section>
    </>
  );
}

function ProjectDetail({ data, project, editProject, refresh }: { data: Bootstrap; project: Project; editProject: (id: string) => void; refresh: () => Promise<void> }) {
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);
  const firstRound = project.rounds[0];
  const currentRound = project.rounds.find((round) => round.roundIndex === project.currentRoundIndex) || project.rounds[project.rounds.length - 1];
  const editingRound = editingRoundIndex ? project.rounds.find((round) => round.roundIndex === editingRoundIndex) : undefined;
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
  return <><section className="page-head"><div><span className="eyebrow">PROJECT ( DETAIL )</span><h1>[{project.level}] {project.name}</h1></div><div className="head-actions"><button className="ghost" onClick={submitFeedback}>提交并待反馈</button><button className="primary" onClick={() => { setShowRoundForm(!showRoundForm); setEditingRoundIndex(null); }}>开启下一轮</button><button className="ghost" onClick={() => editProject(project.id)}>编辑项目</button><button className="danger-action" onClick={() => deleteProject(project.id, refresh)}>删除项目</button></div></section>{project.isUnscheduled && <section className="notice">该项目尚未完成安排，请补充设计师和开始时间。</section>}{showRoundForm && <RoundForm data={data} project={project} refresh={refresh} onDone={() => setShowRoundForm(false)} />}{editingRound && <RoundForm data={data} project={project} round={editingRound} refresh={refresh} onDone={() => setEditingRoundIndex(null)} />}<section className="round-summary"><div><span>当前轮次</span><strong>R{project.currentRoundIndex || 1}</strong></div><div><span>首次开始</span><strong>{formatDate(firstRound?.startDate || project.startDate)}</strong></div><div><span>当前交付</span><strong>{formatDate(currentRound?.deliveryDate || project.deliveryDate)}</strong></div><div><span>总体延期</span><strong>{delayedDays} 天</strong></div><div><span>反馈等待</span><strong>{waitingDays} 天</strong></div></section><section className="detail-layout"><div className="panel"><div className="panel-title"><span>ROUND TIMELINE</span><b>{project.rounds.length}</b></div><div className="round-list">{project.rounds.map((round) => <article className={`round-card ${round.roundIndex === project.currentRoundIndex ? "active" : ""}`} key={round.id}><div className="round-card-head"><strong>R{round.roundIndex} · [{round.level}]</strong><div className="round-head-actions">{round.roundIndex === project.currentRoundIndex ? badge(round.status) : null}<button className="ghost tiny" onClick={() => { setEditingRoundIndex(round.roundIndex); setShowRoundForm(false); }}>编辑本轮</button><button className="danger-action tiny" disabled={project.rounds.length <= 1} onClick={() => deleteRound(round.roundIndex)}>删除本轮</button></div></div><div className="round-meta"><span>开始 {formatDate(round.startDate)}</span><span>对齐 {formatDate(round.alignmentDate)}</span><span>交付 {formatDate(round.deliveryDate)}</span><span>设计师 {namesOf(data.designers, round.designerIds)}</span></div><div className="timeline compact-timeline">{project.scheduleItems.filter((item) => item.roundIndex === round.roundIndex).map((item) => <div className={`timeline-node ${item.isAlignmentNode ? "align" : ""} ${item.isDeliveryNode ? "delivery" : ""}`} key={item.id}><div className="node-index">R{round.roundIndex} D{String(item.workdayIndex).padStart(2, "0")}</div><div><strong>{timelineStageLabel(item)}</strong><span>{formatDate(item.date)} {weekdays[new Date(item.date).getDay()]}</span></div><div className="node-tags">{item.isAlignmentNode && <em>ALIGN</em>}{item.isDeliveryNode && <em>DELIVERY</em>}</div></div>)}</div></article>)}</div></div><aside className="panel meta-panel"><div className="panel-title"><span>BASIC INFO</span><b>{badge(project.status)}</b></div>{meta("事业部", divisionLabels[project.division])}{meta("需求方", requestTypeLabels[project.requestType])}{meta("设计负责人", nameOf(data.designers, project.designOwnerId))}{meta("当前设计师", namesOf(data.designers, project.designerIds))}{meta("项目首次开始", formatDate(firstRound?.startDate || project.startDate))}{meta("当前中途对齐", formatDate(currentRound?.alignmentDate || project.alignmentDate))}{meta("当前交付", formatDate(currentRound?.deliveryDate || project.deliveryDate))}{meta("项目提醒", project.allowReminder ? "提醒" : "不提醒")}<div className="feedback-list"><strong>反馈记录</strong>{project.feedbackEvents.length ? project.feedbackEvents.map((event) => <span key={event.id}>R{event.roundIndex} 提交：{formatDate(event.submittedAt)} · 反馈：{formatDate(event.feedbackReceivedAt)}</span>) : <span>暂无反馈等待记录</span>}</div><div className="notes">{project.notes || "暂无备注。"}</div></aside></section></>;
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
  return <><section className="page-head"><div><span className="eyebrow">SETTINGS</span><h1>基础设置</h1></div></section><section className="settings-grid"><form className="panel form-panel" onSubmit={async (event) => { event.preventDefault(); await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerNames, designerNames, wechatWebhookUrl: webhook, reminderTimes }) }); await refresh(); }}><label className="field"><span>企业微信群机器人 Webhook</span><input value={webhook} onChange={(event) => setWebhook(event.target.value)} /></label><div className="form-grid"><label className="field"><span>设计负责人名单（每行一个）</span><textarea value={ownerNames} onChange={(event) => setOwnerNames(event.target.value)} /></label><label className="field"><span>设计师名单（每行一个）</span><textarea value={designerNames} onChange={(event) => setDesignerNames(event.target.value)} /></label></div><label className="field"><span>提醒时间</span><textarea value={reminderTimes} onChange={(event) => setReminderTimes(event.target.value)} /></label><button className="primary">保存设置</button></form></section></>;
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

function badge(status: keyof typeof statusLabels) {
  return <span className={`badge badge-${status}`}>{statusLabels[status]}</span>;
}

function statusToneClass(label: string) {
  if (["未安排项目", "未安排", "未开始项目", "未开始", "已延期项目", "已延期", "已暂停项目", "已暂停"].includes(label)) return "tone-red";
  if (["进行中项目", "进行中", "设计中", "待对齐项目", "待对齐", "对齐", "本周交付项目", "本周交付"].includes(label)) return "tone-green";
  if (["待反馈项目", "待反馈"].includes(label)) return "tone-orange";
  if (["已完成项目", "已完成"].includes(label)) return "tone-gray";
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
