#!/usr/bin/env python3
"""Bikin keystore penandatangan APK — tanpa perlu Java/keytool.

    python3 tools/bikin-keystore.py

Dipakai kalau password keystore lama ilang, atau mulai dari nol. Hasilnya
PKCS12 dengan alias `rutin` dan CN=Rutin, sama persis kayak yang dibikin
`keytool` di tools/android.mjs — jadi build.gradle dan pemeriksaan sertifikat
di workflow APK nggak usah diubah.

Password diketik pas diminta, bukan lewat argumen, biar nggak nyangkut di
riwayat shell. Nggak ada yang keluar dari komputer ini.

PENTING: simpan file hasilnya DAN passwordnya. Kalau salah satunya ilang lagi,
APK berikutnya nggak bisa nimpa yang udah kepasang, dan harus uninstall dulu.
"""
import datetime
import getpass
import os
import sys

try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.serialization import pkcs12, PrivateFormat
except ImportError:
    sys.exit("Butuh pustaka cryptography:  pip install cryptography")

TUJUAN = sys.argv[1] if len(sys.argv) > 1 else os.path.join("dist", "rutin-release.keystore")
ALIAS = b"rutin"

if os.path.exists(TUJUAN):
    print(f"{TUJUAN} udah ada.")
    print("Kalau ditimpa, APK yang ditandatanganin keystore lama nggak bisa di-update lagi.")
    if input("Ketik TIMPA buat lanjut: ").strip() != "TIMPA":
        sys.exit("Dibatalin.")

sandi = getpass.getpass("Password buat keystore baru: ")
if len(sandi) < 6:
    sys.exit("Kependekan. Minimal 6 karakter.")
if sandi != getpass.getpass("Ketik ulang: "):
    sys.exit("Nggak sama.")

print("\nBikin kunci RSA 2048...")
kunci = rsa.generate_private_key(public_exponent=65537, key_size=2048)

nama = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, "Rutin"),
    x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Personal"),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Rutin"),
    x509.NameAttribute(NameOID.LOCALITY_NAME, "Jakarta"),
    x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "DKI Jakarta"),
    x509.NameAttribute(NameOID.COUNTRY_NAME, "ID"),
])
sekarang = datetime.datetime.now(datetime.timezone.utc)
sertifikat = (
    x509.CertificateBuilder()
    .subject_name(nama).issuer_name(nama)
    .public_key(kunci.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(sekarang - datetime.timedelta(days=1))
    # 30 tahun: Play Store minta sertifikat berlaku sampai lewat 2033
    .not_valid_after(sekarang + datetime.timedelta(days=10950))
    .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
    .sign(kunci, hashes.SHA256())
)

# Sengaja pakai PBE lama: Java/apksigner pasti bisa baca ini.
# Yang berbasis AES kadang ditolak toolchain Android yang lebih tua.
enkripsi = (
    PrivateFormat.PKCS12.encryption_builder()
    .kdf_rounds(50000)
    .key_cert_algorithm(pkcs12.PBES.PBESv1SHA1And3KeyTripleDESCBC)
    .hmac_hash(hashes.SHA1())
    .build(sandi.encode())
)
isi = pkcs12.serialize_key_and_certificates(ALIAS, kunci, sertifikat, None, enkripsi)

os.makedirs(os.path.dirname(TUJUAN) or ".", exist_ok=True)
with open(TUJUAN, "wb") as f:
    f.write(isi)

# baca balik, biar nggak nyimpen file yang ternyata rusak
pkcs12.load_key_and_certificates(isi, sandi.encode())

print(f"\nJadi: {TUJUAN} ({len(isi)} byte), alias '{ALIAS.decode()}', CN=Rutin, berlaku 30 tahun.")
print("Udah dites bisa dibuka pakai password yang barusan.\n")
print("Berikutnya:")
print("  1. Simpan passwordnya di password manager. Nggak ada cara mulihin.")
print("  2. Salin ke clipboard buat secret GitHub:")
print(f'     [Convert]::ToBase64String([IO.File]::ReadAllBytes("{TUJUAN}")) | Set-Clipboard')
print("  3. Pasang RUTIN_KEYSTORE_B64 dan RUTIN_KEYSTORE_PASS di Settings -> Secrets.")
