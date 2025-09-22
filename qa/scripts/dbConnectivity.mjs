import { MongoClient } from 'mongodb';
import pc from 'picocolors';
import { cfg } from '../config.js';

const client = new MongoClient(cfg.mongoUri, { monitorCommands: false });

async function main(){
  console.log(pc.cyan('DB → connecting…'), cfg.mongoUri, cfg.mongoDb);
  await client.connect();
  const db = client.db(cfg.mongoDb);
  const stats = await db.command({ dbStats: 1 });
  console.log(pc.gray(`DB name: ${stats.db} | Collections: ${stats.collections} | Objects: ${stats.objects}`));

  // Write & read verification artifact
  const col = db.collection('qa_verification_artifacts');
  const token = { kind:'fixzit-qa', ts: new Date(), key:'db-reachable', v:1 };
  await col.insertOne(token);
  const got = await col.findOne({ key:'db-reachable' });
  if(!got) throw new Error('DB write/read failed');
  console.log(pc.green('✔ Real MongoDB reachable; write/read OK.'));

  // Ensure org_id index exists where relevant (creates if missing)
  await db.collection('work_orders').createIndex({ org_id: 1 });
  console.log(pc.green('✔ Index check (org_id) ensured on work_orders.'));

  await client.close();
}
main().catch(e=>{ console.error(pc.red(e)); process.exit(1); });
