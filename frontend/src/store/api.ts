import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  NetWorthResult,
  NetWorthSnapshot,
  PiggyBankStatusResult,
  BudgetStatusResult,
  IncomeAllocationResult,
  CompareSpendingResult,
  MonthlyOverviewPoint,
  MonthlyBudgetSpendingResult,
  MonthlyBudgetReportResult,
  ChatResult,
  Period,
  PayStub,
  PayStubSummaryResult,
  LLMConfig,
  Vehicle,
  VehicleSpendingResult,
  VehicleMonthlySpendingResult,
} from '@/types'

export interface AuthUser {
  id: number
  username: string
  isDefault?: boolean
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['FinancialData', 'Auth', 'Prefs', 'PayStubs', 'Vehicles'],
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
    getNetWorthHistory: builder.query<NetWorthSnapshot[], number | void>({
      query: (months = 12) => `/functions/net-worth-history?months=${months}`,
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
    getSetupNeeded: builder.query<{ setupNeeded: boolean }, void>({
      query: () => '/auth/setup-needed',
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
    getPayStubs: builder.query<PayStub[], { year?: string } | void>({
      query: (params) => {
        const p = new URLSearchParams()
        if (params?.year) p.set('year', params.year)
        const qs = p.toString()
        return `/pay-stubs${qs ? `?${qs}` : ''}`
      },
      providesTags: ['PayStubs'],
    }),
    createPayStub: builder.mutation<PayStub, Omit<PayStub, 'id' | 'userId' | 'createdAt'>>({
      query: (body) => ({
        url: '/pay-stubs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PayStubs'],
    }),
    updatePayStub: builder.mutation<PayStub, { id: number } & Omit<PayStub, 'id' | 'userId' | 'createdAt'>>({
      query: ({ id, ...body }) => ({
        url: `/pay-stubs/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PayStubs'],
    }),
    deletePayStub: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({
        url: `/pay-stubs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PayStubs'],
    }),
    getPayStubSummary: builder.query<PayStubSummaryResult, Period | void>({
      query: (period = 'year_to_date') => `/functions/pay-stub-summary?period=${period}`,
      providesTags: ['FinancialData', 'PayStubs'],
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
    getLLMConfigs: builder.query<LLMConfig[], void>({
      query: () => '/admin/llm-configs',
      providesTags: ['Auth'],
    }),
    createLLMConfig: builder.mutation<LLMConfig, { name: string; provider: string; model: string; baseUrl?: string; apiKey?: string }>({
      query: (body) => ({ url: '/admin/llm-configs', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    updateLLMConfig: builder.mutation<LLMConfig, { id: number; name: string; provider: string; model: string; baseUrl?: string; apiKey?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/llm-configs/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Auth'],
    }),
    activateLLMConfig: builder.mutation<LLMConfig, number>({
      query: (id) => ({ url: `/admin/llm-configs/${id}/activate`, method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),
    deleteLLMConfig: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/admin/llm-configs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Auth'],
    }),
    changePassword: builder.mutation<{ ok: boolean }, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/password', method: 'PUT', body }),
    }),
    getVehicles: builder.query<Vehicle[], void>({
      query: () => '/vehicles',
      providesTags: ['Vehicles'],
    }),
    createVehicle: builder.mutation<Vehicle, Omit<Vehicle, 'id' | 'createdAt'>>({
      query: (body) => ({ url: '/vehicles', method: 'POST', body }),
      invalidatesTags: ['Vehicles'],
    }),
    updateVehicle: builder.mutation<Vehicle, { id: number } & Omit<Vehicle, 'id' | 'createdAt'>>({
      query: ({ id, ...body }) => ({ url: `/vehicles/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Vehicles'],
    }),
    deleteVehicle: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/vehicles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Vehicles'],
    }),
    getVehicleSpending: builder.query<VehicleSpendingResult, { vehicleId: number; period?: Period }>({
      query: ({ vehicleId, period = 'year_to_date' }) =>
        `/functions/vehicle-spending?vehicleId=${vehicleId}&period=${period}`,
      providesTags: ['FinancialData', 'Vehicles'],
    }),
    getVehicleMonthlySpending: builder.query<VehicleMonthlySpendingResult, number | void>({
      query: (months = 12) => `/functions/vehicle-monthly-spending?months=${months}`,
      providesTags: ['FinancialData', 'Vehicles'],
    }),
  }),
})

export const {
  useGetSetupNeededQuery,
  useGetNetWorthQuery,
  useGetPiggyBanksQuery,
  useGetBudgetsQuery,
  useGetIncomeAllocationQuery,
  useGetCompareSpendingQuery,
  useGetMonthlyOverviewQuery,
  useGetMonthlyBudgetSpendingQuery,
  useGetMonthlyBudgetReportQuery,
  useGetNetWorthHistoryQuery,
  useChatMutation,
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetPinnedBudgetsQuery,
  useSetPinnedBudgetsMutation,
  useGetPayStubsQuery,
  useCreatePayStubMutation,
  useUpdatePayStubMutation,
  useDeletePayStubMutation,
  useGetPayStubSummaryQuery,
  useGetLLMConfigsQuery,
  useCreateLLMConfigMutation,
  useUpdateLLMConfigMutation,
  useActivateLLMConfigMutation,
  useDeleteLLMConfigMutation,
  useChangePasswordMutation,
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  useGetVehicleSpendingQuery,
  useGetVehicleMonthlySpendingQuery,
} = api
