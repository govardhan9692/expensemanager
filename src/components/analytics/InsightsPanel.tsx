import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Insight } from '@/utils/insightsEngine';
import { Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  strengths: Insight[];
  warnings: Insight[];
  opportunities: Insight[];
  recommendations: Insight[];
}

export const InsightsPanel = ({ strengths, warnings, opportunities, recommendations }: InsightsPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Business Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div>
            <h4 className="font-semibold text-success mb-3">✅ Strengths</h4>
            <div className="space-y-2">
              {strengths.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span>{insight.icon}</span>
                  <p>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div>
            <h4 className="font-semibold text-warning mb-3">⚠️ Areas for Improvement</h4>
            <div className="space-y-2">
              {warnings.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span>{insight.icon}</span>
                  <p>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div>
            <h4 className="font-semibold text-primary mb-3">📈 Opportunities</h4>
            <div className="space-y-2">
              {opportunities.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span>{insight.icon}</span>
                  <p>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold text-foreground mb-3">🎯 Recommendations</h4>
            <div className="space-y-2">
              {recommendations.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span>{insight.icon}</span>
                  <p>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {strengths.length === 0 && warnings.length === 0 && opportunities.length === 0 && recommendations.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No insights available yet. Add more clients and transactions to see insights.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
