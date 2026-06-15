# 系统架构文档

## 1. 技术架构概览

当前系统是 Next.js 单体应用：

```text
浏览器
  ↓
Next.js 页面与 React 组件
  ↓
Next.js API Routes
  ↓
Prisma Client
  ↓
SQLite 数据库
```

前端和后端在同一个 Next.js 项目中。前端通过 `fetch()` 调用 `/api/*` 路由，API 路由再调用 `src/lib/` 中的业务函数，并通过 Prisma 读写 SQLite。

## 2. 前端结构

主要入口：

- `src/app/page.tsx`：渲染主应用组件。
- `src/components/OpsApp.tsx`：当前所有主要页面和交互都集中在这个组件中。
- `src/app/globals.css`：引入根样式。
- `styles.css`：主要 UI 样式文件。

页面模块：

- 项目汇总页。
- 每周设计师工作总览页。
- 提醒记录页。
- 基础设置页。
- 项目详情页。
- 新建/编辑项目页。

状态管理：

- 当前使用 React `useState` / `useEffect`。
- 页面初始化通过 `/api/bootstrap` 拉取项目、人员、提醒、设置。
- 操作完成后调用 `refresh()` 重新获取完整数据。

## 3. 后端结构

后端由 Next.js API Routes 提供。

主要 API：

- `GET /api/bootstrap`：聚合项目、人员、提醒、设置。
- `GET /api/projects`：项目列表。
- `POST /api/projects`：创建项目。
- `GET /api/projects/:id`：项目详情。
- `PUT /api/projects/:id`：编辑项目。
- `DELETE /api/projects/:id`：删除项目。
- `PATCH /api/projects/:id/status`：修改项目状态。
- `POST /api/projects/:id/feedback`：提交并进入待反馈。
- `POST /api/projects/:id/rounds`：开启下一轮。
- `PUT /api/projects/:id/rounds/:roundIndex`：编辑指定轮次。
- `DELETE /api/projects/:id/rounds/:roundIndex`：删除指定轮次。
- `GET /api/reminders`：提醒记录列表。
- `DELETE /api/reminders`：删除提醒记录。
- `POST /api/reminders/rebuild`：重建提醒计划并发送到期提醒。
- `POST /api/reminders/:id/send`：发送单条提醒。
- `POST /api/reminders/:id/revoke`：作废提醒。
- `GET /api/settings`：读取设置。
- `PUT /api/settings`：保存设置和人员名单。

服务层：

- `src/lib/projects.ts`：项目、轮次、状态、反馈、排期重建。
- `src/lib/schedule.ts`：工作日、排期生成、延期判断。
- `src/lib/weekly.ts`：周总览日期事实和阶段标签。
- `src/lib/reminders.ts`：提醒计划、企业微信发送、提醒清理。
- `src/lib/format.ts`：日期和 ID 编解码。
- `src/lib/enums.ts` / `src/lib/labels.ts`：枚举和中文标签。

## 4. 数据库结构

数据库使用 SQLite，主要模型：

- `Project`：项目主表。
- `ProjectRound`：项目轮次。
- `ProjectScheduleItem`：项目排期日期项。
- `FeedbackEvent`：反馈记录。
- `Designer`：设计负责人/设计师。
- `Reminder`：提醒记录。
- `Settings`：系统设置。

详细字段见 `docs/database-schema.md`。

## 5. 数据流说明

### 创建项目

```text
用户提交表单
  → POST /api/projects
  → createProject()
  → enrichProjectForSave()
  → 创建 Project + ProjectRound
  → generateProjectSchedule()
  → 写入 ProjectScheduleItem
  → rebuildReminderPlan()
  → 返回完整项目
  → 前端刷新并进入详情页
```

### 周工作总览

```text
用户进入周总览
  → 前端已有 bootstrap 数据
  → weekDates() 生成周一至周六
  → getWeeklyProjectItemsForDate()
  → 按设计师过滤项目日期项
  → 计算日负载和周负载
  → 渲染矩阵表
```

### 提醒发送

```text
重建提醒计划或手动发送
  → reminders.ts 生成 messageContent
  → sendReminder()
  → 读取 Settings.wechatWebhookUrl
  → POST 到企业微信群机器人 Webhook
  → 更新 Reminder 状态
```

## 6. 权限逻辑

当前没有登录、鉴权、权限控制。所有 API 默认本地可访问。

后续如果部署到多人环境，建议增加：

- 登录。
- API 鉴权。
- 管理员/负责人/设计师角色。
- 重要操作日志。
- 删除操作二次确认和软删除。

## 7. 关键设计原则

- 周工作总览展示日期事实，不用当前状态覆盖历史。
- 未安排项目不进入排期和负载计算。
- 延期表示仍在推进，应在周总览继续占用设计师。
- 待反馈/完成/暂停表示排期停止，不继续生成未来工作。
- 项目轮次历史应保留，编辑当前轮才同步项目主字段。
- 重要操作需要确认，尤其删除项目和删除轮次。
- 企业微信消息保持简短，日志记录保留必要追溯信息。
