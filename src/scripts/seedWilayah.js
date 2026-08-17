import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Setup path to .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
// Gunakan SERVICE_ROLE_KEY untuk bypass RLS (karena script seeder berjalan di server/tanpa login)
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env file");
  process.exit(1);
}

if (supabaseKey === env.VITE_SUPABASE_ANON_KEY) {
  console.warn("⚠️ PERINGATAN: Anda menggunakan ANON_KEY.");
  console.warn("Jika tabel wilayah & pegawai mengaktifkan RLS (Row Level Security), operasi insert akan gagal!");
  console.warn("Solusi: Tambahkan VITE_SUPABASE_SERVICE_ROLE_KEY=<secret_role_key> ke dalam file .env Anda.\n");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure unique random segments
const randomInt = () => Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
const randomKode = () => Math.floor(Math.random() * 9000 + 1000).toString(); // 4 digit kode

async function run() {
  console.log("=== Memulai Auto-Seeder: Hierarki Wilayah Lengkap ===\n");
  
  const allUsersToInsert = [];
  let nameCounter = 1;

  // --- 1. MEMBUAT PROVINSI ---
  const kodeProv = randomKode();
  const namaProv = "Provinsi Dummy " + kodeProv;
  console.log(`[1/3] Membuat Provinsi Induk: ${namaProv}...`);

  const { data: prov, error: provError } = await supabase
    .from('wilayah')
    .insert([
      {
        kode_wilayah: kodeProv,
        nama_wilayah: namaProv,
        nama_unit_kerja: "BPS PROVINSI DUMMY " + kodeProv,
        level: "PROVINSI",
        parent_id: null
      }
    ])
    .select()
    .single();

  if (provError) {
    console.error("Gagal membuat provinsi:", provError.message);
    process.exit(1);
  }

  console.log(`      Berhasil! ID Provinsi: ${prov.id}`);

  // Pegawai Provinsi
  // 1 Kakan, 1 Admin, 2 Upper Rank, 7 Normal
  allUsersToInsert.push(
    {
      nama: "Kakan Provinsi " + randomInt().substring(0,4),
      nip: "19700101" + randomInt(),
      wilayah_id: prov.id,
      golongan: "IV/c",
      jabatan: "Kepala BPS Provinsi", // Upper Rank by Regex
      is_kakan: true,
      role_admin: "USER_BIASA",
      foto_url: "https://ui-avatars.com/api/?name=Kakan+Provinsi&background=random",
    },
    {
      nama: "Admin Provinsi " + randomInt().substring(0,4),
      nip: "19800202" + randomInt(),
      wilayah_id: prov.id,
      golongan: "III/d",
      jabatan: "Administrator Provinsi",
      is_kakan: false,
      role_admin: "ADMIN_PROVINSI",
      foto_url: "https://ui-avatars.com/api/?name=Admin+Provinsi&background=random",
    }
  );

  // 2 Upper Rank Provinsi (Ahli Madya)
  for (let i = 0; i < 2; i++) {
    allUsersToInsert.push({
      nama: `Pegawai Upper Rank Prov ${i+1}`,
      nip: `19800000${randomInt()}`,
      wilayah_id: prov.id,
      golongan: "IV/a",
      jabatan: "Statistisi Ahli Madya BPS Provinsi", // Ahli Madya = Upper Rank
      is_kakan: false,
      role_admin: "USER_BIASA",
      foto_url: `https://ui-avatars.com/api/?name=UR+Prov+${i+1}&background=random`,
    });
  }

  // 7 Normal Provinsi
  for (let i = 0; i < 7; i++) {
    allUsersToInsert.push({
      nama: `Pegawai Biasa Prov ${i+1}`,
      nip: `19900000${randomInt()}`,
      wilayah_id: prov.id,
      golongan: "III/a",
      jabatan: "Staf BPS Provinsi", // Bukan Upper Rank
      is_kakan: false,
      role_admin: "USER_BIASA",
      foto_url: `https://ui-avatars.com/api/?name=Biasa+Prov+${i+1}&background=random`,
    });
  }


  // --- 2. MEMBUAT 2 KABUPATEN/KOTA ---
  console.log(`\n[2/3] Membuat 2 Kabupaten/Kota di bawah Provinsi ${prov.id}...`);
  
  for (let k = 1; k <= 2; k++) {
    const kodeKab = randomKode();
    const namaKab = `Kabupaten Dummy ${k} (${kodeKab})`;
    
    const { data: kab, error: kabError } = await supabase
      .from('wilayah')
      .insert([
        {
          kode_wilayah: kodeKab,
          nama_wilayah: namaKab,
          nama_unit_kerja: `BPS KABUPATEN DUMMY ${k}`,
          level: "KABKOTA",
          parent_id: prov.id
        }
      ])
      .select()
      .single();

    if (kabError) {
      console.error(`Gagal membuat KabKota ${k}:`, kabError.message);
      continue;
    }
    console.log(`      Berhasil membuat ${namaKab} dengan ID: ${kab.id}`);

    // Pegawai Kab/Kota
    // 1 Kakan, 1 Admin, 1 Upper Rank, 4 Normal
    allUsersToInsert.push(
      {
        nama: `Kakan KabKota ${k} ` + randomInt().substring(0,4),
        nip: "19750101" + randomInt(),
        wilayah_id: kab.id,
        golongan: "IV/a",
        jabatan: "Kepala BPS Kabupaten/Kota", // Upper Rank by Regex
        is_kakan: true,
        role_admin: "USER_BIASA",
        foto_url: `https://ui-avatars.com/api/?name=Kakan+Kab+${k}&background=random`,
      },
      {
        nama: `Admin KabKota ${k} ` + randomInt().substring(0,4),
        nip: "19850202" + randomInt(),
        wilayah_id: kab.id,
        golongan: "III/c",
        jabatan: "Administrator KabKota",
        is_kakan: false,
        role_admin: "ADMIN_KABKOTA",
        foto_url: `https://ui-avatars.com/api/?name=Admin+Kab+${k}&background=random`,
      }
    );

    // 1 Upper Rank KabKota (Ahli Madya)
    allUsersToInsert.push({
      nama: `Pegawai Upper Rank Kab ${k}`,
      nip: `19800000${randomInt()}`,
      wilayah_id: kab.id,
      golongan: "IV/a",
      jabatan: "Statistisi Ahli Madya BPS Kabupaten/Kota",
      is_kakan: false,
      role_admin: "USER_BIASA",
      foto_url: `https://ui-avatars.com/api/?name=UR+Kab+${k}&background=random`,
    });

    // 4 Normal KabKota
    for (let i = 0; i < 4; i++) {
      allUsersToInsert.push({
        nama: `Pegawai Biasa Kab ${k}-${i+1}`,
        nip: `19950000${randomInt()}`,
        wilayah_id: kab.id,
        golongan: "III/a",
        jabatan: "Staf BPS Kabupaten/Kota",
        is_kakan: false,
        role_admin: "USER_BIASA",
        foto_url: `https://ui-avatars.com/api/?name=Biasa+Kab+${k}-${i+1}&background=random`,
      });
    }
  }

  // --- 3. CREATE AUTH USERS FOR ADMINS & INSERT SEMUA PEGAWAI ---
  console.log(`\n[3/3] Menyiapkan Akun Auth dan memasukkan ${allUsersToInsert.length} data pegawai ke database...`);
  
  const createdAdmins = [];

  for (let i = 0; i < allUsersToInsert.length; i++) {
    const p = allUsersToInsert[i];
    if (p.role_admin !== 'USER_BIASA' || p.is_kakan) {
      // Buat akun Auth untuk admin ini agar bisa login
      const rawEmail = p.nama.toLowerCase().replace(/[^a-z0-9]/g, '') + '@dummy.com';
      const password = 'password123';
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: rawEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: p.nama }
      });

      if (authError) {
        console.error(`Gagal membuat Auth User untuk ${p.nama}:`, authError.message);
      } else if (authData?.user) {
        p.user_id = authData.user.id;
        p.email = rawEmail; // Simpan email juga di tabel pegawai
        createdAdmins.push({ nama: p.nama, email: rawEmail, password, role: p.role_admin });
      }
    }
  }

  const { data: pegawaiData, error: pegawaiError } = await supabase
    .from('pegawai')
    .insert(allUsersToInsert)
    .select();

  if (pegawaiError) {
    console.error("Gagal insert pegawai:", pegawaiError.message);
  } else {
    console.log("Sukses insert pegawai!");
    console.log(`\n=== SEEDING HIERARKI SELESAI ===`);
    console.log(`Terbuat:`);
    console.log(`- 1 Provinsi (11 Pegawai)`);
    console.log(`- 2 Kabupaten/Kota (Masing-masing 7 Pegawai)`);
    console.log(`Total 25 Pegawai berhasil ditambahkan!`);
    
    if (createdAdmins.length > 0) {
      console.log(`\n--- KREDENSIAL LOGIN (ADMIN & KAKAN) ---`);
      console.log(`Gunakan email & password berikut untuk login ke Dashboard Admin / Kakan:`);
      createdAdmins.forEach(adm => {
        console.log(`- ${adm.nama} (${adm.role})`);
        console.log(`  Email: ${adm.email}`);
        console.log(`  Password: ${adm.password}\n`);
      });
    }
  }
}

run();
