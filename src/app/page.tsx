"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowUpRight,
  Check,
  History,
  Lock,
  LogOut,
  PiggyBank,
  Save,
  ShieldCheck,
  TrendingUp,
  User
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

type PensionInput = {
  currentAge: number;
  retireAge: number;
  principal: number;
  monthly: number;
  annualRate: number;
};

type FundInput = {
  name: string;
  oneMonth: number;
  sixMonths: number;
  oneYear: number;
  threeYears: number;
};

type SavedRecord = {
  id?: string;
  created_at?: string;
  total_invested: number;
  estimated_profit: number;
  final_asset: number;
  payload: PensionInput;
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2
});

const defaultPension: PensionInput = {
  currentAge: 32,
  retireAge: 60,
  principal: 100000,
  monthly: 3000,
  annualRate: 6
};

const defaultFundA: FundInput = {
  name: "稳健养老混合 A",
  oneMonth: 1.8,
  sixMonths: 7.6,
  oneYear: 12.4,
  threeYears: 31.2
};

const defaultFundB: FundInput = {
  name: "均衡成长基金 C",
  oneMonth: 0.9,
  sixMonths: 9.1,
  oneYear: 15.8,
  threeYears: 26.4
};

function formatMoney(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function calculatePension(input: PensionInput) {
  const years = Math.max(input.retireAge - input.currentAge, 0);
  const months = years * 12;
  const monthlyRate = input.annualRate / 100 / 12;
  let asset = input.principal;
  const points = [{ year: input.currentAge, asset, invested: input.principal }];

  for (let month = 1; month <= months; month += 1) {
    asset = asset * (1 + monthlyRate) + input.monthly;
    if (month % 12 === 0 || month === months) {
      const invested = input.principal + input.monthly * month;
      points.push({
        year: input.currentAge + Math.ceil(month / 12),
        asset: Math.round(asset),
        invested
      });
    }
  }

  const totalInvested = input.principal + input.monthly * months;
  const finalAsset = asset;

  return {
    years,
    months,
    totalInvested,
    estimatedProfit: Math.max(finalAsset - totalInvested, 0),
    finalAsset,
    points
  };
}

function InputField({
  label,
  value,
  suffix,
  min,
  onChange
}: {
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
      <div className="flex h-12 items-center rounded-[8px] border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-slate-400">
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-slate-950 outline-none"
          min={min}
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span className="shrink-0 text-sm text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function FundFields({
  title,
  value,
  onChange
}: {
  title: string;
  value: FundInput;
  onChange: (next: FundInput) => void;
}) {
  const update = (key: keyof FundInput, nextValue: string | number) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <TrendingUp className="size-4 text-teal-600" />
      </div>
      <label className="mb-3 block">
        <span className="mb-2 block text-xs font-medium text-slate-500">基金名称</span>
        <input
          className="h-11 w-full rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
          value={value.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["oneMonth", "近 1 月"],
          ["sixMonths", "近 6 月"],
          ["oneYear", "近 1 年"],
          ["threeYears", "近 3 年"]
        ].map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-2 block text-xs font-medium text-slate-500">{label}</span>
            <div className="flex h-11 items-center rounded-[8px] border border-slate-200 px-3 focus-within:border-slate-400">
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none"
                type="number"
                value={value[key as Exclude<keyof FundInput, "name">]}
                onChange={(event) => update(key as keyof FundInput, Number(event.target.value))}
              />
              <span className="text-xs text-slate-500">%</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [pension, setPension] = useState<PensionInput>(defaultPension);
  const [loss, setLoss] = useState(30);
  const [fundA, setFundA] = useState<FundInput>(defaultFundA);
  const [fundB, setFundB] = useState<FundInput>(defaultFundB);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [status, setStatus] = useState("");

  const pensionResult = useMemo(() => calculatePension(pension), [pension]);
  const recoveryGain = loss >= 100 ? Infinity : loss / (100 - loss) * 100;

  const comparisonData = useMemo(
    () => [
      { period: "近 1 月", [fundA.name]: fundA.oneMonth, [fundB.name]: fundB.oneMonth },
      { period: "近 6 月", [fundA.name]: fundA.sixMonths, [fundB.name]: fundB.sixMonths },
      { period: "近 1 年", [fundA.name]: fundA.oneYear, [fundB.name]: fundB.oneYear },
      { period: "近 3 年", [fundA.name]: fundA.threeYears, [fundB.name]: fundB.threeYears }
    ],
    [fundA, fundB]
  );

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setRecords([]);
      return;
    }

    supabase
      .from("calculation_records")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecords((data as SavedRecord[]) ?? []));
  }, [user, status]);

  const updatePension = (key: keyof PensionInput, value: number) => {
    setPension((current) => ({ ...current, [key]: value }));
  };

  const handleAuth = async () => {
    if (!supabase) {
      setStatus("请先在 Vercel 或本地配置 Supabase 环境变量。");
      return;
    }
    const { error } =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setStatus(error ? error.message : authMode === "login" ? "登录成功" : "注册成功，请按 Supabase 设置完成邮箱确认。");
  };

  const saveRecord = async () => {
    if (!supabase || !user) {
      setStatus("登录后即可保存历史测算记录。");
      return;
    }

    const { error } = await supabase.from("calculation_records").insert({
      user_id: user.id,
      total_invested: Math.round(pensionResult.totalInvested),
      estimated_profit: Math.round(pensionResult.estimatedProfit),
      final_asset: Math.round(pensionResult.finalAsset),
      payload: pension
    });

    setStatus(error ? error.message : "已保存本次测算。");
  };

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-[8px] border border-slate-200 bg-white/90 p-5 shadow-soft backdrop-blur sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              <ShieldCheck className="size-3.5 text-teal-600" />
              Supabase + Vercel Ready
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              FundNest 基金投资工具
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              养老定投、亏损回本、基金收益对比和历史测算记录，集中在一个清爽的移动端优先界面里。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-[8px] bg-slate-50 p-2">
            {[
              ["年限", `${pensionResult.years} 年`],
              ["投入", formatMoney(pensionResult.totalInvested)],
              ["资产", formatMoney(pensionResult.finalAsset)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] bg-white px-3 py-4 text-center shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-950 sm:text-base">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-teal-700">01</p>
                <h2 className="text-xl font-semibold text-slate-950">基金养老计算器</h2>
              </div>
              <PiggyBank className="size-6 text-slate-900" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <InputField label="当前年龄" min={0} suffix="岁" value={pension.currentAge} onChange={(value) => updatePension("currentAge", value)} />
              <InputField label="退休年龄" min={0} suffix="岁" value={pension.retireAge} onChange={(value) => updatePension("retireAge", value)} />
              <InputField label="初始本金" min={0} suffix="元" value={pension.principal} onChange={(value) => updatePension("principal", value)} />
              <InputField label="每月定投" min={0} suffix="元" value={pension.monthly} onChange={(value) => updatePension("monthly", value)} />
              <InputField label="年化收益率" suffix="%" value={pension.annualRate} onChange={(value) => updatePension("annualRate", value)} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["总投入", pensionResult.totalInvested],
                ["预估收益", pensionResult.estimatedProfit],
                ["最终资产", pensionResult.finalAsset]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(value as number)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pensionResult.points} margin={{ left: 0, right: 6, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="assetGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 10000)}万`} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} labelFormatter={(value) => `${value} 岁`} />
                  <Area type="monotone" dataKey="invested" name="累计投入" stroke="#94a3b8" strokeWidth={2} fill="transparent" />
                  <Area type="monotone" dataKey="asset" name="最终资产" stroke="#0f766e" strokeWidth={3} fill="url(#assetGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <button
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              onClick={saveRecord}
            >
              <Save className="size-4" />
              保存测算
            </button>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal-700">02</p>
                  <h2 className="text-xl font-semibold text-slate-950">回本计算器</h2>
                </div>
                <ArrowUpRight className="size-6 text-slate-900" />
              </div>
              <InputField label="当前亏损比例" min={0} suffix="%" value={loss} onChange={setLoss} />
              <div className="mt-5 rounded-[8px] bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">需要上涨</p>
                <p className="mt-2 text-4xl font-semibold">
                  {Number.isFinite(recoveryGain) ? percentFormatter.format(recoveryGain) : "∞"}%
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">亏损越深，回本所需涨幅会非线性放大。</p>
              </div>
            </section>

            <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal-700">04</p>
                  <h2 className="text-xl font-semibold text-slate-950">用户系统</h2>
                </div>
                {user ? <User className="size-6 text-teal-700" /> : <Lock className="size-6 text-slate-900" />}
              </div>

              {user ? (
                <div>
                  <div className="mb-4 rounded-[8px] bg-teal-50 p-4 text-sm font-medium text-teal-800">
                    <Check className="mr-2 inline size-4" />
                    {user.email}
                  </div>
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-slate-200 text-sm font-semibold"
                    onClick={() => supabase?.auth.signOut()}
                  >
                    <LogOut className="size-4" />
                    退出登录
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 rounded-[8px] bg-slate-100 p-1">
                    {(["login", "signup"] as const).map((mode) => (
                      <button
                        key={mode}
                        className={`h-10 rounded-[8px] text-sm font-semibold transition ${authMode === mode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                        onClick={() => setAuthMode(mode)}
                      >
                        {mode === "login" ? "登录" : "注册"}
                      </button>
                    ))}
                  </div>
                  <input className="h-12 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-slate-400" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <input className="h-12 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-slate-400" placeholder="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button className="h-12 w-full rounded-[8px] bg-slate-950 text-sm font-semibold text-white" onClick={handleAuth}>
                    {authMode === "login" ? "登录" : "创建账户"}
                  </button>
                </div>
              )}

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {hasSupabaseConfig ? status || "历史记录将写入 calculation_records 表。" : "配置 Supabase 环境变量后启用注册登录和记录保存。"}
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-700">03</p>
              <h2 className="text-xl font-semibold text-slate-950">基金对比模块</h2>
            </div>
            <TrendingUp className="size-6 text-slate-900" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FundFields title="基金 A" value={fundA} onChange={setFundA} />
            <FundFields title="基金 B" value={fundB} onChange={setFundB} />
          </div>
          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ left: 0, right: 6, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey={fundA.name} fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey={fundB.name} fill="#111827" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <History className="size-5 text-slate-900" />
            <h2 className="text-xl font-semibold text-slate-950">历史测算记录</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {records.length > 0 ? (
              records.map((record) => (
                <div key={record.id ?? record.created_at} className="rounded-[8px] bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{record.created_at ? new Date(record.created_at).toLocaleDateString("zh-CN") : "刚刚"}</p>
                  <p className="mt-2 text-sm text-slate-500">最终资产</p>
                  <p className="text-lg font-semibold text-slate-950">{formatMoney(record.final_asset)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[8px] bg-slate-50 p-4 text-sm leading-6 text-slate-500 sm:col-span-2 lg:col-span-5">
                登录并保存测算后，这里会显示最近 5 条记录。
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
