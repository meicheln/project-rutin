/**
 * Rutin — proxy asisten.
 *
 * Gunanya satu: kunci penyedia AI nggak pernah nyentuh HP. Aplikasi ngirim token
 * sesi Supabase-nya, fungsi ini yang mastiin token itu sah, terus nerusin ke
 * penyedia pakai kunci yang cuma ada di sini.
 *
 * Dua penyedia didukung, dipilih dari secret mana yang ada:
 *   GEMINI_API_KEY    -> Gemini (diterjemahin di gemini.ts)
 *   ANTHROPIC_API_KEY -> Anthropic (diteruskan apa adanya)
 * Aplikasinya sendiri selalu ngomong format Anthropic; yang nerjemahin server.
 *
 * Deploy (dari akar repo, nggak perlu install apa-apa, nggak perlu Docker):
 *   npx supabase@latest login
 *   npx supabase@latest functions deploy asisten --project-ref <ref> --use-api
 *   npx supabase@latest secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <ref>
 *
 * Langkah lengkap + troubleshooting: docs/SUPABASE.md
 *
 * Ini proxy tipis: prompt sistem dan daftar alat masih dikirim dari aplikasi.
 * Baru pas Fase 4 (Telegram) semuanya perlu pindah ke sini, soalnya waktu itu
 * nggak ada HP yang lagi kebuka buat nyusunnya.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { panggilGemini } from './gemini.ts';

const ANTHROPIC = 'https://api.anthropic.com';

/* Daftar putih. Tanpa ini, siapa pun yang punya akun di proyek lo bisa mukul
   endpoint Anthropic mana aja pakai kunci lo — ini bukan proxy umum. */
const JALUR_BOLEH = [/^\/v1\/messages$/, /^\/v1\/models(\?[\w=&%.-]*)?$/];

const BATAS_BADAN = 512 * 1024;   // 512 KB, jauh di atas percakapan wajar
const BATAS_HARIAN = 300;         // pesan per pengguna per hari

/* Auth-nya token, bukan asal domain — APK jalan dari https://localhost dan
   web-nya bisa dari mana aja, jadi ngunci origin cuma bikin repot tanpa nambah aman. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const balas = (status: number, isi: unknown) =>
  new Response(JSON.stringify(isi), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

const salah = (status: number, pesan: string) => balas(status, { error: { message: pesan } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return salah(405, 'Cuma nerima POST.');

  // ---------- 1. token sesi harus sah ----------
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return salah(401, 'Belum masuk.');

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return salah(500, 'Fungsi belum dikonfigurasi dengan benar.');

  const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: errAuth } = await sb.auth.getUser();
  if (errAuth || !user) return salah(401, 'Sesi nggak valid atau udah kedaluwarsa.');

  // ---------- 2. kunci cuma ada di sini ----------
  // Dua penyedia. Gemini menang kalau kuncinya ada, biar ganti penyedia itu
  // cukup nge-set/ngehapus satu secret — nggak usah deploy ulang.
  const kunciGemini = Deno.env.get('GEMINI_API_KEY');
  const kunci = Deno.env.get('ANTHROPIC_API_KEY');
  if (!kunciGemini && !kunci) {
    return salah(501, 'Belum ada kunci penyedia di Edge Function. Jalanin salah satu:\n' +
      'supabase secrets set GEMINI_API_KEY=...\n' +
      'supabase secrets set ANTHROPIC_API_KEY=sk-ant-...');
  }

  // ---------- 3. badan permintaan ----------
  const mentah = await req.text();
  if (mentah.length > BATAS_BADAN) return salah(413, 'Permintaannya kegedean.');

  let isi: { path?: string; method?: string; body?: unknown };
  try { isi = JSON.parse(mentah || '{}'); }
  catch { return salah(400, 'Badan permintaan bukan JSON.'); }

  const jalur = String(isi.path ?? '');
  if (!JALUR_BOLEH.some((r) => r.test(jalur))) return salah(400, 'Jalur nggak diizinin: ' + jalur);
  const metode = isi.method === 'GET' ? 'GET' : 'POST';

  // ---------- 4. kuota harian per pengguna ----------
  // Tanpa ini, satu token yang bocor bisa ngabisin saldo Anthropic lo diam-diam.
  // Ditulis pakai service role, dan tabelnya sengaja nggak punya policy sama sekali —
  // kalau pengguna bisa nulis sendiri, dia (atau token yang bocor) tinggal reset ke 0.
  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (svcKey) {
    const svc = createClient(url, svcKey, { auth: { persistSession: false } });
    const hari = new Date().toISOString().slice(0, 10);
    const { data: kuota } = await svc
      .from('rutin_kuota').select('jumlah').eq('user_id', user.id).eq('hari', hari).maybeSingle();
    const kepakai = kuota?.jumlah ?? 0;
    if (kepakai >= BATAS_HARIAN) {
      return salah(429, `Udah ${BATAS_HARIAN} permintaan hari ini. Coba lagi besok.`);
    }
    // dicatat sebelum diteruskan — kalau putus di tengah, mendingan kehitung lebih daripada kelewat
    await svc.from('rutin_kuota')
      .upsert({ user_id: user.id, hari, jumlah: kepakai + 1 }, { onConflict: 'user_id,hari' });
  } else {
    // Supabase biasanya nyuntik ini otomatis. Kalau nggak ada, kuota mati tapi
    // pemeriksaan token di atas tetap jalan — itu pengaman utamanya, ini lapis kedua.
    console.error('SUPABASE_SERVICE_ROLE_KEY nggak ada — kuota harian nggak aktif');
  }

  // ---------- 5. teruskan ----------
  // Isi percakapannya sengaja nggak di-log. Itu data harian pengguna.
  if (kunciGemini) {
    try {
      const g = await panggilGemini(jalur, metode, isi.body ?? {}, kunciGemini);
      return balas(g.status, g.data);
    } catch (e) {
      console.error('gemini tak terjangkau', String(e));   // pesannya doang, bukan isinya
      return salah(502, 'Nggak bisa nyambung ke Gemini.');
    }
  }

  let r: Response;
  try {
    r = await fetch(ANTHROPIC + jalur, {
      method: metode,
      headers: {
        'x-api-key': kunci!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: metode === 'GET' ? undefined : JSON.stringify(isi.body ?? {}),
    });
  } catch (e) {
    console.error('anthropic tak terjangkau', String(e));   // pesannya doang, bukan isinya
    return salah(502, 'Nggak bisa nyambung ke Anthropic.');
  }

  const teks = await r.text();
  return new Response(teks, {
    status: r.status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
});
