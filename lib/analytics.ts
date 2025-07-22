interface AnalyticsProperties {
  [key: string]: string | number | boolean
}

export function trackEvent(event: string, properties?: AnalyticsProperties) {
  // For now, just log to console
  console.log('Analytics Event:', event, properties)
  
  // In production, you would send this to your analytics service
  // Example with PostHog, Mixpanel, etc.
}

export function trackPageView(path: string, properties?: AnalyticsProperties) {
  trackEvent('page_view', { path, ...properties })
}

export function trackTransactionAdded(type: 'income' | 'expense', amount: number, properties?: AnalyticsProperties) {
  trackEvent('transaction_added', { type, amount, ...properties })
}

export function trackGoalCreated(goalType: string, targetAmount: number, properties?: AnalyticsProperties) {
  trackEvent('goal_created', { goalType, targetAmount, ...properties })
}

export function trackExpenseAdded(category: string, amount: number, properties?: AnalyticsProperties) {
  trackEvent('expense_added', { category, amount, ...properties })
}
