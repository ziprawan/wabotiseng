import Layout from "#web/components/Layout";

type BasicGroupInfo = {
  remote_jid: string;
  subject: string;
  desc: string | null;
};

function GroupCard({ subject, desc, id }: { subject: string; desc: string | null; id: string }) {
  return (
    <div class={"rounded-lg border shadow-sm flex flex-1 hover:shadow-md transition overflow-hidden"}>
      <a class={"flex"} href={`/user/titles/${id}`}>
        <div class={"p-6 items-baseline flex flex-col"}>
          <h3 class={"text-lg font-semibold leading-none tracking-tight mb-3"} safe>
            {subject}
          </h3>
          <p class={"mb-5 flex-1 text-base font-light text-muted-foreground"} safe>
            {desc}
          </p>
        </div>
      </a>
    </div>
  );
}

export default function TitlesIndexPage({ groups }: { groups: BasicGroupInfo[] }) {
  return (
    <Layout title="User Titles">
      <main class={"p-4"}>
        <div class={"container m-auto"}>
          <div class={"text-3xl w-fit h-fit m-auto pt-8 font-bold"}>Atur Title Kamu!</div>
          <div class={"w-fit h-fit m-auto mt-4 mb-14"}>Pilih grup yang ada di sini ya!</div>
        </div>
        <div class={"container m-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
          {groups.map((group) => (
            <GroupCard desc={group.desc} id={group.remote_jid} subject={group.subject} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
