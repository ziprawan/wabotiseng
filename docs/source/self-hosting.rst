Cara Jalanin Bot Sendiri
========================

Pengenalan
----------

Hore, penasaran ya gimana cara jalanin sendiri. Ni ku kasih instruksi secara singkat, so, selamat mencoba!

Syarat
------

- Tau gimana cara ngetik di *keyboard*.
- Tau gimana cara make alat-alat ini:

  - `Git <https://git-scm.com>`_
  - `Node.js 16.0.0 atau lebih baru <https://nodejs.org>`_

      Catatan: `Bun <https://bun.sh>`_ saat ini masih ga support (Sekarang v.1.1.34).
  - `MongoDB 4.4 atau lebih baruu <https://www.mongodb.com/try/download/community>`_

      Kau bisa pake `MongoDB Atlas <https://www.mongodb.com/cloud/atlas>`_ kalau gamau masang *database* di lokal.

Setup
-----

Ga susah tbh.

1. *Clone* |link_repo|_ ini.

   ``git clone https://github.com/ziprawan/wabotiseng.git``
2. Pasang node_modules hell

   ``npm install``
3. Bikin file ``.env`` terus isi dengan value-mu

Berikut variabel environment yang mungkin dibutuhkan
  - ``SESSION_NAME``: Nama sesi yang bakal kesimpen di *collection* ``Creds``
  - ``MONGO_URL``: URL database MongoDB
  - ``OWNER``: Jid dari sang pemilik. Formatnya ``<nomor telepon format internasional>@s.whatsapp.net`` ga pake <>.
  - ``CONFESS_TARGET``: Jid yang bakal jadi target pengiriman pesan *confess*. Formatnya sama kayak ``OWNER``.
  - ``DEBUG_ID`` (opsional): Jid chat yang bisa digunakan untuk men-debug bot??.
  - ``GROUPS`` (opsional): Kumpulan remoteJid yang bisa menggunakan bot ini, dipisah pake koma. Biarin kosong kalau mau nerima semua chat.

    Segala event ``message.upsert`` bakal kesimpen di folder ``json``

1. Bikin folder kosong dengan nama-nama berikut:

   - ``dist``
   - ``json``
   - ``errors``
   - ``logs``
2. Sinkronisasi (😭) model database
   
   ``npm run prisma db push``
3. Jalanin bot

   ``npm start``
4. Jika ini adalah pertama kalinya menjalankan bot, maka akan ditampilkan QR Code untuk di-*scan*. Cara *scan* sama kayak mau nge-*scan* di |wa_web|_

*Troubleshooting*
-----------------

Berikut beberapa *troubleshooting* yang kutau:

Gabisa login setelah logout
^^^^^^^^^^^^^^^^^^^^^^^^^^^
Akses ke database-mu (Bisa pake MongoDB Compass), terus buka db-mu. Cari *collection* yang namanya ``Creds``. Habistu hapus data yang ``sessionName``-nya sama dengan *value* ``SESSION_NAME`` yang kamu isi di file .env

Lain Lain
^^^^^^^^^
Gatau, coba solve sendiri. Atau kalau emang salah dari kode nya, boleh tolong lapor atau bikin pull request, oke?

.. |link_repo| replace:: *repo*
.. _link_repo: https://github.com/ziprawan/wabotiseng
.. |wa_web| replace:: WhatsApp Web
.. _wa_web: https://web.whatsapp.com