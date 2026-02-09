
export function useContextEngine() {
  const detectProjectType = (description) => {
    const lowerDesc = description.toLowerCase();
    
    const typeKeywords = {
      'SaaS': ['saas', 'software', 'subscription', 'cloud', 'platform', 'app', 'digital', 'online service'],
      'Industrial': ['factory', 'manufacturing', 'production', 'industrial', 'plant', 'machinery', 'assembly'],
      'Real Estate': ['property', 'real estate', 'building', 'rental', 'housing', 'apartment', 'commercial space'],
      'Energy': ['solar', 'wind', 'energy', 'renewable', 'power plant', 'electricity', 'green energy'],
      'Infrastructure': ['infrastructure', 'road', 'bridge', 'port', 'airport', 'railway', 'public works'],
      'Commercial': ['retail', 'store', 'shop', 'restaurant', 'cafe', 'commerce', 'business']
    };
    
    let maxScore = 0;
    let detectedType = 'Commercial';
    
    Object.entries(typeKeywords).forEach(([type, keywords]) => {
      const score = keywords.filter(keyword => lowerDesc.includes(keyword)).length;
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    });
    
    return detectedType;
  };

  const detectMaturity = (description, currentStage) => {
    if (currentStage) return currentStage;
    
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('idea') || lowerDesc.includes('concept') || lowerDesc.includes('planning')) {
      return 'Idea';
    }
    
    if (lowerDesc.includes('prototype') || lowerDesc.includes('mvp') || lowerDesc.includes('validated') || lowerDesc.includes('testing')) {
      return 'Validated';
    }
    
    if (lowerDesc.includes('operating') || lowerDesc.includes('revenue') || lowerDesc.includes('customers') || lowerDesc.includes('running')) {
      return 'In Operation';
    }
    
    return 'Idea';
  };

  const calculateInvestmentHorizon = (timeline) => {
    if (timeline <= 12) return 'Short-term (< 1 year)';
    if (timeline <= 36) return 'Medium-term (1-3 years)';
    return 'Long-term (> 3 years)';
  };

  const assessRiskLevel = (projectType, maturity, investmentAmount) => {
    let riskScore = 0;
    
    // Project type risk
    const typeRisk = {
      'SaaS': 2,
      'Industrial': 4,
      'Real Estate': 3,
      'Energy': 3,
      'Infrastructure': 5,
      'Commercial': 2
    };
    riskScore += typeRisk[projectType] || 3;
    
    // Maturity risk
    const maturityRisk = {
      'Idea': 5,
      'Validated': 3,
      'In Operation': 1
    };
    riskScore += maturityRisk[maturity] || 3;
    
    // Investment size risk
    if (investmentAmount > 1000000) riskScore += 3;
    else if (investmentAmount > 100000) riskScore += 2;
    else riskScore += 1;
    
    // Normalize to risk level
    if (riskScore <= 4) return 'Low';
    if (riskScore <= 7) return 'Medium';
    if (riskScore <= 10) return 'High';
    return 'Very High';
  };

  const analyzeContext = (projectData) => {
    const type = detectProjectType(projectData.description || '');
    const maturity = detectMaturity(projectData.description || '', projectData.currentStage);
    const horizon = calculateInvestmentHorizon(projectData.timeline || 12);
    const risk = assessRiskLevel(type, maturity, projectData.investmentAmount || 0);
    
    return {
      type,
      maturity,
      investmentHorizon: horizon,
      riskLevel: risk
    };
  };

  return {
    detectProjectType,
    detectMaturity,
    calculateInvestmentHorizon,
    assessRiskLevel,
    analyzeContext
  };
}
