Perintah-Perintah Utilitas
==========================

Perintah ini adalah perintah-perintah utilitas yang bisa dipake di grup atau di *private chat*. Biasanya perintah-perintah ini adalah hasil dari *request* fitur dari para *tester* Bot OPC :D

Berikut adalah perintah-perintah utilitas yang bisa dipake:

stk <emoji>
-----------
Digunakan untuk mengubah gambar menjadi stiker. Bisa digunakan dengan me-*reply* gambar atau mengirim gambar langsung dengan *caption* .stk

.. note:: 

  Buat sekarang, perintah ini cuma bisa buat ubah gambar jadi stiker. Nanti akan diberikan support untuk mengubah video menjadi stiker bergerak (video stikcer)

.. note:: 

  Gambar yang diubah menjadi stiker, akan mengikuti `aturan stiker dari WhatsApp <https://github.com/WhatsApp/stickers/blob/main/Android/README.md#sticker-art-and-app-requirements>`_, yaitu foto akan diubah menjadi format WebP dengan resolusi maksimal 512x512 pixel dan 100KB

argumen:
  - ``emoji``: (Opsional) Menspesifikasikan emoji dari stiker yang akan dibuat. Ini berguna untuk mencari stiker dari favorit mu sesuai dengan emoji yang kamu masukkan.

    .. image:: ../images/stiker_beremoji.jpg
      :alt: Contoh penggunaan stiker dengan emoji
      :align: center
      :scale: 50%
    
    Untuk info klasifikasi emoji stiker, bisa refer ke `wiki di sini <https://github.com/WhatsApp/stickers/wiki/Tag-your-stickers-with-Emojis>`_

vo
--
vo atau singkatan dari *view once* adalah perintah yang dipake buat ngeliat pesan *view once*. Perintah ini akan mengirim pesan konfirmasi dan menunggu respon dari pengirim untuk menyetujui permintaan. 
Setujui dengan react pesan tersebut dengan emoji ✅ atau diemin aja kalau ga mau liat.

Untuk sekarang, seharusnya *support* untuk gambar, video, dan voice note.

.. warning:: 

  Perintah ini mungkin melanggar peraturan privasi baik dari sisi pengirim maupun dari sisi WhatsApp. Ada kemungkinan bot bisa di-*ban* kapan saja. Dimohon kebijakannya untuk perintah ini! 