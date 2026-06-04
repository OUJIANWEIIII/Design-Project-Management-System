# 工业设计项目池、排期与周工作总览系统

面向工业设计部门设计负责人的项目管理系统，用于提前记录设计项目、自动生成工作日排期、按周查看设计师工作安排、跟踪项目状态与负载，并通过企业微信群机器人发送提醒。

当前项目是一个可本地运行的 Next.js 单体应用，不是通用项目管理模板。业务重点围绕工业设计项目池、A/B/C/D 项目等级、设计轮次、周工作总览和企业微信群提醒。

## 1. 项目简介

本系统适合工业设计负责人或设计管理者使用，解决以下问题：

- 项目可以提前录入，避免遗漏。
- 项目安排设计师和开始时间后，系统自动生成工作日排期。
- A/B/C/D 项目按等级和目标交付时间生成时间线。
- 周工作总览按设计师展示每天安排和负载。
- 项目提交待反馈后可开启下一轮设计，并保留历史轮次。
- 企业微信群机器人可发送项目创建、交付前、延期、每周排期等提醒。

当前没有登录和权限系统，默认作为部门内部本地工具或内网工具使用。

## 2. 核心功能

已实现功能：

- 项目创建、编辑、删除。
- 项目状态管理：未开始、进行中、待对齐、待反馈、已完成、已延期、已暂停。
- 项目等级：A/B/C/D。
- 事业部：制冷、环电、亚马逊、其它。
- 需求方：2B、2C、B2C。
- 设计负责人和设计师名单维护。
- 每个项目 1 个设计负责人，最多 4 个设计师。
- 未安排项目识别：缺少设计师或开始时间时，不进入周排期和负载计算。
- 自动排期：跳过周六、周日。
- A/B 默认 8 个工作日，C 默认 6 个工作日，D 默认 2 个工作日。
- A/B/C 自动生成中途对齐节点。
- 目标交付时间可压缩或拉长排期，系统按给定时间窗口重新安排节点。
- 项目详情页展示轮次、时间线、反馈记录、基础信息。
- 支持提交待反馈、开启下一轮、编辑任意轮次、删除非唯一轮次。
- 周工作总览按设计师和周一至周五展示，每天可显示多个项目。
- 设计师周负载百分比与负载条。
- 延期项目在周工作总览中继续显示延期推进。
- 提醒记录页：查看、重发、复制、作废、删除提醒记录。
- 企业微信群机器人 Webhook 配置和发送。
- 提醒记录超过 2 天后自动清理已发送、发送失败、已作废记录。
- 基础设置页：设计负责人、设计师、Webhook、提醒时间说明。

未实现功能：

- 登录、账号、权限、角色授权。
- 多租户或多人在线协作权限隔离。
- 真实工时填写。
- 复杂审批流。
- 自动会议预约。

## 3. 技术栈

- 前端：Next.js 14 App Router、React 18、TypeScript。
- 后端：Next.js API Routes。
- 数据库：SQLite。
- ORM：Prisma。
- UI：自定义 CSS，白色/浅灰/黑色为主，克莱因蓝点缀，Nothing-inspired 风格。
- 状态管理：React `useState` / `useEffect`，无独立状态管理库。
- 测试：Vitest。
- 构建工具：Next.js。
- 部署方式：当前主要面向本地或内网部署；可后续扩展到 Node.js 服务器。

## 4. 项目结构

```text
.
├─ README.md
├─ .env.example
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ prisma/
│  ├─ schema.prisma          # Prisma 数据模型
│  └─ seed.ts                # 初始人员、项目、设置数据
├─ scripts/
│  ├─ init-sqlite.mjs        # 初始化/重置 SQLite 表结构
│  ├─ migrate-rounds.mjs     # 旧库升级到轮次结构的辅助脚本
│  ├─ verify-system.mjs      # 系统级接口验收脚本
│  ├─ verify-rounds.mjs      # 轮次逻辑验收脚本
│  └─ verify-current-changes.mjs
├─ src/
│  ├─ app/
│  │  ├─ api/                # Next.js API 路由
│  │  ├─ globals.css         # 引入根级样式
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  └─ OpsApp.tsx          # 主应用界面
│  └─ lib/
│     ├─ projects.ts         # 项目 CRUD、轮次、状态、排期重建
│     ├─ schedule.ts         # 工作日、排期、延期判断
│     ├─ weekly.ts           # 周总览日期事实逻辑
│     ├─ reminders.ts        # 提醒计划、企业微信发送、记录清理
│     ├─ prisma.ts           # Prisma Client
│     ├─ enums.ts
│     ├─ labels.ts
│     └─ format.ts
├─ public/
│  └─ favicon*.png
├─ docs/
│  ├─ product-requirements.md
│  ├─ system-architecture.md
│  ├─ database-schema.md
│  ├─ development-guide.md
│  └─ changelog.md
├─ index.html                # 旧版本地原型入口，非主系统入口
├─ app.js                    # 旧版本地原型逻辑，非主系统逻辑
└─ styles.css                # 当前主系统仍复用的全局视觉样式
```

