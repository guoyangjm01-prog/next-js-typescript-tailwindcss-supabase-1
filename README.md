# FundNest 基金投资工具

Next.js + TypeScript + TailwindCSS + Supabase 的基金投资工具首页，包含：

- 基金养老计算器：总投入、预估收益、最终资产和资产增长曲线
- 回本计算器：输入亏损比例，自动计算回本所需涨幅
- 基金对比模块：输入两只基金并展示收益率对比图
- 用户系统：Supabase 注册登录和历史测算记录保存
- 移动端优先的苹果风极简卡片布局

## 本地运行

```bash
npm install
npm run dev
```

## Supabase 配置

复制 `.env.example` 为 `.env.local` 并填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

在 Supabase SQL Editor 执行 `supabase/schema.sql` 创建历史记录表和 RLS 策略。

## Vercel 部署

1. 将项目推送到 Git 仓库。
2. 在 Vercel 导入项目。
3. 添加 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 环境变量。
4. 使用默认构建命令 `npm run build` 部署。
