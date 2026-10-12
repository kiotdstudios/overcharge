globalThis.Image = class { constructor() { this.complete = false; } };
const { levelOneObjective, advanceLevelOneObjectivePresentation } = await import('../src_scroll/ui.js');

const lamp = { kind:'prop', sprite:'assets/objects/night-city-props/streetlight/', charge:4, max:4 };
const exit = { isExit:true, required:8, charged:0, open:false };
const level = { number:1, sources:[lamp], gates:[exit] };
const player = { usableEnergy:0 };
function check(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`✓ ${label}`);
}
check(levelOneObjective(level,player).title === 'NEED TO POWER UP', 'starts with lamp objective');
lamp.charge = 3.75;
check(levelOneObjective(level,player).title === 'POWER THE EXIT', 'lamp absorption reveals exit objective');
check(!levelOneObjective(level,player).checked, 'exit objective starts unchecked');
player.usableEnergy = 7.75;
check(!levelOneObjective(level,player).checked, 'less than required charge stays unchecked');
player.usableEnergy = 8;
check(levelOneObjective(level,player).checked, 'enough charge checks the exit objective');
player.usableEnergy = 0; exit.charged = 4;
check(!levelOneObjective(level,player).checked, 'spent charge does not falsely complete objective');
exit.open = true;
check(levelOneObjective(level,player).checked, 'opened exit remains checked');
exit.open = false; lamp.charge = 4;
check(levelOneObjective(level,player).title === 'NEED TO POWER UP', 'checkpoint rewind restores first objective');
check(levelOneObjective({...level,number:2},player) === null, 'other levels have no Level 1 objective');

const first = {stage:0,checked:false};
const second = {stage:1,checked:false};
let ui = advanceLevelOneObjectivePresentation(null, first, 10);
check(ui.stage === 0 && ui.enteredAt === 10, 'first objective begins with an entrance animation');
ui = advanceLevelOneObjectivePresentation(ui, second, 12);
check(ui.stage === 0 && ui.checked && ui.sparkAt === 12, 'lamp completion checks and sparks before advancing');
ui = advanceLevelOneObjectivePresentation(ui, second, 12.5);
check(ui.stage === 0, 'completed lamp objective remains visible briefly');
ui = advanceLevelOneObjectivePresentation(ui, second, 12.81);
check(ui.stage === 1 && ui.enteredAt === 12.81, 'gate objective gets its own entrance animation');
ui = advanceLevelOneObjectivePresentation(ui, {...second,checked:true}, 15);
check(ui.checked && ui.sparkAt === 15, 'gate completion triggers its own checkbox spark');
ui = advanceLevelOneObjectivePresentation(ui, first, 16);
check(ui.stage === 0 && !ui.checked && ui.enteredAt === 16, 'checkpoint rewind resets the presentation');
