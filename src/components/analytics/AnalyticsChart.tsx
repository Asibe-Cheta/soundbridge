// src/components/analytics/AnalyticsChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'pie';
  height?: number;
}

export default function AnalyticsChart({ title, data, type, height = 200 }: AnalyticsChartProps) {
  const { theme } = useTheme();

  const maxValue = Math.max(...data.map(d => d.value));
  const chartWidth = width - 40;

  const renderBarChart = () => {
    return (
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 60);
          const barWidth = (chartWidth - (data.length - 1) * 8) / data.length;
          
          return (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: barWidth,
                    backgroundColor: item.color || theme.colors.primary,
                  },
                ]}
              />
              <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                {item.label}
              </Text>
              <Text style={[styles.barValue, { color: theme.colors.text }]}>
                {item.value.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = height - 60 - (item.value / maxValue) * (height - 60);
      return { x, y };
    });

    const pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return (
      <View style={styles.chartContainer}>
        <View style={styles.lineChartContainer}>
          {/* Simple line representation using View components */}
          {points.map((point, index) => (
            <View key={index}>
              <View
                style={[
                  styles.linePoint,
                  {
                    left: point.x - 4,
                    top: point.y - 4,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
              {index < points.length - 1 && (
                <View
                  style={[
                    styles.lineSegment,
                    {
                      left: point.x,
                      top: point.y,
                      width: Math.sqrt(
                        Math.pow(points[index + 1].x - point.x, 2) +
                        Math.pow(points[index + 1].y - point.y, 2)
                      ),
                      backgroundColor: theme.colors.primary,
                      transform: [
                        {
                          rotate: `${Math.atan2(
                            points[index + 1].y - point.y,
                            points[index + 1].x - point.x
                          )}rad`,
                        },
                      ],
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
        
        {/* Labels */}
        <View style={styles.lineLabels}>
          {data.map((item, index) => (
            <Text
              key={index}
              style={[
                styles.lineLabel,
                { color: theme.colors.textSecondary },
                { left: (index / (data.length - 1)) * chartWidth - 20 },
              ]}
            >
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.pieChartContainer}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            
            const sliceStyle = {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: item.color || theme.colors.primary,
              transform: [{ rotate: `${currentAngle}deg` }],
            };
            
            currentAngle += angle;
            
            return (
              <View key={index} style={[styles.pieSlice, sliceStyle]} />
            );
          })}
        </View>
        
        {/* Legend */}
        <View style={styles.pieLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: item.color || theme.colors.primary },
                ]}
              />
              <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                {item.label}: {item.value.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <View style={[styles.chartWrapper, { height }]}>
        {renderChart()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bar Chart Styles
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  bar: {
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Line Chart Styles
  lineChartContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
  },
  lineLabels: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 40,
  },
  lineLabel: {
    position: 'absolute',
    fontSize: 12,
    textAlign: 'center',
    width: 40,
  },
  // Pie Chart Styles
  pieChartContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  pieSlice: {
    position: 'absolute',
    borderRadius: 60,
  },
  pieLegend: {
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
  },
});
