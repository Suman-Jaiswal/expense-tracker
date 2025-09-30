import { Layout, Spin, theme } from "antd";
import React, { useEffect } from "react";
import { getAllResources } from "./api";
import ContentPage from "./components/ContentPage";
import MenuBar from "./components/MenuBar";
import { featureFlag } from "./featureFlag";
const { Content } = Layout;
const App = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [resources, setResources] = React.useState(null);
  const [resourceIdentifier, setResourceIdentifier] =
    React.useState("credit_cards");
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    getAllResources()
      .then((data) => {
        setResources(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching resources:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    console.log(resources);
  }, [resources]);

  if (loading) {
    return <Spin style={{ position: "absolute", top: "50%", left: "50%" }} />;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout>
        {featureFlag.isSideMenuEnabled && (
          <MenuBar
            resources={resources}
            setResourceIdentifier={setResourceIdentifier}
          />
        )}

        <Content
          style={{
            padding: "0 0",
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <ContentPage
            setResourceIdentifier={setResourceIdentifier}
            resources={resources}
            resourceIdentifier={resourceIdentifier}
          />
        </Content>
      </Layout>
    </Layout>
  );
};
export default App;
