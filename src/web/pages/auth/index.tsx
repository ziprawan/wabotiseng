import Layout from "#web/components/Layout";

export default function MainAuthPage({ failReason }: { failReason: string | undefined }) {
  let err: string | null = null;

  switch (failReason) {
    case "invalidType":
      err = "Terdeteksi manipulasi data yang dikirim! Coba lagi";
      break;
    case "invalidCode":
      err = "Kode yang dimasukkan salah! Minta kode ke bot lagi!";
      break;
    case "invalidCodeLength":
      err = "Kode yang dimasukkan harus 6 digit!";
      break;
    case "userNotFound":
      err = "User tidak ditemukan atau nomor tidak vakid!";
      break;
    case "unknownError":
      err = "Ada kesalahan yang tidak diketahui! Laporkan masalah ini segera!";
      break;
    default:
      err = "";
  }

  return (
    <Layout>
      <main>
        <div class={"p-6"}>
          <div class={"text-3xl font-bold mb-2"}>Login dulu le</div>
          <div class={"text-sm mb-2"}>
            Untuk nomor telepon, isi dengan angka nomor telepon dalam format internasional dan tanpa menggunakan tanda tambah
            (+). Misal: 6212345678900
          </div>
          <div class={"text-sm mb-4"}>
            Kode bisa didapat dengan mengirim perintah .code ke private chat bot. Kode akan terdiri dari 6 angka dan
            berubah-ubah setiap kali berhasil atau gagal login.
          </div>
          <form action="/auth/signin" method="post">
            <div class={"grid grid-cols-2 gap-y-4 items-center w-fit bg-login p-6 rounded-xl"}>
              <label class={"items-center"}>Nomor telepon</label>
              <input
                class={"bg-[#130f17] text-white border border-white px-4 py-2 rounded-sm"}
                name="remoteJid"
                placeholder="remoteJid"
              />
              <label class={"items-center"}>Kode</label>
              <input
                class={"bg-[#130f17] text-white border border-white px-4 py-2 rounded-sm"}
                name="code"
                placeholder="code"
                autocomplete="off"
              />
            </div>
            <div class={"text-red-500 font-bold mt-4"}>{err}</div>
            <button type="submit" class={"py-2 px-4 mt-4 border border-white rounded-lg"}>
              Cek
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}
