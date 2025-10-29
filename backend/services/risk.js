function baseRisk(input={}) {
  let score = 30;
  if (input.isDSNP) score += 20;
  if (input.switchesLast2Years) score += Math.min(20, input.switchesLast2Years*8);
  if (input.age && input.age > 80) score += 5;
  if (input.newMeds) score += Math.min(15, input.newMeds*5);
  return Math.max(0, Math.min(100, score));
}
module.exports = { baseRisk };
