import Layout from "#web/components/Layout";
import { GroupInfo, Titles } from "#web/types/titles";

function UserPen({ size }: { size?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? "24"}
      height={size ?? "24"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-user-pen"
    >
      <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
      <path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
      <circle cx="10" cy="7" r="4" />
    </svg>
  );
}

function Users({ size }: { size?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? "24"}
      height={size ?? "24"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-users"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TitleRow({ groupJid, t, isAdmin }: { groupJid: string; isAdmin: boolean; t: Titles }) {
  return (
    <tr>
      <td class={"p-2 w-fit h-fit border border-white"}>
        <input
          class={"h-6 w-6 cursor-pointer"}
          name={t.id}
          disabled={!t.claimable}
          type="checkbox"
          value="y"
          checked={t.holding}
        />
      </td>
      <td class={"p-2 border border-white"} safe>
        {t.title_name}
      </td>
      <td class={"p-2 border border-white"}>
        <a href={`/user/titles/${groupJid}/holders/${t.id}`}>{isAdmin ? <UserPen size="30" /> : <Users size="30" />}</a>
      </td>
    </tr>
  );
}

export default function TitlesGroupPage({
  groupInfo,
  titles,
  result,
}: {
  titles: Titles[];
  groupInfo: GroupInfo;
  result: string;
}) {
  const groupJid = groupInfo.group.jid.split("@")[0];
  const isAdmin = groupInfo.me.role !== "MEMBER";
  const claimableTitles = titles.filter((t) => t.claimable);
  const unclaimableTitles = titles.filter((t) => !t.claimable);

  let color = "";
  let msg = "";

  switch (result) {
    case "notModified": {
      color = "text-orange-400";
      msg = "Ga ada yang berubah";
      break;
    }
    case "???": {
      color = "text-orange-400";
      msg = "???";
      break;
    }
    case "success": {
      color = "text-green-500";
      msg = "Sukses";
      break;
    }
    default: {
      color = "text-red-500";
      msg = result;
    }
  }

  return (
    <Layout title="Titles">
      <div class={"p-4"}>
        {msg && (
          <div class={`${color} mb-2`} safe>
            {msg}
          </div>
        )}
        {isAdmin && (
          <div class={"p-2 mb-6 w-fit rounded-md border border-white"}>
            <a href={`/user/titles/${groupJid}/create`}>Bikin title baru</a>
          </div>
        )}
        <div class={"font-bold text-lg mb-2"}>Title yang sudah tetap dan tak bisa diubah:</div>
        {unclaimableTitles.length > 0 ? (
          <table border={1} class={"mb-6 border-collapse border border-white"}>
            {unclaimableTitles.map((t) => (
              <TitleRow groupJid={groupJid} t={t} isAdmin={isAdmin} />
            ))}
          </table>
        ) : (
          <i>Tidak ada</i>
        )}
        <div class={"mb-2 font-bold text-lg"}>Title yang tersedia:</div>
        {claimableTitles.length > 0 ? (
          <form method="post" action={`/user/titles/${groupJid}/assign`}>
            <table border={1} class={"mb-6 border-collapse border border-white"}>
              {claimableTitles.map((t) => (
                <TitleRow groupJid={groupJid} t={t} isAdmin={isAdmin} />
              ))}
            </table>
            <button type="submit" class={"border border-white rounded-md py-2 px-4"}>
              Save
            </button>
          </form>
        ) : (
          <i>Tidak ada</i>
        )}
      </div>
    </Layout>
  );
}
