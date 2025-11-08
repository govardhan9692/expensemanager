import { Client } from '@/types/client';
import { ClientPerformanceData } from './analyticsCalculations';

export interface Insight {
  type: 'strength' | 'warning' | 'opportunity' | 'recommendation';
  message: string;
  icon: string;
}

export const generateBusinessInsights = (
  clients: Client[],
  performanceData: ClientPerformanceData[]
): {
  strengths: Insight[];
  warnings: Insight[];
  opportunities: Insight[];
  recommendations: Insight[];
} => {
  const insights = {
    strengths: [] as Insight[],
    warnings: [] as Insight[],
    opportunities: [] as Insight[],
    recommendations: [] as Insight[]
  };

  // Calculate overall metrics
  const totalExpected = performanceData.reduce((sum, p) => sum + p.expectedIncome, 0);
  const totalReceived = performanceData.reduce((sum, p) => sum + p.receivedIncome, 0);
  const collectionRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

  const avgMargin = performanceData.length > 0
    ? performanceData.reduce((sum, p) => sum + p.profitMargin, 0) / performanceData.length
    : 0;

  // Strengths
  if (collectionRate >= 80) {
    insights.strengths.push({
      type: 'strength',
      message: `Payment collection rate excellent (${collectionRate.toFixed(0)}%)`,
      icon: '✅'
    });
  }

  if (avgMargin >= 70) {
    insights.strengths.push({
      type: 'strength',
      message: `Average profit margin healthy (${avgMargin.toFixed(0)}%)`,
      icon: '✅'
    });
  }

  const top3Revenue = performanceData
    .sort((a, b) => b.receivedIncome - a.receivedIncome)
    .slice(0, 3)
    .reduce((sum, p) => sum + p.receivedIncome, 0);

  if (totalReceived > 0) {
    const top3Percentage = (top3Revenue / totalReceived) * 100;
    insights.strengths.push({
      type: 'strength',
      message: `Top 3 clients generate ${top3Percentage.toFixed(0)}% of revenue`,
      icon: '✅'
    });
  }

  // Warnings
  const negativeMarginClients = performanceData.filter(p => p.netProfit < 0);
  if (negativeMarginClients.length > 0) {
    negativeMarginClients.forEach(client => {
      insights.warnings.push({
        type: 'warning',
        message: `${client.name} has negative margin - review costs`,
        icon: '⚠️'
      });
    });
  }

  const overdueClients = clients.filter(client => {
    return client.services.some(service =>
      service.paymentSchedule?.some(item => item.status === 'overdue')
    );
  });

  if (overdueClients.length > 0) {
    insights.warnings.push({
      type: 'warning',
      message: `${overdueClients.length} client${overdueClients.length > 1 ? 's' : ''} overdue - follow up urgently`,
      icon: '⚠️'
    });
  }

  if (totalReceived > 0 && (top3Revenue / totalReceived) > 0.6) {
    insights.warnings.push({
      type: 'warning',
      message: 'Revenue concentrated in top 3 clients - consider diversifying',
      icon: '⚠️'
    });
  }

  // Opportunities
  const highMarginClients = performanceData.filter(p => p.profitMargin >= 90);
  if (highMarginClients.length > 0) {
    insights.opportunities.push({
      type: 'opportunity',
      message: `${highMarginClients.length} client${highMarginClients.length > 1 ? 's have' : ' has'} 90%+ margin - potential to increase pricing or add services`,
      icon: '📈'
    });
  }

  const recurringClients = clients.filter(client =>
    client.services.some(service => service.recurring)
  );

  if (recurringClients.length > 0) {
    insights.opportunities.push({
      type: 'opportunity',
      message: `${recurringClients.length} recurring client${recurringClients.length > 1 ? 's' : ''} = stable income base`,
      icon: '📈'
    });
  }

  const oneTimeClients = clients.filter(client =>
    !client.services.some(service => service.recurring)
  );

  if (oneTimeClients.length >= 3) {
    insights.opportunities.push({
      type: 'opportunity',
      message: 'Consider offering packages to convert one-time clients to recurring',
      icon: '📈'
    });
  }

  // Recommendations
  if (highMarginClients.length > 0) {
    insights.recommendations.push({
      type: 'recommendation',
      message: `Focus on high-margin clients: ${highMarginClients.slice(0, 3).map(c => c.name).join(', ')}`,
      icon: '🎯'
    });
  }

  if (negativeMarginClients.length > 0) {
    insights.recommendations.push({
      type: 'recommendation',
      message: `Reduce costs or renegotiate terms for: ${negativeMarginClients.map(c => c.name).join(', ')}`,
      icon: '🎯'
    });
  }

  if (overdueClients.length > 0) {
    insights.recommendations.push({
      type: 'recommendation',
      message: 'Set up payment reminders for overdue accounts',
      icon: '🎯'
    });
  }

  const topPerformers = performanceData
    .filter(p => p.netProfit > 0)
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 3);

  if (topPerformers.length > 0) {
    insights.recommendations.push({
      type: 'recommendation',
      message: `Expand services with top performers: ${topPerformers.map(p => p.name).join(', ')}`,
      icon: '🎯'
    });
  }

  return insights;
};
