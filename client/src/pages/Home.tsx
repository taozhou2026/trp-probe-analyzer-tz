/* 
 * Design Philosophy: Data Brutalism meets Swiss Design
 * - Monospaced JetBrains Mono for technical precision
 * - Dark charcoal (#1a1a1a) with electric cyan (#00d9ff) accents
 * - Grid-based asymmetric layout with split-screen dashboard
 * - Flat brutalist aesthetic with sharp borders, no shadows
 */

import { useEffect, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Activity, Database, Filter, TrendingUp } from "lucide-react";

interface TRPRecord {
  SerialNumber: string;
  Tech: string;
  Band: number;
  Bandwidth: number;
  Channel: number;
  Antenna: number;
  POC_TRP_dBm: number;
  Num_Probes: number;
  Probe_01: number | null;
  Probe_02: number | null;
  Probe_03: number | null;
  Probe_04: number | null;
  Probe_05: number | null;
  Probe_06: number | null;
  Probe_07: number | null;
  Probe_08: number | null;
  Probe_09: number | null;
  Probe_10: number | null;
  Probe_11: number | null;
  Probe_12: number | null;
  Probe_13: number | null;
  Probe_14: number | null;
  Probe_15: number | null;
  Probe_16: number | null;
}

interface Metadata {
  technologies: string[];
  bands: number[];
  antennas: number[];
  channels: number[];
  serialNumbers: string[];
  probeColumns: string[];
}

