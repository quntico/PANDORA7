
export function useFinancialCalculations() {
  const calculateNPV = (cashFlows, discountRate) => {
    return cashFlows.reduce((npv, cashFlow, period) => {
      return npv + cashFlow / Math.pow(1 + discountRate, period);
    }, 0);
  };

  const calculateIRR = (cashFlows, iterations = 100) => {
    let rate = 0.1;
    const tolerance = 0.0001;
    
    for (let i = 0; i < iterations; i++) {
      const npv = calculateNPV(cashFlows, rate);
      const npvDerivative = cashFlows.reduce((sum, cf, period) => {
        return sum - (period * cf) / Math.pow(1 + rate, period + 1);
      }, 0);
      
      const newRate = rate - npv / npvDerivative;
      
      if (Math.abs(newRate - rate) < tolerance) {
        return newRate;
      }
      
      rate = newRate;
    }
    
    return rate;
  };

  const calculatePaybackPeriod = (cashFlows) => {
    let cumulative = 0;
    
    for (let i = 0; i < cashFlows.length; i++) {
      cumulative += cashFlows[i];
      if (cumulative >= 0) {
        const fraction = -cumulative / cashFlows[i];
        return i + fraction;
      }
    }
    
    return null;
  };

  const calculateDiscountedPayback = (cashFlows, discountRate) => {
    let cumulative = 0;
    
    for (let i = 0; i < cashFlows.length; i++) {
      const discountedCF = cashFlows[i] / Math.pow(1 + discountRate, i);
      cumulative += discountedCF;
      if (cumulative >= 0) {
        return i;
      }
    }
    
    return null;
  };

  const calculateEBITDA = (revenue, operatingExpenses) => {
    return revenue - operatingExpenses;
  };

  const calculateBreakEven = (fixedCosts, pricePerUnit, variableCostPerUnit) => {
    return fixedCosts / (pricePerUnit - variableCostPerUnit);
  };

  const generateCashFlows = (metrics, projectType, years = 5) => {
    const cashFlows = [];
    
    switch (projectType) {
      case 'SaaS':
        cashFlows.push(-metrics.initialInvestment);
        for (let year = 1; year <= years; year++) {
          const mrr = metrics.mrr * Math.pow(1 + metrics.growthRate, year);
          const revenue = mrr * 12;
          const cac = metrics.cac * (mrr / metrics.mrr);
          const opex = revenue * 0.3;
          cashFlows.push(revenue - cac - opex);
        }
        break;
        
      case 'Industrial':
        cashFlows.push(-metrics.capex);
        for (let year = 1; year <= years; year++) {
          const revenue = metrics.productionCapacity * metrics.pricePerUnit * metrics.efficiency;
          const opex = metrics.opex * Math.pow(1.05, year - 1);
          cashFlows.push(revenue - opex);
        }
        break;
        
      case 'Real Estate':
        cashFlows.push(-metrics.propertyCost);
        for (let year = 1; year <= years; year++) {
          const rental = metrics.rentalIncome * 12 * metrics.occupancyRate;
          const appreciation = metrics.propertyCost * Math.pow(1 + metrics.appreciationRate, year) - metrics.propertyCost;
          const maintenance = metrics.propertyCost * 0.02;
          cashFlows.push(rental + (year === years ? appreciation : 0) - maintenance);
        }
        break;
        
      case 'Energy':
        cashFlows.push(-metrics.installationCost);
        for (let year = 1; year <= years; year++) {
          const output = metrics.annualOutput * metrics.efficiency * Math.pow(0.99, year - 1);
          const revenue = output * metrics.pricePerKwh;
          const maintenance = metrics.maintenanceCost * Math.pow(1.03, year - 1);
          cashFlows.push(revenue - maintenance);
        }
        break;
        
      case 'Infrastructure':
        cashFlows.push(-metrics.projectCost);
        for (let year = 1; year <= years; year++) {
          const revenue = metrics.annualRevenue * metrics.utilizationRate * Math.pow(1.05, year - 1);
          const maintenance = metrics.maintenanceCost * Math.pow(1.04, year - 1);
          cashFlows.push(revenue - maintenance);
        }
        break;
        
      case 'Commercial':
        cashFlows.push(-metrics.setupCost);
        for (let year = 1; year <= years; year++) {
          const revenue = metrics.monthlyRevenue * 12 * Math.pow(1 + metrics.growthRate, year - 1);
          const opex = metrics.operatingCosts * 12 * Math.pow(1.05, year - 1);
          cashFlows.push(revenue - opex);
        }
        break;
        
      default:
        cashFlows.push(-metrics.initialInvestment);
        for (let year = 1; year <= years; year++) {
          cashFlows.push(metrics.initialInvestment * 0.2);
        }
    }
    
    return cashFlows;
  };

  return {
    calculateNPV,
    calculateIRR,
    calculatePaybackPeriod,
    calculateDiscountedPayback,
    calculateEBITDA,
    calculateBreakEven,
    generateCashFlows
  };
}
