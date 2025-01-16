import Layout from "#web/components/Layout";

export default function AuthAlreadyLoggedIn({ name }: { name: string }) {
  return (
    <Layout>
      <main class={"p-6"}>
        <div>
          You are already logged in as <b>{name}</b>!
        </div>
      </main>
    </Layout>
  );
}
