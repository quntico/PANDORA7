import { useMemo } from 'react';

export function useFlowSimulation(nodes, edges, config = {}) {
    // Default config values
    const {
        electricityRate = 0.15,
        pricePerKg = 2.5,
        daysPerMonth = 30,
        hoursPerShift = 8,
        shiftsPerDay = 3, // Default to continuous operation (3 shifts of 8h)
        rawMaterialCost = 0, // Default 0
        operatorCost = 0,
        operatorCount = 0
    } = config;

    return useMemo(() => {
        if (!nodes || nodes.length === 0) {
            return {
                bottleneck: 0,
                bottleneckNode: null,
                totalPower: 0,
                costPerHour: 0,
                costPerDay: 0,
                costPerMonth: 0,
                productionPerShift: 0,
                productionPerDay: 0,
                productionPerMonth: 0,
                roi: 0,
            };
        }

        // 1. Calcular cuello de botella (capacidad mínima)
        let minCapacity = Infinity;
        let bottleneckNodeName = null;

        nodes.forEach((node) => {
            const capacity = node.data.capacity || 0;
            if (capacity > 0 && capacity < minCapacity) {
                minCapacity = capacity;
                bottleneckNodeName = node.data.name;
            }
        });

        const bottleneck = minCapacity === Infinity ? 0 : minCapacity;

        // 2. Calcular consumo total de energía
        const totalPower = nodes.reduce((sum, node) => {
            return sum + (node.data.power || 0);
        }, 0);

        // 3. Calcular producción estimada based on operation time
        const avgEfficiency = nodes.length > 0
            ? nodes.reduce((sum, node) => sum + (node.data.efficiency || 100), 0) / nodes.length
            : 100;

        const effectiveCapacity = bottleneck * (avgEfficiency / 100);

        // Operación diaria basada en turnos
        const dailyHours = hoursPerShift * shiftsPerDay;

        const productionPerShift = effectiveCapacity * hoursPerShift;
        const productionPerDay = effectiveCapacity * dailyHours;
        const productionPerMonth = productionPerDay * daysPerMonth;

        // 4. Calcular costos operativos
        // Costo Eléctrico
        const elecCostPerHour = totalPower * electricityRate;
        const elecCostPerMonth = elecCostPerHour * dailyHours * daysPerMonth;

        // Costo Materia Prima
        const rawMatCostPerHour = effectiveCapacity * rawMaterialCost;
        const rawMatCostPerMonth = productionPerMonth * rawMaterialCost;

        // Costo Mano de Obra
        const laborCostPerMonth = operatorCost * operatorCount;

        const totalCostPerMonth = elecCostPerMonth + rawMatCostPerMonth + laborCostPerMonth;
        const totalCostPerDay = totalCostPerMonth / daysPerMonth;
        const totalCostPerHour = (dailyHours > 0) ? (totalCostPerDay / dailyHours) : 0;

        // 5. Calcular ingresos
        const revenuePerMonth = productionPerMonth * pricePerKg;

        // 6. Calcular inversión total
        const totalInvestment = nodes.reduce((sum, node) => {
            return sum + (node.data.cost || 0);
        }, 0);

        // 7. Calcular ROI
        const netProfitPerMonth = revenuePerMonth - totalCostPerMonth;
        const roi = totalInvestment > 0
            ? (netProfitPerMonth / totalInvestment) * 100
            : 0;

        return {
            bottleneck: Math.round(bottleneck),
            bottleneckNode: bottleneckNodeName,
            totalPower: Math.round(totalPower * 10) / 10,
            costPerHour: Math.round(totalCostPerHour * 100) / 100, // Now includes Raw Material & Labor
            costPerDay: Math.round(totalCostPerDay * 100) / 100,
            costPerMonth: Math.round(totalCostPerMonth * 100) / 100,
            productionPerShift: Math.round(productionPerShift),
            productionPerDay: Math.round(productionPerDay),
            productionPerMonth: Math.round(productionPerMonth),
            revenuePerMonth: Math.round(revenuePerMonth * 100) / 100,
            netProfitPerMonth: Math.round(netProfitPerMonth * 100) / 100,
            netProfitPerDay: Math.round((netProfitPerMonth / daysPerMonth) * 100) / 100,
            roi: Math.round(roi * 10) / 10,
        };
    }, [nodes, edges, electricityRate, pricePerKg, daysPerMonth, hoursPerShift, shiftsPerDay, rawMaterialCost, operatorCost, operatorCount]);
}
