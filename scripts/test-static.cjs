const {readdirSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
for(const file of readdirSync('tests').filter(f=>f.endsWith('.cjs')).sort()){
  const r=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});
  if(r.status!==0)process.exit(r.status||1);
}