export default function Home() {
  const [data, setData] = useState<TRPRecord[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [selectedBand, setSelectedBand] = useState<string>("all");
  const [selectedAntenna, setSelectedAntenna] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  
  // Probe selection
  const [selectedProbes, setSelectedProbes] = useState<string[]>(["Probe_01", "Probe_02", "Probe_03"]);
  const [combineModes, setCombineModes] = useState<Set<'individual' | 'linear' | 'db' | 'linear_top_half' | 'best_2_probe'>>(new Set<'individual' | 'linear' | 'db' | 'linear_top_half' | 'best_2_probe'>(['individual']));
  const [highlightBest, setHighlightBest] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  useEffect(() => {
    Promise.all([
      fetch('/trp_data.json?v=' + Date.now()).then(r => r.json()),
      fetch('/metadata.json?v=' + Date.now()).then(r => r.json())
    ]).then(([trpData, meta]) => {
      console.log('Data loaded:', trpData.length, 'records');
      console.log('Metadata loaded:', meta);
      setData(trpData);
      setMetadata(meta);
      setLoading(false);
    }).catch(error => {
      console.error('Error loading data:', error);
      setLoading(false);
    });
  }, []);
  
  // Get available channels for selected band
  const availableChannels = useMemo(() => {
    if (selectedBand === "all") {
      return metadata?.channels || [];
    }
    const bandData = data.filter(record => record.Band === parseInt(selectedBand));
    const channels = Array.from(new Set(bandData.map(r => r.Channel)));
    return channels.sort((a, b) => a - b);
  }, [data, selectedBand, metadata]);

  // Reset channel when band changes
  useEffect(() => {
    if (selectedBand !== "all" && selectedChannel !== "all") {
      const channelNum = parseInt(selectedChannel);
      if (!availableChannels.includes(channelNum)) {
        setSelectedChannel("all");
      }
    }
  }, [selectedBand, selectedChannel, availableChannels]);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter(record => {
      if (selectedTech !== "all" && record.Tech !== selectedTech) return false;
      if (selectedBand !== "all" && record.Band !== parseInt(selectedBand)) return false;
      if (selectedAntenna !== "all" && record.Antenna !== parseInt(selectedAntenna)) return false;
      if (selectedChannel !== "all" && record.Channel !== parseInt(selectedChannel)) return false;
      return true;
    });
  }, [data, selectedTech, selectedBand, selectedAntenna, selectedChannel]);
  
  // Calculate linear power average from dB values
  const calculateLinearAverage = (probeValues: (number | null)[]) => {
    const validValues = probeValues.filter(v => v !== null) as number[];
    if (validValues.length === 0) return null;
    
    // Convert dB to linear (power = 10^(dB/10))
    const linearSum = validValues.reduce((sum, db) => sum + Math.pow(10, db / 10), 0);
    const linearAvg = linearSum / validValues.length;
    
    // Convert back to dB
    return 10 * Math.log10(linearAvg);
  };

  // Calculate linear regression (y = mx + b) and R²
  const calculateLinearRegression = (points: Array<{x: number, y: number}>) => {
    const n = points.length;
    if (n < 2) return null;

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = points.reduce((sum, p) => {
      const yPred = slope * p.x + intercept;
      return sum + Math.pow(p.y - yPred, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    return { slope, intercept, rSquared };
  };
  
  // Calculate R² for correlations
  const correlationData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    const isValidValue = (val: number | null | undefined): val is number => {
      return val !== null && val !== undefined && val > -100;
    };
    
    const results: Array<{probe: string, correlation: number, count: number}> = [];
    
    // If "All Channels" is selected, group by channel
    const shouldGroupByChannel = selectedChannel === "all";
    const channelsToProcess = shouldGroupByChannel 
      ? Array.from(new Set(filteredData.map(r => r.Channel))).sort((a, b) => a - b)
      : [null];
    
    for (const channel of channelsToProcess) {
      const channelData = shouldGroupByChannel && channel !== null
        ? filteredData.filter(r => r.Channel === channel)
        : filteredData;
      
      // Skip channels with insufficient data
      if (channelData.length < 10) continue;
      
      const channelPrefix = shouldGroupByChannel && channel !== null ? `Ch${channel}-` : '';
    
      // Individual probes
      if (combineModes.has('individual')) {
        const individualResults = selectedProbes.map(probe => {
          const validPairs = channelData
            .map(r => ({ trp: r.POC_TRP_dBm, probe: r[probe as keyof TRPRecord] as number | null }))
            .filter(p => isValidValue(p.probe));
          
          if (validPairs.length < 10) return null;
          
          const points = validPairs.map(p => ({ x: p.probe as number, y: p.trp }));
          const regression = calculateLinearRegression(points);
          const rSquared = regression ? regression.rSquared : 0;
          
          return { probe: `${channelPrefix}${probe}`, correlation: rSquared, count: validPairs.length };
        }).filter(item => item !== null) as Array<{probe: string, correlation: number, count: number}>;
        
        results.push(...individualResults);
      }
      
      // Linear average
      if (combineModes.has('linear') && selectedProbes.length > 0) {
        const points = channelData
          .map(r => {
            const probeValues = selectedProbes
              .map(p => r[p as keyof TRPRecord] as number | null)
              .filter(isValidValue);
            
            if (probeValues.length === 0) return null;
            const avgValue = calculateLinearAverage(probeValues);
            return avgValue !== null && isValidValue(avgValue) ? {
              x: avgValue,
              y: r.POC_TRP_dBm
            } : null;
          })
          .filter(p => p !== null) as Array<{x: number, y: number}>;
        
        if (points.length >= 10) {
          const regression = calculateLinearRegression(points);
          const rSquared = regression ? regression.rSquared : 0;
          results.push({ probe: `${channelPrefix}Linear Avg`, correlation: rSquared, count: points.length });
        }
      }
      
      // Linear average (top half)
      if (combineModes.has('linear_top_half') && selectedProbes.length > 0) {
        const points = channelData
          .map(r => {
            const probeValues = selectedProbes
              .map(p => r[p as keyof TRPRecord] as number | null)
              .filter(isValidValue);
            
            if (probeValues.length === 0) return null;
            // Sort and take top half
            const sorted = [...probeValues].sort((a, b) => b - a);
            const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
            const avgValue = calculateLinearAverage(topHalf);
            return avgValue !== null && isValidValue(avgValue) ? {
              x: avgValue,
              y: r.POC_TRP_dBm
            } : null;
          })
          .filter(p => p !== null) as Array<{x: number, y: number}>;
        
        if (points.length >= 10) {
          const regression = calculateLinearRegression(points);
          const rSquared = regression ? regression.rSquared : 0;
          results.push({ probe: `${channelPrefix}Linear Avg (Top Half)`, correlation: rSquared, count: points.length });
        }
      }
      
      // dB average
      if (combineModes.has('db') && selectedProbes.length > 0) {
        const points = channelData
          .map(r => {
            const probeValues = selectedProbes
              .map(p => r[p as keyof TRPRecord] as number | null)
              .filter(isValidValue);
            
            if (probeValues.length === 0) return null;
            const avgValue = probeValues.reduce((sum, v) => sum + v, 0) / probeValues.length;
            return avgValue !== null && isValidValue(avgValue) ? {
              x: avgValue,
              y: r.POC_TRP_dBm
            } : null;
          })
          .filter(p => p !== null) as Array<{x: number, y: number}>;
        
        if (points.length >= 10) {
          const regression = calculateLinearRegression(points);
          const rSquared = regression ? regression.rSquared : 0;
          results.push({ probe: `${channelPrefix}dB Avg`, correlation: rSquared, count: points.length });
        }
      }
      
      // Best 2-probe combo
      if (combineModes.has('best_2_probe') && selectedProbes.length >= 2) {
        let bestR2 = 0;
        let bestPoints: Array<{x: number, y: number}> = [];
        
        // Try all 2-probe combinations with different weights
        for (let i = 0; i < selectedProbes.length; i++) {
          for (let j = i + 1; j < selectedProbes.length; j++) {
            const probe1 = selectedProbes[i];
            const probe2 = selectedProbes[j];
            
            // Try different weight ratios (10%-90%, 20%-80%, ..., 90%-10%)
            for (let w1 = 0.1; w1 <= 0.9; w1 += 0.1) {
              const w2 = 1 - w1;
              
              const points = channelData
                .map(r => {
                  const v1 = r[probe1 as keyof TRPRecord] as number | null;
                  const v2 = r[probe2 as keyof TRPRecord] as number | null;
                  
                  if (!isValidValue(v1) || !isValidValue(v2)) return null;
                  
                  const linear1 = Math.pow(10, v1 / 10);
                  const linear2 = Math.pow(10, v2 / 10);
                  const weightedAvg = w1 * linear1 + w2 * linear2;
                  const dbValue = 10 * Math.log10(weightedAvg);
                  
                  return {
                    x: dbValue,
                    y: r.POC_TRP_dBm
                  };
                })
                .filter(p => p !== null) as Array<{x: number, y: number}>;
              
              if (points.length >= 10) {
                const regression = calculateLinearRegression(points);
                if (regression && regression.rSquared > bestR2) {
                  bestR2 = regression.rSquared;
                  bestPoints = points;
                }
              }
            }
          }
        }
        
        if (bestPoints.length >= 10) {
          results.push({ probe: `${channelPrefix}Best 2-Probe`, correlation: bestR2, count: bestPoints.length });
        }
      }
    }
    
    return results;
  }, [filteredData, selectedProbes, combineModes, selectedChannel]);

  // Linear regression data for fit lines
  const regressionData = useMemo(() => {
    if (selectedProbes.length === 0 || filteredData.length === 0) return [];

    const isValidValue = (val: number | null | undefined): val is number => {
      return val !== null && val !== undefined && val > -100;
    };

    const results: Array<{probeName: string, regression: {slope: number, intercept: number, rSquared: number}, lineData: Array<{probe: number, trp: number}>}> = [];

    // Individual probes
    if (combineModes.has('individual')) {
      const individualResults = selectedProbes.map(probeName => {
        const points = filteredData
          .map(r => {
            const probeValue = r[probeName as keyof TRPRecord] as number | null | undefined;
            return isValidValue(probeValue) ? {
              x: probeValue,
              y: r.POC_TRP_dBm
            } : null;
          })
          .filter(p => p !== null) as Array<{x: number, y: number}>;

        const regression = calculateLinearRegression(points);
        if (!regression || points.length < 10) return null;

        const xMin = Math.min(...points.map(p => p.x));
        const xMax = Math.max(...points.map(p => p.x));

        return {
          probeName,
          regression,
          lineData: [
            { probe: xMin, trp: regression.slope * xMin + regression.intercept },
            { probe: xMax, trp: regression.slope * xMax + regression.intercept }
          ]
        };
      }).filter(r => r !== null) as Array<{probeName: string, regression: {slope: number, intercept: number, rSquared: number}, lineData: Array<{probe: number, trp: number}>}>;
      
      results.push(...individualResults);
    }

    // Linear average
    if (combineModes.has('linear') && selectedProbes.length > 0) {
      const points = filteredData
        .map(r => {
          const probeValues = selectedProbes
            .map(p => r[p as keyof TRPRecord] as number | null)
            .filter(isValidValue);
          
          if (probeValues.length === 0) return null;
          const avgValue = calculateLinearAverage(probeValues);
          return avgValue !== null && isValidValue(avgValue) ? {
            x: avgValue,
            y: r.POC_TRP_dBm
          } : null;
        })
        .filter(p => p !== null) as Array<{x: number, y: number}>;

      const regression = calculateLinearRegression(points);
      if (regression && points.length >= 10) {
        const xMin = Math.min(...points.map(p => p.x));
        const xMax = Math.max(...points.map(p => p.x));

        results.push({
          probeName: 'Linear Avg',
          regression,
          lineData: [
            { probe: xMin, trp: regression.slope * xMin + regression.intercept },
            { probe: xMax, trp: regression.slope * xMax + regression.intercept }
          ]
        });
      }
    }

    // Linear average (top half)
    if (combineModes.has('linear_top_half') && selectedProbes.length > 0) {
      const points = filteredData
        .map(r => {
          const probeValues = selectedProbes
            .map(p => r[p as keyof TRPRecord] as number | null)
            .filter(isValidValue);
          
          if (probeValues.length === 0) return null;
          // Sort and take top half
          const sorted = [...probeValues].sort((a, b) => b - a);
          const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
          const avgValue = calculateLinearAverage(topHalf);
          return avgValue !== null && isValidValue(avgValue) ? {
            x: avgValue,
            y: r.POC_TRP_dBm
          } : null;
        })
        .filter(p => p !== null) as Array<{x: number, y: number}>;

      const regression = calculateLinearRegression(points);
      if (regression && points.length >= 10) {
        const xMin = Math.min(...points.map(p => p.x));
        const xMax = Math.max(...points.map(p => p.x));

        results.push({
          probeName: 'Linear Avg (Top Half)',
          regression,
          lineData: [
            { probe: xMin, trp: regression.slope * xMin + regression.intercept },
            { probe: xMax, trp: regression.slope * xMax + regression.intercept }
          ]
        });
      }
    }
    
    // dB average
    if (combineModes.has('db') && selectedProbes.length > 0) {
      const points = filteredData
        .map(r => {
          const probeValues = selectedProbes
            .map(p => r[p as keyof TRPRecord] as number | null)
            .filter(isValidValue);
          
          if (probeValues.length === 0) return null;
          const avgValue = probeValues.reduce((sum, v) => sum + v, 0) / probeValues.length;
          return avgValue !== null && isValidValue(avgValue) ? {
            x: avgValue,
            y: r.POC_TRP_dBm
          } : null;
        })
        .filter(p => p !== null) as Array<{x: number, y: number}>;

      const regression = calculateLinearRegression(points);
      if (regression && points.length >= 10) {
        const xMin = Math.min(...points.map(p => p.x));
        const xMax = Math.max(...points.map(p => p.x));

        results.push({
          probeName: 'dB Avg',
          regression,
          lineData: [
            { probe: xMin, trp: regression.slope * xMin + regression.intercept },
            { probe: xMax, trp: regression.slope * xMax + regression.intercept }
          ]
        });
      }
    }
    
    // Best 2-probe combo
    if (combineModes.has('best_2_probe') && selectedProbes.length >= 2) {
      let bestR2 = 0;
      let bestPoints: Array<{x: number, y: number}> = [];
      
      // Try all 2-probe combinations with different weights
      for (let i = 0; i < selectedProbes.length; i++) {
        for (let j = i + 1; j < selectedProbes.length; j++) {
          const probe1 = selectedProbes[i];
          const probe2 = selectedProbes[j];
          
          // Try different weight ratios
          for (let w1 = 0.1; w1 <= 0.9; w1 += 0.1) {
            const w2 = 1 - w1;
            
            const points = filteredData
              .map(r => {
                const v1 = r[probe1 as keyof TRPRecord] as number | null;
                const v2 = r[probe2 as keyof TRPRecord] as number | null;
                
                if (!isValidValue(v1) || !isValidValue(v2)) return null;
                
                const linear1 = Math.pow(10, v1 / 10);
                const linear2 = Math.pow(10, v2 / 10);
                const weightedAvg = w1 * linear1 + w2 * linear2;
                const dbValue = 10 * Math.log10(weightedAvg);
                
                return {
                  x: dbValue,
                  y: r.POC_TRP_dBm
                };
              })
              .filter(p => p !== null) as Array<{x: number, y: number}>;
            
            if (points.length >= 10) {
              const regression = calculateLinearRegression(points);
              if (regression && regression.rSquared > bestR2) {
                bestR2 = regression.rSquared;
                bestPoints = points;
              }
            }
          }
        }
      }
      
      if (bestPoints.length >= 10) {
        const regression = calculateLinearRegression(bestPoints);
        if (regression) {
          const xMin = Math.min(...bestPoints.map(p => p.x));
          const xMax = Math.max(...bestPoints.map(p => p.x));
          
          results.push({
            probeName: 'Best 2-Probe',
            regression,
            lineData: [
              { probe: xMin, trp: regression.slope * xMin + regression.intercept },
              { probe: xMax, trp: regression.slope * xMax + regression.intercept }
            ]
          });
        }
      }
    }

    return results;
  }, [filteredData, selectedProbes, combineModes]);

  // Scatter plot data - show all selected probes
  const scatterData = useMemo(() => {
    if (selectedProbes.length === 0 || filteredData.length === 0) return [];
    
    const isValidValue = (val: number | null | undefined): val is number => {
      return val !== null && val !== undefined && val > -100;
    };
    
    const allPoints: Array<{trp: number, probe: number, probeName: string, name: string}> = [];
    
    // If "All Channels" is selected, group by channel
    const shouldGroupByChannel = selectedChannel === "all";
    const channelsToProcess = shouldGroupByChannel 
      ? Array.from(new Set(filteredData.map(r => r.Channel))).sort((a, b) => a - b)
      : [null];
    
    for (const channel of channelsToProcess) {
      const channelData = shouldGroupByChannel && channel !== null
        ? filteredData.filter(r => r.Channel === channel)
        : filteredData;
      
      // Skip channels with insufficient data
      if (channelData.length < 10) continue;
      
      const channelPrefix = shouldGroupByChannel && channel !== null ? `Ch${channel}-` : '';
    
      // Individual probes
      if (combineModes.has('individual')) {
        selectedProbes.forEach(probeName => {
          const probePoints: Array<{trp: number, probe: number, probeName: string, name: string}> = [];
          channelData.forEach(r => {
            const probeValue = r[probeName as keyof TRPRecord] as number | null | undefined;
            if (isValidValue(probeValue)) {
              probePoints.push({
                trp: r.POC_TRP_dBm,
                probe: probeValue,
                probeName: `${channelPrefix}${probeName}`,
                name: `${r.Tech}-B${r.Band}-A${r.Antenna}`
              });
            }
          });
          if (probePoints.length >= 10) {
            allPoints.push(...probePoints);
          }
        });
      }
      
      // Linear average
      if (combineModes.has('linear') && selectedProbes.length > 0) {
        const linearPoints = channelData
          .map(r => {
            const probeValues = selectedProbes
              .map(p => r[p as keyof TRPRecord] as number | null)
              .filter(isValidValue);
            
            if (probeValues.length === 0) return null;
            const avgValue = calculateLinearAverage(probeValues);
            return avgValue !== null && isValidValue(avgValue) ? {
              trp: r.POC_TRP_dBm,
              probe: avgValue,
              probeName: `${channelPrefix}Linear Avg`,
              name: `${r.Tech}-B${r.Band}-A${r.Antenna}`
            } : null;
          })
          .filter(d => d !== null) as Array<{trp: number, probe: number, probeName: string, name: string}>;
        
        if (linearPoints.length >= 10) {
          allPoints.push(...linearPoints);
        }
      }
      
      // Linear average (top half)
      if (combineModes.has('linear_top_half') && selectedProbes.length > 0) {
        const topHalfPoints = channelData
          .map(r => {
            const probeValues = selectedProbes
              .map(p => r[p as keyof TRPRecord] as number | null)
              .filter(isValidValue);
            
            if (probeValues.length === 0) return null;
            // Sort and take top half
            const sorted = [...probeValues].sort((a, b) => b - a);
            const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
            const avgValue = calculateLinearAverage(topHalf);
            return avgValue !== null && isValidValue(avgValue) ? {
              trp: r.POC_TRP_dBm,
              probe: avgValue,
              probeName: `${channelPrefix}Linear Avg (Top Half)`,
              name: `${r.Tech}-B${r.Band}-A${r.Antenna}`
            } : null;
          })
          .filter(d => d !== null) as Array<{trp: number, probe: number, probeName: string, name: string}>;
        
        
        if (topHalfPoints.length >= 10) {
          allPoints.push(...topHalfPoints);
        }
      }
      
      // dB average
      if (combineModes.has('db') && selectedProbes.length > 0) {
        const dbPoints = channelData
          .map(r => {
            const probeValues = selectedProbes
              .map(p => r[p as keyof TRPRecord] as number | null)
              .filter(isValidValue);
            
            if (probeValues.length === 0) return null;
            const avgValue = probeValues.reduce((sum, v) => sum + v, 0) / probeValues.length;
            return avgValue !== null && isValidValue(avgValue) ? {
              trp: r.POC_TRP_dBm,
              probe: avgValue,
              probeName: `${channelPrefix}dB Avg`,
              name: `${r.Tech}-B${r.Band}-A${r.Antenna}`
            } : null;
          })
          .filter(d => d !== null) as Array<{trp: number, probe: number, probeName: string, name: string}>;
        
        if (dbPoints.length >= 10) {
          allPoints.push(...dbPoints);
        }
      }
      
      // Best 2-probe combo
      if (combineModes.has('best_2_probe') && selectedProbes.length >= 2) {
        let bestR2 = 0;
        let bestProbePoints: Array<{trp: number, probe: number, probeName: string, name: string}> = [];
        
        // Try all 2-probe combinations with different weights
        for (let i = 0; i < selectedProbes.length; i++) {
          for (let j = i + 1; j < selectedProbes.length; j++) {
            const probe1 = selectedProbes[i];
            const probe2 = selectedProbes[j];
            
            // Try different weight ratios
            for (let w1 = 0.1; w1 <= 0.9; w1 += 0.1) {
              const w2 = 1 - w1;
              
              const points = channelData
                .map(r => {
                  const v1 = r[probe1 as keyof TRPRecord] as number | null;
                  const v2 = r[probe2 as keyof TRPRecord] as number | null;
                  
                  if (!isValidValue(v1) || !isValidValue(v2)) return null;
                  
                  const linear1 = Math.pow(10, v1 / 10);
                  const linear2 = Math.pow(10, v2 / 10);
                  const weightedAvg = w1 * linear1 + w2 * linear2;
                  const dbValue = 10 * Math.log10(weightedAvg);
                  
                  return {
                    trp: r.POC_TRP_dBm,
                    probe: dbValue,
                    probeName: `${channelPrefix}Best 2-Probe`,
                    name: `${r.Tech}-B${r.Band}-A${r.Antenna}`,
                    x: dbValue,
                    y: r.POC_TRP_dBm
                  };
                })
                .filter(p => p !== null) as Array<{trp: number, probe: number, probeName: string, name: string, x: number, y: number}>;
              
              if (points.length >= 10) {
                const regressionPoints = points.map(p => ({x: p.x, y: p.y}));
                const regression = calculateLinearRegression(regressionPoints);
                if (regression && regression.rSquared > bestR2) {
                  bestR2 = regression.rSquared;
                  bestProbePoints = points;
                }
              }
            }
          }
        }
        
        if (bestProbePoints.length >= 10) {
          allPoints.push(...bestProbePoints);
        }
      }
    }
    
    return allPoints;
  }, [filteredData, selectedProbes, combineModes, selectedChannel]);
  
  const probeNames = metadata?.probeColumns || [];
  
  // Antenna analysis data - R² across all band/channel combinations for selected antenna
  const antennaAnalysisData = useMemo(() => {
    if (selectedAntenna === "all" || !data.length) return [];
    
    const antennaData = data.filter(r => r.Antenna === parseInt(selectedAntenna));
    const bandChannelCombos = Array.from(new Set(antennaData.map(r => `Band ${r.Band} - Ch ${r.Channel}`)));
    
    const isValidValue = (val: number | null | undefined): val is number => {
      return val !== null && val !== undefined && val > -100;
    };
    
    return bandChannelCombos
      .map(combo => {
        const [bandPart, chPart] = combo.split(' - ');
        const band = parseInt(bandPart.replace('Band ', ''));
        const channel = parseInt(chPart.replace('Ch ', ''));
        
        const comboData = antennaData.filter(r => r.Band === band && r.Channel === channel);
        
        // Skip if less than 10 data points
        if (comboData.length < 10) return null;
        
        const result: any = { combo, dataPoints: comboData.length };
      
      // Calculate R² for each selected probe (only if 10+ valid data points)
      selectedProbes.forEach(probe => {
        const points = comboData
          .map(r => {
            const probeValue = r[probe as keyof TRPRecord] as number | null;
            return isValidValue(probeValue) ? { x: probeValue, y: r.POC_TRP_dBm } : null;
          })
          .filter(p => p !== null) as Array<{x: number, y: number}>;
        
        // Only calculate regression if we have 10+ data points
        if (points.length >= 10) {
          const regression = calculateLinearRegression(points);
          result[probe] = regression ? regression.rSquared : null;
        } else {
          result[probe] = null; // Mark as insufficient data
        }
      });
      
      // Calculate R² for linear power average
      const linearPoints = comboData
        .map(r => {
          const probeValues = selectedProbes
            .map(p => r[p as keyof TRPRecord] as number | null)
            .filter(isValidValue);
          
          if (probeValues.length === 0) return null;
          const avgValue = calculateLinearAverage(probeValues);
          return avgValue !== null && isValidValue(avgValue) ? {
            x: avgValue,
            y: r.POC_TRP_dBm
          } : null;
        })
        .filter(p => p !== null) as Array<{x: number, y: number}>;
      
      const linearRegression = calculateLinearRegression(linearPoints);
      result['Linear Avg'] = linearRegression ? linearRegression.rSquared : 0;
      
      // Calculate R² for dB average
      const dbPoints = comboData
        .map(r => {
          const probeValues = selectedProbes
            .map(p => r[p as keyof TRPRecord] as number | null)
            .filter(isValidValue);
          
          if (probeValues.length === 0) return null;
          const avgValue = probeValues.reduce((sum, v) => sum + v, 0) / probeValues.length;
          return isValidValue(avgValue) ? {
            x: avgValue,
            y: r.POC_TRP_dBm
          } : null;
        })
        .filter(p => p !== null) as Array<{x: number, y: number}>;
      
      const dbRegression = calculateLinearRegression(dbPoints);
      result['dB Avg'] = dbRegression ? dbRegression.rSquared : 0;
      
      // Calculate R² for linear average (top half)
      const topHalfPoints = comboData
        .map(r => {
          const probeValues = selectedProbes
            .map(p => r[p as keyof TRPRecord] as number | null)
            .filter(isValidValue);
          
          if (probeValues.length === 0) return null;
          // Sort and take top half
          const sorted = [...probeValues].sort((a, b) => b - a);
          const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
          const avgValue = calculateLinearAverage(topHalf);
          return avgValue !== null && isValidValue(avgValue) ? {
            x: avgValue,
            y: r.POC_TRP_dBm
          } : null;
        })
        .filter(p => p !== null) as Array<{x: number, y: number}>;
      
      const topHalfRegression = calculateLinearRegression(topHalfPoints);
      result['Linear Avg (Top Half)'] = topHalfRegression ? topHalfRegression.rSquared : 0;
      
      // Find best 2-probe weighted combination
      let bestComboR2 = 0;
      let bestComboProbes = '';
      let bestComboWeights = '';
      
      // Try all 2-probe combinations from selected probes
      for (let i = 0; i < selectedProbes.length; i++) {
        for (let j = i + 1; j < selectedProbes.length; j++) {
          const probe1 = selectedProbes[i];
          const probe2 = selectedProbes[j];
          
          // Try different weight combinations (0.1 to 0.9 in 0.1 steps)
          for (let w1 = 0.1; w1 <= 0.9; w1 += 0.1) {
            const w2 = 1 - w1;
            
            const weightedPoints = comboData
              .map(r => {
                const val1 = r[probe1 as keyof TRPRecord] as number | null;
                const val2 = r[probe2 as keyof TRPRecord] as number | null;
                
                if (!isValidValue(val1) || !isValidValue(val2)) return null;
                
                // Convert to linear, weight, sum, convert back to dB
                const linear1 = Math.pow(10, val1 / 10);
                const linear2 = Math.pow(10, val2 / 10);
                const weightedSum = w1 * linear1 + w2 * linear2;
                const weightedDb = 10 * Math.log10(weightedSum);
                
                return {
                  x: weightedDb,
                  y: r.POC_TRP_dBm
                };
              })
              .filter(p => p !== null) as Array<{x: number, y: number}>;
            
            if (weightedPoints.length >= 10) {
              const regression = calculateLinearRegression(weightedPoints);
              if (regression && regression.rSquared > bestComboR2) {
                bestComboR2 = regression.rSquared;
                bestComboProbes = `${probe1}+${probe2}`;
                bestComboWeights = `${(w1*100).toFixed(0)}%/${(w2*100).toFixed(0)}%`;
              }
            }
          }
        }
      }
      
      result['Best 2-Probe'] = bestComboR2 > 0 ? bestComboR2 : null;
      result['Best 2-Probe Combo'] = bestComboProbes || 'N/A';
      result['Best 2-Probe Weights'] = bestComboWeights || 'N/A';
      
      return result;
      })
      .filter(r => r !== null);
  }, [data, selectedAntenna, selectedProbes]);
  
  // Sorted antenna analysis data
  const sortedAntennaAnalysisData = useMemo(() => {
    if (!sortColumn) return antennaAnalysisData;
    
    return [...antennaAnalysisData].sort((a, b) => {
      const aVal = a[sortColumn] || 0;
      const bVal = b[sortColumn] || 0;
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [antennaAnalysisData, sortColumn, sortDirection]);
  
  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  const getBestProbeForRow = (row: any) => {
    const probeKeys = [...selectedProbes, 'Linear Avg', 'dB Avg'];
    let maxR2 = -1;
    let bestKey = '';
    
    probeKeys.forEach(key => {
      const r2 = row[key];
      // Skip null values (insufficient data)
      if (r2 !== null && r2 !== undefined && r2 > maxR2) {
        maxR2 = r2;
        bestKey = key;
      }
    });
    
    return bestKey;
  };
  
  const toggleProbe = (probe: string) => {
    setSelectedProbes(prev => 
      prev.includes(probe) 
        ? prev.filter(p => p !== probe)
        : [...prev, probe]
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-lg font-mono">LOADING DATA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header 
        className="border-b-2 border-primary relative overflow-hidden"
        style={{
          backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/ZGmxfkXEnWaidMwZMSjE1p/sandbox/EBdi2sHSqXk5MkbYeJnfxd-img-1_1770681877000_na1fn_aGVyby1hYnN0cmFjdC13YXZlcw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvWkdteGZrWEVuV2FpZE13Wk1TakUxcC9zYW5kYm94L0VCZGkyc0hTcVhrNU1rYlllSm5meGQtaW1nLTFfMTc3MDY4MTg3NzAwMF9uYTFmbl9hR1Z5YnkxaFluTjBjbUZqZEMxM1lYWmxjdy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=t1XaNaN5wRjw9AU-GK5sBsXsSbdqGCOsTZtJLF1iTdCfkqdd9aBXxpAPXY-PBoBQfnfKt6J8118-mvUhHNHcaouzrb2KBCPNVXYEfa-Q3SpkRKsz9pC~jD1v8lBYMfeTJsY6DlqDYfJn5HM3Cn3XQ9k7u8gEw0Rfyq34znyH1dFgzB02TOGHlT9VMum0iLbr-jPCzNE6QjmexfvHpnuvj-TnWmlFHxdM7W8pBU~g0psVlzlWi1GVcppt-5doHVc-a0K93qvJ2Ui3BLcdqmnAUCMXVRW8VSxUcpyyXEVJYZeS~7yAyE2qhNyLFW0dUtjCbnbLWFEJg2TlTGrpUGwinA__')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-background/90 backdrop-blur-sm">
          <div className="container py-6">
            <div className="flex items-center gap-4">
              <Database className="w-10 h-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-primary">TRP PROBE DATA ANALYZER</h1>
                <p className="text-sm text-muted-foreground font-sans mt-1">
                  Correlation analysis between Total Radiated Power and probe measurements
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-border bg-card">
              <CardHeader className="border-b-2 border-border">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Filter className="w-5 h-5" />
                  FILTERS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">TECHNOLOGY</Label>
                  <Select value={selectedTech} onValueChange={setSelectedTech}>
                    <SelectTrigger className="border-2 border-border bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Technologies</SelectItem>
                      {metadata?.technologies.map(tech => (
                        <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">BAND</Label>
                  <Select value={selectedBand} onValueChange={setSelectedBand}>
                    <SelectTrigger className="border-2 border-border bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bands</SelectItem>
                      {metadata?.bands.map(band => (
                        <SelectItem key={band} value={band.toString()}>Band {band}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">ANTENNA</Label>
                  <Select value={selectedAntenna} onValueChange={setSelectedAntenna}>
                    <SelectTrigger className="border-2 border-border bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Antennas</SelectItem>
                      {metadata?.antennas.map(ant => (
                        <SelectItem key={ant} value={ant.toString()}>Antenna {ant}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    CHANNEL {selectedBand !== "all" && `(Band ${selectedBand})`}
                  </Label>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="border-2 border-border bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {availableChannels.map(ch => (
                        <SelectItem key={ch} value={ch.toString()}>Ch {ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t-2 border-border">
                    <Label className="text-sm font-semibold text-foreground">PROBE SELECTION</Label>
                    <ScrollArea className="h-[200px] mt-2">
                      <div className="space-y-2">
                        {probeNames.map((probe: string) => (
                          <div key={probe} className="flex items-center space-x-2">
                            <Checkbox 
                              id={probe}
                              checked={selectedProbes.includes(probe)}
                              onCheckedChange={() => toggleProbe(probe)}
                              className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label 
                              htmlFor={probe} 
                              className="text-sm font-mono cursor-pointer hover:text-primary"
                            >
                              {probe}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="mt-4 pt-4 border-t-2 border-border">
                      <Label className="text-sm font-semibold text-foreground mb-2 block">COMBINE PROBES</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="combine-individual"
                            checked={combineModes.has('individual')}
                            onCheckedChange={(checked) => {
                              const newModes = new Set(combineModes);
                              if (checked) newModes.add('individual');
                              else newModes.delete('individual');
                              setCombineModes(newModes);
                            }}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor="combine-individual" className="text-sm font-mono cursor-pointer">
                            Individual Probes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="combine-linear"
                            checked={combineModes.has('linear')}
                            onCheckedChange={(checked) => {
                              const newModes = new Set(combineModes);
                              if (checked) newModes.add('linear');
                              else newModes.delete('linear');
                              setCombineModes(newModes);
                            }}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor="combine-linear" className="text-sm font-mono cursor-pointer">
                            Linear Power Avg
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="combine-db"
                            checked={combineModes.has('db')}
                            onCheckedChange={(checked) => {
                              const newModes = new Set(combineModes);
                              if (checked) newModes.add('db');
                              else newModes.delete('db');
                              setCombineModes(newModes);
                            }}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor="combine-db" className="text-sm font-mono cursor-pointer">
                            dB Average
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="combine-linear-top-half"
                            checked={combineModes.has('linear_top_half')}
                            onCheckedChange={(checked) => {
                              const newModes = new Set(combineModes);
                              if (checked) newModes.add('linear_top_half');
                              else newModes.delete('linear_top_half');
                              setCombineModes(newModes);
                            }}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor="combine-linear-top-half" className="text-sm font-mono cursor-pointer">
                            Linear Avg (Top Half)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="combine-best-2-probe"
                            checked={combineModes.has('best_2_probe')}
                            onCheckedChange={(checked) => {
                              const newModes = new Set(combineModes);
                              if (checked) newModes.add('best_2_probe');
                              else newModes.delete('best_2_probe');
                              setCombineModes(newModes);
                            }}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor="combine-best-2-probe" className="text-sm font-mono cursor-pointer">
                            Best 2-Probe Combo
                          </Label>
                        </div>
                      </div>
                    </div>
                </div>

                <Button 
                  onClick={() => {
                    setSelectedTech("all");
                    setSelectedBand("all");
                    setSelectedAntenna("all");
                    setSelectedChannel("all");
                    setSelectedProbes(["Probe_01", "Probe_02", "Probe_03"]);
                    setCombineModes(new Set<'individual' | 'linear' | 'db'>(['individual']));
                  }}
                  variant="outline"
                  className="w-full border-2"
                >
                  RESET FILTERS
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 border-primary bg-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">FILTERED RECORDS</p>
                    <p className="text-4xl font-bold text-primary">{filteredData.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-border bg-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">SELECTED PROBES</p>
                    <p className="text-4xl font-bold text-foreground">{selectedProbes.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-border bg-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">AVG R²</p>
                    <p className="text-4xl font-bold text-foreground">
                      {correlationData.length > 0 
                        ? (correlationData.reduce((sum, c) => sum + c.correlation, 0) / correlationData.length).toFixed(3)
                        : "N/A"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visualizations */}
            <Tabs defaultValue="correlation" className="w-full">
              <TabsList className="grid w-full grid-cols-4 border-2 border-border bg-secondary">
                <TabsTrigger value="correlation" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                  CORRELATION
                </TabsTrigger>
                <TabsTrigger value="scatter" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                  SCATTER PLOT
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                  HEATMAP
                </TabsTrigger>
                <TabsTrigger value="data" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                  RAW DATA
                </TabsTrigger>
                {selectedAntenna !== "all" && (
                  <TabsTrigger value="antenna-analysis" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                    ANTENNA ANALYSIS
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="correlation" className="mt-6">
                <Card className="border-2 border-border bg-card">
                  <CardHeader className="border-b-2 border-border">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      R² VALUES (COEFFICIENT OF DETERMINATION)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={correlationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis 
                          dataKey="probe" 
                          stroke="#ffffff"
                          style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#ffffff"
                          style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                          domain={[0, 1]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#2a2a2a', 
                            border: '2px solid #00d9ff',
                            fontFamily: 'JetBrains Mono',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => value.toFixed(4)}
                        />
                        <Bar dataKey="correlation" fill="#00d9ff">
                          {correlationData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`}
                              fill={entry.correlation > 0.7 ? '#00d9ff' : entry.correlation > 0.4 ? '#ffb84d' : '#6b7280'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scatter" className="mt-6">
                <Card className="border-2 border-border bg-card">
                  <CardHeader className="border-b-2 border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        TRP vs PROBE SCATTER
                      </CardTitle>

                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {regressionData.length > 0 && (
                      <div className="mb-4 p-4 bg-muted/30 border border-border rounded">
                        <div className="text-sm font-mono">
                          <div className="font-bold mb-2">Linear Regression Results:</div>
                          {regressionData.map((reg) => (
                            <div key={reg.probeName} className="flex justify-between items-center py-1">
                              <span className="text-cyan-400">{reg.probeName}:</span>
                              <span>
                                <span className="text-muted-foreground">y = </span>
                                <span className="text-amber-400">{reg.regression.slope.toFixed(4)}</span>
                                <span className="text-muted-foreground">x + </span>
                                <span className="text-amber-400">{reg.regression.intercept.toFixed(4)}</span>
                                <span className="text-muted-foreground"> | R² = </span>
                                <span className={reg.regression.rSquared > 0.7 ? "text-green-400" : reg.regression.rSquared > 0.4 ? "text-amber-400" : "text-gray-400"}>
                                  {reg.regression.rSquared.toFixed(4)}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis 
                          type="number" 
                          dataKey="probe" 
                          name="Probe Value"
                          stroke="#ffffff"
                          style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                          label={{ value: 'Probe Value (dBm)', position: 'insideBottom', offset: -5, fill: '#ffffff' }}
                          domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="trp" 
                          name="TRP"
                          stroke="#ffffff"
                          style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                          label={{ value: 'TRP (dBm)', angle: -90, position: 'insideLeft', fill: '#ffffff' }}
                          domain={['dataMin - 1', 'dataMax + 1']}
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ 
                            backgroundColor: '#2a2a2a', 
                            border: '2px solid #00d9ff',
                            fontFamily: 'JetBrains Mono',
                            fontSize: '12px'
                          }}
                          formatter={(value: number, name: string) => [
                            typeof value === 'number' ? value.toFixed(2) : value,
                            name === 'probe' ? 'Probe' : name === 'trp' ? 'TRP' : name
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                        />
                        {/* Render scatter points for all selected modes */}
                        {Array.from(new Set(scatterData.map(d => d.probeName))).map((probeName, idx) => {
                          const probeData = scatterData.filter(d => d.probeName === probeName);
                          const colors = ['#00d9ff', '#ffb84d', '#ff8c42', '#00a8cc', '#6dd4a8', '#b8a4e8', '#ff6b9d', '#c780fa'];
                          return (
                            <Scatter 
                              key={probeName}
                              name={probeName} 
                              data={probeData} 
                              fill={colors[idx % colors.length]}
                            />
                          );
                        })}
                        {regressionData.map((reg) => (
                          <ReferenceLine
                            key={`ref-${reg.probeName}`}
                            segment={[
                              { x: reg.lineData[0].probe, y: reg.lineData[0].trp },
                              { x: reg.lineData[1].probe, y: reg.lineData[1].trp }
                            ]}
                            stroke="#ff3366"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            ifOverflow="extendDomain"
                          />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="heatmap">
                <Card className="border-2 border-border bg-card">
                  <CardHeader className="border-b-2 border-border">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      PROBE POWER HEATMAP
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Heatmap showing probe value distribution. X-axis shows probe numbers, Y-axis shows probe values. Color intensity indicates frequency of values.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {(() => {
                      // If "All Channels" is selected, group by channel
                      const shouldGroupByChannel = selectedChannel === "all";
                      const channelsToProcess = shouldGroupByChannel 
                        ? Array.from(new Set(filteredData.map(r => r.Channel))).sort((a, b) => a - b).filter(ch => filteredData.filter(r => r.Channel === ch).length >= 10)
                        : [null];
                      
                      // Get all probe values for heatmap (with channel grouping)
                      const allProbeValues: { [key: string]: number[] } = {};
                      const probeLabels: string[] = [];
                      
                      for (const channel of channelsToProcess) {
                        const channelData = shouldGroupByChannel && channel !== null
                          ? filteredData.filter(r => r.Channel === channel)
                          : filteredData;
                        
                        const channelPrefix = shouldGroupByChannel && channel !== null ? `Ch${channel}-` : '';
                        
                        selectedProbes.forEach(probe => {
                          const probeLabel = `${channelPrefix}${probe}`;
                          probeLabels.push(probeLabel);
                          
                          channelData.forEach(record => {
                            const value = record[probe as keyof TRPRecord];
                            if (typeof value === 'number' && value > -9000) {
                              if (!allProbeValues[probeLabel]) allProbeValues[probeLabel] = [];
                              allProbeValues[probeLabel].push(value);
                            }
                          });
                        });
                      }
                      
                      // Find global min/max for Y-axis
                      const allValues = Object.values(allProbeValues).flat();
                      if (allValues.length === 0) {
                        return <p className="text-muted-foreground">No data available for selected probes</p>;
                      }
                      
                      const globalMin = Math.min(...allValues);
                      const globalMax = Math.max(...allValues);
                      const yBins = 30;
                      const yStep = (globalMax - globalMin) / yBins;
                      
                      // Create heatmap data
                      const heatmapData: any[] = [];
                      probeLabels.forEach((probeLabel, probeIdx) => {
                        const probeVals = allProbeValues[probeLabel] || [];
                        if (probeVals.length === 0) return;
                        
                        for (let i = 0; i < yBins; i++) {
                          const yStart = globalMin + i * yStep;
                          const yEnd = yStart + yStep;
                          
                          const count = probeVals.filter(v => v >= yStart && v < yEnd).length;
                          
                          if (count > 0) {
                            heatmapData.push({
                              x: probeIdx,
                              y: (yStart + yEnd) / 2,
                              value: count,
                              probeName: probeLabel
                            });
                          }
                        }
                      });
                      
                      const maxCount = Math.max(...heatmapData.map(d => d.value));
                      
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={500}>
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 80, left: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                              <XAxis 
                                type="number" 
                                dataKey="x" 
                                name="Probe"
                                stroke="#ffffff"
                                style={{ fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                                label={{ value: 'Probe Number', position: 'insideBottom', offset: -15, fill: '#ffffff' }}
                                domain={[-0.5, probeLabels.length - 0.5]}
                                ticks={probeLabels.map((_, idx) => idx)}
                                tickFormatter={(value) => probeLabels[value] || ''}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis 
                                type="number" 
                                dataKey="y" 
                                name="Probe Value"
                                stroke="#ffffff"
                                style={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                                label={{ value: 'Probe Value (dBm)', angle: -90, position: 'insideLeft', fill: '#ffffff' }}
                                domain={[globalMin - 1, globalMax + 1]}
                              />
                              <Tooltip 
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ 
                                  backgroundColor: '#2a2a2a', 
                                  border: '2px solid #00d9ff',
                                  fontFamily: 'JetBrains Mono',
                                  fontSize: '11px'
                                }}
                                formatter={(value: any, name: string, props: any) => {
                                  if (name === 'value') return [value, 'Count'];
                                  if (name === 'Probe') return [props.payload.probeName, 'Probe'];
                                  return [typeof value === 'number' ? value.toFixed(2) : value, name];
                                }}
                              />
                              <Scatter data={heatmapData}>
                                {heatmapData.map((entry, index) => {
                                  const intensity = entry.value / maxCount;
                                  const color = `rgba(0, 217, 255, ${0.2 + intensity * 0.8})`;
                                  return (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={color}
                                    />
                                  );
                                })}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Total data points: {allValues.length}</span>
                            <div className="flex items-center gap-2">
                              <span>Low frequency</span>
                              <div className="w-24 h-3 bg-gradient-to-r from-cyan-400/20 to-cyan-400" />
                              <span>High frequency</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="data" className="mt-6">
                <Card className="border-2 border-border bg-card">
                  <CardHeader className="border-b-2 border-border">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      FILTERED DATA TABLE
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[500px]">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>SERIAL</th>
                            <th>TECH</th>
                            <th>BAND</th>
                            <th>CH</th>
                            <th>ANT</th>
                            <th>TRP</th>
                            {selectedProbes.map(probe => (
                              <th key={probe}>{probe}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.slice(0, 100).map((record, idx) => (
                            <tr key={idx}>
                              <td className="text-xs">{record.SerialNumber}</td>
                              <td>{record.Tech}</td>
                              <td>{record.Band}</td>
                              <td>{record.Channel}</td>
                              <td>{record.Antenna}</td>
                              <td className="text-primary font-semibold">{record.POC_TRP_dBm}</td>
                              {selectedProbes.map(probe => (
                                <td key={probe}>
                                  {record[probe as keyof TRPRecord] !== null 
                                    ? (record[probe as keyof TRPRecord] as number).toFixed(2)
                                    : 'N/A'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredData.length > 100 && (
                        <p className="text-center text-muted-foreground text-sm mt-4">
                          Showing first 100 of {filteredData.length} records
                        </p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {selectedAntenna !== "all" && (
                <TabsContent value="antenna-analysis" className="mt-6">
                  <Card className="border-2 border-border bg-card max-w-full">
                    <CardHeader className="border-b-2 border-border">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        ANTENNA {selectedAntenna} R² ANALYSIS ACROSS BANDS & CHANNELS
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Comparing R² values for individual probes vs. combined averages (showing only band-channel combinations with ≥10 data points)
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="highlight-best" 
                          checked={highlightBest}
                          onChange={(e) => setHighlightBest(e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="highlight-best" className="text-sm font-medium cursor-pointer">
                          Highlight Best R² in Each Row
                        </label>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 p-0">
                      <p className="text-xs text-muted-foreground px-4 pb-2">Scroll horizontally to view all probe columns →</p>
                      <div className="overflow-x-scroll overflow-y-auto h-[900px] w-full border-t border-border">
                        <table className="data-table" style={{minWidth: 'max-content'}}>
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-card z-10">BAND-CHANNEL</th>
                              <th className="sticky left-[140px] bg-card z-10">N</th>
                              {selectedProbes.map(probe => (
                                <th 
                                  key={probe} 
                                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                                  onClick={() => handleColumnSort(probe)}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {probe}
                                    {sortColumn === probe && (
                                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                                    )}
                                  </div>
                                </th>
                              ))}
                              <th 
                                className="bg-primary/20 cursor-pointer hover:bg-primary/30 transition-colors"
                                onClick={() => handleColumnSort('Linear Avg')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  LINEAR AVG
                                  {sortColumn === 'Linear Avg' && (
                                    <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th 
                                className="bg-primary/20 cursor-pointer hover:bg-primary/30 transition-colors"
                                onClick={() => handleColumnSort('dB Avg')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  dB AVG
                                  {sortColumn === 'dB Avg' && (
                                    <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th 
                                className="bg-primary/20 cursor-pointer hover:bg-primary/30 transition-colors"
                                onClick={() => handleColumnSort('Linear Avg (Top Half)')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  TOP HALF
                                  {sortColumn === 'Linear Avg (Top Half)' && (
                                    <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th 
                                className="bg-primary/20 cursor-pointer hover:bg-primary/30 transition-colors"
                                onClick={() => handleColumnSort('Best 2-Probe')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  BEST 2-PROBE R²
                                  {sortColumn === 'Best 2-Probe' && (
                                    <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th className="bg-primary/20">
                                <div className="flex items-center justify-center gap-1">
                                  PROBES
                                </div>
                              </th>
                              <th className="bg-primary/20">
                                <div className="flex items-center justify-center gap-1">
                                  WEIGHTS
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedAntennaAnalysisData.map((row, idx) => {
                              const bestProbe = getBestProbeForRow(row);
                              return (
                              <tr key={idx}>
                                <td className="sticky left-0 bg-card z-10 font-semibold">{row.combo}</td>
                                <td className="sticky left-[140px] bg-card z-10 text-xs text-muted-foreground">{row.dataPoints}</td>
                                {selectedProbes.map(probe => {
                                  const r2 = row[probe];
                                  const isBest = highlightBest && bestProbe === probe;
                                  
                                  // If r2 is null, it means insufficient data (<10 points)
                                  if (r2 === null) {
                                    return (
                                      <td key={probe} className="text-xs text-muted-foreground italic">
                                        N/A
                                      </td>
                                    );
                                  }
                                  
                                  return (
                                    <td 
                                      key={probe}
                                      style={{
                                        backgroundColor: isBest ? 'rgba(0, 255, 0, 0.3)' : (r2 > 0.7 ? 'rgba(0, 217, 255, 0.2)' : r2 > 0.4 ? 'rgba(255, 184, 77, 0.2)' : 'transparent'),
                                        fontWeight: isBest ? 'bold' : 'normal'
                                      }}
                                    >
                                      {r2.toFixed(3)}
                                    </td>
                                  );
                                })}
                                <td 
                                  className="font-semibold"
                                  style={{
                                    backgroundColor: (highlightBest && bestProbe === 'Linear Avg') ? 'rgba(0, 255, 0, 0.3)' : (row['Linear Avg'] > 0.7 ? 'rgba(0, 217, 255, 0.3)' : row['Linear Avg'] > 0.4 ? 'rgba(255, 184, 77, 0.3)' : 'rgba(107, 114, 128, 0.1)')
                                  }}
                                >
                                  {row['Linear Avg'].toFixed(3)}
                                </td>
                                <td 
                                  className="font-semibold"
                                  style={{
                                    backgroundColor: (highlightBest && bestProbe === 'dB Avg') ? 'rgba(0, 255, 0, 0.3)' : (row['dB Avg'] > 0.7 ? 'rgba(0, 217, 255, 0.3)' : row['dB Avg'] > 0.4 ? 'rgba(255, 184, 77, 0.3)' : 'rgba(107, 114, 128, 0.1)')
                                  }}
                                >
                                  {row['dB Avg'].toFixed(3)}
                                </td>
                                <td 
                                  className="font-semibold"
                                  style={{
                                    backgroundColor: (highlightBest && bestProbe === 'Linear Avg (Top Half)') ? 'rgba(0, 255, 0, 0.3)' : (row['Linear Avg (Top Half)'] > 0.7 ? 'rgba(0, 217, 255, 0.3)' : row['Linear Avg (Top Half)'] > 0.4 ? 'rgba(255, 184, 77, 0.3)' : 'rgba(107, 114, 128, 0.1)')
                                  }}
                                >
                                  {row['Linear Avg (Top Half)'].toFixed(3)}
                                </td>
                                <td 
                                  className="font-semibold"
                                  style={{
                                    backgroundColor: (highlightBest && bestProbe === 'Best 2-Probe') ? 'rgba(0, 255, 0, 0.3)' : (row['Best 2-Probe'] && row['Best 2-Probe'] > 0.7 ? 'rgba(0, 217, 255, 0.3)' : row['Best 2-Probe'] && row['Best 2-Probe'] > 0.4 ? 'rgba(255, 184, 77, 0.3)' : 'rgba(107, 114, 128, 0.1)')
                                  }}
                                >
                                  {row['Best 2-Probe'] ? row['Best 2-Probe'].toFixed(3) : 'N/A'}
                                </td>
                                <td className="text-xs font-mono">
                                  {row['Best 2-Probe Combo']}
                                </td>
                                <td className="text-xs font-mono">
                                  {row['Best 2-Probe Weights']}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
