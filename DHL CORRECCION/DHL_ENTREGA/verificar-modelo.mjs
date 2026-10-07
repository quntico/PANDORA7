import assert from 'node:assert/strict';
import {normalizeDHLInputs,calculateDHLResults,DHL_MODEL_VERSION,DHL_YEAR_ASSUMPTIONS} from '../src/utils/dhlTenderModel.js';
const i=normalizeDHLInputs({hoursPerDay:9,daysPerMonth:24,clientName:'TOTEM',machineName:'PLD-120'},{loadFactor:85,electricityRate:2.5,waterCostM3:35});
assert.equal(i.hoursPerDay,8.5);assert.equal(i.daysPerMonth,248/12);assert.equal(i.cajas.length,11);assert.equal(i.machineName,'BWD-350 + BA + SWM-1000');assert.equal(i.clientName,'Francisco Louvier');
const r=calculateDHLResults(i);
const expected={realProductionPerHourBoxes:332.5,dailyProductionBoxes:2826.25,nominalDailyCapacity:2975,nominalMargin:156,operationalReserve:7.25,requirementCoverage:100.25718339836823,systemUtilization:99.74347633790359,minimumOee:94.75630252100841,annualDemand:699112,annualProductionBoxes:700910,annualMargin:1798,netReserveMinutes:1.30827067669168,nominalReserveMinutes:1.242857142857143,precioEquipoUsd:106700,knownPowerKw:44.01535,weeklyWaterLiters:6970,annualWaterM3:345.712};
for(const [k,v]of Object.entries(expected))assert.ok(Math.abs(r[k]-v)<1e-8,`${k}: ${r[k]} vs ${v}`);
for(const [e,p,m]of [[70,2082.5,-736.5],[85,2528.75,-290.25],[90,2677.5,-141.5],[94,2796.5,-22.5],[95,2826.25,7.25],[97,2885.75,66.75]]){const x=calculateDHLResults({...i,oee:e});assert.equal(x.dailyProductionBoxes,p);assert.equal(x.operationalReserve,m);assert.equal(x.annualEnergyKwh,r.annualEnergyKwh);}
assert.deepEqual(r.annualScenarios.map(y=>y.year),[2027,2028,2029,2030]);assert.ok(r.annualScenarios[2].hourMargin<0&&r.annualScenarios[3].hourMargin<0);
const zero=calculateDHLResults({...i,oee:0});assert.equal(zero.dailyProductionBoxes,0);assert.equal(zero.hoursRequired,null);assert.equal(zero.estadoOperativo,'DÉFICIT DETECTADO');
const edited=normalizeDHLInputs({...i,oee:90,annualScenarios:DHL_YEAR_ASSUMPTIONS.map(x=>({...x,demand:x.year===2029?3000:x.demand}))});assert.equal(edited.oee,90);assert.equal(edited.annualScenarios[2].demand,3000);assert.equal(edited.dhlModelVersion,DHL_MODEL_VERSION);
assert.ok(!r.powerComplete);assert.equal(i.cajas.filter(b=>b.hasLid).reduce((s,b)=>s+b.piezasDia2028,0),2318);
console.log('VERIFICADO: migración, 17 controles, seis escenarios, cuatro años, cero OEE, energía independiente del OEE y fuentes de CAPEX/potencia/agua.');
