import Layout from "#web/components/Layout";

export default function IndexPage({ loggedInAs }: { loggedInAs: string | null }) {
  return (
    <Layout title="Home">
      <main class={"pb-8"}>
        {loggedInAs ? (
          <div class={"flex justify-between px-6 pt-6"}>
            <div safe>{loggedInAs}</div>
            <a href="/auth/signout?redirect=home">Logout</a>
          </div>
        ) : (
          <div class={"flex justify-end px-6 pt-6"}>
            <a href="/auth">Login le</a>
          </div>
        )}
        <div class={"container m-auto"}>
          <div class={"text-3xl w-fit h-fit m-auto pt-8 font-bold"}>Selamat datang!</div>
          <div class={"w-fit h-fit m-auto mt-4 mb-14"}>Pilih menu yang ada di sini ya</div>
        </div>
        <div class={"container m-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
          <div class={"rounded-lg border shadow-sm flex flex-1 hover:shadow-md transition"}>
            <a class={"flex"} href="/user/titles">
              <div class={"p-6 items-baseline flex flex-col"}>
                <h3 class={"text-lg font-semibold leading-none tracking-tight mb-3"}>Ambil title-mu!</h3>
                <p class={"mb-5 flex-1 text-base font-light text-muted-foreground"}>
                  "title" ini tidak lain adalah hal yang sama dengan "role" di platform Discord. Pilih grupnya lalu atur
                  title yang ingin kamu ambil! Perlu diingat bahwa title ada yang bisa diambil dan ada yang mutlak,
                  tergantung apa yang diatur oleh admin grup.
                </p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </Layout>
  );
}
