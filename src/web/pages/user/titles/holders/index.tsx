import Layout from "#web/components/Layout";
import { GroupInfo, TitlesWithHolders } from "#web/types/titles";
import { escapeHTML } from "bun";

function HoldersListAdmin({
  titleInfo,
  groupInfo: {
    group: { participants, jid },
    me: { jid: meJid },
  },
}: {
  titleInfo: TitlesWithHolders;
  groupInfo: GroupInfo;
}) {
  const holdersIds = titleInfo.holders.map((h) => h.jid);
  const groupJid = jid.split("@")[0];
  const titleId = titleInfo.id;

  return (
    <div>
      <div class={"font-bold text-lg"}>ADMIN MODE</div>
      <form method="post" action={`/user/titles/${groupJid}/holders/${titleId}/assign`}>
        <button class={"py-2 px-4 border border-white"}>Save</button>
        <div>
          <input id="input_holders" class={"py-1 px-2 bg-black text-white border border-white"} type="text" />
        </div>
        <div id="holders">
          {titleInfo.holders.map((h) => {
            const isMe = h.jid === meJid;

            return (
              <div class={"flex gap-2"} style="">
                <input name={h.jid} type="checkbox" checked value="y" />
                <div class={`${isMe ? "text-green-500 font-bold" : ""}`} safe>
                  {h.name ? `${h.name} (+${h.jid.split("@")[0]})` : "+" + h.jid.split("@")[0]}
                </div>
              </div>
            );
          })}
        </div>
        <input id="input_non_holders" class={"py-1 px-2 bg-black text-white border border-white"} type="text" />
        <div id="non_holders">
          {participants
            .filter((f) => !holdersIds.includes(f.jid))
            .map((p) => {
              const isMe = p.jid === meJid;

              return (
                <div class={"flex gap-2"} style="">
                  <input name={p.jid} type="checkbox" value="y" />
                  <div class={`${isMe ? "text-green-500 font-bold" : ""}`} safe>
                    {p.name ? `${p.name} (+${p.jid.split("@")[0]})` : "+" + p.jid.split("@")[0]}
                  </div>
                </div>
              );
            })}
        </div>
      </form>
    </div>
  );
}

function HoldersListUser({ titleInfo, groupInfo }: { titleInfo: TitlesWithHolders; groupInfo: GroupInfo }) {
  return (
    <div>
      <div>User mode</div>
      {titleInfo.holders.map((h) => (
        <div>
          <div safe>{h.name ? `${h.name} (${h.jid})` : h.jid}</div>
        </div>
      ))}
    </div>
  );
}

export default async function TitleHoldersPage({
  titleInfo,
  groupInfo,
  result,
}: {
  titleInfo: TitlesWithHolders;
  groupInfo: GroupInfo;
  result: string;
}) {
  const isAdmin = groupInfo.me.role !== "MEMBER";

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
    <Layout scripts={[{ position: "bottom", src: "/assets/scripts/holders.js" }]}>
      <main class={"p-8"}>
        {msg && (
          <div class={`${color} mb-2`} safe>
            {msg}
          </div>
        )}
        <div>
          <div>{titleInfo.holding ? "Kamu saat ini memegang title ini" : "Kamu saat ini tidak memegang title ini"}</div>
          <div>
            <div>
              Info untuk title "{titleInfo.title_name}" dalam grup{" "}
              <span class={"font-bold"} safe>
                {groupInfo.group.name}
              </span>
            </div>
            <div>
              {isAdmin ? (
                <HoldersListAdmin titleInfo={titleInfo} groupInfo={groupInfo} />
              ) : (
                <HoldersListUser titleInfo={titleInfo} groupInfo={groupInfo} />
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
