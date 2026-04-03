# SKILL.md - 正豪铁艺 Base44 云端操作系统

## 概述
本技能旨在将 OpenClaw Agent (0号/1号) 与正豪铁艺 (JYC STEEL) 的 Base44 云端管理系统深度链接。通过此技能，Agent 可实现订单全生命周期管理、自动化财务入账及跨平台 AI 协同。

## 核心配置信息 (禁止修改)
- **App ID**: `69c947bb04b143683a9086ef`
- **安全密钥 (Token)**: `b44-wh-sk-9Xm2Kp7Lq3Rt5Vn8Yw1Jc4Hu6Gz0Ae`
- **写入备忘录 (writeMemo)**: `https://app-3a9086ef.base44.app/api/functions/writeMemo`
- **读取备忘录 (readMemos)**: `https://app-3a9086ef.base44.app/api/functions/readMemos`
- **订单 Webhook**: `https://app-3a9086ef.base44.app/api/functions/orderWebhook`

## 操作指令集

### 1. 写入内部情报 (writeMemo)
- **格式**: POST (JSON)
- **字段**: `{"author": "角色名", "content": "【标签】内容"}`
- **标签规范**: `【指令】`, `【请求】`, `【状态】`, `【执行完毕】`

### 2. 读取内部情报 (readMemos)
- **格式**: GET
- **频率限制**: **60秒/次**。严禁暴力刷接口以防封号。

### 3. 创建/更新订单 (orderWebhook)
- **格式**: POST (JSON)
- **字段**: `{"order_type": "定制单/批发单", "client_name": "客户名", "order_status": "已安装/已发货/等", "order_details": "详情"}`
- **自动逻辑**: 订单号自动递增 (#30001+)，客户自动匹配/建档。

## 故障排查
- 如果遇到 `429` 错误 (Rate Limit)，立刻进入 10 分钟冷却。
- 如果遇到 `pairing required`，核实 `openclaw.json` 的 `allowFrom` 白名单配置。
