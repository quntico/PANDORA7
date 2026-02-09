import { useMemo } from 'react';

export function useFlowSimulation(nodes, edges) {
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

        // 3. Calcular costos operativos (tarifa eléctrica: $0.15/kWh)
        const electricityRate = 0.15;
        const costPerHour = totalPower * electricityRate;
        const costPerDay = costPerHour * 24;
        const costPerMonth = costPerDay * 30;

        // 4. Calcular producción estimada
        const avgEfficiency = nodes.length > 0
            ? nodes.reduce((sum, node) => sum + (node.data.efficiency || 100), 0) / nodes.length
            : 100;

        const effectiveCapacity = bottleneck * (avgEfficiency / 100);
        const productionPerShift = effectiveCapacity * 8; // 8 horas
        const productionPerDay = effectiveCapacity * 24; // 24 horas
        const productionPerMonth = productionPerDay * 30; // 30 días

        // 5. Calcular ingresos (precio por kg: $2.50)
        const pricePerKg = 2.5;
        const revenuePerMonth = productionPerMonth * pricePerKg;

        // 6. Calcular inversión total
        const totalInvestment = nodes.reduce((sum, node) => {
            return sum + (node.data.cost || 0);
        }, 0);

        // 7. Calcular ROI
        const netProfitPerMonth = revenuePerMonth - costPerMonth;
        const roi = totalInvestment > 0
            ? (netProfitPerMonth / totalInvestment) * 100
            : 0;

        return {
            bottleneck: Math.round(bottleneck),
            bottleneckNode: bottleneckNodeName,
            totalPower: Math.round(totalPower * 10) / 10,
            costPerHour: Math.round(costPerHour * 100) / 100,
            costPerDay: Math.round(costPerDay * 100) / 100,
            costPerMonth: Math.round(costPerMonth * 100) / 100,
            productionPerShift: Math.round(productionPerShift),
            productionPerDay: Math.round(productionPerDay),
            productionPerMonth: Math.round(productionPerMonth),
            revenuePerMonth: Math.round(revenuePerMonth * 100) / 100,
            roi: Math.round(roi * 10) / 10,
        };
    }, [nodes, edges]);
}