## 5. 本地运行步骤

### 5.1 环境要求

- Node.js 20 或更新版本。
- npm。
- Windows / macOS / Linux 均可，当前项目主要在 Windows 本地开发。

### 5.2 克隆项目

```bash
git clone <your-repository-url>
cd <project-folder>
```

### 5.3 安装依赖

```bash
npm install
```

### 5.4 配置环境变量

复制环境变量示例：

```bash
cp .env.example .env
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

默认 SQLite 配置：

```env
DATABASE_URL="file:./dev.db"
```

### 5.5 初始化数据库

首次运行或需要重置本地库时执行：

```bash
npm run prisma:generate
npm run db:init
npm run prisma:seed
```

说明：

- `prisma:generate` 生成 Prisma Client。
- `db:init` 会重建 SQLite 表结构，会清空当前数据库。
- `prisma:seed` 写入基础人员、项目、设置数据。

### 5.6 启动开发环境

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

如果 Windows 上 `npm run dev` 遇到 `Access is denied`，可临时使用：

```powershell
.\.tools\node-v20.19.5-win-x64\node.exe .\node_modules\next\dist\bin\next dev
```

注意：`.tools/` 是当前电脑的本地辅助运行时，不建议提交到 GitHub。换电脑后优先安装标准 Node.js 并使用 `npm run dev`。

## 6. 环境变量说明

| 变量 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | `file:./dev.db` | Prisma SQLite 数据库地址。 |

企业微信群机器人 Webhook 不通过 `.env` 配置，而是在系统“基础设置”页面保存到数据库 `Settings.wechatWebhookUrl`。

## 7. 数据库初始化说明

数据库类型：SQLite。

推荐本地初始化流程：

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:init
npm run prisma:seed
npm run dev
```

重置数据库：

```bash
npm run db:init
npm run prisma:seed
```

旧数据库升级：

```bash
node scripts/migrate-rounds.mjs
```

仅在旧版本数据库缺少轮次相关字段时使用 `migrate-rounds.mjs`。

## 8. 常用命令

```bash
npm run dev              # 启动开发服务
npm run build            # 构建生产版本
npm run start            # 启动生产服务，需要先 build
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:migrate   # Prisma migrate dev
npm run db:init          # 初始化/重置 SQLite 表结构
npm run prisma:seed      # 写入初始数据
npm run test             # 运行 Vitest 测试
```

当前 `package.json` 没有配置 `lint` 命令，不要使用 `npm run lint`。

## 9. 常见问题

### localhost:3000 打不开

通常是开发服务未启动。执行：

```bash
npm run dev
```

或者在当前 Windows 环境使用备用命令：

```powershell
.\.tools\node-v20.19.5-win-x64\node.exe .\node_modules\next\dist\bin\next dev
```

### npm run dev 提示 Access is denied

这是当前 Windows 环境出现过的问题。优先检查 Node/npm 安装；临时可使用上面的本地 Node 备用命令。

### 数据库连接失败

检查 `.env` 是否存在，且包含：

```env
DATABASE_URL="file:./dev.db"
```

如果换电脑运行，建议重新执行：

```bash
npm run prisma:generate
npm run db:init
npm run prisma:seed
```

### 企业微信群机器人发送失败

在“基础设置”里填写企业微信群机器人 Webhook，格式应类似：

```text
https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

不要把真实 Webhook 写入 `.env.example`、README 或 GitHub。

### 旧的 index.html / app.js 是什么

这是早期无依赖本地原型，不是当前主系统入口。当前主系统入口是：

```text
http://localhost:3000
```

## 10. 后续开发建议

- 增加登录和基础权限，避免内网多人使用时误操作。
- 增加数据库迁移目录，减少手写 SQL 初始化脚本的维护压力。
- 为项目、轮次、提醒 API 增加更完整的错误处理和输入校验。
- 增加端到端测试，覆盖页面点击流程。
- 将旧原型文件移动到 `docs/archive/` 或单独分支，等确认不再需要后再删除。
- 部署前将 SQLite 路径、备份策略、Webhook 配置和访问权限整理成运维文档。
