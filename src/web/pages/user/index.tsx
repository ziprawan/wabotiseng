import Layout from "#web/components/Layout";

export default function UserIndexPage() {
  return (
    <Layout title="User">
      <div class={"p-6"}>
        <div class={"text-3xl"}>
          <a href="/" class={"underline"}>
            Back to Home
          </a>
        </div>
        <div>Nothing to do in here!</div>
      </div>
    </Layout>
  );
}
