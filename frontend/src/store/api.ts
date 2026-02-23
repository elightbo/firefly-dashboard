import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  NetWorthResult,
  PiggyBankStatusResult,
  BudgetStatusResult,
  IncomeAllocationResult,
  CompareSpendingResult,
  MonthlyOverviewPoint,
  MonthlyBudgetSpendingResult,
  MonthlyBudgetReportResult,
  ChatResult,
  Period,
} from '@/types'

export interface AuthUser {
  id: number
  username: string
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['FinancialData', 'Auth', 'Prefs'],
  endpoints: (builder) => ({
    getNetWorth: builder.query<NetWorthResult, void>({
      query: () => '/functions/net-worth',
      providesTags: ['FinancialData'],
    }),
    getPiggyBanks: builder.query<PiggyBankStatusResult[], void>({
      query: () => '/functions/piggy-banks',
      providesTags: ['FinancialData'],
    }),
    getBudgets: builder.query<BudgetStatusResult[], void>({
      query: () => '/functions/budgets',
      providesTags: ['FinancialData'],
    }),
    getIncomeAllocation: builder.query<IncomeAllocationResult, Period>({
      query: (period) => `/functions/income-allocation?period=${period}`,
      providesTags: ['FinancialData'],
    }),
    getCompareSpending: builder.query<CompareSpendingResult, Period>({
      query: (period) => `/functions/compare-spending?period=${period}`,
      providesTags: ['FinancialData'],
    }),
    getMonthlyBudgetReport: builder.query<MonthlyBudgetReportResult, { lookback?: number; targetMonth?: string } | void>({
      query: (params) => {
        const p = new URLSearchParams()
        if (params?.lookback) p.set('lookback', String(params.lookback))
        if (params?.targetMonth) p.set('targetMonth', params.targetMonth)
        return `/functions/budget-report?${p.toString()}`
      },
      providesTags: ['FinancialData'],
    }),
    getMonthlyOverview: builder.query<MonthlyOverviewPoint[], number | void>({
      query: (months = 12) => `/functions/monthly-overview?months=${months}`,
      providesTags: ['FinancialData'],
    }),
    getMonthlyBudgetSpending: builder.query<MonthlyBudgetSpendingResult, number | void>({
      query: (months = 12) => `/functions/monthly-budget-spending?months=${months}`,
      providesTags: ['FinancialData'],
    }),
    chat: builder.mutation<ChatResult, string>({
      query: (question) => ({
        url: '/chat',
        method: 'POST',
        body: { question },
      }),
    }),
    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    login: builder.mutation<AuthUser, { username: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'FinancialData'],
    }),
    getUsers: builder.query<Array<{ id: number; username: string; createdAt: string }>, void>({
      query: () => '/admin/users',
      providesTags: ['Auth'],
    }),
    createUser: builder.mutation<AuthUser, { username: string; password: string }>({
      query: (body) => ({
        url: '/admin/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    deleteUser: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),
    getPinnedBudgets: builder.query<string[], void>({
      query: () => '/prefs/pinned-budgets',
      providesTags: ['Prefs'],
    }),
    setPinnedBudgets: builder.mutation<{ ok: boolean }, { names: string[] }>({
      query: (body) => ({
        url: '/prefs/pinned-budgets',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Prefs'],
    }),
  }),
})

export const {
  useGetNetWorthQuery,
  useGetPiggyBanksQuery,
  useGetBudgetsQuery,
  useGetIncomeAllocationQuery,
  useGetCompareSpendingQuery,
  useGetMonthlyOverviewQuery,
  useGetMonthlyBudgetSpendingQuery,
  useGetMonthlyBudgetReportQuery,
  useChatMutation,
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetPinnedBudgetsQuery,
  useSetPinnedBudgetsMutation,
} = api
