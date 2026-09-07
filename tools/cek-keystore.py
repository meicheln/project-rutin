#!/usr/bin/env python3
"""Cek apakah sebuah password bisa buka keystore rilis.

    python3 tools/cek-keystore.py

Passwordnya diketik pas diminta, nggak lewat argumen — biar nggak nyangkut di
riwayat shell. Nggak ada yang dikirim ke mana-mana; ini murni ngecek file lokal.

Kenapa perlu: APK yang ditandatanganin kunci beda nggak bisa nimpa yang udah
kepasang di HP. Kalau passwordnya ketemu, rilis berikutnya mulus. Kalau nggak,
lihat docs/ANDROID.md bagian "If the keystore password is lost".
"""
import getpass
import os
import sys

try:
    from cryptography.hazmat.primitives.serialization import pkcs12
except ImportError:
    sys.exit("Butuh pustaka cryptography:  pip install cryptography")

KS = sys.argv[1] if len(sys.argv) > 1 else os.path.join("dist", "rutin-release.keystore")

if not os.path.exists(KS):
    sys.exit(f"Nggak nemu keystore di {KS}")

with open(KS, "rb") as f:
    data = f.read()

print(f"Keystore : {KS} ({len(data)} byte)")
print("Ketik password buat dicoba. Kosongin lalu Enter buat berhenti.\n")

while True:
    try:
        sandi = getpass.getpass("  password: ")
    except (KeyboardInterrupt, EOFError):
        print()
        break
    if not sandi:
        break
    try:
        kunci, sertifikat, _ = pkcs12.load_key_and_certificates(data, sandi.encode())
    except Exception:
        print("  salah.\n")
        continue

    print("\n  BENAR. Ini passwordnya.")
    if sertifikat is not None:
        print(f"  sertifikat : {sertifikat.subject.rfc4514_string()}")
        print(f"  berlaku    : {sertifikat.not_valid_before_utc:%Y-%m-%d} sampai "
              f"{sertifikat.not_valid_after_utc:%Y-%m-%d}")
    print("\n  Pasang sebagai secret RUTIN_KEYSTORE_PASS di GitHub.")
    sys.exit(0)

print("Berhenti. Belum ketemu.")
sys.exit(1)
