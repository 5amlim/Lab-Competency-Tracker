import test from 'node:test';
import assert from 'node:assert/strict';
import {datePlus,createStages,demoData,getPlatform,statusOf,isoToday,MARKETS,SITES,getMarket,getMarketSites} from '../src/data.js';
test('month schedule clamps leap-year dates',()=>{
 assert.equal(datePlus('2024-08-31',6),'2025-02-28');
 assert.equal(datePlus('2024-02-29',12),'2025-02-28');
 assert.equal(datePlus('2024-01-31',1),'2024-02-29');
});
test('new platform includes distinct training, initial, six-month and annual events',()=>{
 const stages=createStages({id:'e',first_testing_date:'2026-01-15'},'2026-10-27');
 assert.equal(stages[0].phase,'initial_training');
 assert.equal(stages[1].phase,'initial_competency');
 assert.equal(stages[2].phase,'six_month');
 assert.equal(stages[2].due_date,'2026-07-15');
 assert(stages.some(s=>s.phase==='annual'&&s.due_date==='2027-01-15'));
 assert(new Set(stages.map(s=>s.id)).size===stages.length);
});
test('offboarded staff never generate due reminders',()=>{
 assert.equal(statusOf({due_date:'2020-01-01',completed_at:null},{status:'offboarded'}),'archived');
 assert.equal(statusOf({due_date:'2020-01-01',completed_at:'2020-01-01T12:00:00Z'},{status:'offboarded'}),'complete');
});
test('demo uses fictional records and has no evidence by default',()=>{
 const d=demoData();
 assert.equal(d.employees.length,8);
 assert.equal(d.documents.length,0);
 assert(d.assessments.length>d.enrollments.length*4);
 assert(getPlatform('pathfast').source===null);
});
test('markets contain exactly the 15 requested full-name sites',()=>{
 assert.deepEqual(MARKETS.map(m=>[m.id,m.sites.length]),[['SoCal',4],['NorCal',2],['FL',3],['NY',6]]);
 assert.equal(SITES.length,15);
 assert.equal(new Set(SITES).size,15);
 assert.deepEqual(getMarketSites('SoCal'),['Beverly Hills Flagship','Beverly Hills Satellite','Santa Monica','Manhattan Beach']);
 assert.deepEqual(getMarketSites('NorCal'),['San Francisco','Palo Alto']);
 assert.deepEqual(getMarketSites('FL'),['Boca Raton','Palm Beach','Coral Gables']);
 assert.deepEqual(getMarketSites('NY'),['Upper East Side','Tribeca','Hamptons','Fifth Avenue','Gramercy','Hudson Yards']);
 assert.equal(getMarket('Beverly Hills Satellite').name,'Southern California');
 assert.equal(getMarket('Palo Alto').id,'NorCal');
 assert.equal(getMarket('Random legacy site'),null);
 const demo=demoData();
 assert(demo.employees.every(e=>SITES.includes(e.site)),'All fictional employees must have a valid site');
});
