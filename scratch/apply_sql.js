const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
console.log('Connecting to database...');

const client = new Client({
  connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected successfully!');

    let sql = fs.readFileSync('/home/belloumi/Téléchargements/full_init.sql', 'utf8');

    // Fix the policy syntax errors
    sql = sql.replace(
      /execute format\(\$f\$\s+create policy %1\$L on storage\.objects for select to authenticated[\s\S]+?\$f\$, b\);/g,
      `execute format($f$
      create policy %1$I on storage.objects for select to authenticated
      using (
        bucket_id = %2$L
        and split_part(name,'/',1)::uuid in (
          select garage_id from public.garage_members
          where user_id = auth.uid() and active = true
        )
      );
    $f$, b || '_read', b);`
    );

    sql = sql.replace(
      /execute format\(\$f\$\s+create policy %1\$L on storage\.objects for all to authenticated[\s\S]+?\$f\$, b\);/g,
      `execute format($f$
      create policy %1$I on storage.objects for all to authenticated
      using (
        bucket_id = %2$L
        and split_part(name,'/',1)::uuid in (
          select garage_id from public.garage_members
          where user_id = auth.uid() and active = true
        )
      )
      with check (
        bucket_id = %2$L
        and split_part(name,'/',1)::uuid in (
          select garage_id from public.garage_members
          where user_id = auth.uid() and active = true
        )
      );
    $f$, b || '_write', b);`
    );

    console.log('Applying fixed migration SQL...');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
