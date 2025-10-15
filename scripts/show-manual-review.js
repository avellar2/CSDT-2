const report = require('../deep-analysis-schools-report.json');

console.log('🤔 ESCOLAS PARA REVISÃO MANUAL:\n');

report.potential_matches.forEach((match, i) => {
  console.log(`${i+1}. ${match.existing_name}`);
  console.log('   Candidatos:');
  match.candidates.forEach(c => {
    console.log(`   - ${c.maps_name} (${c.district}) - ${(c.confidence*100).toFixed(1)}%`);
  });
  console.log('');
});

console.log(`\n📊 Total de escolas para revisão manual: ${report.potential_matches.length}`);
console.log('\n🎯 RECOMENDAÇÕES:');

// Analisar os matches mais prováveis
const highProbability = report.potential_matches.filter(m => 
  m.candidates.some(c => c.confidence > 0.6)
);

const mediumProbability = report.potential_matches.filter(m => 
  m.candidates.every(c => c.confidence <= 0.6) && 
  m.candidates.some(c => c.confidence > 0.4)
);

const lowProbability = report.potential_matches.filter(m => 
  m.candidates.every(c => c.confidence <= 0.4)
);

console.log(`✅ Alta probabilidade (>60%): ${highProbability.length} escolas`);
console.log(`⚠️ Média probabilidade (40-60%): ${mediumProbability.length} escolas`);
console.log(`❓ Baixa probabilidade (<40%): ${lowProbability.length} escolas`);

console.log('\n🔍 MATCHES MAIS PROVÁVEIS PARA REVISÃO:');
highProbability.slice(0, 10).forEach((match, i) => {
  const bestCandidate = match.candidates[0];
  console.log(`${i+1}. ${match.existing_name}`);
  console.log(`   → ${bestCandidate.maps_name} (${bestCandidate.district}) - ${(bestCandidate.confidence*100).toFixed(1)}%`);
  console.log('');
});